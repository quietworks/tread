import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "smol-toml";
import type { Config, FeedConfig, ThemeColors, ThemeConfig } from "./types.js";
import {
	DEFAULT_KEYBINDINGS,
	type CommandKeybindings,
	type KeybindingsConfig,
} from "../keybindings/types.js";

function getConfigDir(): string {
	const xdgConfig = process.env.XDG_CONFIG_HOME;
	if (xdgConfig) {
		return join(xdgConfig, "tread");
	}
	return join(homedir(), ".config", "tread");
}

const CONFIG_DIR = getConfigDir();
const CONFIG_PATH = join(CONFIG_DIR, "config.toml");

const SAMPLE_CONFIG = `# Tread RSS Reader Configuration
# Add your feeds below. Each feed needs a name and url.

[[feeds]]
name = "Hacker News"
url = "https://hnrss.org/frontpage"

[[feeds]]
name = "Lobsters"
url = "https://lobste.rs/rss"

[[feeds]]
name = "TechCrunch"
url = "https://techcrunch.com/feed/"

# Theme configuration (optional)
# Available themes: tokyo-night, dracula, nord, gruvbox
# [theme]
# name = "tokyo-night"

# You can also override individual colors:
# [theme.colors]
# primary = "#ff79c6"
# accent = "#8be9fd"

# Keybindings Configuration (optional)
# Customize keyboard shortcuts for navigation and actions
# Format: key can be a simple key ("j"), arrow key ("down"), ctrl combo ("C-c"),
#         sequence ("gg" for double-g), or leader combo ("<leader>r")
# Available modifiers: C- (ctrl), M- (meta/cmd), S- (shift)
# Capital letters automatically imply shift (e.g., "G" = shift+g)

# [keybindings.global]
# quit = ["q"]
# force_quit = ["C-c"]
# command_palette = [":"]
# navigate_down = ["j", "down"]
# navigate_up = ["k", "up"]
# jump_top = ["gg"]
# jump_bottom = ["G"]
# leader = ["space"]  # Optional leader key for command sequences

# [keybindings.feeds]
# select = ["l", "right", "enter"]
# refresh = ["r"]
# refresh_all = ["R"]
# next_pane = ["tab"]

# [keybindings.articles]
# prev_pane = ["h", "left"]
# select = ["l", "right", "enter"]
# refresh = ["r"]
# next_pane = ["tab"]

# [keybindings.article]
# back = ["h", "left"]
# open_browser = ["o"]
# scroll_up = ["k", "up"]
# scroll_down = ["j", "down"]
# page_up = ["C-u"]
# page_down = ["C-d", "space"]
# jump_top = ["gg"]
# jump_bottom = ["G"]
# next_pane = ["tab"]

# Command-specific keybindings (optional)
# Commands reference these keys by name
# Use <leader> prefix for leader-based shortcuts (requires leader key above)
# [keybindings.commands]
# add_feed = ["<leader>a"]
# refresh_all = ["<leader>r"]
# reload_config = ["<leader>c"]
# quit = ["<leader>q"]
`;

export function getConfigPath(): string {
	return CONFIG_PATH;
}

export function configExists(): boolean {
	return existsSync(CONFIG_PATH);
}

export function initConfig(): { created: boolean; path: string } {
	if (existsSync(CONFIG_PATH)) {
		return { created: false, path: CONFIG_PATH };
	}

	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	writeFileSync(CONFIG_PATH, SAMPLE_CONFIG, "utf-8");
	return { created: true, path: CONFIG_PATH };
}

export function saveConfig(config: Config): void {
	const tomlContent = buildConfigToml(config);
	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	writeFileSync(CONFIG_PATH, tomlContent, "utf-8");
}

export function buildConfigToml(config: Config): string {
	const lines: string[] = [
		"# Tread RSS Reader Configuration",
		"# Add your feeds below. Each feed needs a name and url.",
		"",
	];

	// Feeds section
	for (const feed of config.feeds) {
		lines.push("[[feeds]]");
		lines.push(`name = ${JSON.stringify(feed.name)}`);
		lines.push(`url = ${JSON.stringify(feed.url)}`);
		lines.push("");
	}

	// Theme section (optional)
	if (config.theme) {
		if (config.theme.name) {
			lines.push("[theme]");
			lines.push(`name = ${JSON.stringify(config.theme.name)}`);
			lines.push("");
		}

		if (config.theme.colors && Object.keys(config.theme.colors).length > 0) {
			lines.push("[theme.colors]");
			for (const [key, value] of Object.entries(config.theme.colors)) {
				if (value) {
					lines.push(`${key} = ${JSON.stringify(value)}`);
				}
			}
			lines.push("");
		}
	}

	return lines.join("\n");
}

