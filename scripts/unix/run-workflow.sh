#!/bin/bash
# DocGen Workflow Runner - Unix Implementation
# Executes the sequential workflow manager directly using ts-node

# Banner
echo ""
echo "============================================="
echo "     DocGen Sequential Workflow Manager"
echo "============================================="
echo "Starting automated workflow sequence:"
echo "1. Testing Phase"
echo "2. Issues Phase"
echo "3. TODOs Phase"
echo "============================================="
echo ""

# Get project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
WORKFLOW_DIR="$PROJECT_ROOT/scripts/workflow"

# Install dependencies
echo "Installing required dependencies..."
cd "$PROJECT_ROOT"
npm install --no-save typescript ts-node @types/node

# Execute the workflow using ts-node with ES module support
echo "Executing workflow with ts-node..."
NODE_OPTIONS="--experimental-specifier-resolution=node" npx ts-node --esm "$WORKFLOW_DIR/workflow-entry.ts"

# Exit with the result of the workflow
EXIT_CODE=$?

# Completion banner
echo ""
echo "============================================="
echo "     DocGen Workflow Execution Complete"
echo "============================================="

exit $EXIT_CODE
