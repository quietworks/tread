import {
  BoxRenderable,
  TextRenderable,
  type RenderContext,
} from "@opentui/core";
import { colors } from "./theme.js";
import type { Article } from "../db/types.js";
import { truncate } from "../utils/html.js";

export class ArticleList extends BoxRenderable {
  private articles: Article[] = [];
  private selectedIndex = 0;
  private scrollOffset = 0;
  private itemRenderables: BoxRenderable[] = [];
  private _isFocused = false;
  private visibleCount = 0;

  constructor(ctx: RenderContext, width: number, height: number) {
    super(ctx, {
      width,
      height,
      flexDirection: "column",
      border: true,
      borderColor: colors.border,
      focusedBorderColor: colors.borderFocused,
      title: " Articles ",
      backgroundColor: colors.bg,
    });

    this.visibleCount = height - 2; // Account for borders
  }

  setArticles(articles: Article[]): void {
    this.articles = articles;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.renderItems();
  }

  getSelectedArticle(): Article | null {
    return this.articles[this.selectedIndex] ?? null;
  }

  getSelectedIndex(): number {
    return this.selectedIndex;
  }

  setFocused(focused: boolean): void {
    this._isFocused = focused;
    this.borderColor = focused ? colors.borderFocused : colors.border;
    this.renderItems();
  }

  moveUp(): void {
    if (this.articles.length === 0) return;
    this.selectedIndex = Math.max(0, this.selectedIndex - 1);
    this.updateScrollOffset();
    this.renderItems();
  }

  moveDown(): void {
    if (this.articles.length === 0) return;
    this.selectedIndex = Math.min(this.articles.length - 1, this.selectedIndex + 1);
    this.updateScrollOffset();
    this.renderItems();
  }

  moveToTop(): void {
    if (this.articles.length === 0) return;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.renderItems();
  }

  moveToBottom(): void {
    if (this.articles.length === 0) return;
    this.selectedIndex = this.articles.length - 1;
    this.updateScrollOffset();
    this.renderItems();
  }

  private updateScrollOffset(): void {
    // Keep selection visible with some context
    const padding = 2;
    if (this.selectedIndex < this.scrollOffset + padding) {
      this.scrollOffset = Math.max(0, this.selectedIndex - padding);
    } else if (this.selectedIndex >= this.scrollOffset + this.visibleCount - padding) {
      this.scrollOffset = Math.min(
        Math.max(0, this.articles.length - this.visibleCount),
        this.selectedIndex - this.visibleCount + padding + 1
      );
    }
  }

  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.visibleCount = height - 2;
    this.renderItems();
  }

  private formatDate(date: Date | null): string {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  private renderItems(): void {
    // Clear existing items
    for (const item of this.itemRenderables) {
      item.destroy();
    }
    this.itemRenderables = [];

    const contentWidth = this.width - 2; // Account for borders
    const visibleArticles = this.articles.slice(
      this.scrollOffset,
      this.scrollOffset + this.visibleCount
    );

    for (let i = 0; i < visibleArticles.length; i++) {
      const article = visibleArticles[i]!;
      const actualIndex = this.scrollOffset + i;
      const isSelected = actualIndex === this.selectedIndex;
      const isRead = article.readAt !== null;

      const row = new BoxRenderable(this._ctx, {
        width: contentWidth,
        height: 1,
        flexDirection: "row",
        backgroundColor: isSelected && this._isFocused ? colors.bgHighlight : "transparent",
      });

      const readIndicator = isRead ? "  " : "\u2022 ";
      const dateStr = this.formatDate(article.publishedAt);
      const dateWidth = dateStr.length + 1;
      const maxTitleWidth = contentWidth - readIndicator.length - dateWidth - 1;
      const title = truncate(article.title, maxTitleWidth);
      const padding = " ".repeat(Math.max(0, contentWidth - readIndicator.length - title.length - dateWidth));

      const fg = isSelected && this._isFocused
        ? colors.fg
        : isRead
          ? colors.fgDim
          : colors.fg;

      const text = new TextRenderable(this._ctx, {
        content: `${readIndicator}${title}${padding}${dateStr}`,
        fg,
        width: contentWidth,
        height: 1,
      });

      row.add(text);
      this.add(row);
      this.itemRenderables.push(row);
    }

    // Show scroll indicator if needed
    if (this.articles.length > this.visibleCount) {
      const hasMore = this.scrollOffset + this.visibleCount < this.articles.length;
      const hasLess = this.scrollOffset > 0;
      if (hasMore || hasLess) {
        this.title = ` Articles (${this.selectedIndex + 1}/${this.articles.length}) `;
      }
    } else {
      this.title = " Articles ";
    }

    this.requestRender();
  }
}
