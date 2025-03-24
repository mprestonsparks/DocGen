#!/bin/bash
#
# DocGen Command Runner for Unix-based systems
# This script provides a clean interface for running DocGen commands on Unix systems.
#
# This script aligns with the Docker-first strategy for cross-platform compatibility.

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Check if docgen.js exists
DOCGEN_PATH="$PROJECT_ROOT/docgen.js"
if [ ! -f "$DOCGEN_PATH" ]; then
    echo "Error: docgen.js not found at $DOCGEN_PATH"
    echo "Please make sure the project structure is correct"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Run the docgen.js command
node "$DOCGEN_PATH" "$@"
exit $?
