# Contributing to Tread

Thank you for your interest in contributing to Tread!

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later

### Getting Started

1. Clone the repository:

```bash
git clone https://github.com/quietworks/tread.git
cd tread
```

2. Install dependencies:

```bash
bun install
```

3. Create a config file at `~/.config/tread/config.toml`:

```toml
[[feeds]]
name = "Hacker News"
url = "https://hnrss.org/frontpage"
```

4. Run the application:

```bash
bun run start
```

### Development Commands

| Command | Description |
|---------|-------------|
| `bun run start` | Run the application |
| `bun run dev` | Run with watch mode (auto-restart on changes) |
| `bun run build` | Type-check the project |

### Project Structure

```
src/
├── index.ts              # Entry point
├── app.ts                # Main application orchestrator
├── config/
│   ├── loader.ts         # TOML configuration loading
│   └── types.ts          # Config type definitions
├── db/
│   ├── database.ts       # SQLite connection and schema
│   ├── articles.ts       # Article CRUD operations
│   └── types.ts          # Database type definitions
├── feed/
│   ├── fetcher.ts        # HTTP fetching for feeds
│   ├── parser.ts         # RSS/Atom parsing
│   └── types.ts          # Feed type definitions
├── ui/
│   ├── FeedList.ts       # Feed list component
│   ├── ArticleList.ts    # Article list component
│   ├── ArticleView.ts    # Article content view
│   ├── StatusBar.ts      # Status bar with keybindings
│   └── theme.ts          # Colors and styling
├── keybindings/
│   ├── handler.ts        # Keyboard input handling
│   └── actions.ts        # Action type definitions
└── utils/
    └── html.ts           # HTML to text conversion
```

### Architecture

Tread uses the [OpenTUI](https://github.com/sst/opentui) library for terminal rendering. The application follows a simple architecture:

- **App**: Main orchestrator that coordinates UI components and handles state
- **UI Components**: Extend OpenTUI's `BoxRenderable` for custom rendering
- **Database**: Bun's built-in SQLite for persistence
- **Feed Parser**: Supports RSS 2.0 and Atom feeds

### Code Style

- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Keep functions small and focused
- Use conventional commits for commit messages

### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Examples:
```
feat: add feed search functionality
fix: handle feeds with missing pubDate
docs: update keybinding documentation
```

## Reporting Issues

When reporting issues, please include:

- Your operating system and terminal emulator
- Bun version (`bun --version`)
- Steps to reproduce the issue
- Expected vs actual behavior

## Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run type checking (`bun run build`)
5. Commit with a conventional commit message
6. Push and open a pull request

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
