const ENTITY_MAP: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&apos;": "'",
	"&nbsp;": " ",
	"&mdash;": "\u2014",
	"&ndash;": "\u2013",
	"&hellip;": "\u2026",
	"&ldquo;": "\u201C",
	"&rdquo;": "\u201D",
	"&lsquo;": "\u2018",
	"&rsquo;": "\u2019",
	"&copy;": "\u00A9",
	"&reg;": "\u00AE",
	"&trade;": "\u2122",
};

function decodeEntities(text: string): string {
	let result = text;

	for (const [entity, char] of Object.entries(ENTITY_MAP)) {
		result = result.replaceAll(entity, char);
	}

	result = result.replace(/&#(\d+);/g, (_, code) =>
		String.fromCharCode(parseInt(code, 10)),
	);

	result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
		String.fromCharCode(parseInt(code, 16)),
	);

	return result;
}

export function htmlToText(html: string | null | undefined): string {
	if (!html) {
		return "";
	}

	let text = html;

	// Replace block elements with newlines
	text = text.replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, "\n");
	text = text.replace(/<(br|hr)[^>]*\/?>/gi, "\n");
	text = text.replace(/<li[^>]*>/gi, "\u2022 ");

	// Remove all remaining tags
	text = text.replace(/<[^>]+>/g, "");

	// Decode HTML entities
	text = decodeEntities(text);

	// Normalize whitespace
	text = text.replace(/[ \t]+/g, " ");
	text = text.replace(/\n[ \t]+/g, "\n");
	text = text.replace(/[ \t]+\n/g, "\n");
	text = text.replace(/\n{3,}/g, "\n\n");

	return text.trim();
}

export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return text.slice(0, maxLength - 1) + "\u2026";
}

export function wrapText(text: string, width: number): string[] {
	const lines: string[] = [];
	const paragraphs = text.split("\n");

	for (const paragraph of paragraphs) {
		if (paragraph.length === 0) {
			lines.push("");
			continue;
		}

		const words = paragraph.split(" ");
		let currentLine = "";

		for (const word of words) {
			if (currentLine.length === 0) {
				currentLine = word;
			} else if (currentLine.length + 1 + word.length <= width) {
				currentLine += " " + word;
			} else {
				lines.push(currentLine);
				currentLine = word;
			}
		}

		if (currentLine.length > 0) {
			lines.push(currentLine);
		}
	}

	return lines;
}
