import {
	BoxRenderable,
	TextRenderable,
	type RenderContext,
	RGBA,
} from "@opentui/core";
import { colors } from "./theme.js";
import type { SearchResult } from "../search/types.js";

export class CommandPalette extends BoxRenderable {
	private dimLayer!: BoxRenderable;
	private modalBox!: BoxRenderable;
	private inputBox!: BoxRenderable;
	private inputText!: TextRenderable;
	private resultsBox!: BoxRenderable;
	private resultRenderables: BoxRenderable[] = [];

	private isOpen = false;
	private query = "";
	private results: SearchResult[] = [];
	private selectedIndex = 0;
	private scrollOffset = 0;
	private terminalWidth: number;
	private terminalHeight: number;

	constructor(ctx: RenderContext, width: number, height: number) {
		super(ctx, {
			width,
			height,
			flexDirection: "column",
			backgroundColor: "transparent",
			position: "absolute",
			left: 0,
			top: 0,
		});

		this.terminalWidth = width;
		this.terminalHeight = height;

		this.buildUI();
		// Start hidden - don't add dimLayer until open() is called
	}

	private buildUI(): void {
		// Dim layer (full screen, semi-transparent black)
		this.dimLayer = new BoxRenderable(this._ctx, {
			width: this.terminalWidth,
			height: this.terminalHeight,
			backgroundColor: RGBA.fromInts(0, 0, 0, 150),
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
		});

		// Modal box (60% width, 80% height, centered)
		const modalWidth = Math.floor(this.terminalWidth * 0.6);
		const modalHeight = Math.floor(this.terminalHeight * 0.8);

		this.modalBox = new BoxRenderable(this._ctx, {
			width: modalWidth,
			height: modalHeight,
			backgroundColor: colors.bgLight,
			border: true,
			borderColor: colors.borderFocused,
			flexDirection: "column",
		});

		// Input box (3 lines)
		this.inputBox = new BoxRenderable(this._ctx, {
			width: modalWidth - 2, // Account for border
			height: 3,
			backgroundColor: colors.bg,
			flexDirection: "column",
			paddingLeft: 1,
			paddingTop: 1,
		});

		this.inputText = new TextRenderable(this._ctx, {
			content: "> ",
			fg: colors.fg,
			width: modalWidth - 4,
			height: 1,
		});

		this.inputBox.add(this.inputText);

		// Results box (remaining height, scrollable)
		this.resultsBox = new BoxRenderable(this._ctx, {
			width: modalWidth - 2,
			height: modalHeight - 3 - 2, // Subtract input height and borders
			backgroundColor: colors.bgLight,
			flexDirection: "column",
			paddingLeft: 1,
			paddingRight: 1,
		});

		// Build structure
		this.modalBox.add(this.inputBox);
		this.modalBox.add(this.resultsBox);
		this.dimLayer.add(this.modalBox);
	}

	open(): void {
		if (this.isOpen) return;

		this.isOpen = true;
		this.query = "";
		this.results = [];
		this.selectedIndex = 0;

		this.add(this.dimLayer);
		this.updateInputText();
		this.renderResults();
		this.requestRender();
	}

	close(): void {
		if (!this.isOpen) return;

		this.isOpen = false;
		this.dimLayer.destroy();
		this.buildUI(); // Rebuild for next open
		this.requestRender();
	}

	setQuery(query: string): void {
		this.query = query;
		this.updateInputText();
	}

	setResults(results: SearchResult[]): void {
		this.results = results;
		this.selectedIndex = 0;
		this.scrollOffset = 0;
		this.renderResults();
	}

	moveSelection(direction: "up" | "down"): void {
		if (this.results.length === 0) return;

		if (direction === "up") {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
		} else {
			this.selectedIndex = Math.min(
				this.results.length - 1,
				this.selectedIndex + 1,
			);
		}

		this.updateScrollOffset();
		this.renderResults();
	}

	private updateScrollOffset(): void {
		const visibleCount = this.resultsBox.height;

		// Keep selection visible with some padding
		const padding = 2;
		if (this.selectedIndex < this.scrollOffset + padding) {
			this.scrollOffset = Math.max(0, this.selectedIndex - padding);
		} else if (
			this.selectedIndex >=
			this.scrollOffset + visibleCount - padding
		) {
			this.scrollOffset = Math.min(
				Math.max(0, this.results.length - visibleCount),
				this.selectedIndex - visibleCount + padding + 1,
			);
		}
	}

	getSelectedResult(): SearchResult | null {
		return this.results[this.selectedIndex] ?? null;
	}

	updateDimensions(width: number, height: number): void {
		this.terminalWidth = width;
		this.terminalHeight = height;
		this.width = width;
		this.height = height;

		if (this.isOpen) {
			this.close();
			this.open();
		}
	}

	private updateInputText(): void {
		const cursor = "█";
		this.inputText.content = `> ${this.query}${cursor}`;
		this.requestRender();
	}

	private renderResults(): void {
		// Clear existing result renderables
		for (const renderable of this.resultRenderables) {
			renderable.destroy();
		}
		this.resultRenderables = [];

		const resultWidth = this.resultsBox.width - 2;

		if (this.results.length === 0) {
			// Show placeholder or "no results" message
			const message = this.query
				? "No results found"
				: "Type to search commands, feeds, and articles...";

			const msgText = new TextRenderable(this._ctx, {
				content: message,
				fg: colors.fgDim,
				width: resultWidth,
				height: 1,
			});

			const msgBox = new BoxRenderable(this._ctx, {
				width: resultWidth,
				height: 1,
				flexDirection: "row",
				backgroundColor: "transparent",
			});

			msgBox.add(msgText);
			this.resultsBox.add(msgBox);
			this.resultRenderables.push(msgBox);
		} else {
			// Render visible results only
			const visibleCount = this.resultsBox.height;
			const visibleResults = this.results.slice(
				this.scrollOffset,
				this.scrollOffset + visibleCount,
			);

			for (let i = 0; i < visibleResults.length; i++) {
				const actualIndex = this.scrollOffset + i;
				const result = visibleResults[i]!;
				const isSelected = actualIndex === this.selectedIndex;

				const resultRow = new BoxRenderable(this._ctx, {
					width: resultWidth,
					height: 1,
					flexDirection: "row",
					backgroundColor: isSelected ? colors.bgHighlight : "transparent",
				});

				// Type indicator
				const icon = this.getIcon(result.type);

				// Format label and description
				const maxLabelWidth = resultWidth - 30; // Reserve space for description
				const label =
					result.label.length > maxLabelWidth
						? result.label.slice(0, maxLabelWidth - 1) + "…"
						: result.label;

				const description = result.description || "";
				const maxDescWidth = 25;
				const desc =
					description.length > maxDescWidth
						? description.slice(0, maxDescWidth - 1) + "…"
						: description;

				// Calculate spacing
				const spacing = " ".repeat(
					Math.max(1, resultWidth - label.length - desc.length - 4),
				);

				const content = `${icon} ${label}${spacing}${desc}`;

				const text = new TextRenderable(this._ctx, {
					content,
					fg: isSelected ? colors.fg : colors.fgDim,
					width: resultWidth,
					height: 1,
				});

				resultRow.add(text);
				this.resultsBox.add(resultRow);
				this.resultRenderables.push(resultRow);
			}
		}

		this.requestRender();
	}

	private getIcon(type: SearchResult["type"]): string {
		switch (type) {
			case "command":
				return "⌘";
			case "feed":
				return "📰";
			case "article":
				return "📄";
		}
	}
}
