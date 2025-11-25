import type { Command } from "../search/types.js";
import type { App } from "../app.js";

export function getCommands(app: App): Command[] {
	return [
		{
			id: "refresh-all",
			name: "Refresh All Feeds",
			description: "Fetch and update all RSS feeds",
			execute: async () => {
				await app.refreshAllFeeds();
			},
		},
	];
}
