import {
	BoxRenderable,
	TextRenderable,
	type RenderContext,
	RGBA,
	type PasteEvent,
} from "@opentui/core";
import { colors } from "./theme.js";
import type { SearchResult } from "../search/types.js";
import { logger } from "../logger.js";

export class CommandPalette extends BoxRenderable {
	private dimLayer!: BoxRenderable;
	private modalBox!: BoxRenderable;
	private inputBox!: BoxRenderable;
	private inputText!: TextRenderable;
	private resultsBox!: BoxRenderable;
	private resultRenderables: BoxRenderable[] = [];

	private isOpen = false;
	private mode: "search" | "form" = "search";
	private query = "";
	private results: SearchResult[] = [];
	private selectedIndex = 0;
	private scrollOffset = 0;
	private terminalWidth: number;
	private terminalHeight: number;

	// Form state
	private formFields: Array<{ label: string; value: string }> = [];
	private currentFieldIndex = 0;
	private onFormSubmit: ((values: Record<string, string>) => void) | null =
		null;

	constructor(ctx: RenderContext, width: number, height: number) {
		super(ctx, {
			width,
			height,
			flexDirection: "column",
			backgroundColor: "transparent",
			position: "absolute",
			left: 0,
			top: 0,
			onPaste: (event: PasteEvent) => this.handlePaste(event),
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
		this.mode = "search";
		this.query = "";
		this.results = [];
		this.selectedIndex = 0;

		this.add(this.dimLayer);
		this.updateInputText();
		this.renderResults();
		this.requestRender();
	}

	openForm(
		title: string,
		fields: Array<{ label: string; placeholder?: string }>,
		onSubmit: (values: Record<string, string>) => void,
	): void {
		this.mode = "form";
		this.formFields = fields.map((f) => ({ label: f.label, value: "" }));
		this.currentFieldIndex = 0;
		this.onFormSubmit = onSubmit;

		// Update modal title
		this.modalBox.title = ` ${title} `;

		this.renderForm();
		this.requestRender();
	}

	backToSearch(): void {
		this.mode = "search";
		this.formFields = [];
		this.currentFieldIndex = 0;
		this.onFormSubmit = null;
		this.modalBox.title = undefined;

		this.updateInputText();
		this.renderResults();
		this.requestRender();
	}

	close(): void {
		if (!this.isOpen) return;

		this.isOpen = false;
		this.mode = "search";
		this.formFields = [];
		this.currentFieldIndex = 0;
		this.onFormSubmit = null;
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

	getMode(): "search" | "form" {
		return this.mode;
	}

	handleFormInput(text: string): void {
		if (this.mode !== "form") return;

		logger.debug("CommandPalette.handleFormInput", {
			text,
			textLength: text.length,
			currentFieldIndex: this.currentFieldIndex,
			currentValue: this.formFields[this.currentFieldIndex]!.value,
		});

		// Handle both single characters and pasted text
		this.formFields[this.currentFieldIndex]!.value += text;
		logger.debug("Updated field value", {
			newValue: this.formFields[this.currentFieldIndex]!.value,
		});
		this.renderForm();
	}

	handleFormBackspace(): void {
		if (this.mode !== "form") return;

		const field = this.formFields[this.currentFieldIndex]!;
		if (field.value.length > 0) {
			field.value = field.value.slice(0, -1);
			this.renderForm();
		}
	}

	handleFormNavigation(direction: "up" | "down"): void {
		if (this.mode !== "form") return;

		if (direction === "up") {
			this.currentFieldIndex = Math.max(0, this.currentFieldIndex - 1);
		} else {
			this.currentFieldIndex = Math.min(
				this.formFields.length - 1,
				this.currentFieldIndex + 1,
			);
		}
		this.renderForm();
	}

	handleFormSubmit(): void {
		if (this.mode !== "form" || !this.onFormSubmit) return;

		const values: Record<string, string> = {};
		for (const field of this.formFields) {
			values[field.label] = field.value;
		}

		this.onFormSubmit(values);
	}

	handlePaste(event: PasteEvent): void {
		logger.debug("CommandPalette.handlePaste", {
			text: event.text,
			textLength: event.text.length,
			mode: this.mode,
		});

		if (this.mode === "form") {
			// Paste into current form field
			this.handleFormInput(event.text);
		} else {
			// Paste into search query
			this.handleFormInput(event.text);
		}
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

	private renderForm(): void {
		// Clear existing result renderables
		for (const renderable of this.resultRenderables) {
			renderable.destroy();
		}
		this.resultRenderables = [];

		// Hide input box, use results area for form
		this.inputBox.height = 0;

		const resultWidth = this.resultsBox.width - 2;

		// Render instructions at top
		const instructions = new TextRenderable(this._ctx, {
			content: "Tab/j/k: navigate  Enter: submit  Esc: cancel",
			fg: colors.fgMuted,
			width: resultWidth,
			height: 1,
		});

		const instructionsBox = new BoxRenderable(this._ctx, {
			width: resultWidth,
			height: 1,
			flexDirection: "row",
			backgroundColor: "transparent",
		});

		instructionsBox.add(instructions);
		this.resultsBox.add(instructionsBox);
		this.resultRenderables.push(instructionsBox);

		// Add spacing
		const spacer = new BoxRenderable(this._ctx, {
			width: resultWidth,
			height: 1,
			backgroundColor: "transparent",
		});
		this.resultsBox.add(spacer);
		this.resultRenderables.push(spacer);

		// Render each field
		for (let i = 0; i < this.formFields.length; i++) {
			const field = this.formFields[i]!;
			const isActive = i === this.currentFieldIndex;

			// Field label
			const labelBox = new BoxRenderable(this._ctx, {
				width: resultWidth,
				height: 1,
				flexDirection: "row",
				backgroundColor: "transparent",
			});

			const labelText = new TextRenderable(this._ctx, {
				content: field.label,
				fg: isActive ? colors.accent : colors.fgDim,
				width: resultWidth,
				height: 1,
			});

			labelBox.add(labelText);
			this.resultsBox.add(labelBox);
			this.resultRenderables.push(labelBox);

			// Field input
			const inputRow = new BoxRenderable(this._ctx, {
				width: resultWidth,
				height: 1,
				flexDirection: "row",
				backgroundColor: isActive ? colors.bgHighlight : colors.bg,
			});

			const cursor = isActive ? "█" : "";
			const inputContent = `  ${field.value}${cursor}`;

			const inputText = new TextRenderable(this._ctx, {
				content: inputContent,
				fg: colors.fg,
				width: resultWidth,
				height: 1,
			});

			inputRow.add(inputText);
			this.resultsBox.add(inputRow);
			this.resultRenderables.push(inputRow);

			// Add spacing between fields
			if (i < this.formFields.length - 1) {
				const fieldSpacer = new BoxRenderable(this._ctx, {
					width: resultWidth,
					height: 1,
					backgroundColor: "transparent",
				});
				this.resultsBox.add(fieldSpacer);
				this.resultRenderables.push(fieldSpacer);
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
