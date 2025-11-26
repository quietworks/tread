import type { FeedConfig } from "../config/types.js";
import type { Article } from "../db/types.js";
import type { Pane } from "../keybindings/handler.js";

export type SearchResultType = "command" | "feed" | "article";

export interface Command {
	id: string;
	name: string;
	description: string;
	/** References config key in keybindings.commands */
	keybind?: string;
	/** Optional pane restriction (default: all panes) */
	panes?: Pane[];
	/** Whether command is disabled */
	disabled?: boolean | (() => boolean);
	execute: () => void | Promise<void>;
}

export interface SearchResult {
	type: SearchResultType;
	label: string;
	description?: string;
	weight: number;
	score: number;
	matchedIn?: "title" | "content";
	data: Command | FeedConfig | Article;
	/** Formatted keybind hint for display (e.g., "ctrl+a") */
	keybindHint?: string;
}

export interface SearchWeights {
	commands: number;
	feeds: number;
	articleTitles: number;
	articleContent: number;
}

export const DEFAULT_WEIGHTS: SearchWeights = {
	commands: 10.0,
	feeds: 5.0,
	articleTitles: 2.0,
	articleContent: 1.0,
};
