import { exec } from "node:child_process";
import { platform } from "node:os";
import { createSignal, createMemo, batch, onMount } from "solid-js";
import {
	render,
	useKeyboard,
	usePaste,
	useTerminalDimensions,
} from "@opentui/solid";
import type { JSX } from "@opentui/solid";
import type { KeyEvent, PasteEvent } from "@opentui/core";
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
import type { Command, SearchResult } from "./search/types.js";
import {
	FeedList,
	ArticleList,
	ArticleView,
	StatusBar,
	CommandPalette,
	type FeedListItem,
	type Pane,
	type ScrollBoxRenderable,
} from "./ui/components/index.js";
import { ThemeProvider } from "./ui/theme/index.js";

interface AppProps {
	config: Config;
	onQuit: () => void;
}

function AppContent(props: AppProps): JSX.Element {
	const term = useTerminalDimensions();

	// State
	const [currentPane, setCurrentPane] = createSignal<Pane>("feeds");
	const [feedItems, setFeedItems] = createSignal<FeedListItem[]>([]);
	const [selectedFeedIndex, setSelectedFeedIndex] = createSignal(0);
	const [articles, setArticles] = createSignal<Article[]>([]);
	const [selectedArticleIndex, setSelectedArticleIndex] = createSignal(0);
	const [selectedArticle, setSelectedArticle] = createSignal<Article | null>(
		null,
	);
	const [statusMessage, setStatusMessage] = createSignal<string | undefined>(
		undefined,
	);

	// Command palette state
	const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false);
	const [commandPaletteMode, setCommandPaletteMode] = createSignal<
		"search" | "form"
	>("search");
	const [commandPaletteQuery, setCommandPaletteQuery] = createSignal("");
	const [commandPaletteResults, setCommandPaletteResults] = createSignal<
		SearchResult[]
	>([]);
	const [commandPaletteSelectedIndex, setCommandPaletteSelectedIndex] =
		createSignal(0);
	const [formTitle, setFormTitle] = createSignal("");
	const [formFields, setFormFields] = createSignal<
		Array<{ label: string; value: string }>
	>([]);
	const [currentFieldIndex, setCurrentFieldIndex] = createSignal(0);
	const [formCallback, setFormCallback] = createSignal<
		((values: Record<string, string>) => void) | null
	>(null);

	// Keybinding handler
	const keybindingHandler = new KeybindingHandler();

	// Article view scroll ref
	let articleScrollRef: ScrollBoxRenderable | undefined;

	// App commands for Searcher
	const appCommands = {
		quit: props.onQuit,
		refreshAllFeeds: async () => {
			setStatusMessage("Refreshing...");
			try {
				await fetchAllFeeds(props.config.feeds.map((f) => f.url));
				updateFeedList();
				setStatusMessage("All feeds refreshed");
				setTimeout(() => setStatusMessage(undefined), 2000);
			} catch {
				setStatusMessage("Failed to refresh feeds");
			}
		},
		openAddFeedForm,
		closeCommandPaletteFromCommand: () => {
			setCommandPaletteOpen(false);
			setCommandPaletteQuery("");
			setCommandPaletteMode("search");
			keybindingHandler.setFormMode(false);
			keybindingHandler.setCommandPaletteMode(false);
		},
	};

	// Searcher
	const searcher = new Searcher(
		getCommands(appCommands),
		props.config.feeds,
		() => getAllArticles(),
	);

	// Helper functions
	function updateFeedList(): void {
		const items: FeedListItem[] = props.config.feeds.map((feed) => ({
			feed,
			unreadCount: getUnreadCount(feed.url),
		}));
		setFeedItems(items);
	}

	function selectFeed(feed: FeedConfig): void {
		const feedArticles = getArticlesByFeed(feed.url);
		setArticles(feedArticles);
		setSelectedArticleIndex(0);
		if (feedArticles.length > 0) {
			setSelectedArticle(feedArticles[0]!);
		} else {
			setSelectedArticle(null);
		}
	}

	function selectArticle(article: Article): void {
		setSelectedArticle(article);
		if (!article.readAt) {
			markAsRead(article.id);
			const currentFeed = props.config.feeds[selectedFeedIndex()];
			if (currentFeed) {
				const feedArticles = getArticlesByFeed(currentFeed.url);
				setArticles(feedArticles);
			}
			updateFeedList();
		}
	}

	function openAddFeedForm(): void {
		setCommandPaletteMode("form");
		keybindingHandler.setFormMode(true);
		setFormTitle("Add Feed");
		setFormFields([
			{ label: "Name", value: "" },
			{ label: "URL", value: "" },
		]);
		setCurrentFieldIndex(0);
		setFormCallback(() => (values: Record<string, string>) => {
			const name = values.Name || "";
			const url = values.URL || "";
			addFeed(name, url);
		});
	}

	function addFeed(name: string, url: string): void {
		if (!name.trim() || !url.trim()) {
			setStatusMessage("Name and URL are required");
			closeCommandPalette();
			return;
		}

		try {
			new URL(url);
		} catch {
			setStatusMessage("Invalid URL");
			closeCommandPalette();
			return;
		}

		if (props.config.feeds.some((f) => f.url === url)) {
			setStatusMessage("Feed already exists");
			closeCommandPalette();
			return;
		}

		props.config.feeds.push({ name: name.trim(), url: url.trim() });
		closeCommandPalette();
		setStatusMessage(`Added feed: ${name}`);
		setTimeout(() => setStatusMessage(undefined), 2000);
		updateFeedList();

		setStatusMessage(`Fetching ${name}...`);
		fetchAndStoreFeed(url)
			.then(() => {
				updateFeedList();
				setStatusMessage(`Fetched ${name}`);
				setTimeout(() => setStatusMessage(undefined), 2000);
			})
			.catch(() => {
				setStatusMessage(`Failed to fetch ${name}`);
			});
	}

	function closeCommandPalette(): void {
		if (commandPaletteMode() === "form") {
			setCommandPaletteMode("search");
			keybindingHandler.setFormMode(false);
			performSearch(commandPaletteQuery());
			return;
		}
		setCommandPaletteOpen(false);
		setCommandPaletteQuery("");
		keybindingHandler.setCommandPaletteMode(false);
	}

	function performSearch(query: string): void {
		const results = searcher.search(query);
		setCommandPaletteResults(results);
		setCommandPaletteSelectedIndex(0);
	}

	function handleKeyDown(event: KeyEvent): void {
		let action: Action | null = null;
		try {
			action = keybindingHandler.handleKey(event);
		} catch {
			return;
		}
		if (!action) return;

		switch (action.type) {
			case "quit":
				props.onQuit();
				break;

			case "navigate":
				if (currentPane() === "feeds") {
					const newIndex =
						action.direction === "up"
							? Math.max(0, selectedFeedIndex() - 1)
							: Math.min(feedItems().length - 1, selectedFeedIndex() + 1);
					setSelectedFeedIndex(newIndex);
				} else if (currentPane() === "articles") {
					const newIndex =
						action.direction === "up"
							? Math.max(0, selectedArticleIndex() - 1)
							: Math.min(articles().length - 1, selectedArticleIndex() + 1);
					setSelectedArticleIndex(newIndex);
					const article = articles()[newIndex];
					if (article) {
						setSelectedArticle(article);
					}
				}
				break;

			case "jump":
				if (currentPane() === "feeds") {
					const newIndex = action.target === "top" ? 0 : feedItems().length - 1;
					setSelectedFeedIndex(newIndex);
				} else if (currentPane() === "articles") {
					const newIndex = action.target === "top" ? 0 : articles().length - 1;
					setSelectedArticleIndex(newIndex);
					const article = articles()[newIndex];
					if (article) {
						setSelectedArticle(article);
					}
				} else if (currentPane() === "article" && articleScrollRef) {
					if (action.target === "top") {
						articleScrollRef.scrollTo(0);
					} else {
						articleScrollRef.scrollTo(Number.MAX_SAFE_INTEGER);
					}
				}
				break;

			case "select":
				if (currentPane() === "feeds") {
					const item = feedItems()[selectedFeedIndex()];
					if (item) {
						selectFeed(item.feed);
						setCurrentPane("articles");
						keybindingHandler.setPane("articles");
					}
				} else if (currentPane() === "articles") {
					const article = articles()[selectedArticleIndex()];
					if (article) {
						selectArticle(article);
						setCurrentPane("article");
						keybindingHandler.setPane("article");
					}
				}
				break;

			case "back":
				if (currentPane() === "article") {
					setCurrentPane("articles");
					keybindingHandler.setPane("articles");
				} else if (currentPane() === "articles") {
					setCurrentPane("feeds");
					keybindingHandler.setPane("feeds");
				}
				break;

			case "focusPane":
				setCurrentPane(action.pane);
				keybindingHandler.setPane(action.pane);
				break;

			case "scroll":
				if (articleScrollRef) {
					const amount =
						action.direction === "up" ? -action.amount : action.amount;
					articleScrollRef.scrollBy(amount);
				}
				break;

			case "pageScroll":
				if (articleScrollRef) {
					const pageAmount = articleScrollRef.height - 4;
					const amount = action.direction === "up" ? -pageAmount : pageAmount;
					articleScrollRef.scrollBy(amount);
				}
				break;

			case "refresh": {
				const feed = props.config.feeds[selectedFeedIndex()];
				if (feed) {
					setStatusMessage(`Refreshing ${feed.name}...`);
					fetchAndStoreFeed(feed.url)
						.then(() => {
							updateFeedList();
							if (props.config.feeds[selectedFeedIndex()]?.url === feed.url) {
								const feedArticles = getArticlesByFeed(feed.url);
								setArticles(feedArticles);
							}
							setStatusMessage(`Refreshed ${feed.name}`);
							setTimeout(() => setStatusMessage(undefined), 2000);
						})
						.catch(() => {
							setStatusMessage(`Failed to refresh ${feed.name}`);
						});
				}
				break;
			}

			case "refreshAll":
				setStatusMessage("Refreshing all feeds...");
				fetchAllFeeds(props.config.feeds.map((f) => f.url))
					.then((results) => {
						updateFeedList();
						const currentFeed = props.config.feeds[selectedFeedIndex()];
						if (currentFeed) {
							const feedArticles = getArticlesByFeed(currentFeed.url);
							setArticles(feedArticles);
						}
						const errors = results.filter((r) => !r.success);
						if (errors.length > 0) {
							setStatusMessage(`Failed to refresh ${errors.length} feed(s)`);
						} else {
							setStatusMessage("All feeds refreshed");
							setTimeout(() => setStatusMessage(undefined), 2000);
						}
					})
					.catch(() => {
						setStatusMessage("Failed to refresh feeds");
					});
				break;

			case "openInBrowser": {
				const article = selectedArticle();
				if (article?.link) {
					const cmd =
						platform() === "darwin"
							? `open "${article.link}"`
							: platform() === "win32"
								? `start "${article.link}"`
								: `xdg-open "${article.link}"`;
					exec(cmd);
				}
				break;
			}

			case "openCommandPalette":
				setCommandPaletteOpen(true);
				setCommandPaletteQuery("");
				setCommandPaletteMode("search");
				keybindingHandler.setCommandPaletteMode(true);
				performSearch("");
				break;

			case "closeCommandPalette":
				closeCommandPalette();
				break;

			case "commandPaletteInput":
				if (commandPaletteMode() === "form") {
					const fields = formFields();
					const idx = currentFieldIndex();
					if (fields[idx]) {
						const newValue = fields[idx].value + action.char;
						const newFields = fields.map((f, i) =>
							i === idx ? { ...f, value: newValue } : f,
						);
						setFormFields(newFields);
					}
				} else {
					const newQuery = commandPaletteQuery() + action.char;
					setCommandPaletteQuery(newQuery);
					performSearch(newQuery);
				}
				break;

			case "commandPaletteBackspace":
				if (commandPaletteMode() === "form") {
					const fields = formFields();
					const idx = currentFieldIndex();
					if (fields[idx] && fields[idx].value.length > 0) {
						const newValue = fields[idx].value.slice(0, -1);
						const newFields = fields.map((f, i) =>
							i === idx ? { ...f, value: newValue } : f,
						);
						setFormFields(newFields);
					}
				} else {
					const query = commandPaletteQuery();
					if (query.length > 0) {
						const newQuery = query.slice(0, -1);
						setCommandPaletteQuery(newQuery);
						performSearch(newQuery);
					}
				}
				break;

			case "commandPaletteNavigate":
				if (commandPaletteMode() === "form") {
					const fields = formFields();
					const newIdx =
						action.direction === "up"
							? Math.max(0, currentFieldIndex() - 1)
							: Math.min(fields.length - 1, currentFieldIndex() + 1);
					setCurrentFieldIndex(newIdx);
				} else {
					const results = commandPaletteResults();
					const newIdx =
						action.direction === "up"
							? Math.max(0, commandPaletteSelectedIndex() - 1)
							: Math.min(results.length - 1, commandPaletteSelectedIndex() + 1);
					setCommandPaletteSelectedIndex(newIdx);
				}
				break;

			case "commandPaletteSelect":
				if (commandPaletteMode() === "form") {
					const callback = formCallback();
					if (callback) {
						const values: Record<string, string> = {};
						for (const field of formFields()) {
							values[field.label] = field.value;
						}
						callback(values);
					}
				} else {
					const result = commandPaletteResults()[commandPaletteSelectedIndex()];
					if (result) {
						switch (result.type) {
							case "command": {
								const command = result.data as Command;
								command.execute();
								break;
							}
							case "feed": {
								closeCommandPalette();
								const feed = result.data as FeedConfig;
								const index = props.config.feeds.findIndex(
									(f) => f.url === feed.url,
								);
								if (index >= 0) {
									setSelectedFeedIndex(index);
									selectFeed(feed);
									setCurrentPane("feeds");
									keybindingHandler.setPane("feeds");
								}
								break;
							}
							case "article": {
								closeCommandPalette();
								const article = result.data as Article;
								const feed = props.config.feeds.find(
									(f) => f.url === article.feedUrl,
								);
								if (feed) {
									const feedIndex = props.config.feeds.findIndex(
										(f) => f.url === feed.url,
									);
									if (feedIndex >= 0) {
										setSelectedFeedIndex(feedIndex);
										selectFeed(feed);
									}
									const feedArticles = getArticlesByFeed(feed.url);
									const articleIndex = feedArticles.findIndex(
										(a) => a.id === article.id,
									);
									if (articleIndex >= 0) {
										setSelectedArticleIndex(articleIndex);
										selectArticle(article);
										setCurrentPane("article");
										keybindingHandler.setPane("article");
									}
								}
								break;
							}
						}
					}
				}
				break;
		}
	}

	function handlePaste(event: PasteEvent): void {
		// Normalize line endings for Windows compatibility
		const text = event.text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

		if (commandPaletteMode() === "form") {
			const fields = formFields();
			const idx = currentFieldIndex();
			if (fields[idx]) {
				const newValue = fields[idx].value + text;
				const newFields = fields.map((f, i) =>
					i === idx ? { ...f, value: newValue } : f,
				);
				setFormFields(newFields);
			}
		} else {
			const newQuery = commandPaletteQuery() + text;
			setCommandPaletteQuery(newQuery);
			performSearch(newQuery);
		}
	}

	// Initial load
	onMount(async () => {
		updateFeedList();
		setStatusMessage("Refreshing...");
		try {
			const results = await fetchAllFeeds(props.config.feeds.map((f) => f.url));
			updateFeedList();
			const errors = results.filter((r) => !r.success);
			if (errors.length > 0) {
				setStatusMessage(`Failed to load ${errors.length} feed(s)`);
			} else {
				setStatusMessage(undefined);
			}
		} catch {
			setStatusMessage("Failed to refresh feeds");
		}

		if (props.config.feeds.length > 0) {
			selectFeed(props.config.feeds[0]!);
		}
	});

	// Keyboard handling
	useKeyboard((event: KeyEvent) => {
		handleKeyDown(event);
	});

	// Paste handling (only active when command palette is open)
	usePaste((event: PasteEvent) => {
		if (commandPaletteOpen()) {
			handlePaste(event);
		}
	});

	return (
		<box
			width={term().width}
			height={term().height}
			flexDirection="column"
			backgroundColor="#1a1b26"
		>
			{/* Main content area */}
			<box width={term().width} height={term().height - 1} flexDirection="row">
				{/* Feed list */}
				<FeedList
					items={feedItems()}
					selectedIndex={selectedFeedIndex()}
					isFocused={currentPane() === "feeds"}
				/>

				{/* Right side: Articles + Article View */}
				<box flexDirection="column" flexGrow={1}>
					<ArticleList
						articles={articles()}
						selectedIndex={selectedArticleIndex()}
						isFocused={currentPane() === "articles"}
						height="40%"
					/>
					<ArticleView
						article={selectedArticle()}
						isFocused={currentPane() === "article"}
						height="60%"
						scrollRef={(r) => (articleScrollRef = r)}
					/>
				</box>
			</box>

			{/* Status bar */}
			<StatusBar pane={currentPane()} message={statusMessage()} />

			{/* Command palette overlay */}
			<CommandPalette
				isOpen={commandPaletteOpen()}
				terminalWidth={term().width}
				terminalHeight={term().height}
				mode={commandPaletteMode()}
				query={commandPaletteQuery()}
				results={commandPaletteResults()}
				selectedIndex={commandPaletteSelectedIndex()}
				formTitle={formTitle()}
				formFields={formFields()}
				currentFieldIndex={currentFieldIndex()}
			/>
		</box>
	);
}

export function startApp(config: Config): Promise<void> {
	return new Promise((resolve) => {
		const onQuit = () => {
			resolve();
		};

		render(
			() => (
				<ThemeProvider config={config.theme}>
					<AppContent config={config} onQuit={onQuit} />
				</ThemeProvider>
			),
			{
				targetFps: 60,
				exitOnCtrlC: false,
				useKittyKeyboard: true,
			},
		);
	});
}
