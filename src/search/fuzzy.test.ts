import { describe, expect, test } from "bun:test";
import { fuzzyMatch, rankMatches } from "./fuzzy.js";

describe("fuzzyMatch", () => {
	test("matches exact string", () => {
		const result = fuzzyMatch("test", "test");
		expect(result).not.toBeNull();
		expect(result?.score).toBeGreaterThan(0);
	});

	test("matches case-insensitively", () => {
		const result = fuzzyMatch("test", "TEST");
		expect(result).not.toBeNull();
		expect(result?.score).toBeGreaterThan(0);
	});

	test("returns null when character is missing", () => {
		const result = fuzzyMatch("xyz", "abc");
		expect(result).toBeNull();
	});

	test("matches characters in sequence", () => {
		const result = fuzzyMatch("tst", "test");
		expect(result).not.toBeNull();
		expect(result?.indices).toEqual([0, 2, 3]);
	});

	test("returns empty match for empty query", () => {
		const result = fuzzyMatch("", "test");
		expect(result).toEqual({ score: 0, indices: [] });
	});

	test("gives bonus for consecutive matches", () => {
		const consecutive = fuzzyMatch("te", "test");
		const nonConsecutive = fuzzyMatch("tt", "test");

		expect(consecutive?.score).toBeGreaterThan(nonConsecutive?.score ?? 0);
	});

	test("gives bonus for word boundary matches", () => {
		const wordBoundary = fuzzyMatch("ft", "foo test");
		const noWordBoundary = fuzzyMatch("ft", "fooatest");

		expect(wordBoundary?.score).toBeGreaterThan(noWordBoundary?.score ?? 0);
	});

	test("gives bonus for start of string", () => {
		const atStart = fuzzyMatch("t", "test");
		const notAtStart = fuzzyMatch("e", "test");

		expect(atStart?.score).toBeGreaterThan(notAtStart?.score ?? 0);
	});

	test("handles word boundary after space", () => {
		const result = fuzzyMatch("tc", "test case");
		expect(result).not.toBeNull();
		expect(result?.indices).toEqual([0, 5]);
	});

	test("handles word boundary after dash", () => {
		const result = fuzzyMatch("fb", "foo-bar");
		expect(result).not.toBeNull();
		expect(result?.indices).toEqual([0, 4]);
	});

	test("handles word boundary after underscore", () => {
		const result = fuzzyMatch("fb", "foo_bar");
		expect(result).not.toBeNull();
		expect(result?.indices).toEqual([0, 4]);
	});

	test("handles word boundary after slash", () => {
		const result = fuzzyMatch("fb", "foo/bar");
		expect(result).not.toBeNull();
		expect(result?.indices).toEqual([0, 4]);
	});

	test("applies length penalty", () => {
		const shorter = fuzzyMatch("test", "test");
		const longer = fuzzyMatch("test", "test with extra words");

		expect(shorter?.score).toBeGreaterThan(longer?.score ?? 0);
	});

	test("matches abbreviations", () => {
		const result = fuzzyMatch("rss", "Really Simple Syndication");
		expect(result).not.toBeNull();
		expect(result?.indices).toEqual([0, 7, 14]);
	});

	test("matches file paths", () => {
		const result = fuzzyMatch("sfp", "src/feed/parser.ts");
		expect(result).not.toBeNull();
	});

	test("prefers shorter matches with same characters", () => {
		const short = fuzzyMatch("abc", "abc");
		const long = fuzzyMatch("abc", "aabbcc");

		expect(short?.score).toBeGreaterThan(long?.score ?? 0);
	});

	test("handles special characters", () => {
		const result = fuzzyMatch("test", "test$extra");
		expect(result).not.toBeNull();
	});

	test("returns correct indices for scattered match", () => {
		const result = fuzzyMatch("ace", "abcdef");
		expect(result?.indices).toEqual([0, 2, 4]);
	});

	test("matches CamelCase", () => {
		const result = fuzzyMatch("fpc", "FeedParserClass");
		expect(result).not.toBeNull();
		expect(result?.score).toBeGreaterThan(0);
	});
});

describe("rankMatches", () => {
	interface TestItem {
		name: string;
		value: number;
	}

	const items: TestItem[] = [
		{ name: "test", value: 1 },
		{ name: "testing", value: 2 },
		{ name: "best", value: 3 },
		{ name: "rest", value: 4 },
		{ name: "foo", value: 5 },
	];

	test("ranks items by fuzzy match score", () => {
		const results = rankMatches("test", items, (item) => item.name);

		expect(results.length).toBeGreaterThan(0);
		expect(results[0]?.item.name).toBe("test");
	});

	test("filters out non-matching items", () => {
		const results = rankMatches("xyz", items, (item) => item.name);

		expect(results).toHaveLength(0);
	});

	test("sorts by score descending", () => {
		const results = rankMatches("est", items, (item) => item.name);

		for (let i = 1; i < results.length; i++) {
			expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
		}
	});

	test("applies weight to scores", () => {
		const weight1 = rankMatches("test", items, (item) => item.name, 1.0);
		const weight2 = rankMatches("test", items, (item) => item.name, 2.0);

		expect(weight2[0]?.score).toBe((weight1[0]?.score ?? 0) * 2);
	});

	test("includes match indices in results", () => {
		const results = rankMatches("tst", items, (item) => item.name);

		expect(results[0]?.indices).toBeDefined();
		expect(Array.isArray(results[0]?.indices)).toBe(true);
	});

	test("handles empty items array", () => {
		const results = rankMatches<TestItem>("test", [], (item) => item.name);

		expect(results).toHaveLength(0);
	});

	test("handles empty query", () => {
		const results = rankMatches("", items, (item) => item.name);

		// Empty query matches everything with score 0
		expect(results.length).toBe(items.length);
		expect(results[0]?.score).toBe(0);
	});

	test("uses custom search string extractor", () => {
		const results = rankMatches("5", items, (item) => item.value.toString());

		expect(results.length).toBe(1);
		expect(results[0]?.item.value).toBe(5);
	});

	test("ranks exact matches higher than partial", () => {
		const results = rankMatches("test", items, (item) => item.name);

		expect(results[0]?.item.name).toBe("test");
		expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
	});

	test("ranks start matches higher than middle", () => {
		const testItems = [
			{ name: "xtest", value: 1 },
			{ name: "testx", value: 2 },
		];

		const results = rankMatches("test", testItems, (item) => item.name);

		expect(results[0]?.item.name).toBe("testx");
	});
});
