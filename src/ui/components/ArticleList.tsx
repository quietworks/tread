import { For, Show, createMemo, createEffect } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { Article } from "../../db/types.js";
import { useTheme } from "../theme/index.js";

export interface ArticleListProps {
	articles: Article[];
	selectedIndex: number;
	isFocused: boolean;
	height?: number | `${number}%`;
}

function formatDate(date: Date | null): string {
	if (!date) return "";
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (days === 0) {
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	} else if (days === 1) {
		return "Yesterday";
	} else if (days < 7) {
		return `${days}d ago`;
	} else {
		return date.toLocaleDateString([], { month: "short", day: "numeric" });
	}
}

export function ArticleList(props: ArticleListProps): JSX.Element {
	const { colors } = useTheme();
	let scrollRef: ScrollBoxRenderable | undefined;

	const title = createMemo(() => {
		if (props.articles.length === 0) return " Articles ";
		return ` Articles (${props.selectedIndex + 1}/${props.articles.length}) `;
	});

	// Scroll to keep selected item visible
	createEffect(() => {
		const index = props.selectedIndex;
		if (scrollRef) {
			scrollRef.scrollTo(index);
		}
	});

	return (
		<box
			height={props.height || "40%"}
			flexDirection="column"
			border={true}
			borderColor={props.isFocused ? colors.borderFocused : colors.border}
			backgroundColor={colors.bg}
			title={title()}
			flexShrink={0}
		>
			<scrollbox
				ref={(r: ScrollBoxRenderable) => {
					scrollRef = r;
				}}
			>
				<For each={props.articles}>
					{(article, index) => {
						const isSelected = () => index() === props.selectedIndex;
						const isRead = () => article.readAt !== null;

						const readIndicator = () => (isRead() ? "  " : "\u2022 ");
						const dateStr = () => formatDate(article.publishedAt);

						return (
							<box
								height={1}
								flexDirection="row"
								backgroundColor={
									isSelected() && props.isFocused
										? colors.bgHighlight
										: "transparent"
								}
							>
								<text
									fg={
										isSelected() && props.isFocused
											? colors.fg
											: isRead()
												? colors.fgDim
												: colors.fg
									}
									wrapMode="none"
									flexGrow={1}
								>
									{readIndicator()}
									{article.title}
								</text>
								<text fg={colors.fgDim} wrapMode="none" flexShrink={0}>
									{" "}
									{dateStr()}
								</text>
							</box>
						);
					}}
				</For>
			</scrollbox>
			<Show when={props.articles.length === 0}>
				<text fg={colors.fgDim} paddingLeft={1}>
					No articles
				</text>
			</Show>
		</box>
	);
}
