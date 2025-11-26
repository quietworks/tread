# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tread is a keyboard-driven TUI RSS reader built with Bun and OpenTUI. It features a 3-pane interface (feeds, articles, article content), vim-style navigation, and SQLite-based read tracking.

## Development Commands

This project uses [just](https://github.com/casey/just) as a command runner. Run `just` to see all available commands.

```bash
just install         # Install dependencies
just run             # Run the application
just dev             # Run with watch mode (auto-restart on changes)
just check           # Type-check the project
just fmt             # Format code
just test            # Run tests
just test-coverage   # Run tests with coverage
just screenshot      # Generate README screenshot (requires vhs)
just release X.Y.Z   # Create a new release
```

Or using bun directly:

```bash
bun install          # Install dependencies
bun run start        # Run the application
bun run dev          # Run with watch mode (auto-restart on changes)
bun run build        # Type-check the project (no emit)
bun test             # Run tests
bun test --coverage  # Run tests with coverage
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
just release X.Y.Z
```

This will:
1. Validate version format
2. Update version in package.json
3. Commit and push
4. Create GitHub release (triggers build + tap update)

### Required setup (one-time):

The `TAP_GITHUB_TOKEN` secret must be configured in the tread repo settings. This is a fine-grained PAT with Contents (read/write) permission on `quietworks/homebrew-tread`.

## Testing

Tread uses Bun's built-in test runner with 157+ tests covering core functionality. See [TESTING.md](./TESTING.md) for the complete testing strategy.

### Quick Start

```bash
just test              # Run all tests
just test-coverage     # Run with coverage report
just test-watch        # Watch mode
```

### Test Coverage

- **Feed Parser**: RSS 2.0 and Atom parsing, error handling, edge cases (75 tests)
- **HTML Utilities**: Text conversion, entity decoding, wrapping (32 tests)
- **Fuzzy Search**: Matching algorithm, ranking, scoring (31 tests)
- **Keybindings**: Pane navigation, vim sequences, command palette (16 tests)
- **Config Loader**: TOML parsing and validation (3 tests)

Tests are co-located with source files (`*.test.ts`) and use fixtures from `test/fixtures/`.

### Mock Feed Server

A mock feed server is available for testing and screenshots:

```bash
just serve-mock   # Starts server at http://localhost:3333
```

Test fixtures are in `test/fixtures/feeds/`:
- `tech-news.xml` - RSS feed with sample articles
- `dev-blog.xml` - Atom feed with sample articles
- `empty.xml` - Empty feed (edge case)
- `malformed.xml` - Invalid XML (error case)

### Screenshots

To regenerate the README screenshot:

```bash
just screenshot   # Requires: brew install vhs
```

Or trigger manually via GitHub Actions: `gh workflow run screenshot.yml`
