# VHS tape file for generating tread screenshots
# https://github.com/charmbracelet/vhs

Output screenshots/tread.png

Set Shell bash
Set FontFamily "JetBrains Mono"
Set FontSize 14
Set Width 1200
Set Height 700
Set Padding 20
Set Theme "Dracula"

# Start with a clean slate
Hide
Type "export XDG_CONFIG_HOME=$(mktemp -d)"
Enter
Sleep 500ms
Type "mkdir -p $XDG_CONFIG_HOME/tread"
Enter
Sleep 500ms
Type "cp test/screenshot/config.toml $XDG_CONFIG_HOME/tread/config.toml"
Enter
Sleep 500ms

# Start the app
Type "bun run src/index.ts"
Enter
Sleep 3s
Show

# Wait for feeds to load and show the UI
Sleep 2s

# Navigate to show articles
Type "l"
Sleep 1s

# Take screenshot with articles visible
Screenshot screenshots/tread.png

# Exit
Type "q"
Sleep 500ms
