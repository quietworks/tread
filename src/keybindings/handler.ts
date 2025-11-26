import type { KeyEvent } from "@opentui/core";
import { commandRegistry } from "../commands/registry.js";
import { logger } from "../logger.js";
import type { Action } from "./actions.js";
import {
	DEFAULT_KEYBINDINGS,
	type KeybindingsConfig,
	parseKeybinding,
} from "./types.js";

export type Pane = "feeds" | "articles" | "article";

/** Default leader key timeout in milliseconds */
const LEADER_TIMEOUT_MS = 2000;

export class KeybindingHandler {
	private currentPane: Pane = "feeds";
	private pendingG = false;
	private gTimeout: ReturnType<typeof setTimeout> | null = null;
	private isCommandPaletteMode = false;
	private isFormMode = false;
	private keybindings: KeybindingsConfig;

	// Leader key state
	private leaderActive = false;
	private leaderTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(keybindings?: KeybindingsConfig) {
		this.keybindings = keybindings || DEFAULT_KEYBINDINGS;
	}

	setKeybindings(keybindings: KeybindingsConfig): void {
		this.keybindings = keybindings;
		this.clearPendingG();
		this.clearLeader();
	}

	setPane(pane: Pane): void {
		this.currentPane = pane;
		this.clearPendingG();
	}

	getCurrentPane(): Pane {
		return this.currentPane;
	}

	setCommandPaletteMode(active: boolean): void {
		this.isCommandPaletteMode = active;
		if (!active) {
			this.isFormMode = false;
		}
		this.clearLeader();
	}

	setFormMode(active: boolean): void {
		this.isFormMode = active;
	}

	isLeaderActive(): boolean {
		return this.leaderActive;
	}

	private activateLeader(): void {
		this.leaderActive = true;
		if (this.leaderTimeout) {
			clearTimeout(this.leaderTimeout);
		}
		this.leaderTimeout = setTimeout(() => {
			this.leaderActive = false;
			this.leaderTimeout = null;
		}, LEADER_TIMEOUT_MS);
	}

	private clearLeader(): void {
		this.leaderActive = false;
		if (this.leaderTimeout) {
			clearTimeout(this.leaderTimeout);
			this.leaderTimeout = null;
		}
	}

	private clearPendingG(): void {
		this.pendingG = false;
		if (this.gTimeout) {
			clearTimeout(this.gTimeout);
			this.gTimeout = null;
		}
	}

