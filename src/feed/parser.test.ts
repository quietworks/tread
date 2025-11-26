import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFeed } from "./parser.js";

const FIXTURES_DIR = join(import.meta.dir, "../../test/fixtures/feeds");

function loadFixture(filename: string): string {
	return readFileSync(join(FIXTURES_DIR, filename), "utf-8");
}

describe("parseFeed - RSS", () => {
	test("parses RSS 2.0 feed correctly", () => {
		const xml = loadFixture("tech-news.xml");
		const result = parseFeed(xml);

		expect(result.title).toBe("Tech Daily");
		expect(result.items).toHaveLength(5);
	});

	test("parses RSS feed items with all fields", () => {
		const xml = loadFixture("tech-news.xml");
		const result = parseFeed(xml);

		const firstItem = result.items[0];
		expect(firstItem?.title).toBe(
			"Rust 2.0 Released with Major Performance Improvements",
		);
		expect(firstItem?.link).toBe("https://example.com/tech/rust-2");
		expect(firstItem?.id).toBe("rust-2-release");
		expect(firstItem?.content).toContain("Rust programming language");
		expect(firstItem?.publishedAt).toBeInstanceOf(Date);
	});

	test("generates ID from link when guid is missing", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<item>
					<title>Article</title>
					<link>https://example.com/article</link>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.id).toBeTruthy();
		expect(result.items[0]?.id).toHaveLength(16); // SHA256 hash truncated to 16 chars
	});

	test("generates ID from title when both guid and link are missing", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<item>
					<title>Unique Article Title</title>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.id).toBeTruthy();
		expect(result.items[0]?.id).toHaveLength(16);
	});

	test("handles missing description", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<item>
					<title>Article</title>
					<link>https://example.com/article</link>
					<guid>test-id</guid>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.content).toBeNull();
	});

	test("handles missing pubDate", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<item>
					<title>Article</title>
					<link>https://example.com/article</link>
					<guid>test-id</guid>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.publishedAt).toBeNull();
	});

	test("handles single item (not array)", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<item>
					<title>Single Article</title>
					<link>https://example.com/article</link>
					<guid>single</guid>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.title).toBe("Single Article");
	});

	test("handles empty channel (no items)", () => {
		const xml = loadFixture("empty.xml");
		const result = parseFeed(xml);

		expect(result.title).toBe("Empty Feed");
		expect(result.items).toHaveLength(0);
	});

	test("prefers content:encoded over description", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
			<channel>
				<title>Test</title>
				<item>
					<title>Article</title>
					<description>Short description</description>
					<content:encoded>Full content here</content:encoded>
					<guid>test</guid>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.content).toBe("Full content here");
	});

	test("uses Untitled for missing title", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<item>
					<link>https://example.com/article</link>
					<guid>test</guid>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.title).toBe("Untitled Feed");
		expect(result.items[0]?.title).toBe("Untitled");
	});

	test("throws error for missing channel", () => {
		const xml = `<?xml version="1.0"?><rss version="2.0"></rss>`;
		expect(() => parseFeed(xml)).toThrow("Invalid RSS feed: missing channel");
	});
});

