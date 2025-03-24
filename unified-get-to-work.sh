#!/bin/bash

# Symlink to the platform-specific unified workflow script
# This script serves as an entry point that calls the appropriate platform-specific
# unified workflow script based on the current operating system.

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
UNIFIED_SCRIPT="$SCRIPT_DIR/scripts/unix/unified-get-to-work.sh"

# Make the script executable
chmod +x "$UNIFIED_SCRIPT"

# Execute the unified workflow script
exec bash "$UNIFIED_SCRIPT" "$@"