	/**
	 * Check if a key event matches any of the given keybindings
	 */
	private matchesAny(key: KeyEvent, bindings: string[]): boolean {
		for (const binding of bindings) {
			if (this.matchesKeybinding(key, binding)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Check if a key event matches a specific keybinding
	 */
	private matchesKeybinding(key: KeyEvent, binding: string): boolean {
		const parsed = parseKeybinding(binding);

		// Handle sequences (like "gg")
		if (parsed.isSequence) {
			// For now, sequences are handled separately in handleKey
			return false;
		}

		// Check leader state - if keybind requires leader, leader must be active
		if (parsed.leader && !this.leaderActive) {
			return false;
		}
		// If keybind doesn't require leader but leader is active, don't match
		// (so regular bindings don't fire when in leader mode)
		if (!parsed.leader && this.leaderActive) {
			return false;
		}

		// Check modifiers (ctrl and meta)
		if (parsed.ctrl !== (key.ctrl || false)) return false;
		if (parsed.meta !== (key.meta || false)) return false;

		// Handle special case: "enter" can match both "return" and "linefeed"
		if (parsed.key === "enter") {
			return key.name === "return" || key.name === "linefeed";
		}

		// Handle special case: ":" needs to check both name and sequence
		if (parsed.key === ":") {
			return key.name === ":" || key.sequence === ":";
		}

		// For capital letters in config (e.g., "G", "R"), match directly against name or sequence
		// This handles the case where terminal sends name="G" regardless of shift flag
		const originalKey = parsed.leader
			? binding.replace(/^<leader>/i, "")
			: binding;
		if (originalKey.length === 1 && originalKey >= "A" && originalKey <= "Z") {
			return key.name === originalKey || key.sequence === originalKey;
		}

		// For other keys, check shift modifier and compare key name
		if (parsed.shift !== (key.shift || false)) return false;
		return key.name === parsed.key;
	}

	/**
	 * Check if any of the bindings contain a sequence (like "gg")
	 */
	private hasSequence(bindings: string[]): boolean {
		return bindings.some((b) => parseKeybinding(b).isSequence);
	}

	/**
	 * Check if key matches the configured leader key
	 */
	private matchesLeaderKey(key: KeyEvent): boolean {
		const leaderBindings = this.keybindings.global.leader;
		if (!leaderBindings || leaderBindings.length === 0) {
			// No default leader key - must be explicitly configured
			return false;
		}
		// Check without leader state consideration
		for (const binding of leaderBindings) {
			const parsed = parseKeybinding(binding);
			if (parsed.isSequence) continue;

			if (parsed.ctrl !== (key.ctrl || false)) continue;
			if (parsed.meta !== (key.meta || false)) continue;

			if (key.name === parsed.key) return true;
		}
		return false;
	}

	/**
	 * Check if key matches any registered command keybind
	 */
	private checkCommandKeybinds(key: KeyEvent): Action | null {
		const commands = commandRegistry.getCommandsForPane(this.currentPane);

		for (const cmd of commands) {
			if (!cmd.keybind) continue;

			const bindings = commandRegistry.getCommandKeybindings(cmd.id);
			for (const binding of bindings) {
				if (this.matchesKeybinding(key, binding)) {
					// Clear leader state after matching
					this.clearLeader();
					return { type: "executeCommand", commandId: cmd.id };
				}
			}
		}

		return null;
	}

	handleKey(key: KeyEvent): Action | null {
		const keyName = key.name;
		logger.debug("Key event", {
			name: keyName,
			sequence: key.sequence,
			ctrl: key.ctrl,
			meta: key.meta,
			shift: key.shift,
			isCommandPaletteMode: this.isCommandPaletteMode,
			leaderActive: this.leaderActive,
		});

		// Check for command palette trigger (global)
		if (
			!this.isCommandPaletteMode &&
			!this.leaderActive &&
			this.matchesAny(key, this.keybindings.global.command_palette)
		) {
			return { type: "openCommandPalette" };
		}

		// If in command palette mode, route to palette handler
		if (this.isCommandPaletteMode) {
			return this.handleCommandPaletteKey(key);
		}

		// Check for leader key activation (only when not already in leader mode)
		if (!this.leaderActive && this.matchesLeaderKey(key)) {
			this.activateLeader();
			logger.debug("Leader mode activated");
			return null;
		}

		// Check command keybinds (works in both normal and leader mode)
		const commandAction = this.checkCommandKeybinds(key);
		if (commandAction) {
			return commandAction;
		}

		// If in leader mode and no command matched, clear leader on any other key
		if (this.leaderActive) {
			this.clearLeader();
			logger.debug("Leader mode cancelled - no matching command");
			return null;
		}

		// Handle "gg" sequence for jump_top
		if (this.hasSequence(this.keybindings.global.jump_top)) {
			if (keyName === "g" && !key.ctrl && !key.meta && !key.shift) {
				if (this.pendingG) {
					this.clearPendingG();
					return { type: "jump", target: "top" };
				} else {
					this.pendingG = true;
					this.gTimeout = setTimeout(() => {
						this.clearPendingG();
					}, 500);
					return null;
				}
			}
		}

		// Handle "gg" sequence for article pane jump_top
		if (
			this.currentPane === "article" &&
			this.hasSequence(this.keybindings.article.jump_top)
		) {
			if (keyName === "g" && !key.ctrl && !key.meta && !key.shift) {
				if (this.pendingG) {
					this.clearPendingG();
					return { type: "jump", target: "top" };
				} else {
					this.pendingG = true;
					this.gTimeout = setTimeout(() => {
						this.clearPendingG();
					}, 500);
					return null;
				}
			}
		}

		// Clear pending g on any other key
		this.clearPendingG();

		// Global keybindings - quit
		// Special handling: "q" backs out of nested panes first
		if (this.matchesAny(key, this.keybindings.global.quit)) {
			if (this.currentPane === "article") {
				return { type: "back" };
			} else if (this.currentPane === "articles") {
				return { type: "focusPane", pane: "feeds" };
			}
			return { type: "quit" };
		}

		if (this.matchesAny(key, this.keybindings.global.force_quit)) {
			return { type: "quit" };
		}

		// Global navigation
		if (this.matchesAny(key, this.keybindings.global.navigate_down)) {
			if (this.currentPane === "article") {
				// In article pane, check scroll_down binding
				if (this.matchesAny(key, this.keybindings.article.scroll_down)) {
					return { type: "scroll", direction: "down", amount: 1 };
				}
			}
			return { type: "navigate", direction: "down" };
		}

		if (this.matchesAny(key, this.keybindings.global.navigate_up)) {
			if (this.currentPane === "article") {
				// In article pane, check scroll_up binding
				if (this.matchesAny(key, this.keybindings.article.scroll_up)) {
					return { type: "scroll", direction: "up", amount: 1 };
				}
			}
			return { type: "navigate", direction: "up" };
		}

		// Jump to bottom (global, but also check article-specific)
		if (this.matchesAny(key, this.keybindings.global.jump_bottom)) {
			return { type: "jump", target: "bottom" };
		}

		if (
			this.currentPane === "article" &&
			this.matchesAny(key, this.keybindings.article.jump_bottom)
		) {
			return { type: "jump", target: "bottom" };
		}

		// Pane-specific keybindings
		switch (this.currentPane) {
			case "feeds":
				return this.handleFeedsPane(key);
			case "articles":
				return this.handleArticlesPane(key);
			case "article":
				return this.handleArticlePane(key);
		}
	}

	private handleFeedsPane(key: KeyEvent): Action | null {
		if (this.matchesAny(key, this.keybindings.feeds.select)) {
			return { type: "select" };
		}

		if (this.matchesAny(key, this.keybindings.feeds.refresh)) {
			return { type: "refresh" };
		}

		if (this.matchesAny(key, this.keybindings.feeds.refresh_all)) {
			return { type: "refreshAll" };
		}

		if (this.matchesAny(key, this.keybindings.feeds.next_pane)) {
			return { type: "focusPane", pane: "articles" };
		}

		return null;
	}

	private handleArticlesPane(key: KeyEvent): Action | null {
		if (this.matchesAny(key, this.keybindings.articles.prev_pane)) {
			return { type: "focusPane", pane: "feeds" };
		}

		if (this.matchesAny(key, this.keybindings.articles.select)) {
			return { type: "select" };
		}

		if (this.matchesAny(key, this.keybindings.articles.refresh)) {
			return { type: "refresh" };
		}

		if (this.matchesAny(key, this.keybindings.articles.next_pane)) {
			return { type: "focusPane", pane: "article" };
		}

		return null;
	}

	private handleArticlePane(key: KeyEvent): Action | null {
		if (this.matchesAny(key, this.keybindings.article.back)) {
			return { type: "back" };
		}

		if (this.matchesAny(key, this.keybindings.article.open_browser)) {
			return { type: "openInBrowser" };
		}

		if (this.matchesAny(key, this.keybindings.article.page_up)) {
			return { type: "pageScroll", direction: "up" };
		}

		if (this.matchesAny(key, this.keybindings.article.page_down)) {
			return { type: "pageScroll", direction: "down" };
		}

		if (this.matchesAny(key, this.keybindings.article.next_pane)) {
			return { type: "focusPane", pane: "feeds" };
		}

		return null;
	}

	private handleCommandPaletteKey(key: KeyEvent): Action | null {
		const keyName = key.name;
		logger.debug("Command palette key", {
			name: keyName,
			sequence: key.sequence,
			length: key.sequence?.length,
			isFormMode: this.isFormMode,
		});

		if (keyName === "escape") {
			return { type: "closeCommandPalette" };
		}

		// In form mode, only handle escape, tab, enter, and backspace specially
		// Everything else should be text input
		if (this.isFormMode) {
			if (keyName === "tab") {
				return {
					type: "commandPaletteNavigate",
					direction: key.shift ? "up" : "down",
				};
			}

			if (keyName === "return" || keyName === "linefeed") {
				return { type: "commandPaletteSelect" };
			}

			if (keyName === "backspace") {
				return { type: "commandPaletteBackspace" };
			}

			// Arrow keys for field navigation
			if (keyName === "up" || keyName === "down") {
				return {
					type: "commandPaletteNavigate",
					direction: keyName as "up" | "down",
				};
			}

			// All other keys are text input in form mode
			// Use sequence first (contains actual character), fall back to keyName for single chars
			const char = key.sequence ?? (keyName?.length === 1 ? keyName : null);
			if (char && char.length >= 1 && !key.ctrl && !key.meta) {
				// Check if all characters are printable ASCII
				let isPrintable = true;
				for (let i = 0; i < char.length; i++) {
					const code = char.charCodeAt(i);
					if (code < 32 || code >= 127) {
						isPrintable = false;
						break;
					}
				}
				if (isPrintable) {
					return { type: "commandPaletteInput", char };
				}
			}

			return null;
		}

		// Search mode navigation
		if (keyName === "tab") {
			return {
				type: "commandPaletteNavigate",
				direction: key.shift ? "up" : "down",
			};
		}

		if (keyName === "up" || (keyName === "k" && !key.ctrl && !key.meta)) {
			return { type: "commandPaletteNavigate", direction: "up" };
		}

		if (keyName === "down" || (keyName === "j" && !key.ctrl && !key.meta)) {
			return { type: "commandPaletteNavigate", direction: "down" };
		}

		if (keyName === "return" || keyName === "linefeed") {
			return { type: "commandPaletteSelect" };
		}

		if (keyName === "backspace") {
			return { type: "commandPaletteBackspace" };
		}

		// Paste support (Cmd+V / Ctrl+V / Ctrl+Shift+V)
		if (keyName === "v" && (key.ctrl || key.meta)) {
			logger.debug("Paste key detected (Cmd/Ctrl+V)");
			// Request paste action - App will read from clipboard
			return { type: "commandPalettePaste" };
		}

		// Alternative paste binding (Ctrl+Y - common in terminals)
		if (keyName === "y" && key.ctrl && !key.meta) {
			logger.debug("Paste key detected (Ctrl+Y)");
			return { type: "commandPalettePaste" };
		}

		// Character input (printable characters only)
		if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
			const charCode = key.sequence.charCodeAt(0);
			// Accept printable ASCII (space to tilde) and extended characters
			if (charCode >= 32 && charCode < 127) {
				logger.debug("Single character input", { char: key.sequence });
				return { type: "commandPaletteInput", char: key.sequence };
			}
		}

		// Handle pasted text (multi-character sequence)
		// Filter out sequences that might have ANSI codes or control characters
		if (key.sequence && key.sequence.length > 1 && !key.ctrl && !key.meta) {
			logger.debug("Multi-character sequence detected", {
				length: key.sequence.length,
				sequence: key.sequence,
			});

			// Only accept sequences with printable ASCII characters
			const isPrintable = key.sequence.split("").every((c) => {
				const code = c.charCodeAt(0);
				return code >= 32 && code < 127;
			});

			logger.debug("Printable check", { isPrintable });

			if (isPrintable) {
				logger.debug("Accepting pasted text", { text: key.sequence });
				return { type: "commandPaletteInput", char: key.sequence };
			} else {
				logger.debug("Rejecting non-printable sequence");
			}
		}

		return null;
	}
}
