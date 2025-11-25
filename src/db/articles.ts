import { getDatabase } from "./database.js";
import type { Article, ArticleRow } from "./types.js";

function rowToArticle(row: ArticleRow): Article {
	return {
		id: row.id,
		feedUrl: row.feed_url,
		title: row.title,
		link: row.link,
		content: row.content,
		publishedAt: row.published_at ? new Date(row.published_at) : null,
		readAt: row.read_at ? new Date(row.read_at) : null,
		fetchedAt: new Date(row.fetched_at),
	};
}

export function upsertArticle(article: {
	id: string;
	feedUrl: string;
	title: string;
	link: string | null;
	content: string | null;
	publishedAt: Date | null;
}): void {
	const db = getDatabase();
	const stmt = db.prepare(`
    INSERT INTO articles (id, feed_url, title, link, content, published_at, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      link = excluded.link,
      content = excluded.content,
      published_at = excluded.published_at,
      fetched_at = excluded.fetched_at
  `);

	stmt.run(
		article.id,
		article.feedUrl,
		article.title,
		article.link,
		article.content,
		article.publishedAt?.getTime() ?? null,
		Date.now(),
	);
}

export function getArticlesByFeed(feedUrl: string): Article[] {
	const db = getDatabase();
	const stmt = db.prepare<ArticleRow, [string]>(`
    SELECT * FROM articles
    WHERE feed_url = ?
    ORDER BY published_at DESC, fetched_at DESC
  `);

	const rows = stmt.all(feedUrl);
	return rows.map(rowToArticle);
}

export function getArticleById(id: string): Article | null {
	const db = getDatabase();
	const stmt = db.prepare<ArticleRow, [string]>(`
    SELECT * FROM articles WHERE id = ?
  `);

	const row = stmt.get(id);
	return row ? rowToArticle(row) : null;
}

export function markAsRead(id: string): void {
	const db = getDatabase();
	const stmt = db.prepare(`
    UPDATE articles SET read_at = ? WHERE id = ? AND read_at IS NULL
  `);
	stmt.run(Date.now(), id);
}

export function markAsUnread(id: string): void {
	const db = getDatabase();
	const stmt = db.prepare(`
    UPDATE articles SET read_at = NULL WHERE id = ?
  `);
	stmt.run(id);
}

export function isRead(id: string): boolean {
	const db = getDatabase();
	const stmt = db.prepare<{ read_at: number | null }, [string]>(`
    SELECT read_at FROM articles WHERE id = ?
  `);
	const row = stmt.get(id);
	return row?.read_at !== null && row?.read_at !== undefined;
}

export function getUnreadCount(feedUrl: string): number {
	const db = getDatabase();
	const stmt = db.prepare<{ count: number }, [string]>(`
    SELECT COUNT(*) as count FROM articles
    WHERE feed_url = ? AND read_at IS NULL
  `);
	const row = stmt.get(feedUrl);
	return row?.count ?? 0;
}

export function deleteArticlesByFeed(feedUrl: string): void {
	const db = getDatabase();
	const stmt = db.prepare(`DELETE FROM articles WHERE feed_url = ?`);
	stmt.run(feedUrl);
}

export function getAllArticles(): Article[] {
	const db = getDatabase();
	const stmt = db.prepare<ArticleRow, []>(`
    SELECT * FROM articles
    ORDER BY published_at DESC, fetched_at DESC
    LIMIT 1000
  `);

	const rows = stmt.all();
	return rows.map(rowToArticle);
}
