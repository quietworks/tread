import { exec } from "node:child_process";
import { platform } from "node:os";
import {
	BoxRenderable,
	type CliRenderer,
	createCliRenderer,
	type KeyEvent,
} from "@opentui/core";
import { getCommands } from "./commands/registry.js";
import type { Config, FeedConfig } from "./config/types.js";
import {
	getAllArticles,
	getArticlesByFeed,
	getUnreadCount,
	markAsRead,
} from "./db/articles.js";
import type { Article } from "./db/types.js";
import { fetchAllFeeds, fetchAndStoreFeed } from "./feed/fetcher.js";
import type { Action } from "./keybindings/actions.js";
import { KeybindingHandler } from "./keybindings/handler.js";
import { logger } from "./logger.js";
import { Searcher } from "./search/searcher.js";
import type { Command } from "./search/types.js";
import { ArticleList } from "./ui/ArticleList.js";
import { ArticleView } from "./ui/ArticleView.js";
import { CommandPalette } from "./ui/CommandPalette.js";
import { FeedList, type FeedListItem } from "./ui/FeedList.js";
import { type Pane, StatusBar } from "./ui/StatusBar.js";
import { colors, layout } from "./ui/theme.js";

export class App {
	private renderer!: CliRenderer;
	private config: Config;
	private rootBox!: BoxRenderable;
	private mainBox!: BoxRenderable;
	private feedList!: FeedList;
	private articleList!: ArticleList;
	private articleView!: ArticleView;
	private statusBar!: StatusBar;
	private commandPalette!: CommandPalette;
	private keybindingHandler: KeybindingHandler;
	private searcher!: Searcher;

	private currentPane: Pane = "feeds";
	private selectedFeed: FeedConfig | null = null;
	private selectedArticle: Article | null = null;
	private commandPaletteQuery = "";

	constructor(config: Config) {
		this.config = config;
		this.keybindingHandler = new KeybindingHandler();
	}

	async init(): Promise<void> {
		this.renderer = await createCliRenderer({
			useMouse: true,
			exitOnCtrlC: false,
			useAlternateScreen: true,
		});

		const { terminalWidth, terminalHeight } = this.renderer;

		// Root container
		this.rootBox = new BoxRenderable(this.renderer, {
			width: terminalWidth,
			height: terminalHeight,
			flexDirection: "column",
			backgroundColor: colors.bg,
		});

		// Main content area (3 panes)
		this.mainBox = new BoxRenderable(this.renderer, {
			width: terminalWidth,
			height: terminalHeight - layout.statusBarHeight,
			flexDirection: "row",
			backgroundColor: colors.bg,
		});

		// Left pane: Feed list
		this.feedList = new FeedList(
			this.renderer,
			layout.feedListWidth,
			terminalHeight - layout.statusBarHeight,
		);

		// Right side container (articles + article view)
		const rightWidth = terminalWidth - layout.feedListWidth;
		const rightBox = new BoxRenderable(this.renderer, {
			width: rightWidth,
			height: terminalHeight - layout.statusBarHeight,
			flexDirection: "column",
			backgroundColor: colors.bg,
		});

		// Top-right: Article list
		const articleListHeight = Math.floor(
			(terminalHeight - layout.statusBarHeight) * 0.4,
		);
		this.articleList = new ArticleList(
			this.renderer,
			rightWidth,
			articleListHeight,
		);

		// Bottom-right: Article view
		const articleViewHeight =
			terminalHeight - layout.statusBarHeight - articleListHeight;
		this.articleView = new ArticleView(
			this.renderer,
			rightWidth,
			articleViewHeight,
		);

		// Status bar
		this.statusBar = new StatusBar(this.renderer, terminalWidth);

		// Command palette
		this.commandPalette = new CommandPalette(
			this.renderer,
			terminalWidth,
			terminalHeight,
		);

		// Initialize searcher
		this.searcher = new Searcher(getCommands(this), this.config.feeds, () =>
			getAllArticles(),
		);

		// Build layout
		rightBox.add(this.articleList);
		rightBox.add(this.articleView);
		this.mainBox.add(this.feedList);
		this.mainBox.add(rightBox);
		this.rootBox.add(this.mainBox);
		this.rootBox.add(this.statusBar);

		this.renderer.root.add(this.rootBox);
		this.renderer.root.add(this.commandPalette);

		// Handle keyboard input
		this.renderer.keyInput.on("keypress", this.handleKeyDown.bind(this));

		// Handle resize
		this.renderer.on("resize", () => {
			this.handleResize();
		});

		// Initial state
		this.focusPane("feeds");
	}

