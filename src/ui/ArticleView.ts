import {
  BoxRenderable,
  TextRenderable,
  ScrollBoxRenderable,
  type RenderContext,
} from "@opentui/core";
import { colors } from "./theme.js";
import type { Article } from "../db/types.js";
import { htmlToText, wrapText } from "../utils/html.js";

export class ArticleView extends BoxRenderable {
  private article: Article | null = null;
  private scrollBox: ScrollBoxRenderable;
  private contentBox: BoxRenderable;
  private _isFocused = false;

  constructor(ctx: RenderContext, width: number, height: number) {
    super(ctx, {
      width,
      height,
      flexDirection: "column",
      border: true,
      borderColor: colors.border,
      focusedBorderColor: colors.borderFocused,
      title: " Article ",
      backgroundColor: colors.bg,
    });

    this.scrollBox = new ScrollBoxRenderable(ctx, {
      width: width - 2,
      height: height - 2,
      scrollY: true,
      scrollX: false,
      backgroundColor: colors.bg,
      scrollbarOptions: {
        visible: false,
      },
    });

    this.contentBox = new BoxRenderable(ctx, {
      flexDirection: "column",
      width: width - 2,
      backgroundColor: colors.bg,
    });

    this.scrollBox.add(this.contentBox);
    this.add(this.scrollBox);
  }

  setArticle(article: Article | null): void {
    this.article = article;
    this.renderContent();
  }

  setFocused(focused: boolean): void {
    this._isFocused = focused;
    this.borderColor = focused ? colors.borderFocused : colors.border;
    this.requestRender();
  }

  scrollUp(lines: number = 1): void {
    this.scrollBox.scrollBy(-lines);
  }

  scrollDown(lines: number = 1): void {
    this.scrollBox.scrollBy(lines);
  }

  scrollToTop(): void {
    this.scrollBox.scrollTo(0);
  }

  scrollToBottom(): void {
    this.scrollBox.scrollTo(this.scrollBox.scrollHeight);
  }

  pageUp(): void {
    this.scrollUp(this.height - 4);
  }

  pageDown(): void {
    this.scrollDown(this.height - 4);
  }

  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scrollBox.width = width - 2;
    this.scrollBox.height = height - 2;
    this.contentBox.width = width - 2;
    this.renderContent();
  }

  private renderContent(): void {
    // Clear existing content
    for (const child of this.contentBox.getChildren()) {
      child.destroy();
    }

    if (!this.article) {
      const placeholder = new TextRenderable(this._ctx, {
        content: "Select an article to read",
        fg: colors.fgDim,
        width: this.width - 4,
        height: 1,
      });
      this.contentBox.add(placeholder);
      this.title = " Article ";
      this.requestRender();
      return;
    }

    const contentWidth = this.width - 4;

    // Title
    const titleLines = wrapText(this.article.title, contentWidth);
    for (const line of titleLines) {
      const titleText = new TextRenderable(this._ctx, {
        content: line,
        fg: colors.primary,
        width: contentWidth,
        height: 1,
      });
      this.contentBox.add(titleText);
    }

    // Metadata line
    const dateStr = this.article.publishedAt
      ? this.article.publishedAt.toLocaleDateString([], {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Unknown date";

    const metaText = new TextRenderable(this._ctx, {
      content: dateStr,
      fg: colors.fgMuted,
      width: contentWidth,
      height: 1,
    });
    this.contentBox.add(metaText);

    // Separator
    const separator = new TextRenderable(this._ctx, {
      content: "\u2500".repeat(Math.min(contentWidth, 40)),
      fg: colors.border,
      width: contentWidth,
      height: 1,
    });
    this.contentBox.add(separator);

    // Empty line
    const spacer = new TextRenderable(this._ctx, {
      content: "",
      width: contentWidth,
      height: 1,
    });
    this.contentBox.add(spacer);

    // Content
    const plainText = htmlToText(this.article.content);
    const contentLines = wrapText(plainText || "No content available.", contentWidth);

    for (const line of contentLines) {
      const lineText = new TextRenderable(this._ctx, {
        content: line,
        fg: colors.fg,
        width: contentWidth,
        height: 1,
      });
      this.contentBox.add(lineText);
    }

    // Update title with truncated article title
    const maxTitleWidth = this.width - 4;
    const displayTitle = this.article.title.length > maxTitleWidth
      ? this.article.title.slice(0, maxTitleWidth - 1) + "\u2026"
      : this.article.title;
    this.title = ` ${displayTitle} `;

    this.scrollBox.scrollTo(0);
    this.requestRender();
  }
}
