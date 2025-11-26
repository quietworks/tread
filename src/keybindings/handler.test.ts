import { describe, expect, test, beforeEach } from "bun:test";
import { KeybindingHandler } from "./handler.js";
import type { KeyEvent } from "@opentui/core";

function createKeyEvent(
	name: string,
	options: {
		ctrl?: boolean;
		meta?: boolean;
		shift?: boolean;
		sequence?: string;
	} = {},
): KeyEvent {
	return {
		name,
		sequence: options.sequence ?? name,
		ctrl: options.ctrl ?? false,
		meta: options.meta ?? false,
		shift: options.shift ?? false,
	};
}

describe("KeybindingHandler - Global keybindings", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
	});

	test("q quits from feeds pane", () => {
		handler.setPane("feeds");
		const action = handler.handleKey(createKeyEvent("q"));
		expect(action?.type).toBe("quit");
	});

	test("q goes back from articles pane", () => {
		handler.setPane("articles");
		const action = handler.handleKey(createKeyEvent("q"));
		expect(action?.type).toBe("focusPane");
		if (action?.type === "focusPane") {
			expect(action.pane).toBe("feeds");
		}
	});

	test("q goes back from article pane", () => {
		handler.setPane("article");
		const action = handler.handleKey(createKeyEvent("q"));
		expect(action?.type).toBe("back");
	});

	test("Ctrl+C quits", () => {
		const action = handler.handleKey(createKeyEvent("c", { ctrl: true }));
		expect(action?.type).toBe("quit");
	});

	test("colon opens command palette", () => {
		const action = handler.handleKey(createKeyEvent(":", { sequence: ":" }));
		expect(action?.type).toBe("openCommandPalette");
	});
});

describe("KeybindingHandler - Navigation", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
	});

	test("j navigates down in feeds", () => {
		handler.setPane("feeds");
		const action = handler.handleKey(createKeyEvent("j"));
		expect(action?.type).toBe("navigate");
		if (action?.type === "navigate") {
			expect(action.direction).toBe("down");
		}
	});

	test("k navigates up in feeds", () => {
		handler.setPane("feeds");
		const action = handler.handleKey(createKeyEvent("k"));
		expect(action?.type).toBe("navigate");
		if (action?.type === "navigate") {
			expect(action.direction).toBe("up");
		}
	});

	test("down arrow navigates down", () => {
		handler.setPane("feeds");
		const action = handler.handleKey(createKeyEvent("down"));
		expect(action?.type).toBe("navigate");
	});

	test("up arrow navigates up", () => {
		handler.setPane("feeds");
		const action = handler.handleKey(createKeyEvent("up"));
		expect(action?.type).toBe("navigate");
	});

	test("j scrolls down in article view", () => {
		handler.setPane("article");
		const action = handler.handleKey(createKeyEvent("j"));
		expect(action?.type).toBe("scroll");
		if (action?.type === "scroll") {
			expect(action.direction).toBe("down");
			expect(action.amount).toBe(1);
		}
	});

	test("k scrolls up in article view", () => {
		handler.setPane("article");
		const action = handler.handleKey(createKeyEvent("k"));
		expect(action?.type).toBe("scroll");
		if (action?.type === "scroll") {
			expect(action.direction).toBe("up");
			expect(action.amount).toBe(1);
		}
	});
});

describe("KeybindingHandler - gg sequence", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
	});

	test("gg jumps to top", () => {
		const first = handler.handleKey(createKeyEvent("g"));
		expect(first).toBeNull(); // First g is pending

		const second = handler.handleKey(createKeyEvent("g"));
		expect(second?.type).toBe("jump");
		if (second?.type === "jump") {
			expect(second.target).toBe("top");
		}
	});

	test("G (shift+g) jumps to bottom", () => {
		const action = handler.handleKey(createKeyEvent("G", { shift: true }));
		expect(action?.type).toBe("jump");
		if (action?.type === "jump") {
			expect(action.target).toBe("bottom");
		}
	});

	test("pending g is cleared by other keys", () => {
		handler.handleKey(createKeyEvent("g"));
		handler.handleKey(createKeyEvent("j")); // Clear pending g

		const action = handler.handleKey(createKeyEvent("g"));
		expect(action).toBeNull(); // Should be pending again, not jump
	});

	test("pending g is cleared when pane changes", () => {
		handler.handleKey(createKeyEvent("g"));
		handler.setPane("articles"); // Clear pending g

		const action = handler.handleKey(createKeyEvent("g"));
		expect(action).toBeNull(); // Should be pending again
	});
});