	async start(): Promise<void> {
		await this.init();

		// Load initial feed list
		this.updateFeedList();

		// Refresh all feeds on startup
		this.statusBar.showLoading();
		try {
			const results = await fetchAllFeeds(this.config.feeds.map((f) => f.url));
			const errors = results.filter((r) => !r.success);
			if (errors.length > 0) {
				this.statusBar.showError(`Failed to load ${errors.length} feed(s)`);
			} else {
				this.statusBar.clearMessage();
			}
		} catch (_error) {
			this.statusBar.showError("Failed to refresh feeds");
		}

		// Update feed list with unread counts
		this.updateFeedList();

		// Select first feed if available
		if (this.config.feeds.length > 0) {
			this.selectFeed(this.config.feeds[0]!);
		}
	}

	private handleKeyDown(key: KeyEvent): void {
		let action: Action | null = null;

		try {
			action = this.keybindingHandler.handleKey(key);
		} catch (error) {
			// Ignore errors from malformed key events (e.g., paste with ANSI codes)
			// This is a workaround for OpenTUI's Bun.stripANSI issue
			console.error("Key handling error:", error);
			return;
		}

		if (!action) return;

		switch (action.type) {
			case "quit":
				this.quit();
				break;

			case "navigate":
				this.navigate(action.direction);
				break;

			case "jump":
				this.jump(action.target);
				break;

			case "select":
				this.selectCurrent();
				break;

			case "back":
				this.goBack();
				break;

			case "refresh":
				this.refreshCurrentFeed();
				break;

			case "refreshAll":
				this.refreshAllFeeds();
				break;

			case "openInBrowser":
				this.openInBrowser();
				break;

			case "focusPane":
				this.focusPane(action.pane);
				break;

			case "scroll":
				if (action.direction === "up") {
					this.articleView.scrollUp(action.amount);
				} else {
					this.articleView.scrollDown(action.amount);
				}
				break;

			case "pageScroll":
				if (action.direction === "up") {
					this.articleView.pageUp();
				} else {
					this.articleView.pageDown();
				}
				break;

			case "openCommandPalette":
				this.openCommandPalette();
				break;

			case "closeCommandPalette":
				this.closeCommandPalette();
				break;

			case "commandPaletteInput":
				this.handleCommandPaletteInput(action.char);
				break;

			case "commandPaletteBackspace":
				this.handleCommandPaletteBackspace();
				break;

			case "commandPaletteNavigate":
				this.handleCommandPaletteNavigation(action.direction);
				break;

			case "commandPaletteSelect":
				this.handleCommandPaletteSelect();
				break;

			case "commandPalettePaste":
				this.handleCommandPalettePaste();
				break;
		}
	}

	private handleResize(): void {
		const { terminalWidth, terminalHeight } = this.renderer;

		this.rootBox.width = terminalWidth;
		this.rootBox.height = terminalHeight;

		this.mainBox.width = terminalWidth;
		this.mainBox.height = terminalHeight - layout.statusBarHeight;

		const rightWidth = terminalWidth - layout.feedListWidth;
		const articleListHeight = Math.floor(
			(terminalHeight - layout.statusBarHeight) * 0.4,
		);
		const articleViewHeight =
			terminalHeight - layout.statusBarHeight - articleListHeight;

		this.articleList.updateDimensions(rightWidth, articleListHeight);
		this.articleView.updateDimensions(rightWidth, articleViewHeight);
		this.statusBar.updateDimensions(terminalWidth);
		this.commandPalette.updateDimensions(terminalWidth, terminalHeight);

		this.renderer.root.requestRender();
	}

