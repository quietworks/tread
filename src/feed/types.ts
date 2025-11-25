export interface FeedItem {
  id: string;
  title: string;
  link: string | null;
  content: string | null;
  publishedAt: Date | null;
}

export interface ParsedFeed {
  title: string;
  items: FeedItem[];
}
