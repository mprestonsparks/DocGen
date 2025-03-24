#!/bin/bash

# Main get-to-work script for DocGen
# This directly launches the Unix version of the workflow script

# Get the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
UNIX_SCRIPT="$SCRIPT_DIR/scripts/unix/get-to-work.sh"

# Make the script executable
chmod +x "$UNIX_SCRIPT"

# Execute the Unix script
exec bash "$UNIX_SCRIPT" "$@"