describe("KeybindingHandler - Feeds pane", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
		handler.setPane("feeds");
	});

	test("l selects feed", () => {
		const action = handler.handleKey(createKeyEvent("l"));
		expect(action?.type).toBe("select");
	});

	test("right arrow selects feed", () => {
		const action = handler.handleKey(createKeyEvent("right"));
		expect(action?.type).toBe("select");
	});

	test("return selects feed", () => {
		const action = handler.handleKey(createKeyEvent("return"));
		expect(action?.type).toBe("select");
	});

	test("r refreshes current feed", () => {
		const action = handler.handleKey(createKeyEvent("r"));
		expect(action?.type).toBe("refresh");
	});

	test("R refreshes all feeds", () => {
		const action = handler.handleKey(createKeyEvent("R", { shift: true }));
		expect(action?.type).toBe("refreshAll");
	});

	test("tab switches to articles pane", () => {
		const action = handler.handleKey(createKeyEvent("tab"));
		expect(action?.type).toBe("focusPane");
		if (action?.type === "focusPane") {
			expect(action.pane).toBe("articles");
		}
	});
});

describe("KeybindingHandler - Articles pane", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
		handler.setPane("articles");
	});

	test("h goes back to feeds", () => {
		const action = handler.handleKey(createKeyEvent("h"));
		expect(action?.type).toBe("focusPane");
		if (action?.type === "focusPane") {
			expect(action.pane).toBe("feeds");
		}
	});

	test("left arrow goes back to feeds", () => {
		const action = handler.handleKey(createKeyEvent("left"));
		expect(action?.type).toBe("focusPane");
		if (action?.type === "focusPane") {
			expect(action.pane).toBe("feeds");
		}
	});

	test("l selects article", () => {
		const action = handler.handleKey(createKeyEvent("l"));
		expect(action?.type).toBe("select");
	});

	test("return selects article", () => {
		const action = handler.handleKey(createKeyEvent("return"));
		expect(action?.type).toBe("select");
	});

	test("r refreshes feed", () => {
		const action = handler.handleKey(createKeyEvent("r"));
		expect(action?.type).toBe("refresh");
	});

	test("tab goes back to feeds", () => {
		const action = handler.handleKey(createKeyEvent("tab"));
		expect(action?.type).toBe("focusPane");
		if (action?.type === "focusPane") {
			expect(action.pane).toBe("feeds");
		}
	});
});

describe("KeybindingHandler - Article pane", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
		handler.setPane("article");
	});

	test("h goes back", () => {
		const action = handler.handleKey(createKeyEvent("h"));
		expect(action?.type).toBe("back");
	});

	test("left arrow goes back", () => {
		const action = handler.handleKey(createKeyEvent("left"));
		expect(action?.type).toBe("back");
	});

	test("o opens in browser", () => {
		const action = handler.handleKey(createKeyEvent("o"));
		expect(action?.type).toBe("openInBrowser");
	});

	test("Ctrl+D page scrolls down", () => {
		const action = handler.handleKey(createKeyEvent("d", { ctrl: true }));
		expect(action?.type).toBe("pageScroll");
		if (action?.type === "pageScroll") {
			expect(action.direction).toBe("down");
		}
	});

	test("Ctrl+U page scrolls up", () => {
		const action = handler.handleKey(createKeyEvent("u", { ctrl: true }));
		expect(action?.type).toBe("pageScroll");
		if (action?.type === "pageScroll") {
			expect(action.direction).toBe("up");
		}
	});

	test("space page scrolls down", () => {
		const action = handler.handleKey(createKeyEvent("space"));
		expect(action?.type).toBe("pageScroll");
		if (action?.type === "pageScroll") {
			expect(action.direction).toBe("down");
		}
	});
});