	private focusPane(pane: Pane): void {
		this.currentPane = pane;
		this.keybindingHandler.setPane(pane);
		this.statusBar.setPane(pane);

		this.feedList.setFocused(pane === "feeds");
		this.articleList.setFocused(pane === "articles");
		this.articleView.setFocused(pane === "article");
	}

	private navigate(direction: "up" | "down"): void {
		switch (this.currentPane) {
			case "feeds":
				if (direction === "up") {
					this.feedList.moveUp();
				} else {
					this.feedList.moveDown();
				}
				break;

			case "articles": {
				if (direction === "up") {
					this.articleList.moveUp();
				} else {
					this.articleList.moveDown();
				}
				// Update preview
				const article = this.articleList.getSelectedArticle();
				if (article) {
					this.articleView.setArticle(article);
				}
				break;
			}
		}
	}

	private jump(target: "top" | "bottom"): void {
		switch (this.currentPane) {
			case "feeds":
				if (target === "top") {
					this.feedList.moveToTop();
				} else {
					this.feedList.moveToBottom();
				}
				break;

			case "articles": {
				if (target === "top") {
					this.articleList.moveToTop();
				} else {
					this.articleList.moveToBottom();
				}
				const article = this.articleList.getSelectedArticle();
				if (article) {
					this.articleView.setArticle(article);
				}
				break;
			}

			case "article":
				if (target === "top") {
					this.articleView.scrollToTop();
				} else {
					this.articleView.scrollToBottom();
				}
				break;
		}
	}

	private selectCurrent(): void {
		switch (this.currentPane) {
			case "feeds": {
				const feed = this.feedList.getSelectedFeed();
				if (feed) {
					this.selectFeed(feed);
					this.focusPane("articles");
				}
				break;
			}

			case "articles": {
				const article = this.articleList.getSelectedArticle();
				if (article) {
					this.selectArticle(article);
					this.focusPane("article");
				}
				break;
			}
		}
	}

	private goBack(): void {
		switch (this.currentPane) {
			case "article":
				this.focusPane("articles");
				break;
			case "articles":
				this.focusPane("feeds");
				break;
		}
	}

	private selectFeed(feed: FeedConfig): void {
		this.selectedFeed = feed;
		const articles = getArticlesByFeed(feed.url);
		this.articleList.setArticles(articles);

		// Show first article in preview
		if (articles.length > 0) {
			this.articleView.setArticle(articles[0]!);
		} else {
			this.articleView.setArticle(null);
		}
	}

	private selectArticle(article: Article): void {
		this.selectedArticle = article;
		this.articleView.setArticle(article);

		// Mark as read
		if (!article.readAt) {
			markAsRead(article.id);
			// Update the article list to reflect read state
			if (this.selectedFeed) {
				const articles = getArticlesByFeed(this.selectedFeed.url);
				this.articleList.setArticles(articles);
			}
			// Update feed list unread counts
			this.updateFeedList();
		}
	}

	private updateFeedList(): void {
		const items: FeedListItem[] = this.config.feeds.map((feed) => ({
			feed,
			unreadCount: getUnreadCount(feed.url),
		}));
		this.feedList.setItems(items);
	}

	private async refreshCurrentFeed(): Promise<void> {
		const feed =
			this.currentPane === "feeds"
				? this.feedList.getSelectedFeed()
				: this.selectedFeed;

		if (!feed) return;

		this.statusBar.showLoading(feed.name);
		try {
			await fetchAndStoreFeed(feed.url);
			this.updateFeedList();

			// Refresh article list if this feed is selected
			if (this.selectedFeed?.url === feed.url) {
				const articles = getArticlesByFeed(feed.url);
				this.articleList.setArticles(articles);
			}

			this.statusBar.showSuccess(`Refreshed ${feed.name}`);
			setTimeout(() => this.statusBar.clearMessage(), 2000);
		} catch (_error) {
			this.statusBar.showError(`Failed to refresh ${feed.name}`);
		}
	}

