import type { App } from "../app.js";
import type { Command } from "../search/types.js";

export function getCommands(app: App): Command[] {
	return [
		{
			id: "add-feed",
			name: "Add Feed",
			description: "Add a new RSS/Atom feed",
			execute: () => {
				// Opens form, keeps palette open
				app.openAddFeedForm();
			},
		},
		{
			id: "refresh-all",
			name: "Refresh All Feeds",
			description: "Fetch and update all RSS feeds",
			execute: async () => {
				app.closeCommandPaletteFromCommand();
				await app.refreshAllFeeds();
			},
		},
		{
			id: "quit",
			name: "Quit",
			description: "Exit the application",
			execute: () => {
				// No need to close palette, app will quit
				app.quit();
			},
		},
	];
}
