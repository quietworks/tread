import { Show, createMemo, createEffect } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { Article } from "../../db/types.js";
import { htmlToMarkdown } from "../../utils/markdown.js";
import { useTheme } from "../theme/index.js";

export interface ArticleViewProps {
	article: Article | null;
	isFocused: boolean;
	height?: number | `${number}%`;
	scrollRef?: (ref: ScrollBoxRenderable) => void;
}

function formatPublishDate(date: Date | null): string {
	if (!date) return "Unknown date";
	return date.toLocaleDateString([], {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function ArticleView(props: ArticleViewProps): JSX.Element {
	const { colors, syntax } = useTheme();
	let scrollRef: ScrollBoxRenderable | undefined;

	const markdownContent = createMemo(() => {
		if (!props.article?.content) return "";
		return htmlToMarkdown(props.article.content);
	});

	// Expose scroll ref to parent and reset scroll on article change
	createEffect(() => {
		if (props.article && scrollRef) {
			scrollRef.scrollTo(0);
		}
	});

	return (
		<box
			height={props.height || "60%"}
			flexDirection="column"
			border={true}
			borderColor={props.isFocused ? colors.borderFocused : colors.border}
			backgroundColor={colors.bg}
			flexGrow={1}
		>
			<Show
				when={props.article}
				fallback={
					<box paddingLeft={1} paddingTop={1}>
						<text fg={colors.fgDim}>Select an article to read</text>
					</box>
				}
			>
				<scrollbox
					ref={(r: ScrollBoxRenderable) => {
						scrollRef = r;
						props.scrollRef?.(r);
					}}
					scrollbarOptions={{ visible: false }}
				>
					<box flexDirection="column" paddingLeft={1} paddingRight={1}>
						{/* Article title */}
						<text fg={colors.primary} wrapMode="word">
							{props.article!.title}
						</text>

						{/* Date */}
						<text fg={colors.fgMuted}>
							{formatPublishDate(props.article!.publishedAt)}
						</text>

						{/* Separator */}
						<text fg={colors.border}>{"\u2500".repeat(40)}</text>

						{/* Empty line */}
						<text> </text>

						{/* Markdown content with syntax highlighting */}
						<Show
							when={markdownContent()}
							fallback={<text fg={colors.fgDim}>No content available.</text>}
						>
							<code
								filetype="markdown"
								syntaxStyle={syntax}
								content={markdownContent()}
								fg={colors.fg}
								drawUnstyledText={false}
							/>
						</Show>
					</box>
				</scrollbox>
			</Show>
		</box>
	);
}
