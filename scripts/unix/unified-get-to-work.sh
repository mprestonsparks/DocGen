#!/bin/bash

# DocGen Unified Workflow Manager for Unix
# This script provides a unified interface for running the DocGen workflow manager on Unix platforms.
# It executes the sequential workflow that progresses through Testing -> Issues -> TODOs phases.

# Set colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
WORKFLOW_MANAGER="$PROJECT_ROOT/scripts/workflow/sequential-workflow-manager.js"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Display header
echo -e "${MAGENTA}===============================================${NC}"
echo -e "${MAGENTA}     DocGen Sequential Workflow Manager${NC}"
echo -e "${MAGENTA}===============================================${NC}"
echo -e "Starting automated workflow sequence:"
echo -e "1. ${BLUE}Testing Phase${NC}"
echo -e "2. ${BLUE}Issues Phase${NC}"
echo -e "3. ${BLUE}TODOs Phase${NC}"
echo -e "${MAGENTA}===============================================${NC}"
echo

# Check if Node.js is installed
if ! command_exists node; then
  echo -e "${RED}Error: Node.js is not installed.${NC}"
  echo -e "Please install Node.js from https://nodejs.org/"
  exit 1
else
  NODE_VERSION=$(node -v)
  echo -e "Using ${GREEN}Node.js $NODE_VERSION${NC}"
fi

# Check if Docker is available
if command_exists docker; then
  DOCKER_VERSION=$(docker --version)
  echo -e "Docker detected: ${GREEN}$DOCKER_VERSION${NC}"
  USE_DOCKER=true
else
  echo -e "${YELLOW}Docker not detected. Using local execution mode.${NC}"
  USE_DOCKER=false
fi

# Ensure npm dependencies are installed
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo -e "${YELLOW}Installing dependencies...${NC}"
  cd "$PROJECT_ROOT" && npm install
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to install dependencies.${NC}"
    exit 1
  fi
fi

# Check if workflow manager script exists
if [ ! -f "$WORKFLOW_MANAGER" ]; then
  echo -e "${RED}Error: Workflow manager script not found at $WORKFLOW_MANAGER${NC}"
  exit 1
fi

# Check and start Docker container if needed
if [ "$USE_DOCKER" = true ]; then
  # Check if the Docker container is running
  CONTAINER_RUNNING=$(docker ps --filter "name=docker-docgen" --format "{{.Names}}")
  if [ -z "$CONTAINER_RUNNING" ]; then
    echo -e "${YELLOW}Docker container is not running. Starting it now...${NC}"
    # Start the container
    cd "$PROJECT_ROOT"
    npx ts-node "$PROJECT_ROOT/scripts/docker-commands.ts" start
  fi
  
  # Setup MCP in Docker if needed
  DOCKER_COPY_SCRIPT="$PROJECT_ROOT/scripts/docker-copy-mcp.sh"
  if [ -f "$DOCKER_COPY_SCRIPT" ]; then
    echo -e "${BLUE}Setting up MCP servers in Docker...${NC}"
    bash "$DOCKER_COPY_SCRIPT"
    
    # Start MCP servers in Docker
    echo -e "${BLUE}Starting MCP servers in Docker...${NC}"
    docker exec docker-docgen-1 bash -c "cd /app && MCP_LISTEN_INTERFACE=0.0.0.0 MCP_SERVER_HOST=0.0.0.0 /app/mcp-servers/docker-mcp-adapters.sh"
    
    # Create flag files for MCP in Docker
    echo "1" > "$PROJECT_ROOT/.mcp-in-docker"
    docker exec docker-docgen-1 bash -c "echo '1' > /app/.mcp-in-docker"
  fi
fi

# Execute the sequential workflow
echo
echo -e "${GREEN}Starting sequential workflow execution...${NC}"
echo

# Create a temporary script to execute the workflow manager
TEMP_SCRIPT="/tmp/run-workflow-$$.js"
cat > "$TEMP_SCRIPT" << EOF
// Temporary script to run the DocGen workflow
const workflowManager = require('${WORKFLOW_MANAGER}');

(async () => {
  try {
    await workflowManager.initializeWorkflow();
    console.log('Workflow execution completed.');
  } catch (error) {
    console.error('Error executing workflow:', error);
    process.exit(1);
  }
})();
EOF

# Execute the script
if [ "$USE_DOCKER" = true ]; then
  # Copy the workflow script to Docker
  docker cp "$WORKFLOW_MANAGER" docker-docgen-1:/app/scripts/workflow/sequential-workflow-manager.js
  
  # Copy the temp script to Docker
  docker cp "$TEMP_SCRIPT" docker-docgen-1:/app/run-workflow.js
  
  # Run the workflow in Docker
  docker exec docker-docgen-1 bash -c "cd /app && node run-workflow.js"
else
  # Run locally
  node "$TEMP_SCRIPT"
fi

# Clean up temp script
rm -f "$TEMP_SCRIPT"

echo
echo -e "${MAGENTA}===============================================${NC}"
echo -e "${MAGENTA}     DocGen Workflow Execution Complete${NC}"
echo -e "${MAGENTA}===============================================${NC}"
