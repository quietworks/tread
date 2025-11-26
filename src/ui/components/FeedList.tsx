import { For, Show } from "solid-js";
import type { JSX } from "@opentui/solid";
import type { FeedConfig } from "../../config/types.js";
import { useTheme, layout } from "../theme/index.js";

export interface FeedListItem {
	feed: FeedConfig;
	unreadCount: number;
}

export interface FeedListProps {
	items: FeedListItem[];
	selectedIndex: number;
	isFocused: boolean;
}

export function FeedList(props: FeedListProps): JSX.Element {
	const { colors } = useTheme();

	const truncateName = (name: string, maxWidth: number): string => {
		if (name.length <= maxWidth) return name;
		return `${name.slice(0, maxWidth - 1)}\u2026`;
	};

	return (
		<box
			width={layout.feedListWidth}
			flexDirection="column"
			border={true}
			borderColor={props.isFocused ? colors.borderFocused : colors.border}
			backgroundColor={colors.bg}
			title=" Feeds "
			flexShrink={0}
		>
			<For each={props.items}>
				{(item, index) => {
					const isSelected = () => index() === props.selectedIndex;
					const hasUnread = () => item.unreadCount > 0;

					const indicator = () =>
						isSelected() && props.isFocused ? "> " : "  ";
					const unreadStr = () => (hasUnread() ? ` (${item.unreadCount})` : "");

					// Calculate max name width accounting for indicator and unread count
					const contentWidth = layout.feedListWidth - 2; // borders
					const maxNameWidth = () =>
						contentWidth - indicator().length - unreadStr().length - 1;

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
										: hasUnread()
											? colors.fg
											: colors.fgDim
								}
								wrapMode="none"
							>
								{indicator()}
								{truncateName(item.feed.name, maxNameWidth())}
								{unreadStr()}
							</text>
						</box>
					);
				}}
			</For>
			<Show when={props.items.length === 0}>
				<text fg={colors.fgDim}> No feeds configured</text>
			</Show>
		</box>
	);
}
