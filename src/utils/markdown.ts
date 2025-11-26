import TurndownService from "turndown";

const turndown = new TurndownService({
	headingStyle: "atx",
	codeBlockStyle: "fenced",
	bulletListMarker: "-",
	emDelimiter: "*",
	strongDelimiter: "**",
});

// Custom rule for images - show alt text in terminal-friendly format
turndown.addRule("images", {
	filter: "img",
	replacement: (_content, node) => {
		const element = node as HTMLElement;
		const alt = element.getAttribute("alt") || "image";
		return `[Image: ${alt}]`;
	},
});

// Custom rule for figures - preserve image alt and optional caption
turndown.addRule("figures", {
	filter: "figure",
	replacement: (content) => {
		return `\n${content}\n`;
	},
});

// Custom rule for figcaption
turndown.addRule("figcaption", {
	filter: "figcaption",
	replacement: (content) => {
		return `*${content.trim()}*`;
	},
});

// Custom rule for horizontal rules
turndown.addRule("horizontalRule", {
	filter: "hr",
	replacement: () => {
		return "\n---\n";
	},
});

// Custom rule for videos - show placeholder
turndown.addRule("videos", {
	filter: "video",
	replacement: (_content, node) => {
		const element = node as HTMLElement;
		const src = element.getAttribute("src") || "";
		return `[Video: ${src}]`;
	},
});

// Custom rule for iframes (embedded content)
turndown.addRule("iframes", {
	filter: "iframe",
	replacement: (_content, node) => {
		const element = node as HTMLElement;
		const src = element.getAttribute("src") || "embedded content";
		return `[Embedded: ${src}]`;
	},
});

/**
 * Convert HTML content to Markdown for terminal display.
 * Uses turndown with custom rules optimized for RSS feed content.
 */
export function htmlToMarkdown(html: string | null | undefined): string {
	if (!html) return "";

	try {
		// Clean up common RSS feed artifacts before conversion
		const cleaned = html
			// Remove CDATA wrappers
			.replace(/<!\[CDATA\[/g, "")
			.replace(/\]\]>/g, "")
			// Normalize whitespace in tags
			.replace(/>\s+</g, ">\n<");

		const markdown = turndown.turndown(cleaned);

		// Post-process: normalize multiple blank lines
		return markdown.replace(/\n{3,}/g, "\n\n").trim();
	} catch {
		// If conversion fails, fall back to basic text extraction
		return html
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}
}

/**
 * Check if content appears to be HTML (has tags)
 */
export function isHtml(content: string | null | undefined): boolean {
	if (!content) return false;
	return /<[a-z][\s\S]*>/i.test(content);
}
