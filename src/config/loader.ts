import { parse } from "smol-toml";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config, FeedConfig } from "./types.js";

const CONFIG_DIR = join(homedir(), ".config", "tread");
const CONFIG_PATH = join(CONFIG_DIR, "config.toml");

export function getConfigPath(): string {
	return CONFIG_PATH;
}

export function loadConfig(): Config {
	if (!existsSync(CONFIG_PATH)) {
		throw new Error(
			`Config file not found at ${CONFIG_PATH}\n` +
				`Create it with your RSS feeds:\n\n` +
				`[[feeds]]\n` +
				`name = "Example Feed"\n` +
				`url = "https://example.com/feed.xml"\n`,
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
