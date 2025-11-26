/**
 * Keybinding configuration types
 * Supports simple keys, key combinations, and sequences
 */

export type KeyBinding = string;

export interface GlobalKeybindings {
	quit: KeyBinding[];
	force_quit: KeyBinding[];
	command_palette: KeyBinding[];
	navigate_down: KeyBinding[];
	navigate_up: KeyBinding[];
	jump_top: KeyBinding[];
	jump_bottom: KeyBinding[];
	/** Leader key for command sequences (default: space) */
	leader?: KeyBinding[];
}

export interface FeedsPaneKeybindings {
	select: KeyBinding[];
	refresh: KeyBinding[];
	refresh_all: KeyBinding[];
	next_pane: KeyBinding[];
}

export interface ArticlesPaneKeybindings {
	prev_pane: KeyBinding[];
	select: KeyBinding[];
	refresh: KeyBinding[];
	next_pane: KeyBinding[];
}

export interface ArticlePaneKeybindings {
	back: KeyBinding[];
	open_browser: KeyBinding[];
	scroll_up: KeyBinding[];
	scroll_down: KeyBinding[];
	page_up: KeyBinding[];
	page_down: KeyBinding[];
	jump_top: KeyBinding[];
	jump_bottom: KeyBinding[];
	next_pane: KeyBinding[];
}

/**
 * Command-specific keybindings
 * Commands reference these keys by name (e.g., keybind: "add_feed")
 */
export interface CommandKeybindings {
	[commandKey: string]: KeyBinding[];
}

export interface KeybindingsConfig {
	global: GlobalKeybindings;
	feeds: FeedsPaneKeybindings;
	articles: ArticlesPaneKeybindings;
	article: ArticlePaneKeybindings;
	commands: CommandKeybindings;
}

/**
 * Default keybindings matching the original hardcoded behavior
 */
export const DEFAULT_KEYBINDINGS: KeybindingsConfig = {
	global: {
		quit: ["q"],
		force_quit: ["C-c"],
		command_palette: [":"],
		navigate_down: ["j", "down"],
		navigate_up: ["k", "up"],
		jump_top: ["gg"],
		jump_bottom: ["G"],
	},
	feeds: {
		select: ["l", "right", "enter"],
		refresh: ["r"],
		refresh_all: ["R"],
		next_pane: ["tab"],
	},
	articles: {
		prev_pane: ["h", "left"],
		select: ["l", "right", "enter"],
		refresh: ["r"],
		next_pane: ["tab"],
	},
	article: {
		back: ["h", "left"],
		open_browser: ["o"],
		scroll_up: ["k", "up"],
		scroll_down: ["j", "down"],
		page_up: ["C-u"],
		page_down: ["C-d", "space"],
		jump_top: ["gg"],
		jump_bottom: ["G"],
		next_pane: ["tab"],
	},
	commands: {},
};

/**
 * Parsed keybinding representation
 */
export interface ParsedKeybinding {
	/** Original keybinding string from config */
	original: string;
	/** Key name (e.g., "j", "c", "down") */
	key: string;
	/** Whether ctrl is pressed */
	ctrl: boolean;
	/** Whether meta/command is pressed */
	meta: boolean;
	/** Whether shift is pressed */
	shift: boolean;
	/** Whether this is a multi-key sequence (e.g., "gg") */
	isSequence: boolean;
	/** For sequences, the keys in order */
	sequence?: string[];
	/** Whether this keybind requires leader mode */
	leader: boolean;
}

/**
 * Parse a keybinding string into a structured format
 *
 * Formats supported:
 * - Simple keys: "j", "k", "h", "l"
 * - Special keys: "enter", "tab", "escape", "space", "up", "down", "left", "right"
 * - Ctrl: "C-x" or "c-x"
 * - Meta: "M-x" or "m-x"
 * - Shift: "S-x" or "s-x" or just "X" (capital letter)
 * - Sequences: "gg" (multiple keys pressed in order)
 * - Leader: "<leader>x" (requires leader mode to be active)
 */
export function parseKeybinding(binding: string): ParsedKeybinding {
	const original = binding;
	let ctrl = false;
	let meta = false;
	let shift = false;
	let leader = false;
	let key = binding;

	// Check for leader prefix (e.g., "<leader>r")
	const leaderRegex = /^<leader>(.+)$/i;
	const leaderMatch = binding.match(leaderRegex);

	if (leaderMatch) {
		leader = true;
		key = leaderMatch[1]!;
		// Continue parsing the rest of the keybind
		binding = key;
	}

	// Check for modifier prefixes (e.g., "C-c", "M-x")
	const modifierRegex = /^([CMS])-(.+)$/i;
	const match = binding.match(modifierRegex);

	if (match) {
		const modifier = match[1]!.toUpperCase();
		key = match[2]!;

		switch (modifier) {
			case "C":
				ctrl = true;
				break;
			case "M":
				meta = true;
				break;
			case "S":
				shift = true;
				break;
		}

		return {
			original,
			key,
			ctrl,
			meta,
			shift,
			isSequence: false,
			leader,
		};
	}

	// Check if it's a sequence (multiple non-modifier keys)
	// For now, we only support "gg" as a special case
	if (binding === "gg") {
		return {
			original,
			key: "g",
			ctrl: false,
			meta: false,
			shift: false,
			isSequence: true,
			sequence: ["g", "g"],
			leader,
		};
	}

	// Check for shift via capital letter (e.g., "G" means shift+g)
	if (binding.length === 1 && binding >= "A" && binding <= "Z") {
		return {
			original,
			key: binding.toLowerCase(),
			ctrl: false,
			meta: false,
			shift: true,
			isSequence: false,
			leader,
		};
	}

	// Simple key
	return {
		original,
		key,
		ctrl: false,
		meta: false,
		shift: false,
		isSequence: false,
		leader,
	};
}
