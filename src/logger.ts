export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	none: 4,
};

class Logger {
	private level: LogLevel;
	private logFile: string | null = null;

	constructor() {
		// Read from environment variable, default to "none"
		const envLevel = process.env.TREAD_LOG_LEVEL?.toLowerCase() as LogLevel;
		this.level = LOG_LEVELS[envLevel] !== undefined ? envLevel : "none";

		// Optionally write to a log file
		this.logFile = process.env.TREAD_LOG_FILE || null;
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
	}

	private write(level: LogLevel, message: string, ...args: unknown[]): void {
		if (!this.shouldLog(level)) return;

		const timestamp = new Date().toISOString();
		const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

		if (this.logFile) {
			const fs = require("fs");
			const fullMessage =
				args.length > 0
					? `${formatted} ${JSON.stringify(args)}\n`
					: `${formatted}\n`;
			fs.appendFileSync(this.logFile, fullMessage);
		} else {
			// Write to stderr to avoid interfering with TUI
			if (args.length > 0) {
				console.error(formatted, ...args);
			} else {
				console.error(formatted);
			}
		}
	}

	debug(message: string, ...args: unknown[]): void {
		this.write("debug", message, ...args);
	}

	info(message: string, ...args: unknown[]): void {
		this.write("info", message, ...args);
	}

	warn(message: string, ...args: unknown[]): void {
		this.write("warn", message, ...args);
	}

	error(message: string, ...args: unknown[]): void {
		this.write("error", message, ...args);
	}
}

export const logger = new Logger();
