import type { KeyEvent } from "@opentui/core";
import type { Action } from "./actions.js";
import { logger } from "../logger.js";

export type Pane = "feeds" | "articles" | "article";

export class KeybindingHandler {
	private currentPane: Pane = "feeds";
	private pendingG = false;
	private gTimeout: ReturnType<typeof setTimeout> | null = null;
	private isCommandPaletteMode = false;

	setPane(pane: Pane): void {
		this.currentPane = pane;
		this.clearPendingG();
	}

	setCommandPaletteMode(active: boolean): void {
		this.isCommandPaletteMode = active;
	}

	private clearPendingG(): void {
		this.pendingG = false;
		if (this.gTimeout) {
			clearTimeout(this.gTimeout);
			this.gTimeout = null;
		}
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
		});

		// Check for command palette trigger (global)
		// Note: ":" is shift+semicolon, check both keyName and sequence
		if (
			(keyName === ":" || key.sequence === ":") &&
			!this.isCommandPaletteMode
		) {
			return { type: "openCommandPalette" };
		}

		// If in command palette mode, route to palette handler
		if (this.isCommandPaletteMode) {
			return this.handleCommandPaletteKey(key);
		}

		// Handle gg sequence
		if (keyName === "g" && !key.ctrl && !key.meta) {
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

		// Clear pending g on any other key
		this.clearPendingG();

		// Global keybindings
		if (keyName === "q") {
			if (this.currentPane === "article") {
				return { type: "back" };
			} else if (this.currentPane === "articles") {
				return { type: "focusPane", pane: "feeds" };
			}
			return { type: "quit" };
		}

		if (key.name === "c" && key.ctrl) {
			return { type: "quit" };
		}

		// Navigation
		if (keyName === "j" || keyName === "down") {
			if (this.currentPane === "article") {
				return { type: "scroll", direction: "down", amount: 1 };
			}
			return { type: "navigate", direction: "down" };
		}

		if (keyName === "k" || keyName === "up") {
			if (this.currentPane === "article") {
				return { type: "scroll", direction: "up", amount: 1 };
			}
			return { type: "navigate", direction: "up" };
		}

		// Jump to bottom
		if (keyName === "G" || (keyName === "g" && key.shift)) {
			return { type: "jump", target: "bottom" };
		}

		// Page scrolling (article view)
		if (this.currentPane === "article") {
			if (keyName === "d" && key.ctrl) {
				return { type: "pageScroll", direction: "down" };
			}
			if (keyName === "u" && key.ctrl) {
				return { type: "pageScroll", direction: "up" };
			}
			if (keyName === "space") {
				return { type: "pageScroll", direction: "down" };
			}
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
		const keyName = key.name;

		if (
			keyName === "l" ||
			keyName === "right" ||
			keyName === "return" ||
			keyName === "linefeed"
		) {
			return { type: "select" };
		}

		if (keyName === "r" && !key.shift) {
			return { type: "refresh" };
		}

		if (keyName === "R" || (keyName === "r" && key.shift)) {
			return { type: "refreshAll" };
		}

		if (keyName === "tab") {
			return { type: "focusPane", pane: "articles" };
		}

		return null;
	}

	private handleArticlesPane(key: KeyEvent): Action | null {
		const keyName = key.name;

		if (keyName === "h" || keyName === "left") {
			return { type: "focusPane", pane: "feeds" };
		}

		if (
			keyName === "l" ||
			keyName === "right" ||
			keyName === "return" ||
			keyName === "linefeed"
		) {
			return { type: "select" };
		}

		if (keyName === "r" && !key.shift) {
			return { type: "refresh" };
		}

		if (keyName === "tab") {
			return { type: "focusPane", pane: "feeds" };
		}

		return null;
	}

	private handleArticlePane(key: KeyEvent): Action | null {
		const keyName = key.name;

		if (keyName === "h" || keyName === "left") {
			return { type: "back" };
		}

		if (keyName === "o") {
			return { type: "openInBrowser" };
		}

		return null;
	}

	private handleCommandPaletteKey(key: KeyEvent): Action | null {
		const keyName = key.name;
		logger.debug("Command palette key", {
			name: keyName,
			sequence: key.sequence,
			length: key.sequence?.length,
		});

		if (keyName === "escape") {
			return { type: "closeCommandPalette" };
		}

		// Tab navigation (without shift = down, with shift = up)
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

		// Paste support (Cmd+V / Ctrl+V)
		if (keyName === "v" && (key.ctrl || key.meta)) {
			// We can't directly access clipboard in terminal, so ignore this
			// Terminal will handle paste and send characters
			return null;
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
