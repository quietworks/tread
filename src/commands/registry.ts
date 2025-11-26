import type { Pane } from "../keybindings/handler.js";
import type { CommandKeybindings } from "../keybindings/types.js";
import type { Command } from "../search/types.js";

/**
 * Dynamic command registry
 * Supports registering/unregistering commands and keybind lookups
 */
class CommandRegistry {
	private commands = new Map<string, Command>();
	private keybindings: CommandKeybindings = {};

	/**
	 * Register commands with the registry
	 * @returns cleanup function to unregister all commands
	 */
	registerCommands(cmds: Command[]): () => void {
		for (const cmd of cmds) {
			this.commands.set(cmd.id, cmd);
		}
		return () => {
			for (const cmd of cmds) {
				this.commands.delete(cmd.id);
			}
		};
	}

	/**
	 * Unregister a single command by ID
	 */
	unregisterCommand(id: string): boolean {
		return this.commands.delete(id);
	}

	/**
	 * Get all registered commands
	 */
	getCommands(): Command[] {
		return [...this.commands.values()];
	}

	/**
	 * Get a command by ID
	 */
	getCommandById(id: string): Command | undefined {
		return this.commands.get(id);
	}

	/**
	 * Get commands available for a specific pane
	 * Commands with no pane restriction are available everywhere
	 */
	getCommandsForPane(pane: Pane): Command[] {
		return [...this.commands.values()].filter((cmd) => {
			// Check if command is disabled
			if (typeof cmd.disabled === "function" ? cmd.disabled() : cmd.disabled) {
				return false;
			}
			// Check pane restriction
			return !cmd.panes || cmd.panes.includes(pane);
		});
	}

	/**
	 * Update keybindings configuration
	 */
	setKeybindings(keybindings: CommandKeybindings): void {
		this.keybindings = keybindings;
	}

	/**
	 * Get keybinding strings for a command
	 */
	getCommandKeybindings(commandId: string): string[] {
		const cmd = this.commands.get(commandId);
		if (!cmd?.keybind) return [];
		return this.keybindings[cmd.keybind] || [];
	}

	/**
	 * Get the keybind config key for a command
	 */
	getCommandKeybindKey(commandId: string): string | undefined {
		return this.commands.get(commandId)?.keybind;
	}

	/**
	 * Get formatted keybind display string for a command
	 * Returns first keybind formatted for display
	 */
	getCommandKeybindDisplay(commandId: string): string | undefined {
		const keybindings = this.getCommandKeybindings(commandId);
		if (keybindings.length === 0) return undefined;
		return formatKeybind(keybindings[0]!);
	}

	/**
	 * Find command by keybind
	 * Returns the command if a keybind matches
	 */
	findCommandByKeybind(keybind: string, pane: Pane): Command | undefined {
		for (const cmd of this.getCommandsForPane(pane)) {
			if (!cmd.keybind) continue;
			const bindings = this.keybindings[cmd.keybind];
			if (bindings?.includes(keybind)) {
				return cmd;
			}
		}
		return undefined;
	}

	/**
	 * Clear all commands
	 */
	clear(): void {
		this.commands.clear();
	}
}

/**
 * Format a keybind string for display
 * e.g., "C-a" → "ctrl+a", "M-x" → "meta+x"
 */
export function formatKeybind(binding: string): string {
	// Handle modifier prefixes
	const modifierRegex = /^([CMS])-(.+)$/i;
	const match = binding.match(modifierRegex);

	if (match) {
		const modifier = match[1]!.toUpperCase();
		const key = match[2]!;

		switch (modifier) {
			case "C":
				return `ctrl+${key}`;
			case "M":
				return `meta+${key}`;
			case "S":
				return `shift+${key}`;
		}
	}

	// Handle capital letters (imply shift)
	if (binding.length === 1 && binding >= "A" && binding <= "Z") {
		return `shift+${binding.toLowerCase()}`;
	}

	return binding;
}

// Global singleton instance
export const commandRegistry = new CommandRegistry();

/**
 * App command callbacks
 */
export interface AppCommands {
	quit: () => void;
	refreshAllFeeds: () => Promise<void>;
	openAddFeedForm: () => void;
	closeCommandPaletteFromCommand: () => void;
	reloadConfig: () => void;
}

/**
 * Register default app commands
 * @returns cleanup function
 */
export function registerAppCommands(app: AppCommands): () => void {
	const commands: Command[] = [
		{
			id: "add-feed",
			name: "Add Feed",
			description: "Add a new RSS/Atom feed",
			keybind: "add_feed",
			execute: () => {
				app.openAddFeedForm();
			},
		},
		{
			id: "refresh-all",
			name: "Refresh All Feeds",
			description: "Fetch and update all RSS feeds",
			keybind: "refresh_all",
			execute: async () => {
				app.closeCommandPaletteFromCommand();
				await app.refreshAllFeeds();
			},
		},
		{
			id: "reload-config",
			name: "Reload Config",
			description:
				"Reload configuration from config.toml (keybindings, feeds, etc.)",
			keybind: "reload_config",
			execute: () => {
				app.closeCommandPaletteFromCommand();
				app.reloadConfig();
			},
		},
		{
			id: "quit",
			name: "Quit",
			description: "Exit the application",
			keybind: "quit",
			execute: () => {
				app.quit();
			},
		},
	];

	return commandRegistry.registerCommands(commands);
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use commandRegistry.getCommands() instead
 */
export function getCommands(app: AppCommands): Command[] {
	// Register commands if not already registered
	const existing = commandRegistry.getCommands();
	if (existing.length === 0) {
		registerAppCommands(app);
	}
	return commandRegistry.getCommands();
}
