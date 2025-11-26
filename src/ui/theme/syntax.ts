import { SyntaxStyle, RGBA } from "@opentui/core";
import type { ColorPalette } from "./colors.js";

interface SyntaxRule {
	scope: string[];
	style: {
		foreground?: RGBA;
		background?: RGBA;
		bold?: boolean;
		italic?: boolean;
		underline?: boolean;
	};
}

function hexToRGBA(hex: string): RGBA {
	return RGBA.fromHex(hex);
}

export function createSyntaxStyle(colors: ColorPalette): SyntaxStyle {
	const rules: SyntaxRule[] = [
		// Markdown headings
		{
			scope: ["markup.heading", "markup.heading.1", "markup.heading.2"],
			style: {
				foreground: hexToRGBA(colors.primary),
				bold: true,
			},
		},
		{
			scope: [
				"markup.heading.3",
				"markup.heading.4",
				"markup.heading.5",
				"markup.heading.6",
			],
			style: {
				foreground: hexToRGBA(colors.secondary),
				bold: true,
			},
		},
		// Bold/Strong
		{
			scope: ["markup.bold", "markup.strong"],
			style: {
				foreground: hexToRGBA(colors.fg),
				bold: true,
			},
		},
		// Italic/Emphasis
		{
			scope: ["markup.italic"],
			style: {
				foreground: hexToRGBA(colors.fg),
				italic: true,
			},
		},
		// Code blocks and inline code
		{
			scope: ["markup.raw", "markup.raw.block"],
			style: {
				foreground: hexToRGBA(colors.accent),
			},
		},
		{
			scope: ["markup.raw.inline"],
			style: {
				foreground: hexToRGBA(colors.accent),
				background: hexToRGBA(colors.bgHighlight),
			},
		},
		// Links
		{
			scope: ["markup.link", "markup.link.url"],
			style: {
				foreground: hexToRGBA(colors.primary),
				underline: true,
			},
		},
		{
			scope: ["markup.link.label"],
			style: {
				foreground: hexToRGBA(colors.primary),
				underline: true,
			},
		},
		// Blockquotes
		{
			scope: ["markup.quote"],
			style: {
				foreground: hexToRGBA(colors.fgMuted),
				italic: true,
			},
		},
		// Lists
		{
			scope: ["markup.list", "punctuation.definition.list"],
			style: {
				foreground: hexToRGBA(colors.fgMuted),
			},
		},
		// Strikethrough
		{
			scope: ["markup.strikethrough"],
			style: {
				foreground: hexToRGBA(colors.fgDim),
			},
		},
		// Underline
		{
			scope: ["markup.underline"],
			style: {
				foreground: hexToRGBA(colors.fg),
				underline: true,
			},
		},
		// Checked/unchecked list items
		{
			scope: ["markup.list.checked"],
			style: {
				foreground: hexToRGBA(colors.success),
			},
		},
		{
			scope: ["markup.list.unchecked"],
			style: {
				foreground: hexToRGBA(colors.fgMuted),
			},
		},
		// Default text
		{
			scope: ["spell", "nospell"],
			style: {
				foreground: hexToRGBA(colors.fg),
			},
		},
	];

	return SyntaxStyle.fromTheme(rules);
}
