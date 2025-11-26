import { Show } from "solid-js";
import type { JSX } from "@opentui/solid";
import { useTheme } from "../theme/index.js";

export type Pane = "feeds" | "articles" | "article";

const KEYBINDS: Record<Pane, string> = {
	feeds:
		":(colon):search  j/k:navigate  l/Enter:select  r:refresh  R:refresh all  q:quit",
	articles:
		":(colon):search  j/k:navigate  h:feeds  l/Enter:read  r:refresh  q:quit",
	article:
		":(colon):search  j/k:scroll  h:back  gg/G:top/bottom  o:open in browser  q:quit",
};

export interface StatusBarProps {
	pane: Pane;
	message?: string;
}

export function StatusBar(props: StatusBarProps): JSX.Element {
	const { colors } = useTheme();

	return (
		<box
			height={1}
			flexDirection="row"
			backgroundColor={colors.bgLight}
			flexShrink={0}
		>
			<text fg={colors.fg} flexGrow={0} flexShrink={0} wrapMode="none">
				<Show when={props.message}>{props.message}</Show>
			</text>
			<box flexGrow={1} />
			<text fg={colors.fgMuted} flexGrow={0} flexShrink={0} wrapMode="none">
				{KEYBINDS[props.pane]}
			</text>
		</box>
	);
}
