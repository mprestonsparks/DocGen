#!/bin/bash

# Cross-platform script wrapper (Unix version)
# This script detects the platform and runs the appropriate script

# Set colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect platform
OS=$(uname -s)
case "$OS" in
  Linux*)     PLATFORM="Linux" ;;
  Darwin*)    PLATFORM="macOS" ;;
  CYGWIN*)    PLATFORM="Windows-Cygwin" ;;
  MINGW*)     PLATFORM="Windows-MinGW" ;;
  *)          PLATFORM="Unknown" ;;
esac

echo -e "${BLUE}Platform detected: ${GREEN}$PLATFORM${NC}"

# Get the script name from the first argument
SCRIPT_NAME=$1
shift  # Remove the first argument

if [ -z "$SCRIPT_NAME" ]; then
  echo -e "${RED}Error: No script name provided${NC}"
  echo "Usage: $0 <script-name> [args...]"
  echo "Example: $0 get-to-work"
  exit 1
fi

# Get the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Function to check Docker availability
check_docker() {
  if command -v docker >/dev/null 2>&1 && command -v docker-compose >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Function to run script in Docker
run_in_docker() {
  local script_path=$1
  shift
  
  echo -e "${YELLOW}Running script in Docker: ${script_path}${NC}"
  
  # Make sure Docker container is running
  if ! docker-compose -f "$PROJECT_ROOT/.docker/docker-compose.yml" ps | grep -q "docgen"; then
    echo -e "${YELLOW}Starting Docker container...${NC}"
    docker-compose -f "$PROJECT_ROOT/.docker/docker-compose.yml" up -d
  fi
  
  # Determine the right Docker command based on whether it's a shell script or not
  if [[ "$script_path" == *.sh ]]; then
    docker-compose -f "$PROJECT_ROOT/.docker/docker-compose.yml" exec docgen bash "$script_path" "$@"
  else
    docker-compose -f "$PROJECT_ROOT/.docker/docker-compose.yml" exec docgen "$script_path" "$@"
  fi
}

# Normalize the script name (remove any extension)
NORMALIZED_SCRIPT=$(echo "$SCRIPT_NAME" | sed 's/\.[^.]*$//')

# Special handling for certain scripts
if [ "$NORMALIZED_SCRIPT" = "get-to-work" ]; then
  # For get-to-work, use the Unix or Docker version
  UNIX_SCRIPT="$PROJECT_ROOT/scripts/unix/get-to-work.sh"
  
  if [ -f "$UNIX_SCRIPT" ]; then
    echo -e "${GREEN}Running get-to-work script for Unix${NC}"
    bash "$UNIX_SCRIPT" "$@"
  elif check_docker; then
    echo -e "${YELLOW}Unix script not found. Attempting to run via Docker...${NC}"
    run_in_docker "/app/scripts/unix/get-to-work.sh" "$@"
  else
    echo -e "${RED}Error: get-to-work script not found and Docker is not available${NC}"
    exit 1
  fi
elif [ "$NORMALIZED_SCRIPT" = "mcp-servers/start-mcp-servers" ] || [ "$NORMALIZED_SCRIPT" = "mcp" ]; then
  # For MCP servers, use Unix or Docker
  UNIX_SCRIPT="$PROJECT_ROOT/mcp-servers/start-mcp-adapters.sh"
  
  if [ -f "$UNIX_SCRIPT" ]; then
    echo -e "${GREEN}Running MCP server control script for Unix${NC}"
    bash "$UNIX_SCRIPT" "$@"
  elif check_docker; then
    echo -e "${YELLOW}MCP script not found. Attempting to run via Docker...${NC}"
    run_in_docker "/app/mcp-servers/start-mcp-adapters.sh" "$@"
  else
    echo -e "${RED}Error: MCP server script not found and Docker is not available${NC}"
    exit 1
  fi
elif [ "$NORMALIZED_SCRIPT" = "docgen" ]; then
  # For docgen, use the main docgen.js script
  DOCGEN_SCRIPT="$PROJECT_ROOT/docgen.js"
  
  if [ -f "$DOCGEN_SCRIPT" ]; then
    echo -e "${GREEN}Running docgen command${NC}"
    node "$DOCGEN_SCRIPT" "$@"
  elif check_docker; then
    echo -e "${YELLOW}Docgen script not found. Attempting to run via Docker...${NC}"
    run_in_docker "node /app/docgen.js" "$@"
  else
    echo -e "${RED}Error: docgen script not found and Docker is not available${NC}"
    exit 1
  fi
else
  # For other scripts, look for .sh version
  UNIX_SCRIPT="$PROJECT_ROOT/$NORMALIZED_SCRIPT.sh"
  
  if [ -f "$UNIX_SCRIPT" ]; then
    echo -e "${GREEN}Running script: $UNIX_SCRIPT${NC}"
    bash "$UNIX_SCRIPT" "$@"
  elif check_docker; then
    echo -e "${YELLOW}Unix script not found. Attempting to run via Docker...${NC}"
    DOCKER_SCRIPT="/app/$NORMALIZED_SCRIPT.sh"
    run_in_docker "$DOCKER_SCRIPT" "$@"
  else
    echo -e "${RED}Error: Script not found at $UNIX_SCRIPT and Docker is not available${NC}"
    exit 1
  fi
fi