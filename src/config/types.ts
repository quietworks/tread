export interface FeedConfig {
  name: string;
  url: string;
}

export interface Config {
  feeds: FeedConfig[];
}
