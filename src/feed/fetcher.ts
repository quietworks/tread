import { upsertArticle } from "../db/articles.js";
import { parseFeed } from "./parser.js";
import type { ParsedFeed } from "./types.js";

const USER_AGENT = "Tread/0.1.0 (RSS Reader)";

export async function fetchFeed(url: string): Promise<ParsedFeed> {
	const response = await fetch(url, {
		headers: {
			"User-Agent": USER_AGENT,
			Accept:
				"application/rss+xml, application/atom+xml, application/xml, text/xml",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch feed: ${response.status} ${response.statusText}`,
		);
	}

	const xml = await response.text();
	return parseFeed(xml);
}

export async function fetchAndStoreFeed(feedUrl: string): Promise<number> {
	const feed = await fetchFeed(feedUrl);

	for (const item of feed.items) {
		upsertArticle({
			id: item.id,
			feedUrl,
			title: item.title,
			link: item.link,
			content: item.content,
			publishedAt: item.publishedAt,
		});
	}

	return feed.items.length;
}

export interface FetchResult {
	feedUrl: string;
	success: boolean;
	count?: number;
	error?: string;
}

export async function fetchAllFeeds(
	feedUrls: string[],
): Promise<FetchResult[]> {
	const results = await Promise.allSettled(
		feedUrls.map(async (url) => {
			const count = await fetchAndStoreFeed(url);
			return { feedUrl: url, success: true, count };
		}),
	);

	return results.map((result, index) => {
		if (result.status === "fulfilled") {
			return result.value;
		}
		return {
			feedUrl: feedUrls[index]!,
			success: false,
			error:
				result.reason instanceof Error
					? result.reason.message
					: String(result.reason),
		};
	});
}
