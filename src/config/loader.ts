import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parse } from "smol-toml";
import type { Config, FeedConfig } from "./types.js";

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

	return { feeds: validatedFeeds };
}
