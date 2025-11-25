#!/usr/bin/env bun

/**
 * Mock feed server for testing and screenshots.
 *
 * Usage:
 *   bun run test/fixtures/serve.ts
 *
 * Serves feeds from test/fixtures/feeds/ on http://localhost:3333
 *
 * Available endpoints:
 *   GET /feeds/tech-news.xml   - Tech news RSS feed
 *   GET /feeds/dev-blog.xml    - Dev blog Atom feed
 *   GET /feeds/empty.xml       - Empty feed (edge case)
 *   GET /feeds/malformed.xml   - Malformed XML (error case)
 *   GET /health                - Health check
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const PORT = Number(process.env["PORT"]) || 3333;
const FIXTURES_DIR = dirname(import.meta.path);

const server = Bun.serve({
	port: PORT,
	fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// Health check
		if (path === "/health") {
			return new Response("ok", { status: 200 });
		}

		// Serve feed files
		if (path.startsWith("/feeds/")) {
			const filename = path.slice(7); // Remove "/feeds/"
			const filepath = join(FIXTURES_DIR, "feeds", filename);

			if (!existsSync(filepath)) {
				return new Response("Not found", { status: 404 });
			}

			const content = readFileSync(filepath, "utf-8");
			const contentType = filename.endsWith(".xml")
				? "application/xml"
				: "text/plain";

			return new Response(content, {
				headers: { "Content-Type": contentType },
			});
		}

		// List available feeds
		if (path === "/") {
			const html = `
<!DOCTYPE html>
<html>
<head><title>Mock Feed Server</title></head>
<body>
  <h1>Mock Feed Server</h1>
  <ul>
    <li><a href="/feeds/tech-news.xml">Tech News (RSS)</a></li>
    <li><a href="/feeds/dev-blog.xml">Dev Blog (Atom)</a></li>
    <li><a href="/feeds/empty.xml">Empty Feed</a></li>
    <li><a href="/feeds/malformed.xml">Malformed Feed</a></li>
  </ul>
</body>
</html>`;
			return new Response(html, {
				headers: { "Content-Type": "text/html" },
			});
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Mock feed server running at http://localhost:${server.port}`);
console.log("Press Ctrl+C to stop");
