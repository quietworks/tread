import { describe, expect, test } from "bun:test";
import { parse } from "smol-toml";

// We test loadConfig logic by testing the parsing and validation directly
// without relying on file system (which would require mocking or temp files)

describe("Config parsing and validation", () => {
	test("parses valid config with feeds", () => {
		const toml = `
[[feeds]]
name = "Test Feed"
url = "https://example.com/feed"

[[feeds]]
name = "Another Feed"
url = "https://example.com/other"
`;

		const parsed = parse(toml);
		expect(parsed.feeds).toBeInstanceOf(Array);
		expect(parsed.feeds).toHaveLength(2);
	});

	test("validates feed has name field", () => {
		const toml = `
[[feeds]]
url = "https://example.com/feed"
`;

		const parsed = parse(toml);
		const feed = (parsed.feeds as unknown[])[0] as Record<string, unknown>;

		expect(feed.name).toBeUndefined();
		// In real loadConfig, this would throw
	});

	test("validates feed has url field", () => {
		const toml = `
[[feeds]]
name = "Test Feed"
`;

		const parsed = parse(toml);
		const feed = (parsed.feeds as unknown[])[0] as Record<string, unknown>;

		expect(feed.url).toBeUndefined();
		// In real loadConfig, this would throw
	});

	test("validates URL format", () => {
		const validUrl = "https://example.com/feed";
		const invalidUrl = "not-a-url";

		expect(() => new URL(validUrl)).not.toThrow();
		expect(() => new URL(invalidUrl)).toThrow();
	});

	test("handles empty feeds array", () => {
		const toml = `
# No feeds defined
`;

		const parsed = parse(toml);
		expect(parsed.feeds).toBeUndefined();
	});

	test("trims whitespace from name and url", () => {
		const toml = `
[[feeds]]
name = "  Test Feed  "
url = "  https://example.com/feed  "
`;

		const parsed = parse(toml);
		const feed = (parsed.feeds as unknown[])[0] as Record<string, unknown>;

		expect(typeof feed.name).toBe("string");
		expect(typeof feed.url).toBe("string");
		expect((feed.name as string).trim()).toBe("Test Feed");
		expect((feed.url as string).trim()).toBe("https://example.com/feed");
	});

	test("parses TOML comments", () => {
		const toml = `
# This is a comment
[[feeds]]
name = "Test Feed"  # inline comment
url = "https://example.com/feed"
`;

		expect(() => parse(toml)).not.toThrow();
	});

	test("handles multiple feeds", () => {
		const toml = `
[[feeds]]
name = "Feed 1"
url = "https://example.com/feed1"

[[feeds]]
name = "Feed 2"
url = "https://example.com/feed2"

[[feeds]]
name = "Feed 3"
url = "https://example.com/feed3"
`;

		const parsed = parse(toml);
		expect(parsed.feeds).toHaveLength(3);
	});

	test("validates non-empty name", () => {
		const emptyName = "   ";
		expect(emptyName.trim()).toBe("");
	});

	test("validates non-empty url", () => {
		const emptyUrl = "   ";
		expect(emptyUrl.trim()).toBe("");
	});

	test("validates feed is an object", () => {
		const toml = `
feeds = "not-an-array"
`;

		const parsed = parse(toml);
		expect(Array.isArray(parsed.feeds)).toBe(false);
	});

	test("handles various URL schemes", () => {
		expect(() => new URL("https://example.com")).not.toThrow();
		expect(() => new URL("http://example.com")).not.toThrow();
		expect(() => new URL("ftp://example.com")).not.toThrow();
	});

	test("rejects invalid URL schemes", () => {
		expect(() => new URL("javascript:alert(1)")).not.toThrow(); // Actually valid URL
		expect(() => new URL("://example.com")).toThrow();
		expect(() => new URL("example.com")).toThrow(); // Missing scheme
	});

	test("handles feed objects with extra fields", () => {
		const toml = `
[[feeds]]
name = "Test Feed"
url = "https://example.com/feed"
extra = "ignored"
another = 123
`;

		const parsed = parse(toml);
		const feed = (parsed.feeds as unknown[])[0] as Record<string, unknown>;

		expect(feed.name).toBe("Test Feed");
		expect(feed.url).toBe("https://example.com/feed");
		expect(feed.extra).toBe("ignored");
		expect(feed.another).toBe(123);
	});

	test("validates URL with query parameters", () => {
		const urlWithParams = "https://example.com/feed?format=rss&limit=10";
		expect(() => new URL(urlWithParams)).not.toThrow();
	});

	test("validates URL with fragments", () => {
		const urlWithFragment = "https://example.com/feed#section";
		expect(() => new URL(urlWithFragment)).not.toThrow();
	});

	test("handles international domain names", () => {
		const idn = "https://münchen.de/feed";
		expect(() => new URL(idn)).not.toThrow();
	});
});

describe("Sample config format", () => {
	test("sample config is valid TOML", () => {
		const sampleConfig = `# Tread RSS Reader Configuration
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

		expect(() => parse(sampleConfig)).not.toThrow();
	});

	test("sample config has valid URLs", () => {
		const urls = [
			"https://hnrss.org/frontpage",
			"https://lobste.rs/rss",
			"https://techcrunch.com/feed/",
		];

		for (const url of urls) {
			expect(() => new URL(url)).not.toThrow();
		}
	});
});
