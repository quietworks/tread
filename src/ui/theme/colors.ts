import type { ThemeConfig } from "../../config/types.js";

export interface ColorPalette {
	bg: string;
	bgLight: string;
	bgHighlight: string;
	fg: string;
	fgDim: string;
	fgMuted: string;
	primary: string;
	secondary: string;
	accent: string;
	success: string;
	warning: string;
	error: string;
	border: string;
	borderFocused: string;
}

export const THEMES: Record<string, ColorPalette> = {
	"tokyo-night": {
		bg: "#1a1b26",
		bgLight: "#24283b",
		bgHighlight: "#414868",
		fg: "#c0caf5",
		fgDim: "#565f89",
		fgMuted: "#737aa2",
		primary: "#7aa2f7",
		secondary: "#bb9af7",
		accent: "#7dcfff",
		success: "#9ece6a",
		warning: "#e0af68",
		error: "#f7768e",
		border: "#3b4261",
		borderFocused: "#7aa2f7",
	},
	dracula: {
		bg: "#282a36",
		bgLight: "#44475a",
		bgHighlight: "#44475a",
		fg: "#f8f8f2",
		fgDim: "#6272a4",
		fgMuted: "#6272a4",
		primary: "#bd93f9",
		secondary: "#ff79c6",
		accent: "#8be9fd",
		success: "#50fa7b",
		warning: "#ffb86c",
		error: "#ff5555",
		border: "#44475a",
		borderFocused: "#bd93f9",
	},
	nord: {
		bg: "#2e3440",
		bgLight: "#3b4252",
		bgHighlight: "#434c5e",
		fg: "#eceff4",
		fgDim: "#4c566a",
		fgMuted: "#d8dee9",
		primary: "#88c0d0",
		secondary: "#81a1c1",
		accent: "#8fbcbb",
		success: "#a3be8c",
		warning: "#ebcb8b",
		error: "#bf616a",
		border: "#4c566a",
		borderFocused: "#88c0d0",
	},
	gruvbox: {
		bg: "#282828",
		bgLight: "#3c3836",
		bgHighlight: "#504945",
		fg: "#ebdbb2",
		fgDim: "#928374",
		fgMuted: "#a89984",
		primary: "#83a598",
		secondary: "#d3869b",
		accent: "#8ec07c",
		success: "#b8bb26",
		warning: "#fabd2f",
		error: "#fb4934",
		border: "#504945",
		borderFocused: "#83a598",
	},
};

export function resolveTheme(config?: ThemeConfig): ColorPalette {
	const baseName = config?.name || "tokyo-night";
	const base = THEMES[baseName] || THEMES["tokyo-night"]!;

	if (!config?.colors) return base;

	return { ...base, ...config.colors } as ColorPalette;
}

// Layout constants
export const layout = {
	feedListWidth: 24,
	statusBarHeight: 1,
	padding: 1,
	gap: 0,
} as const;
