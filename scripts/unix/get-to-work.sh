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

# Compile TypeScript to JavaScript if needed
if [ -f "$PROJECT_ROOT/docgen.ts" ] && [ ! -f "$PROJECT_ROOT/docgen.js" ]; then
    echo "Compiling TypeScript to JavaScript..."
    cd "$PROJECT_ROOT" && npx tsc
fi

# Process command-line arguments
COMMAND=$1
USE_DOCKER=true  # Default to using Docker

# Check if Docker container is running
CONTAINER_RUNNING=$(docker ps --filter "name=docker-docgen" --format "{{.Names}}")
if [ -z "$CONTAINER_RUNNING" ]; then
    echo "Docker container is not running. Starting it now..."
    cd "$PROJECT_ROOT" && docker-compose up -d
fi

# Set up MCP servers in Docker
if [ "$USE_DOCKER" = true ]; then
    # Let's copy MCP files to Docker and start there
    if [ -f "$PROJECT_ROOT/scripts/docker-copy-mcp.sh" ]; then
        echo "Setting up MCP servers in Docker..."
        bash "$PROJECT_ROOT/scripts/docker-copy-mcp.sh"
        
        # Start MCP servers in Docker
        echo "Starting MCP servers in Docker..."
        docker exec docker-docgen-1 bash -c "cd /app && MCP_LISTEN_INTERFACE=0.0.0.0 MCP_SERVER_HOST=0.0.0.0 /app/mcp-servers/docker-mcp-adapters.sh"
        
        # Verify MCP servers are running in Docker by directly checking in the container
        echo "Verifying MCP servers are running in Docker..."
        docker exec docker-docgen-1 bash -c "MCP_LISTEN_INTERFACE=0.0.0.0 node /app/mcp-servers/docker-check-mcp.cjs"
        MCP_STATUS=$?
        
        if [ $MCP_STATUS -eq 0 ]; then
            echo "MCP servers are running in Docker!"
            # Create a flag file to indicate we should use Docker for MCP
            echo "1" > "$PROJECT_ROOT/.mcp-in-docker"
            # Also create a flag file inside the container
            docker exec docker-docgen-1 bash -c "echo '1' > /app/.mcp-in-docker"
            
            # Verify port mappings
            echo "Verifying Docker port mappings..."
            CONTAINER_ID=$(docker ps --filter "name=docker-docgen" --format "{{.ID}}")
            PORT_CHECK=$(docker port "$CONTAINER_ID" | grep "7865/tcp\|7866/tcp")
            
            if [ -z "$PORT_CHECK" ]; then
                echo "Warning: MCP ports are not properly mapped in Docker!"
                echo "Please ensure these ports are configured in your docker-compose.yml:"
                echo "  - 7865:7865  # Coverage MCP"
                echo "  - 7866:7866  # GitHub MCP"
                echo "  - 7867:7867  # Coverage REST API"
                echo "  - 7868:7868  # GitHub REST API"
            else
                echo "MCP port mappings confirmed: $PORT_CHECK"
            fi
        else
            echo "Warning: MCP servers may not be running correctly in Docker!"
            echo "Running debug utility to investigate..."
            docker exec docker-docgen-1 bash -c "cd /app && node /app/mcp-servers/docker-debug.js"
        fi
    fi
else
    # Check and start MCP servers locally
    if [ -f "$PROJECT_ROOT/mcp-servers/start-mcp-adapters.sh" ]; then
        echo "Checking MCP servers..."
        MCP_STATUS=$(cd "$PROJECT_ROOT" && node docgen.js check-servers 2>&1)
        
        if [[ "$MCP_STATUS" == *"Not running"* ]]; then
            echo "Starting MCP servers..."
            bash "$PROJECT_ROOT/mcp-servers/start-mcp-adapters.sh"
        else
            echo "MCP servers are running."
        fi
    fi
fi

# Run the DocGen workflow manager
echo "Running DocGen workflow manager..."

if [ "$USE_DOCKER" = true ]; then
    # Set environment variables to connect to Docker MCP
    export MCP_IN_DOCKER=1
    
    # Execute the command in Docker
    if [ -n "$COMMAND" ]; then
        # Run specific command using docker commands (without TypeScript directly)
        cd "$PROJECT_ROOT" && docker exec docker-docgen-1 bash -c "export MCP_IN_DOCKER=1 && cd /app && node docgen.js $COMMAND"
    else
        # Run init command by default
        cd "$PROJECT_ROOT" && docker exec docker-docgen-1 bash -c "export MCP_IN_DOCKER=1 && cd /app && node docgen.js init"
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
echo "MCP server commands:"
echo "  npx ts-node scripts/cross-platform.ts mcp start"
echo "  npx ts-node scripts/cross-platform.ts mcp stop"
echo "  npx ts-node scripts/cross-platform.ts mcp check"
echo ""
echo "=============================================="