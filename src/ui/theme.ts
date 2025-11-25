export const colors = {
  // Background colors
  bg: "#1a1b26",
  bgLight: "#24283b",
  bgHighlight: "#414868",

  // Foreground colors
  fg: "#c0caf5",
  fgDim: "#565f89",
  fgMuted: "#737aa2",

  // Accent colors
  primary: "#7aa2f7",
  secondary: "#bb9af7",
  accent: "#7dcfff",

  // Status colors
  success: "#9ece6a",
  warning: "#e0af68",
  error: "#f7768e",

  // Border colors
  border: "#3b4261",
  borderFocused: "#7aa2f7",
} as const;

export const styles = {
  // Unread article (bold, bright)
  unread: {
    fg: colors.fg,
  },

  // Read article (dimmed)
  read: {
    fg: colors.fgDim,
  },

  // Selected item
  selected: {
    bg: colors.bgHighlight,
    fg: colors.fg,
  },

  // Focused pane border
  focused: {
    borderColor: colors.borderFocused,
  },

  // Unfocused pane border
  unfocused: {
    borderColor: colors.border,
  },
} as const;

export const layout = {
  feedListWidth: 24,
  statusBarHeight: 1,
  padding: 1,
  gap: 0,
} as const;