describe("parseFeed - Atom", () => {
	test("parses Atom feed correctly", () => {
		const xml = loadFixture("dev-blog.xml");
		const result = parseFeed(xml);

		expect(result.title).toBe("Dev Insights");
		expect(result.items).toHaveLength(4);
	});

	test("parses Atom feed items with all fields", () => {
		const xml = loadFixture("dev-blog.xml");
		const result = parseFeed(xml);

		const firstItem = result.items[0];
		expect(firstItem?.title).toBe("Why I Switched from VS Code to Neovim");
		expect(firstItem?.link).toBe("https://example.com/dev/vscode-to-neovim");
		expect(firstItem?.id).toBe("vscode-to-neovim");
		expect(firstItem?.content).toContain("After 5 years");
		expect(firstItem?.publishedAt).toBeInstanceOf(Date);
	});

	test("handles Atom link as object with href attribute", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<link href="https://example.com/article"/>
				<id>test-id</id>
				<updated>2024-01-01T00:00:00Z</updated>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.link).toBe("https://example.com/article");
	});

	test("handles multiple Atom links (prefers alternate)", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<link rel="self" href="https://example.com/feed/123"/>
				<link rel="alternate" href="https://example.com/article"/>
				<id>test-id</id>
				<updated>2024-01-01T00:00:00Z</updated>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.link).toBe("https://example.com/article");
	});

	test("handles Atom link without rel attribute", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<link href="https://example.com/article"/>
				<id>test-id</id>
				<updated>2024-01-01T00:00:00Z</updated>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.link).toBe("https://example.com/article");
	});

	test("handles Atom content as object", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<id>test-id</id>
				<updated>2024-01-01T00:00:00Z</updated>
				<content type="html">Content here</content>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.content).toBe("Content here");
	});

	test("prefers content over summary", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<id>test-id</id>
				<updated>2024-01-01T00:00:00Z</updated>
				<summary>Short summary</summary>
				<content>Full content</content>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.content).toBe("Full content");
	});

	test("uses summary when content is missing", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<id>test-id</id>
				<updated>2024-01-01T00:00:00Z</updated>
				<summary>Summary only</summary>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.content).toBe("Summary only");
	});

	test("prefers published over updated", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<id>test-id</id>
				<published>2024-01-01T00:00:00Z</published>
				<updated>2024-01-02T00:00:00Z</updated>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.publishedAt?.toISOString()).toContain("2024-01-01");
	});

	test("uses updated when published is missing", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<id>test-id</id>
				<updated>2024-01-02T00:00:00Z</updated>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.publishedAt?.toISOString()).toContain("2024-01-02");
	});

	test("handles single entry (not array)", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Single Article</title>
				<id>single</id>
				<updated>2024-01-01T00:00:00Z</updated>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items).toHaveLength(1);
		expect(result.items[0]?.title).toBe("Single Article");
	});

	test("handles empty feed (no entries)", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Empty Feed</title>
			<updated>2024-01-01T00:00:00Z</updated>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items).toHaveLength(0);
	});

	test("generates ID from link when id is missing", () => {
		const xml = `<?xml version="1.0"?>
		<feed xmlns="http://www.w3.org/2005/Atom">
			<title>Test</title>
			<entry>
				<title>Article</title>
				<link href="https://example.com/article"/>
				<updated>2024-01-01T00:00:00Z</updated>
			</entry>
		</feed>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.id).toBeTruthy();
		expect(result.items[0]?.id).toHaveLength(16);
	});

	test("throws error for missing feed element", () => {
		const xml = `<?xml version="1.0"?><root></root>`;
		expect(() => parseFeed(xml)).toThrow("Unknown feed format: not RSS or Atom");
	});
});

describe("parseFeed - Error Handling", () => {
	test("throws error for unknown feed format", () => {
		const xml = `<?xml version="1.0"?><unknown></unknown>`;
		expect(() => parseFeed(xml)).toThrow("Unknown feed format: not RSS or Atom");
	});

	test("handles malformed XML", () => {
		const xml = loadFixture("malformed.xml");
		// fast-xml-parser is quite forgiving and will parse even malformed XML
		// So this test just ensures it doesn't crash
		expect(() => parseFeed(xml)).not.toThrow();
	});

	test("handles invalid date formats gracefully", () => {
		const xml = `<?xml version="1.0"?>
		<rss version="2.0">
			<channel>
				<title>Test</title>
				<item>
					<title>Article</title>
					<guid>test</guid>
					<pubDate>not-a-date</pubDate>
				</item>
			</channel>
		</rss>`;
		const result = parseFeed(xml);

		expect(result.items[0]?.publishedAt).toBeNull();
	});
});
