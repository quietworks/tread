#!/usr/bin/env node

import { loadConfig, getConfigPath } from "./config/loader.js";
import { getDatabase, closeDatabase } from "./db/database.js";
import { App } from "./app.js";

async function main(): Promise<void> {
	// Load configuration
	let config;
	try {
		config = loadConfig();
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	}

	if (config.feeds.length === 0) {
		console.error("No feeds configured. Add feeds to", getConfigPath());
		process.exit(1);
	}

	// Initialize database
	try {
		getDatabase();
	} catch (error) {
		console.error("Failed to initialize database:", error);
		process.exit(1);
	}

	// Create and start the app
	const app = new App(config);

	// Handle cleanup
	const cleanup = () => {
		closeDatabase();
	};

	process.on("exit", cleanup);
	process.on("SIGINT", () => {
		cleanup();
		process.exit(0);
	});
	process.on("SIGTERM", () => {
		cleanup();
		process.exit(0);
	});

	try {
		await app.start();
	} catch (error) {
		console.error("Application error:", error);
		cleanup();
		process.exit(1);
	}
}

main();
