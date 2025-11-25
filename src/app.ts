import {
  BoxRenderable,
  createCliRenderer,
  type CliRenderer,
  type KeyEvent,
} from "@opentui/core";
import { exec } from "node:child_process";
import { platform } from "node:os";

import type { Config, FeedConfig } from "./config/types.js";
import { getArticlesByFeed, getUnreadCount, markAsRead } from "./db/articles.js";
import { fetchAndStoreFeed, fetchAllFeeds } from "./feed/fetcher.js";
import { FeedList, type FeedListItem } from "./ui/FeedList.js";
import { ArticleList } from "./ui/ArticleList.js";
import { ArticleView } from "./ui/ArticleView.js";
import { StatusBar, type Pane } from "./ui/StatusBar.js";
import { KeybindingHandler } from "./keybindings/handler.js";
import { colors, layout } from "./ui/theme.js";
import type { Article } from "./db/types.js";

export class App {
  private renderer!: CliRenderer;
  private config: Config;
  private rootBox!: BoxRenderable;
  private mainBox!: BoxRenderable;
  private feedList!: FeedList;
  private articleList!: ArticleList;
  private articleView!: ArticleView;
  private statusBar!: StatusBar;
  private keybindingHandler: KeybindingHandler;

  private currentPane: Pane = "feeds";
  private selectedFeed: FeedConfig | null = null;
  private selectedArticle: Article | null = null;

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
      terminalHeight - layout.statusBarHeight
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
    const articleListHeight = Math.floor((terminalHeight - layout.statusBarHeight) * 0.4);
    this.articleList = new ArticleList(this.renderer, rightWidth, articleListHeight);

    // Bottom-right: Article view
    const articleViewHeight = terminalHeight - layout.statusBarHeight - articleListHeight;
    this.articleView = new ArticleView(this.renderer, rightWidth, articleViewHeight);

    // Status bar
    this.statusBar = new StatusBar(this.renderer, terminalWidth);

    // Build layout
    rightBox.add(this.articleList);
    rightBox.add(this.articleView);
    this.mainBox.add(this.feedList);
    this.mainBox.add(rightBox);
    this.rootBox.add(this.mainBox);
    this.rootBox.add(this.statusBar);

    this.renderer.root.add(this.rootBox);

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
    } catch (error) {
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
    const action = this.keybindingHandler.handleKey(key);
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
    }
  }

  private handleResize(): void {
    const { terminalWidth, terminalHeight } = this.renderer;

    this.rootBox.width = terminalWidth;
    this.rootBox.height = terminalHeight;

    this.mainBox.width = terminalWidth;
    this.mainBox.height = terminalHeight - layout.statusBarHeight;

    const rightWidth = terminalWidth - layout.feedListWidth;
    const articleListHeight = Math.floor((terminalHeight - layout.statusBarHeight) * 0.4);
    const articleViewHeight = terminalHeight - layout.statusBarHeight - articleListHeight;

    this.articleList.updateDimensions(rightWidth, articleListHeight);
    this.articleView.updateDimensions(rightWidth, articleViewHeight);
    this.statusBar.updateDimensions(terminalWidth);

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

      case "articles":
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

  private jump(target: "top" | "bottom"): void {
    switch (this.currentPane) {
      case "feeds":
        if (target === "top") {
          this.feedList.moveToTop();
        } else {
          this.feedList.moveToBottom();
        }
        break;

      case "articles":
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
      case "feeds":
        const feed = this.feedList.getSelectedFeed();
        if (feed) {
          this.selectFeed(feed);
          this.focusPane("articles");
        }
        break;

      case "articles":
        const article = this.articleList.getSelectedArticle();
        if (article) {
          this.selectArticle(article);
          this.focusPane("article");
        }
        break;
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
    const feed = this.currentPane === "feeds"
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
    } catch (error) {
      this.statusBar.showError(`Failed to refresh ${feed.name}`);
    }
  }

  private async refreshAllFeeds(): Promise<void> {
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
    } catch (error) {
      this.statusBar.showError("Failed to refresh feeds");
    }
  }

  private openInBrowser(): void {
    const article = this.selectedArticle;
    if (!article?.link) {
      this.statusBar.showError("No link available");
      return;
    }

    const cmd = platform() === "darwin"
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

  private quit(): void {
    this.renderer.destroy();
    process.exit(0);
  }
}
