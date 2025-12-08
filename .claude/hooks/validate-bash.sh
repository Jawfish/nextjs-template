#!/usr/bin/env bash

# Read JSON input from stdin
input=$(cat)

# Extract the command from the JSON
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Check if command contains "bun test" (but not "bun run test")
if echo "$command" | grep -q "bun test" && ! echo "$command" | grep -q "bun run test"; then
  echo "Error: Use 'bun run test' instead of 'bun test' to use vitest's test runner" >&2
  exit 2
fi

# Check if command contains "sed"
if echo "$command" | grep -qE '\bsed\b'; then
  cat >&2 << 'EOF'
Error: Use 'sd' instead of 'sed' for find & replace operations.

sd is an intuitive find & replace CLI. Quick primer:

  Basic usage:
    sd 'pattern' 'replacement' file.txt     # In-place replacement
    sd 'pattern' 'replacement' < file.txt   # From stdin to stdout

  Common options:
    -p, --preview         Preview changes without modifying
    -F, --fixed-strings   Treat patterns as literal strings (no regex)
    -f i                  Case-insensitive matching

  Examples:
    sd 'foo' 'bar' file.txt                 # Replace foo with bar
    sd -p 'old' 'new' *.js                  # Preview changes in JS files
    sd -F '[[special]]' 'normal' file.txt   # Literal string replacement
    sd '(\w+)@(\w+)' '$1 AT $2' emails.txt  # Capture groups with $1, $2
EOF
  exit 2
fi

# Allow the command to proceed
exit 0