	async refreshAllFeeds(): Promise<void> {
		this.statusBar.showLoading();
		try {
			const results = await fetchAllFeeds(this.config.feeds.map((f) => f.url));
			this.updateFeedList();

			// Refresh article list if a feed is selected
			if (this.selectedFeed) {
				const articles = getArticlesByFeed(this.selectedFeed.url);
				this.articleList.setArticles(articles);
			}

			const errors = results.filter((r) => !r.success);
			if (errors.length > 0) {
				this.statusBar.showError(`Failed to refresh ${errors.length} feed(s)`);
			} else {
				this.statusBar.showSuccess("All feeds refreshed");
				setTimeout(() => this.statusBar.clearMessage(), 2000);
			}
		} catch (_error) {
			this.statusBar.showError("Failed to refresh feeds");
		}
	}

	private openInBrowser(): void {
		const article = this.selectedArticle;
		if (!article?.link) {
			this.statusBar.showError("No link available");
			return;
		}

		const cmd =
			platform() === "darwin"
				? `open "${article.link}"`
				: platform() === "win32"
					? `start "${article.link}"`
					: `xdg-open "${article.link}"`;

		exec(cmd, (error) => {
			if (error) {
				this.statusBar.showError("Failed to open browser");
			}
		});
	}

	private openCommandPalette(): void {
		this.commandPaletteQuery = "";
		this.keybindingHandler.setCommandPaletteMode(true);
		this.commandPalette.open();
		this.performSearch("");
	}

	private closeCommandPalette(): void {
		const mode = this.commandPalette.getMode();

		// If in form mode, go back to search
		if (mode === "form") {
			this.commandPalette.backToSearch();
			this.performSearch(this.commandPaletteQuery);
			return;
		}

		// Otherwise close completely
		this.keybindingHandler.setCommandPaletteMode(false);
		this.commandPalette.close();
		this.commandPaletteQuery = "";
	}

	closeCommandPaletteFromCommand(): void {
		// Always close completely (used by commands)
		this.keybindingHandler.setCommandPaletteMode(false);
		this.commandPalette.close();
		this.commandPaletteQuery = "";
	}

	private handleCommandPaletteInput(char: string): void {
		const mode = this.commandPalette.getMode();
		logger.debug("handleCommandPaletteInput", {
			mode,
			char,
			charLength: char.length,
		});

		if (mode === "form") {
			logger.debug("Passing to form input", { char });
			this.commandPalette.handleFormInput(char);
		} else {
			this.commandPaletteQuery += char;
			logger.debug("Updated search query", { query: this.commandPaletteQuery });
			this.commandPalette.setQuery(this.commandPaletteQuery);
			this.performSearch(this.commandPaletteQuery);
		}
	}

	private handleCommandPaletteBackspace(): void {
		const mode = this.commandPalette.getMode();

		if (mode === "form") {
			this.commandPalette.handleFormBackspace();
		} else {
			if (this.commandPaletteQuery.length > 0) {
				this.commandPaletteQuery = this.commandPaletteQuery.slice(0, -1);
				this.commandPalette.setQuery(this.commandPaletteQuery);
				this.performSearch(this.commandPaletteQuery);
			}
		}
	}

	private async handleCommandPalettePaste(): Promise<void> {
		logger.debug("handleCommandPalettePaste called");

		try {
			// Read from clipboard using platform-specific command
			const proc = Bun.spawn(
				platform() === "darwin"
					? ["pbpaste"]
					: ["xclip", "-selection", "clipboard", "-o"],
				{
					stdout: "pipe",
					stderr: "pipe",
				},
			);

			const text = await new Response(proc.stdout).text();
			const trimmed = text.trim();

			logger.debug("Clipboard text retrieved", {
				length: trimmed.length,
				text: trimmed,
			});

			if (trimmed) {
				this.handleCommandPaletteInput(trimmed);
			}
		} catch (error) {
			logger.error("Failed to read from clipboard", error);
		}
	}

