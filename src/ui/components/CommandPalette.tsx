import { For, Show, createMemo } from "solid-js";
import type { JSX } from "@opentui/solid";
import { RGBA, type PasteEvent } from "@opentui/core";
import type { SearchResult } from "../../search/types.js";
import { useTheme } from "../theme/index.js";

export interface CommandPaletteProps {
	isOpen: boolean;
	terminalWidth: number;
	terminalHeight: number;
	mode: "search" | "form";
	query: string;
	results: SearchResult[];
	selectedIndex: number;
	formTitle?: string;
	formFields?: Array<{ label: string; value: string }>;
	currentFieldIndex?: number;
	onPaste?: (event: PasteEvent) => void;
}

function getIcon(type: SearchResult["type"]): string {
	switch (type) {
		case "command":
			return "\u2318";
		case "feed":
			return "\ud83d\udcf0";
		case "article":
			return "\ud83d\udcc4";
	}
}

export function CommandPalette(props: CommandPaletteProps): JSX.Element {
	const { colors } = useTheme();

	const modalWidth = createMemo(() => Math.floor(props.terminalWidth * 0.6));
	const modalHeight = createMemo(() => Math.floor(props.terminalHeight * 0.8));
	const resultWidth = createMemo(() => modalWidth() - 4);
	const visibleCount = createMemo(() => modalHeight() - 5);

	const scrollOffset = createMemo(() => {
		const visCount = visibleCount();
		const padding = 2;
		let offset = 0;

		if (props.selectedIndex < offset + padding) {
			offset = Math.max(0, props.selectedIndex - padding);
		} else if (props.selectedIndex >= offset + visCount - padding) {
			offset = Math.min(
				Math.max(0, props.results.length - visCount),
				props.selectedIndex - visCount + padding + 1,
			);
		}

		return offset;
	});

	const visibleResults = createMemo(() => {
		return props.results.slice(scrollOffset(), scrollOffset() + visibleCount());
	});

	return (
		<Show when={props.isOpen}>
			<box
				width={props.terminalWidth}
				height={props.terminalHeight}
				flexDirection="column"
				backgroundColor="transparent"
				position="absolute"
				left={0}
				top={0}
				onPaste={props.onPaste}
			>
				{/* Dim layer */}
				<box
					width={props.terminalWidth}
					height={props.terminalHeight}
					backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
				>
					{/* Modal box */}
					<box
						width={modalWidth()}
						height={modalHeight()}
						backgroundColor={colors.bgLight}
						border={true}
						borderColor={colors.borderFocused}
						flexDirection="column"
						title={props.mode === "form" ? ` ${props.formTitle} ` : undefined}
					>
						{/* Search mode */}
						<Show when={props.mode === "search"}>
							{/* Input box */}
							<box
								width={modalWidth() - 2}
								height={3}
								backgroundColor={colors.bg}
								flexDirection="column"
								paddingLeft={1}
								paddingTop={1}
							>
								<text fg={colors.fg} wrapMode="none">
									{"> "}
									{props.query}
									{"\u2588"}
								</text>
							</box>

							{/* Results box */}
							<box
								width={modalWidth() - 2}
								flexGrow={1}
								backgroundColor={colors.bgLight}
								flexDirection="column"
								paddingLeft={1}
								paddingRight={1}
							>
								<Show
									when={props.results.length > 0}
									fallback={
										<text fg={colors.fgDim} wrapMode="none">
											{props.query
												? "No results found"
												: "Type to search commands, feeds, and articles..."}
										</text>
									}
								>
									<For each={visibleResults()}>
										{(result, i) => {
											const actualIndex = () => scrollOffset() + i();
											const isSelected = () =>
												actualIndex() === props.selectedIndex;

											const maxLabelWidth = resultWidth() - 30;
											const label = () =>
												result.label.length > maxLabelWidth
													? `${result.label.slice(0, maxLabelWidth - 1)}\u2026`
													: result.label;

											const description = result.description || "";
											const maxDescWidth = 25;
											const desc =
												description.length > maxDescWidth
													? `${description.slice(0, maxDescWidth - 1)}\u2026`
													: description;

											const spacing = () =>
												" ".repeat(
													Math.max(
														1,
														resultWidth() - label().length - desc.length - 4,
													),
												);

											return (
												<box
													height={1}
													flexDirection="row"
													backgroundColor={
														isSelected() ? colors.bgHighlight : "transparent"
													}
												>
													<text
														fg={isSelected() ? colors.fg : colors.fgDim}
														wrapMode="none"
													>
														{getIcon(result.type)} {label()}
														{spacing()}
														{desc}
													</text>
												</box>
											);
										}}
									</For>
								</Show>
							</box>
						</Show>

						{/* Form mode */}
						<Show when={props.mode === "form" && props.formFields}>
							<box
								width={modalWidth() - 2}
								flexGrow={1}
								backgroundColor={colors.bgLight}
								flexDirection="column"
								paddingLeft={1}
								paddingRight={1}
							>
								{/* Instructions */}
								<text fg={colors.fgMuted} wrapMode="none">
									Tab/j/k: navigate Enter: submit Esc: cancel
								</text>

								{/* Spacer */}
								<box height={1} />

								{/* Form fields */}
								<For each={props.formFields}>
									{(field, i) => {
										const isActive = () => i() === props.currentFieldIndex;

										return (
											<>
												{/* Label */}
												<text
													fg={isActive() ? colors.accent : colors.fgDim}
													wrapMode="none"
												>
													{field.label}
												</text>

												{/* Input */}
												<box
													height={1}
													flexDirection="row"
													backgroundColor={
														isActive() ? colors.bgHighlight : colors.bg
													}
												>
													<text fg={colors.fg} wrapMode="none">
														{"  "}
														{field.value}
														{isActive() ? "\u2588" : ""}
													</text>
												</box>

												{/* Spacer between fields */}
												<Show when={i() < props.formFields!.length - 1}>
													<box height={1} />
												</Show>
											</>
										);
									}}
								</For>
							</box>
						</Show>
					</box>
				</box>
			</box>
		</Show>
	);
}
