import type { FeedConfig } from "../config/types.js";
import type { Article } from "../db/types.js";
import { rankMatches } from "./fuzzy.js";
import type { Command, SearchResult, SearchWeights } from "./types.js";
import { DEFAULT_WEIGHTS } from "./types.js";

export class Searcher {
	private commands: Command[];
	private feeds: FeedConfig[];
	private getArticles: () => Article[];
	private weights: SearchWeights;

	constructor(
		commands: Command[],
		feeds: FeedConfig[],
		getArticles: () => Article[],
		weights: SearchWeights = DEFAULT_WEIGHTS,
	) {
		this.commands = commands;
		this.feeds = feeds;
		this.getArticles = getArticles;
		this.weights = weights;
	}

	search(query: string): SearchResult[] {
		if (!query.trim()) {
			return [];
		}

		const results: SearchResult[] = [];

		// Search commands
		const commandMatches = rankMatches(
			query,
			this.commands,
			(cmd) => cmd.name,
			this.weights.commands,
		);

		for (const match of commandMatches) {
			results.push({
				type: "command",
				label: match.item.name,
				description: match.item.description,
				weight: this.weights.commands,
				score: match.score,
				data: match.item,
			});
		}

		// Search feeds
		const feedMatches = rankMatches(
			query,
			this.feeds,
			(feed) => feed.name,
			this.weights.feeds,
		);

		for (const match of feedMatches) {
			results.push({
				type: "feed",
				label: match.item.name,
				description: match.item.url,
				weight: this.weights.feeds,
				score: match.score,
				data: match.item,
			});
		}

		// Search article titles
		const articles = this.getArticles();
		const titleMatches = rankMatches(
			query,
			articles,
			(article) => article.title,
			this.weights.articleTitles,
		);

		for (const match of titleMatches) {
			const article = match.item;
			const timeAgo = this.getTimeAgo(article.publishedAt);

			results.push({
				type: "article",
				label: article.title,
				description: timeAgo,
				weight: this.weights.articleTitles,
				score: match.score,
				matchedIn: "title",
				data: article,
			});
		}

		// Search article content (with lower weight)
		const contentMatches = rankMatches(
			query,
			articles,
			(article) => article.content || "",
			this.weights.articleContent,
		);

		for (const match of contentMatches) {
			const article = match.item;

			// Skip if already matched by title
			if (titleMatches.some((tm) => tm.item.id === article.id)) {
				continue;
			}

			const timeAgo = this.getTimeAgo(article.publishedAt);

			results.push({
				type: "article",
				label: article.title,
				description: timeAgo,
				weight: this.weights.articleContent,
				score: match.score,
				matchedIn: "content",
				data: article,
			});
		}

		// Sort all results by weighted score (descending)
		results.sort((a, b) => b.score - a.score);

		// Limit to top 50 results
		return results.slice(0, 50);
	}

	private getTimeAgo(date: Date | null): string {
		if (!date) return "";

		const now = Date.now();
		const then = date.getTime();
		const diff = now - then;

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		const weeks = Math.floor(days / 7);
		const months = Math.floor(days / 30);
		const years = Math.floor(days / 365);

		if (years > 0) return `${years}y ago`;
		if (months > 0) return `${months}mo ago`;
		if (weeks > 0) return `${weeks}w ago`;
		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return "just now";
	}
}
