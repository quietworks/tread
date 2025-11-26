export interface FeedConfig {
	name: string;
	url: string;
}

export interface ThemeColors {
	bg?: string;
	bgLight?: string;
	bgHighlight?: string;
	fg?: string;
	fgDim?: string;
	fgMuted?: string;
	primary?: string;
	secondary?: string;
	accent?: string;
	success?: string;
	warning?: string;
	error?: string;
	border?: string;
	borderFocused?: string;
}

export interface ThemeConfig {
	name?: string;
	colors?: ThemeColors;
}

export interface Config {
	feeds: FeedConfig[];
	theme?: ThemeConfig;
}
