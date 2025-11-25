export interface ArticleRow {
	id: string;
	feed_url: string;
	title: string;
	link: string | null;
	content: string | null;
	published_at: number | null;
	read_at: number | null;
	fetched_at: number;
}

export interface Article {
	id: string;
	feedUrl: string;
	title: string;
	link: string | null;
	content: string | null;
	publishedAt: Date | null;
	readAt: Date | null;
	fetchedAt: Date;
}