	private handleCommandPaletteNavigation(direction: "up" | "down"): void {
		const mode = this.commandPalette.getMode();

		if (mode === "form") {
			this.commandPalette.handleFormNavigation(direction);
		} else {
			this.commandPalette.moveSelection(direction);
		}
	}

	private handleCommandPaletteSelect(): void {
		const mode = this.commandPalette.getMode();

		if (mode === "form") {
			this.commandPalette.handleFormSubmit();
		} else {
			this.selectCommandPaletteResult();
		}
	}

	private performSearch(query: string): void {
		const results = this.searcher.search(query);
		this.commandPalette.setResults(results);
	}

	private selectCommandPaletteResult(): void {
		const result = this.commandPalette.getSelectedResult();
		if (!result) return;

		switch (result.type) {
			case "command": {
				const command = result.data as Command;
				// Execute command first - it may want to keep palette open (e.g., for forms)
				command.execute();
				break;
			}

			case "feed": {
				this.closeCommandPalette();
				const feed = result.data as FeedConfig;
				this.navigateToFeed(feed);
				break;
			}

			case "article": {
				this.closeCommandPalette();
				const article = result.data as Article;
				this.navigateToArticle(article);
				break;
			}
		}
	}

	private navigateToFeed(feed: FeedConfig): void {
		const index = this.config.feeds.findIndex((f) => f.url === feed.url);
		if (index >= 0) {
			this.feedList.selectByIndex(index);
			this.selectFeed(feed);
			this.focusPane("feeds");
		}
	}

	private navigateToArticle(article: Article): void {
		// Find parent feed
		const feed = this.config.feeds.find((f) => f.url === article.feedUrl);
		if (!feed) return;

		// Navigate to feed first
		const feedIndex = this.config.feeds.findIndex((f) => f.url === feed.url);
		if (feedIndex >= 0) {
			this.feedList.selectByIndex(feedIndex);
			this.selectFeed(feed);
		}

		// Select article in list
		const articles = getArticlesByFeed(feed.url);
		const articleIndex = articles.findIndex((a) => a.id === article.id);
		if (articleIndex >= 0) {
			this.articleList.selectByIndex(articleIndex);
			this.selectArticle(article);
			this.focusPane("article");
		}
	}

	openAddFeedForm(): void {
		this.commandPalette.openForm(
			"Add Feed",
			[
				{ label: "Name", placeholder: "My Feed" },
				{ label: "URL", placeholder: "https://example.com/feed.xml" },
			],
			(values) => {
				const name = values.Name || "";
				const url = values.URL || "";
				this.addFeed(name, url);
			},
		);
	}

	private addFeed(name: string, url: string): void {
		// Validate inputs
		if (!name.trim() || !url.trim()) {
			this.statusBar.showError("Name and URL are required");
			this.closeCommandPalette();
			return;
		}

		// Check if URL is valid
		try {
			new URL(url);
		} catch {
			this.statusBar.showError("Invalid URL");
			this.closeCommandPalette();
			return;
		}

		// Check if feed already exists
		if (this.config.feeds.some((f) => f.url === url)) {
			this.statusBar.showError("Feed already exists");
			this.closeCommandPalette();
			return;
		}

		// Add to config
		this.config.feeds.push({ name: name.trim(), url: url.trim() });

		// Close palette and show success
		this.closeCommandPalette();
		this.statusBar.showSuccess(`Added feed: ${name}`);
		setTimeout(() => this.statusBar.clearMessage(), 2000);

		// Update feed list
		this.updateFeedList();

		// Fetch the new feed
		this.statusBar.showLoading(name);
		fetchAndStoreFeed(url)
			.then(() => {
				this.updateFeedList();
				this.statusBar.showSuccess(`Fetched ${name}`);
				setTimeout(() => this.statusBar.clearMessage(), 2000);
			})
			.catch(() => {
				this.statusBar.showError(`Failed to fetch ${name}`);
			});
	}

	quit(): void {
		this.renderer.destroy();
		process.exit(0);
	}
}
