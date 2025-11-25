# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tread is a keyboard-driven TUI RSS reader built with Bun and OpenTUI. It features a 3-pane interface (feeds, articles, article content), vim-style navigation, and SQLite-based read tracking.

## Development Commands

```bash
bun install          # Install dependencies
bun run start        # Run the application
bun run dev          # Run with watch mode (auto-restart on changes)
bun run build        # Type-check the project (no emit)
```

## Architecture

The application uses OpenTUI for terminal rendering with a component-based architecture:

- **App** (`src/app.ts`): Main orchestrator that manages UI layout, coordinates between components, handles keyboard input dispatching, and maintains application state (current pane, selected feed/article)
- **KeybindingHandler** (`src/keybindings/handler.ts`): Translates raw keyboard events into typed actions, handles vim sequences like `gg`, manages pane-specific keybinding contexts
- **UI Components** (`src/ui/`): Extend OpenTUI's `BoxRenderable` - FeedList, ArticleList, ArticleView each manage their own rendering and selection state
- **Database Layer** (`src/db/`): Uses Bun's built-in SQLite (`bun:sqlite`) with WAL mode for article persistence and read tracking
- **Feed Parser** (`src/feed/parser.ts`): Handles both RSS 2.0 and Atom feeds using fast-xml-parser

### Data Flow

1. Config loaded from `~/.config/tread/config.toml` (TOML format via smol-toml)
2. Feeds fetched → parsed → stored in SQLite at `~/.local/share/tread/tread.db`
3. Keyboard events → KeybindingHandler → Action objects → App handles state changes → Components re-render

### Key Types

- `Action` (`src/keybindings/actions.ts`): Discriminated union of all possible user actions
- `Pane`: `"feeds" | "articles" | "article"` - the three UI panels
- `FeedConfig` / `Config` (`src/config/types.ts`): TOML configuration structure
- `Article` (`src/db/types.ts`): Database record with read tracking

## Code Style

- TypeScript strict mode with `noUncheckedIndexedAccess`
- ESM modules (`"type": "module"`)
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`

## Release Process

Releases are automated via GitHub Actions. When a release is published:

1. Binaries are built for darwin-arm64, darwin-x64, linux-arm64, linux-x64
2. Binaries and SHA256 checksums are uploaded to the release
3. The Homebrew tap (quietworks/homebrew-tread) is automatically updated

### To create a release:

```bash
# 1. Bump version in package.json
# 2. Commit the version bump
git add package.json
git commit -m "chore: bump version to X.Y.Z"
git push origin main

# 3. Create the release (triggers build + tap update)
gh release create vX.Y.Z --title "vX.Y.Z" --notes "Release notes here"
```

### Required setup (one-time):

The `TAP_GITHUB_TOKEN` secret must be configured in the tread repo settings. This is a fine-grained PAT with Contents (read/write) permission on `quietworks/homebrew-tread`.