describe("KeybindingHandler - Command palette", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
		handler.setCommandPaletteMode(true);
	});

	test("escape closes command palette", () => {
		const action = handler.handleKey(createKeyEvent("escape"));
		expect(action?.type).toBe("closeCommandPalette");
	});

	test("return selects", () => {
		const action = handler.handleKey(createKeyEvent("return"));
		expect(action?.type).toBe("commandPaletteSelect");
	});

	test("tab navigates down", () => {
		const action = handler.handleKey(createKeyEvent("tab"));
		expect(action?.type).toBe("commandPaletteNavigate");
		if (action?.type === "commandPaletteNavigate") {
			expect(action.direction).toBe("down");
		}
	});

	test("shift+tab navigates up", () => {
		const action = handler.handleKey(createKeyEvent("tab", { shift: true }));
		expect(action?.type).toBe("commandPaletteNavigate");
		if (action?.type === "commandPaletteNavigate") {
			expect(action.direction).toBe("up");
		}
	});

	test("up arrow navigates up", () => {
		const action = handler.handleKey(createKeyEvent("up"));
		expect(action?.type).toBe("commandPaletteNavigate");
		if (action?.type === "commandPaletteNavigate") {
			expect(action.direction).toBe("up");
		}
	});

	test("down arrow navigates down", () => {
		const action = handler.handleKey(createKeyEvent("down"));
		expect(action?.type).toBe("commandPaletteNavigate");
		if (action?.type === "commandPaletteNavigate") {
			expect(action.direction).toBe("down");
		}
	});

	test("k navigates up", () => {
		const action = handler.handleKey(createKeyEvent("k"));
		expect(action?.type).toBe("commandPaletteNavigate");
		if (action?.type === "commandPaletteNavigate") {
			expect(action.direction).toBe("up");
		}
	});

	test("j navigates down", () => {
		const action = handler.handleKey(createKeyEvent("j"));
		expect(action?.type).toBe("commandPaletteNavigate");
		if (action?.type === "commandPaletteNavigate") {
			expect(action.direction).toBe("down");
		}
	});

	test("backspace removes character", () => {
		const action = handler.handleKey(createKeyEvent("backspace"));
		expect(action?.type).toBe("commandPaletteBackspace");
	});

	test("Ctrl+V pastes", () => {
		const action = handler.handleKey(createKeyEvent("v", { ctrl: true }));
		expect(action?.type).toBe("commandPalettePaste");
	});

	test("Cmd+V pastes", () => {
		const action = handler.handleKey(createKeyEvent("v", { meta: true }));
		expect(action?.type).toBe("commandPalettePaste");
	});

	test("Ctrl+Y pastes", () => {
		const action = handler.handleKey(createKeyEvent("y", { ctrl: true }));
		expect(action?.type).toBe("commandPalettePaste");
	});

	test("single printable character inputs", () => {
		const action = handler.handleKey(createKeyEvent("a", { sequence: "a" }));
		expect(action?.type).toBe("commandPaletteInput");
		if (action?.type === "commandPaletteInput") {
			expect(action.char).toBe("a");
		}
	});

	test("multi-character sequence inputs (paste)", () => {
		const action = handler.handleKey(
			createKeyEvent("abc", { sequence: "abc" }),
		);
		expect(action?.type).toBe("commandPaletteInput");
		if (action?.type === "commandPaletteInput") {
			expect(action.char).toBe("abc");
		}
	});

	test("rejects non-printable sequences", () => {
		const action = handler.handleKey(
			createKeyEvent("test", { sequence: "\x1b[A" }),
		);
		expect(action).toBeNull();
	});

	test("colon does not open palette when already in palette mode", () => {
		const action = handler.handleKey(createKeyEvent(":", { sequence: ":" }));
		expect(action?.type).toBe("commandPaletteInput");
		if (action?.type === "commandPaletteInput") {
			expect(action.char).toBe(":");
		}
	});
});

describe("KeybindingHandler - State management", () => {
	let handler: KeybindingHandler;

	beforeEach(() => {
		handler = new KeybindingHandler();
	});

	test("setPane changes current pane", () => {
		handler.setPane("feeds");
		let action = handler.handleKey(createKeyEvent("tab"));
		expect(action?.type).toBe("focusPane");

		handler.setPane("articles");
		action = handler.handleKey(createKeyEvent("tab"));
		expect(action?.type).toBe("focusPane");
	});

	test("setCommandPaletteMode changes mode", () => {
		handler.setCommandPaletteMode(false);
		let action = handler.handleKey(createKeyEvent("escape"));
		expect(action?.type).not.toBe("closeCommandPalette");

		handler.setCommandPaletteMode(true);
		action = handler.handleKey(createKeyEvent("escape"));
		expect(action?.type).toBe("closeCommandPalette");
	});
});
