import type { KeyEvent } from "@opentui/core";
import type { Action } from "./actions.js";

export type Pane = "feeds" | "articles" | "article";

export class KeybindingHandler {
  private currentPane: Pane = "feeds";
  private pendingG = false;
  private gTimeout: ReturnType<typeof setTimeout> | null = null;

  setPane(pane: Pane): void {
    this.currentPane = pane;
    this.clearPendingG();
  }

  private clearPendingG(): void {
    this.pendingG = false;
    if (this.gTimeout) {
      clearTimeout(this.gTimeout);
      this.gTimeout = null;
    }
  }

  handleKey(key: KeyEvent): Action | null {
    const keyName = key.name;

    // Handle gg sequence
    if (keyName === "g" && !key.ctrl && !key.meta) {
      if (this.pendingG) {
        this.clearPendingG();
        return { type: "jump", target: "top" };
      } else {
        this.pendingG = true;
        this.gTimeout = setTimeout(() => {
          this.clearPendingG();
        }, 500);
        return null;
      }
    }

    // Clear pending g on any other key
    this.clearPendingG();

    // Global keybindings
    if (keyName === "q") {
      if (this.currentPane === "article") {
        return { type: "back" };
      } else if (this.currentPane === "articles") {
        return { type: "focusPane", pane: "feeds" };
      }
      return { type: "quit" };
    }

    if (key.name === "c" && key.ctrl) {
      return { type: "quit" };
    }

    // Navigation
    if (keyName === "j" || keyName === "down") {
      if (this.currentPane === "article") {
        return { type: "scroll", direction: "down", amount: 1 };
      }
      return { type: "navigate", direction: "down" };
    }

    if (keyName === "k" || keyName === "up") {
      if (this.currentPane === "article") {
        return { type: "scroll", direction: "up", amount: 1 };
      }
      return { type: "navigate", direction: "up" };
    }

    // Jump to bottom
    if (keyName === "G" || (keyName === "g" && key.shift)) {
      return { type: "jump", target: "bottom" };
    }

    // Page scrolling (article view)
    if (this.currentPane === "article") {
      if (keyName === "d" && key.ctrl) {
        return { type: "pageScroll", direction: "down" };
      }
      if (keyName === "u" && key.ctrl) {
        return { type: "pageScroll", direction: "up" };
      }
      if (keyName === "space") {
        return { type: "pageScroll", direction: "down" };
      }
    }

    // Pane-specific keybindings
    switch (this.currentPane) {
      case "feeds":
        return this.handleFeedsPane(key);
      case "articles":
        return this.handleArticlesPane(key);
      case "article":
        return this.handleArticlePane(key);
    }
  }

  private handleFeedsPane(key: KeyEvent): Action | null {
    const keyName = key.name;

    if (keyName === "l" || keyName === "right" || keyName === "return" || keyName === "linefeed") {
      return { type: "select" };
    }

    if (keyName === "r" && !key.shift) {
      return { type: "refresh" };
    }

    if (keyName === "R" || (keyName === "r" && key.shift)) {
      return { type: "refreshAll" };
    }

    if (keyName === "tab") {
      return { type: "focusPane", pane: "articles" };
    }

    return null;
  }

  private handleArticlesPane(key: KeyEvent): Action | null {
    const keyName = key.name;

    if (keyName === "h" || keyName === "left") {
      return { type: "focusPane", pane: "feeds" };
    }

    if (keyName === "l" || keyName === "right" || keyName === "return" || keyName === "linefeed") {
      return { type: "select" };
    }

    if (keyName === "r" && !key.shift) {
      return { type: "refresh" };
    }

    if (keyName === "tab") {
      return { type: "focusPane", pane: "feeds" };
    }

    return null;
  }

  private handleArticlePane(key: KeyEvent): Action | null {
    const keyName = key.name;

    if (keyName === "h" || keyName === "left") {
      return { type: "back" };
    }

    if (keyName === "o") {
      return { type: "openInBrowser" };
    }

    return null;
  }
}
