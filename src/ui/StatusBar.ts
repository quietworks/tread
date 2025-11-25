import {
	BoxRenderable,
	TextRenderable,
	type RenderContext,
} from "@opentui/core";
import { colors } from "./theme.js";

export type Pane = "feeds" | "articles" | "article";

const KEYBINDS: Record<Pane, string> = {
	feeds: "j/k:navigate  l/Enter:select  r:refresh  R:refresh all  q:quit",
	articles: "j/k:navigate  h:feeds  l/Enter:read  r:refresh  q:quit",
	article: "j/k:scroll  h:back  gg/G:top/bottom  o:open in browser  q:quit",
};

export class StatusBar extends BoxRenderable {
	private statusText: TextRenderable;
	private keybindsText: TextRenderable;
	private currentPane: Pane = "feeds";
	private message: string = "";

	constructor(ctx: RenderContext, width: number) {
		super(ctx, {
			width,
			height: 1,
			flexDirection: "row",
			backgroundColor: colors.bgLight,
		});

		this.statusText = new TextRenderable(ctx, {
			content: "",
			fg: colors.fg,
			width: Math.floor(width * 0.3),
			height: 1,
		});

		this.keybindsText = new TextRenderable(ctx, {
			content: KEYBINDS.feeds,
			fg: colors.fgMuted,
			width: Math.floor(width * 0.7),
			height: 1,
		});

		this.add(this.statusText);
		this.add(this.keybindsText);
	}

	setPane(pane: Pane): void {
		this.currentPane = pane;
		this.updateKeybinds();
	}

	setMessage(message: string): void {
		this.message = message;
		this.statusText.content = message;
		this.requestRender();
	}

	clearMessage(): void {
		this.message = "";
		this.statusText.content = "";
		this.requestRender();
	}

	showLoading(feedName?: string): void {
		const msg = feedName ? `Loading ${feedName}...` : "Loading...";
		this.setMessage(msg);
	}

	showError(error: string): void {
		this.setMessage(`Error: ${error}`);
	}

	showSuccess(message: string): void {
		this.setMessage(message);
	}

	private updateKeybinds(): void {
		this.keybindsText.content = KEYBINDS[this.currentPane];
		this.requestRender();
	}

	updateDimensions(width: number): void {
		this.width = width;
		this.statusText.width = Math.floor(width * 0.3);
		this.keybindsText.width = Math.floor(width * 0.7);
		this.requestRender();
	}
}
