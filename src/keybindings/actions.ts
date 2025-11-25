export type Action =
  | { type: "navigate"; direction: "up" | "down" }
  | { type: "jump"; target: "top" | "bottom" }
  | { type: "select" }
  | { type: "back" }
  | { type: "quit" }
  | { type: "refresh" }
  | { type: "refreshAll" }
  | { type: "openInBrowser" }
  | { type: "focusPane"; pane: "feeds" | "articles" | "article" }
  | { type: "scroll"; direction: "up" | "down"; amount: number }
  | { type: "pageScroll"; direction: "up" | "down" };
