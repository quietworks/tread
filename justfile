# Tread development commands
# Run `just` to see available commands

# Default command - list available recipes
default:
    @just --list

# Run the application
run:
    bun run src/index.ts

# Run with watch mode (auto-restart on changes)
dev:
    bun run dev

# Type-check the project
check:
    bun run build

# Format code
fmt:
    bun run format

# Check formatting without writing
fmt-check:
    bun run format:check

# Run tests
test:
    bun test

# Run tests with coverage
test-coverage:
    bun test --coverage

# Run tests in watch mode
test-watch:
    bun test --watch

# Start mock feed server for testing
serve-mock:
    bun run test/fixtures/serve.ts

# Generate screenshot (requires vhs: brew install vhs)
screenshot:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Starting mock feed server..."
    bun run test/fixtures/serve.ts &
    SERVER_PID=$!
    trap "kill $SERVER_PID 2>/dev/null || true" EXIT
    sleep 2
    curl -sf http://localhost:3333/health > /dev/null || { echo "Server failed to start"; exit 1; }
    echo "Generating screenshot..."
    vhs test/screenshot/tread.tape
    echo "Screenshot saved to screenshots/tread.png"

# Create a new release (bumps version, commits, creates GitHub release)
release version:
    #!/usr/bin/env bash
    set -euo pipefail

    # Validate version format
    if ! [[ "{{version}}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "Error: Version must be in format X.Y.Z (e.g., 1.2.3)"
        exit 1
    fi

    # Check for uncommitted changes
    if ! git diff --quiet || ! git diff --staged --quiet; then
        echo "Error: You have uncommitted changes. Commit or stash them first."
        exit 1
    fi

    echo "Releasing v{{version}}..."

    # Update package.json version
    sed -i '' 's/"version": "[^"]*"/"version": "{{version}}"/' package.json

    # Commit and push
    git add package.json
    git commit -m "chore: bump version to {{version}}"
    git push origin main

    # Create GitHub release
    gh release create "v{{version}}" --title "v{{version}}" --generate-notes

    echo "Release v{{version}} created!"
    echo "Monitor the build: gh run watch"

# Install dependencies
install:
    bun install

# Clean build artifacts and caches
clean:
    rm -rf node_modules/.cache dist
