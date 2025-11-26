import { createContext, useContext, type JSX } from "solid-js";
import type { SyntaxStyle } from "@opentui/core";
import { resolveTheme, type ColorPalette } from "./colors.js";
import { createSyntaxStyle } from "./syntax.js";
import type { ThemeConfig } from "../../config/types.js";

export interface ThemeContextValue {
	colors: ColorPalette;
	syntax: SyntaxStyle;
}

const ThemeContext = createContext<ThemeContextValue>();

export interface ThemeProviderProps {
	config?: ThemeConfig;
	children: JSX.Element;
}

export function ThemeProvider(props: ThemeProviderProps): JSX.Element {
	const colors = resolveTheme(props.config);
	const syntax = createSyntaxStyle(colors);

	return (
		<ThemeContext.Provider value={{ colors, syntax }}>
			{props.children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}
