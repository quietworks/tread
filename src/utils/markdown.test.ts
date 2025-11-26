import { describe, expect, test } from "bun:test";
import { htmlToMarkdown, isHtml } from "./markdown.js";

describe("htmlToMarkdown", () => {
	test("converts basic paragraphs", () => {
		const html = "<p>Hello world</p>";
		expect(htmlToMarkdown(html)).toBe("Hello world");
	});

	test("converts headings", () => {
		expect(htmlToMarkdown("<h1>Title</h1>")).toBe("# Title");
		expect(htmlToMarkdown("<h2>Subtitle</h2>")).toBe("## Subtitle");
		expect(htmlToMarkdown("<h3>Section</h3>")).toBe("### Section");
	});

	test("converts bold and italic", () => {
		expect(htmlToMarkdown("<strong>bold</strong>")).toBe("**bold**");
		expect(htmlToMarkdown("<b>bold</b>")).toBe("**bold**");
		expect(htmlToMarkdown("<em>italic</em>")).toBe("*italic*");
		expect(htmlToMarkdown("<i>italic</i>")).toBe("*italic*");
	});

	test("converts links", () => {
		const html = '<a href="https://example.com">Click here</a>';
		expect(htmlToMarkdown(html)).toBe("[Click here](https://example.com)");
	});

	test("converts unordered lists", () => {
		const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
		const result = htmlToMarkdown(html);
		expect(result).toContain("Item 1");
		expect(result).toContain("Item 2");
		expect(result).toMatch(/-\s+Item 1/);
	});

	test("converts ordered lists", () => {
		const html = "<ol><li>First</li><li>Second</li></ol>";
		const result = htmlToMarkdown(html);
		expect(result).toContain("First");
		expect(result).toContain("Second");
		expect(result).toMatch(/1\.\s+First/);
	});

	test("converts blockquotes", () => {
		const html = "<blockquote>A wise quote</blockquote>";
		expect(htmlToMarkdown(html)).toContain("> A wise quote");
	});

	test("converts inline code", () => {
		const html = "<code>const x = 1</code>";
		expect(htmlToMarkdown(html)).toBe("`const x = 1`");
	});

	test("converts code blocks", () => {
		const html = "<pre><code>function foo() {\n  return 1;\n}</code></pre>";
		const result = htmlToMarkdown(html);
		expect(result).toContain("```");
		expect(result).toContain("function foo()");
	});

	test("converts images to alt text", () => {
		const html = '<img src="image.jpg" alt="A beautiful sunset">';
		expect(htmlToMarkdown(html)).toBe("[Image: A beautiful sunset]");
	});

	test("handles images without alt text", () => {
		const html = '<img src="image.jpg">';
		expect(htmlToMarkdown(html)).toBe("[Image: image]");
	});

	test("converts horizontal rules", () => {
		const html = "<p>Before</p><hr><p>After</p>";
		const result = htmlToMarkdown(html);
		expect(result).toContain("---");
	});

	test("handles null and undefined", () => {
		expect(htmlToMarkdown(null)).toBe("");
		expect(htmlToMarkdown(undefined)).toBe("");
	});

	test("handles empty string", () => {
		expect(htmlToMarkdown("")).toBe("");
	});

	test("handles plain text", () => {
		expect(htmlToMarkdown("Just plain text")).toBe("Just plain text");
	});

	test("strips CDATA wrappers", () => {
		const html = "<![CDATA[<p>Content</p>]]>";
		const result = htmlToMarkdown(html);
		expect(result).not.toContain("CDATA");
		expect(result).toContain("Content");
	});

	test("normalizes multiple blank lines", () => {
		const html = "<p>First</p>\n\n\n\n<p>Second</p>";
		const result = htmlToMarkdown(html);
		expect(result).not.toMatch(/\n{3,}/);
	});

	test("converts complex nested HTML", () => {
		const html = `
			<article>
				<h1>Article Title</h1>
				<p>This is a <strong>bold</strong> statement with a <a href="https://example.com">link</a>.</p>
				<blockquote>
					<p>A nested quote with <em>emphasis</em>.</p>
				</blockquote>
			</article>
		`;
		const result = htmlToMarkdown(html);
		expect(result).toContain("# Article Title");
		expect(result).toContain("**bold**");
		expect(result).toContain("[link](https://example.com)");
		expect(result).toContain("*emphasis*");
	});

	test("handles iframes as embedded content", () => {
		const html = '<iframe src="https://youtube.com/embed/abc"></iframe>';
		expect(htmlToMarkdown(html)).toContain("[Embedded:");
	});
});

describe("isHtml", () => {
	test("returns true for HTML content", () => {
		expect(isHtml("<p>Hello</p>")).toBe(true);
		expect(isHtml("<div>Content</div>")).toBe(true);
		expect(isHtml("Some text <br> more")).toBe(true);
	});

	test("returns false for plain text", () => {
		expect(isHtml("Just plain text")).toBe(false);
		expect(isHtml("No tags here")).toBe(false);
	});

	test("returns false for null/undefined/empty", () => {
		expect(isHtml(null)).toBe(false);
		expect(isHtml(undefined)).toBe(false);
		expect(isHtml("")).toBe(false);
	});
});
