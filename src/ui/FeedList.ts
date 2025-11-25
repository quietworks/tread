import {
	BoxRenderable,
	TextRenderable,
	type RenderContext,
} from "@opentui/core";
import { colors } from "./theme.js";
import type { FeedConfig } from "../config/types.js";

export interface FeedListItem {
	feed: FeedConfig;
	unreadCount: number;
}

export class FeedList extends BoxRenderable {
	private items: FeedListItem[] = [];
	private selectedIndex = 0;
	private itemRenderables: BoxRenderable[] = [];
	private _isFocused = false;

	constructor(ctx: RenderContext, width: number, height: number) {
		super(ctx, {
			width,
			height,
			flexDirection: "column",
			border: true,
			borderColor: colors.border,
			focusedBorderColor: colors.borderFocused,
			title: " Feeds ",
			backgroundColor: colors.bg,
		});
	}

	setItems(items: FeedListItem[]): void {
		this.items = items;
		this.selectedIndex = Math.min(
			this.selectedIndex,
			Math.max(0, items.length - 1),
		);
		this.renderItems();
	}

	getSelectedFeed(): FeedConfig | null {
		return this.items[this.selectedIndex]?.feed ?? null;
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
		if (this.items.length === 0) return;
		this.selectedIndex = Math.max(0, this.selectedIndex - 1);
		this.renderItems();
	}

	moveDown(): void {
		if (this.items.length === 0) return;
		this.selectedIndex = Math.min(
			this.items.length - 1,
			this.selectedIndex + 1,
		);
		this.renderItems();
	}

	moveToTop(): void {
		if (this.items.length === 0) return;
		this.selectedIndex = 0;
		this.renderItems();
	}

	moveToBottom(): void {
		if (this.items.length === 0) return;
		this.selectedIndex = this.items.length - 1;
		this.renderItems();
	}

	private renderItems(): void {
		// Clear existing items
		for (const item of this.itemRenderables) {
			item.destroy();
		}
		this.itemRenderables = [];

		const contentWidth = this.width - 2; // Account for borders

		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i]!;
			const isSelected = i === this.selectedIndex;

			const row = new BoxRenderable(this._ctx, {
				width: contentWidth,
				height: 1,
				flexDirection: "row",
				backgroundColor:
					isSelected && this._isFocused ? colors.bgHighlight : "transparent",
			});

			const indicator = isSelected && this._isFocused ? "> " : "  ";
			const unreadStr = item.unreadCount > 0 ? ` (${item.unreadCount})` : "";
			const maxNameWidth =
				contentWidth - indicator.length - unreadStr.length - 1;
			const name =
				item.feed.name.length > maxNameWidth
					? item.feed.name.slice(0, maxNameWidth - 1) + "\u2026"
					: item.feed.name;

			const text = new TextRenderable(this._ctx, {
				content: `${indicator}${name}${unreadStr}`,
				fg:
					isSelected && this._isFocused
						? colors.fg
						: item.unreadCount > 0
							? colors.fg
							: colors.fgDim,
				width: contentWidth,
				height: 1,
			});

			row.add(text);
			this.add(row);
			this.itemRenderables.push(row);
		}

		this.requestRender();
	}
}
