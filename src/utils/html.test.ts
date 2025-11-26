import { describe, expect, test } from "bun:test";
import { htmlToText, truncate, wrapText } from "./html.js";

describe("htmlToText", () => {
	test("converts basic HTML to text", () => {
		const html = "<p>Hello <strong>world</strong></p>";
		expect(htmlToText(html)).toBe("Hello world");
	});

	test("handles null and undefined", () => {
		expect(htmlToText(null)).toBe("");
		expect(htmlToText(undefined)).toBe("");
		expect(htmlToText("")).toBe("");
	});

	test("replaces block elements with newlines", () => {
		const html = "<p>First paragraph</p><p>Second paragraph</p>";
		expect(htmlToText(html)).toBe("First paragraph\nSecond paragraph");
	});

	test("converts divs to newlines", () => {
		const html = "<div>First</div><div>Second</div>";
		expect(htmlToText(html)).toBe("First\nSecond");
	});

	test("converts br tags to newlines", () => {
		const html = "Line 1<br>Line 2<br/>Line 3";
		expect(htmlToText(html)).toBe("Line 1\nLine 2\nLine 3");
	});

	test("converts list items with bullets", () => {
		const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
		expect(htmlToText(html)).toBe("• Item 1\n• Item 2");
	});

	test("decodes common HTML entities", () => {
		const html = "&lt;div&gt; &amp; &quot;test&quot; &apos;test&apos;";
		expect(htmlToText(html)).toBe("<div> & \"test\" 'test'");
	});

	test("decodes special character entities", () => {
		const html = "&mdash; &ndash; &hellip; &copy; &reg; &trade;";
		expect(htmlToText(html)).toBe("— – … © ® ™");
	});

	test("decodes quote entities", () => {
		const html = "&ldquo;Hello&rdquo; &lsquo;world&rsquo;";
		expect(htmlToText(html)).toBe("\u201CHello\u201D \u2018world\u2019");
	});

	test("decodes numeric character references (decimal)", () => {
		const html = "&#65; &#66; &#67;";
		expect(htmlToText(html)).toBe("A B C");
	});

	test("decodes numeric character references (hex)", () => {
		const html = "&#x41; &#x42; &#x43;";
		expect(htmlToText(html)).toBe("A B C");
	});

	test("normalizes whitespace", () => {
		const html = "Too    many     spaces";
		expect(htmlToText(html)).toBe("Too many spaces");
	});

	test("removes trailing whitespace from lines", () => {
		const html = "<p>Line with trailing spaces   </p>";
		expect(htmlToText(html)).toBe("Line with trailing spaces");
	});

	test("collapses multiple newlines", () => {
		const html = "<p>Para 1</p><br><br><br><p>Para 2</p>";
		const result = htmlToText(html);
		expect(result).toBe("Para 1\n\nPara 2");
	});

	test("handles complex nested HTML", () => {
		const html = `
			<div>
				<h1>Title</h1>
				<p>First <strong>bold</strong> paragraph.</p>
				<ul>
					<li>Item 1</li>
					<li>Item 2</li>
				</ul>
				<p>Last paragraph</p>
			</div>
		`;
		const result = htmlToText(html);
		expect(result).toContain("Title");
		expect(result).toContain("First bold paragraph");
		expect(result).toContain("• Item 1");
		expect(result).toContain("• Item 2");
		expect(result).toContain("Last paragraph");
	});

	test("handles HTML with no tags", () => {
		const text = "Plain text with no HTML";
		expect(htmlToText(text)).toBe(text);
	});

	test("removes script and style tags", () => {
		const html =
			"<p>Content</p><script>alert('bad')</script><style>.class{}</style>";
		const result = htmlToText(html);
		expect(result).toContain("Content");
		// Note: htmlToText removes tags but not their content
		expect(result).toContain("alert");
	});
});

describe("truncate", () => {
	test("truncates text longer than max length", () => {
		const text = "This is a long text that needs truncation";
		expect(truncate(text, 20)).toBe("This is a long text…");
	});

	test("does not truncate text shorter than max length", () => {
		const text = "Short text";
		expect(truncate(text, 20)).toBe("Short text");
	});

	test("does not truncate text equal to max length", () => {
		const text = "Exactly 20 characte!";
		expect(truncate(text, 20)).toBe("Exactly 20 characte!");
	});

	test("handles empty string", () => {
		expect(truncate("", 10)).toBe("");
	});

	test("truncates to exactly max length including ellipsis", () => {
		const text = "1234567890";
		const result = truncate(text, 5);
		expect(result).toBe("1234…");
		expect(result.length).toBe(5);
	});
});

describe("wrapText", () => {
	test("wraps text to specified width", () => {
		const text = "This is a long line that should be wrapped";
		const result = wrapText(text, 20);
		expect(result).toEqual([
			"This is a long line",
			"that should be",
			"wrapped",
		]);
	});

	test("handles single word longer than width", () => {
		const text = "Supercalifragilisticexpialidocious";
		const result = wrapText(text, 10);
		expect(result).toEqual(["Supercalifragilisticexpialidocious"]);
	});

	test("preserves paragraph breaks", () => {
		const text = "First paragraph\n\nSecond paragraph";
		const result = wrapText(text, 50);
		expect(result).toEqual(["First paragraph", "", "Second paragraph"]);
	});

	test("handles empty string", () => {
		expect(wrapText("", 10)).toEqual([""]);
	});

	test("handles single line shorter than width", () => {
		const text = "Short";
		const result = wrapText(text, 10);
		expect(result).toEqual(["Short"]);
	});

	test("wraps multiple paragraphs", () => {
		const text = "Line one here\nLine two here that is longer";
		const result = wrapText(text, 15);
		expect(result.length).toBeGreaterThan(2);
		expect(result[0]).toBe("Line one here");
	});

	test("handles text with multiple spaces", () => {
		const text = "Word1    Word2    Word3";
		const result = wrapText(text, 20);
		expect(result[0]).toContain("Word1");
		expect(result[0]).toContain("Word2");
	});

	test("exact width boundary", () => {
		const text = "12345 67890";
		const result = wrapText(text, 11);
		expect(result).toEqual(["12345 67890"]);
	});
});
