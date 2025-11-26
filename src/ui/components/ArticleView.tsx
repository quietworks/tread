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
	onScrollUp?: (lines?: number) => void;
	onScrollDown?: (lines?: number) => void;
}

export interface ArticleViewRef {
	scrollUp: (lines?: number) => void;
	scrollDown: (lines?: number) => void;
	scrollToTop: () => void;
	scrollToBottom: () => void;
	pageUp: () => void;
	pageDown: () => void;
}

function formatPublishDate(date: Date | null): string {
	if (!date) return "Unknown date";
	return date.toLocaleDateString([], {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function truncateTitle(title: string, maxWidth: number): string {
	if (title.length <= maxWidth) return title;
	return `${title.slice(0, maxWidth - 1)}\u2026`;
}

export function ArticleView(props: ArticleViewProps): JSX.Element {
	const { colors, syntax } = useTheme();
	let scrollRef: ScrollBoxRenderable | undefined;

	const title = createMemo(() => {
		if (!props.article) return " Article ";
		return ` ${truncateTitle(props.article.title, 60)} `;
	});

	const markdownContent = createMemo(() => {
		if (!props.article?.content) return "";
		return htmlToMarkdown(props.article.content);
	});

	// Expose scroll methods via ref callback pattern
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
			title={title()}
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
					ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
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

// Helper hook to get scroll functions
export function createArticleViewRef(): {
	ref: ScrollBoxRenderable | undefined;
	setRef: (r: ScrollBoxRenderable) => void;
	scrollUp: (lines?: number) => void;
	scrollDown: (lines?: number) => void;
	scrollToTop: () => void;
	scrollToBottom: () => void;
	pageUp: () => void;
	pageDown: () => void;
} {
	let ref: ScrollBoxRenderable | undefined;

	return {
		get ref() {
			return ref;
		},
		setRef: (r: ScrollBoxRenderable) => {
			ref = r;
		},
		scrollUp: (lines = 1) => ref?.scrollBy(-lines),
		scrollDown: (lines = 1) => ref?.scrollBy(lines),
		scrollToTop: () => ref?.scrollTo(0),
		scrollToBottom: () => ref?.scrollTo(ref.scrollHeight),
		pageUp: () => ref?.scrollBy(-(ref.height - 4)),
		pageDown: () => ref?.scrollBy(ref.height - 4),
	};
}
