#!/usr/bin/env node

import { loadConfig, getConfigPath, initConfig } from "./config/loader.js";
import type { Config } from "./config/types.js";
import { getDatabase, closeDatabase } from "./db/database.js";
import { App } from "./app.js";

// Import version from package.json - embedded at compile time for standalone binaries
import pkg from "../package.json";
const { version, description } = pkg;

const NAME = "tread";

function printVersion(): void {
	console.log(`${NAME} ${version}`);
}

function printHelp(): void {
	console.log(`${NAME} ${version}`);
	console.log(description);
	console.log();
	console.log("Usage: tread [options]");
	console.log();
	console.log("Options:");
	console.log("  --init         Create a sample configuration file");
	console.log("  -h, --help     Show this help message");
	console.log("  -v, --version  Show version number");
	console.log();
	console.log("Configuration:");
	console.log(`  Config: ${getConfigPath()}`);
}

function runInit(): number {
	const result = initConfig();
	if (result.created) {
		console.log(`Created sample configuration at ${result.path}`);
		console.log();
		console.log(
			"Edit the file to add your RSS feeds, then run 'tread' to start.",
		);
		return 0;
	} else {
		console.log(`Configuration already exists at ${result.path}`);
		return 0;
	}
}

function parseArgs(): { shouldExit: boolean; exitCode: number } {
	const args = process.argv.slice(2);

	for (const arg of args) {
		if (arg === "-v" || arg === "--version") {
			printVersion();
			return { shouldExit: true, exitCode: 0 };
		}
		if (arg === "-h" || arg === "--help") {
			printHelp();
			return { shouldExit: true, exitCode: 0 };
		}
		if (arg === "--init") {
			const exitCode = runInit();
			return { shouldExit: true, exitCode };
		}
		// Unknown argument
		console.error(`Unknown option: ${arg}`);
		console.error("Run 'tread --help' for usage information.");
		return { shouldExit: true, exitCode: 1 };
	}

	return { shouldExit: false, exitCode: 0 };
}

async function main(): Promise<void> {
	// Handle CLI arguments first
	const { shouldExit, exitCode } = parseArgs();
	if (shouldExit) {
		process.exit(exitCode);
	}
	// Load configuration
	let config: Config;
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
