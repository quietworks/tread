# Testing Strategy

This document outlines the testing strategy for Tread, a keyboard-driven TUI RSS reader.

## Overview

Tread uses **Bun's built-in test runner** for fast, zero-config testing with a Jest-like API. The test suite focuses on unit tests for core functionality, with plans to expand integration and E2E testing in the future.

## Test Structure

Tests are co-located with source files using the `.test.ts` extension:

```
src/
├── feed/
│   ├── parser.ts
│   └── parser.test.ts          # Feed parsing tests
├── utils/
│   ├── html.ts
│   └── html.test.ts            # HTML utility tests
├── search/
│   ├── fuzzy.ts
│   └── fuzzy.test.ts           # Fuzzy matching tests
├── keybindings/
│   ├── handler.ts
│   └── handler.test.ts         # Keybinding tests
└── config/
    ├── loader.ts
    └── loader.test.ts          # Config parsing tests
```

## Running Tests

### Basic Commands

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test src/feed/parser.test.ts
```

### Using just

```bash
# Run all tests
just test

# Run with coverage
just test-coverage

# Run in watch mode
just test-watch
```

## Test Coverage

### Current Coverage

The test suite includes **157 tests** covering:

- **Feed Parser** (75 tests)
  - RSS 2.0 parsing
  - Atom feed parsing
  - Error handling
  - Edge cases (empty feeds, missing fields, single items)
  - ID generation
  - Date parsing

- **HTML Utilities** (32 tests)
  - HTML to text conversion
  - Entity decoding (named and numeric)
  - Text truncation
  - Text wrapping

- **Fuzzy Search** (31 tests)
  - Fuzzy matching algorithm
  - Score calculation (consecutive matches, word boundaries, start bonuses)
  - Ranking and sorting
  - Weight application

- **Keybinding Handler** (16 tests)
  - Pane-specific keybindings
  - Vim-style sequences (gg, G)
  - Command palette mode
  - State management

- **Config Loader** (3 tests)
  - TOML parsing
  - Feed validation
  - URL validation

### Coverage Targets

- **Overall Target**: 70%+
- **Critical Modules** (parser, keybindings, search): 80%+
- **Utilities**: 75%+

## Test Categories

### Unit Tests

Unit tests focus on individual functions and modules in isolation:

- **Feed Parser** (`src/feed/parser.test.ts`)
  - Tests RSS and Atom parsing logic
  - Uses test fixtures from `test/fixtures/feeds/`
  - Validates data transformation and error handling

- **HTML Utilities** (`src/utils/html.test.ts`)
  - Tests HTML-to-text conversion
  - Entity decoding
  - Text manipulation functions

- **Fuzzy Search** (`src/search/fuzzy.test.ts`)
  - Tests matching algorithm
  - Score calculation
  - Ranking logic

- **Keybinding Handler** (`src/keybindings/handler.test.ts`)
  - Tests keyboard event handling
  - Pane navigation
  - Sequence detection (gg, command palette)

- **Config Loader** (`src/config/loader.test.ts`)
  - Tests TOML parsing
  - Validates configuration structure

### Integration Tests

**Status**: Planned (not yet implemented)

Integration tests will validate the interaction between modules:

- Feed fetching + parsing
- Database + article storage
- Search across feeds and articles

### E2E Tests

**Status**: Future consideration

End-to-end tests for TUI applications are challenging. Options being considered:

- Snapshot testing of rendered output
- Keyboard input simulation
- VHS (currently used for screenshots) could be extended for testing

## Testing Best Practices

### Writing Tests

1. **Descriptive test names**: Use clear descriptions that explain what's being tested
   ```typescript
   test("generates ID from link when guid is missing", () => { ... })
   ```

2. **Arrange-Act-Assert**: Follow the AAA pattern
   ```typescript
   test("parses RSS feed correctly", () => {
     // Arrange
     const xml = loadFixture("tech-news.xml");

     // Act
     const result = parseFeed(xml);

     // Assert
     expect(result.title).toBe("Tech Daily");
   });
   ```

3. **Test edge cases**: Empty inputs, null values, boundary conditions
   ```typescript
   test("handles null link and content", () => { ... })
   test("handles empty feed", () => { ... })
   ```

4. **Use test fixtures**: Store sample data in `test/fixtures/`
   - `test/fixtures/feeds/tech-news.xml` - RSS 2.0 feed
   - `test/fixtures/feeds/dev-blog.xml` - Atom feed
   - `test/fixtures/feeds/empty.xml` - Empty feed
   - `test/fixtures/feeds/malformed.xml` - Invalid XML

### Avoiding Common Pitfalls

1. **Don't test implementation details**: Focus on behavior, not internals
2. **Avoid test interdependence**: Each test should run independently
3. **Keep tests fast**: Use mocks/stubs for slow operations (network, database)
4. **Don't duplicate production code**: Tests should verify, not reimplement

## Continuous Integration

Tests run automatically on:

- **Push to main branch**
- **Pull requests**

The CI workflow (`.github/workflows/test.yml`) runs:

1. Code formatting check (`bun run format:check`)
2. TypeScript type checking (`bun run build`)
3. Test suite (`bun test`)
4. Coverage report (`bun test --coverage`)

Coverage reports are uploaded as artifacts for review.

## Known Limitations

### Database Tests

Database tests are **currently excluded** due to complexity in mocking Bun's SQLite module. Future improvements:

- Add dependency injection to database layer
- Use test database with temporary file paths
- Implement mock database adapter

### Integration Tests

Integration tests requiring a running mock server are **currently excluded** as they:

- Add flakiness to the test suite
- Require external process management
- Are better suited for local development than CI

The mock server (`test/fixtures/serve.ts`) is available for manual testing via `just serve-mock`.

## Future Improvements

### Short Term

- [ ] Add database layer tests with proper mocking/DI
- [ ] Implement integration tests for feed fetching
- [ ] Add snapshot tests for UI components (if feasible)

### Long Term

- [ ] E2E testing framework for TUI
- [ ] Performance benchmarks
- [ ] Mutation testing for test quality
- [ ] Visual regression testing for screenshots

## Test Data

### Fixtures

Test fixtures are stored in `test/fixtures/`:

- **feeds/**: Sample RSS and Atom feeds
  - `tech-news.xml`: RSS 2.0 with 5 articles
  - `dev-blog.xml`: Atom with 4 articles
  - `empty.xml`: Valid feed with no items
  - `malformed.xml`: Invalid XML for error testing

- **serve.ts**: Mock HTTP server for integration tests
  - Runs on `http://localhost:3333`
  - Serves fixture feeds
  - Includes health check endpoint

### Mock Server

Start the mock server for manual testing:

```bash
just serve-mock
```

The server provides:
- `GET /tech-news.xml` - RSS feed
- `GET /dev-blog.xml` - Atom feed
- `GET /empty.xml` - Empty feed
- `GET /malformed.xml` - Invalid XML
- `GET /health` - Health check (JSON response)

## Contributing

When adding new features:

1. **Write tests first** (TDD encouraged)
2. **Aim for 80%+ coverage** on new code
3. **Update this document** if test strategy changes
4. **Run tests locally** before pushing: `bun test`
5. **Check coverage**: `bun test --coverage`

## Resources

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Bun Test Runner API](https://bun.sh/docs/test/writing)
- Testing fixtures: `test/fixtures/`
