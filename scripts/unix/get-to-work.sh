#!/bin/bash
#
# DocGen Workflow Manager for Unix-based systems
# This script provides a Unix-compatible entry point for the DocGen workflow
#
# This script aligns with the Docker-first strategy for cross-platform compatibility.

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Display header
echo ""
echo "=============================================="
echo "           DocGen Workflow Manager"
echo "=============================================="

# Check if Claude features are enabled
if [ -f "$PROJECT_ROOT/.claude-enabled" ]; then
    echo "Claude features: Enabled"
else
    echo "Claude features: Disabled"
fi
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo "Docker detected: $DOCKER_VERSION"
else
    echo "Docker not detected. Please install Docker."
    exit 1
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "Using Node.js $NODE_VERSION"
else
    echo "Node.js not detected. Please install Node.js."
    exit 1
fi

# Process command-line arguments
COMMAND=$1
USE_DOCKER=true  # Default to using Docker

# Run the DocGen workflow manager
echo "Running DocGen workflow manager in Docker container..."

if [ "$USE_DOCKER" = true ]; then
    # Check if the Docker container is running
    CONTAINER_RUNNING=$(docker ps --filter "name=docker-docgen" --format "{{.Names}}")
    if [ -z "$CONTAINER_RUNNING" ]; then
        echo "Docker container is not running. Starting it now..."
        cd "$PROJECT_ROOT" && docker-compose up -d
    fi
    
    # Execute the command in Docker
    if [ -n "$COMMAND" ]; then
        # Run specific command
        docker exec docker-docgen-1 bash -c "cd /app && node docgen.js $COMMAND"
    else
        # Run init command by default
        docker exec docker-docgen-1 bash -c "cd /app && node docgen.js init"
    fi
else
    # Execute the command locally
    if [ -n "$COMMAND" ]; then
        # Run specific command
        node "$PROJECT_ROOT/docgen.js" $COMMAND
    else
        # Run init command by default
        node "$PROJECT_ROOT/docgen.js" init
    fi
fi

# Display available commands
echo ""
echo "Available commands:"
echo "  node docgen.js check-servers"
echo "  node docgen.js start-servers"
echo "  node docgen.js check-tests"
echo "  node docgen.js analyze"
echo ""
echo "To toggle Claude features:"
echo "  node docgen.js toggle-claude"
echo ""
echo "=============================================="