export function loadConfig(): Config {
	if (!existsSync(CONFIG_PATH)) {
		throw new Error(
			`Config file not found at ${CONFIG_PATH}\n\n` +
				`Run 'tread --init' to create a sample configuration.`,
		);
	}

	const content = readFileSync(CONFIG_PATH, "utf-8");
	const parsed = parse(content);

	const feeds = parsed.feeds;
	if (!Array.isArray(feeds) || feeds.length === 0) {
		throw new Error("Config must contain at least one [[feeds]] entry");
	}

	const validatedFeeds: FeedConfig[] = feeds.map((feed, index) => {
		if (typeof feed !== "object" || feed === null) {
			throw new Error(`Feed at index ${index} is not an object`);
		}

		const f = feed as Record<string, unknown>;

		if (typeof f.name !== "string" || f.name.trim() === "") {
			throw new Error(`Feed at index ${index} must have a non-empty "name"`);
		}

		if (typeof f.url !== "string" || f.url.trim() === "") {
			throw new Error(`Feed at index ${index} must have a non-empty "url"`);
		}

		try {
			new URL(f.url);
		} catch {
			throw new Error(`Feed "${f.name}" has invalid URL: ${f.url}`);
		}

		return {
			name: f.name.trim(),
			url: f.url.trim(),
		};
	});

	// Parse optional theme configuration
	let theme: ThemeConfig | undefined;
	if (parsed.theme && typeof parsed.theme === "object") {
		const t = parsed.theme as Record<string, unknown>;
		theme = {};

		if (typeof t.name === "string") {
			theme.name = t.name;
		}

		if (t.colors && typeof t.colors === "object") {
			const c = t.colors as Record<string, unknown>;
			const colors: ThemeColors = {};

			const colorKeys: (keyof ThemeColors)[] = [
				"bg",
				"bgLight",
				"bgHighlight",
				"fg",
				"fgDim",
				"fgMuted",
				"primary",
				"secondary",
				"accent",
				"success",
				"warning",
				"error",
				"border",
				"borderFocused",
			];

			for (const key of colorKeys) {
				if (typeof c[key] === "string") {
					colors[key] = c[key] as string;
				}
			}

			if (Object.keys(colors).length > 0) {
				theme.colors = colors;
			}
		}
	}

	// Parse keybindings (optional, falls back to defaults)
	const keybindings = parseKeybindings(parsed.keybindings);

	return { feeds: validatedFeeds, theme, keybindings };
}

/**
 * Parse command keybindings section
 * Unlike pane keybindings, this allows arbitrary keys
 */
function parseCommandKeybindings(commandsRaw: unknown): CommandKeybindings {
	if (!commandsRaw || typeof commandsRaw !== "object") {
		return {};
	}

	const commands = commandsRaw as Record<string, unknown>;
	const result: CommandKeybindings = {};

	for (const [key, value] of Object.entries(commands)) {
		if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Parse and validate keybindings from config
 * Merges user config with defaults
 */
function parseKeybindings(
	keybindingsRaw: unknown,
): KeybindingsConfig | undefined {
	// If no keybindings in config, return undefined (will use defaults)
	if (!keybindingsRaw || typeof keybindingsRaw !== "object") {
		return undefined;
	}

	const kb = keybindingsRaw as Record<string, unknown>;

	// Helper to parse a keybinding group
	function parseGroup<T extends { [K in keyof T]: string[] }>(
		groupRaw: unknown,
		defaults: T,
	): T {
		if (!groupRaw || typeof groupRaw !== "object") {
			return defaults;
		}

		const group = groupRaw as Record<string, unknown>;
		const result = { ...defaults };

		for (const key of Object.keys(defaults) as Array<keyof T>) {
			const value = group[key as string];
			if (Array.isArray(value)) {
				// Validate all entries are strings
				if (value.every((v) => typeof v === "string")) {
					result[key] = value as T[keyof T];
				}
			}
		}

		return result;
	}

	return {
		global: parseGroup(kb.global, DEFAULT_KEYBINDINGS.global),
		feeds: parseGroup(kb.feeds, DEFAULT_KEYBINDINGS.feeds),
		articles: parseGroup(kb.articles, DEFAULT_KEYBINDINGS.articles),
		article: parseGroup(kb.article, DEFAULT_KEYBINDINGS.article),
		commands: parseCommandKeybindings(kb.commands),
	};
}
