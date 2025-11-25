import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";
import type { ParsedFeed, FeedItem } from "./types.js";

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: "@_",
	textNodeName: "#text",
});

function generateId(link: string | null, title: string): string {
	const content = link || title;
	return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function parseDate(dateStr: string | undefined | null): Date | null {
	if (!dateStr) return null;

	const date = new Date(dateStr);
	return isNaN(date.getTime()) ? null : date;
}

function getTextContent(node: unknown): string {
	if (typeof node === "string") return node;
	if (typeof node === "number") return String(node);
	if (node && typeof node === "object" && "#text" in node) {
		return String((node as Record<string, unknown>)["#text"]);
	}
	return "";
}

function parseRSS(data: Record<string, unknown>): ParsedFeed {
	const channel = (data.rss as Record<string, unknown>)?.channel as Record<
		string,
		unknown
	>;
	if (!channel) {
		throw new Error("Invalid RSS feed: missing channel");
	}

	const title = getTextContent(channel.title) || "Untitled Feed";
	const rawItems = channel.item;
	const items: unknown[] = Array.isArray(rawItems)
		? rawItems
		: rawItems
			? [rawItems]
			: [];

	const feedItems: FeedItem[] = items.map((item) => {
		const i = item as Record<string, unknown>;
		const guid = getTextContent(i.guid);
		const link = getTextContent(i.link) || null;
		const itemTitle = getTextContent(i.title) || "Untitled";

		const content =
			getTextContent(i["content:encoded"]) ||
			getTextContent(i.description) ||
			null;

		return {
			id: guid || generateId(link, itemTitle),
			title: itemTitle,
			link,
			content,
			publishedAt: parseDate(getTextContent(i.pubDate)),
		};
	});

	return { title, items: feedItems };
}

function parseAtom(data: Record<string, unknown>): ParsedFeed {
	const feed = data.feed as Record<string, unknown>;
	if (!feed) {
		throw new Error("Invalid Atom feed: missing feed element");
	}

	const title = getTextContent(feed.title) || "Untitled Feed";
	const rawEntries = feed.entry;
	const entries: unknown[] = Array.isArray(rawEntries)
		? rawEntries
		: rawEntries
			? [rawEntries]
			: [];

	const feedItems: FeedItem[] = entries.map((entry) => {
		const e = entry as Record<string, unknown>;
		const id = getTextContent(e.id);
		const entryTitle = getTextContent(e.title) || "Untitled";

		// Atom links can be objects with href attribute
		let link: string | null = null;
		const linkNode = e.link;
		if (Array.isArray(linkNode)) {
			const altLink = linkNode.find(
				(l) =>
					(l as Record<string, unknown>)["@_rel"] === "alternate" ||
					!(l as Record<string, unknown>)["@_rel"],
			) as Record<string, unknown> | undefined;
			link = altLink ? String(altLink["@_href"] || "") : null;
		} else if (linkNode && typeof linkNode === "object") {
			link = String((linkNode as Record<string, unknown>)["@_href"] || "");
		} else {
			link = getTextContent(linkNode) || null;
		}

		// Content can be in content or summary
		const contentNode = e.content || e.summary;
		let content: string | null = null;
		if (contentNode && typeof contentNode === "object") {
			content =
				getTextContent((contentNode as Record<string, unknown>)["#text"]) ||
				getTextContent(contentNode) ||
				null;
		} else {
			content = getTextContent(contentNode) || null;
		}

		const published = getTextContent(e.published) || getTextContent(e.updated);

		return {
			id: id || generateId(link, entryTitle),
			title: entryTitle,
			link,
			content,
			publishedAt: parseDate(published),
		};
	});

	return { title, items: feedItems };
}

export function parseFeed(xml: string): ParsedFeed {
	const data = parser.parse(xml) as Record<string, unknown>;

	if (data.rss) {
		return parseRSS(data);
	}

	if (data.feed) {
		return parseAtom(data);
	}

	throw new Error("Unknown feed format: not RSS or Atom");
}
