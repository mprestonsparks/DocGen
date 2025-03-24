#!/bin/bash

# Simplified get-to-work script for DocGen
# This script provides a list of commands instead of interactive menu

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
PROJECT_ROOT="$SCRIPT_DIR"

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Welcome message
echo -e "${MAGENTA}===== DocGen Development Workflow =====${NC}"
echo -e "${CYAN}Current platform: Unix ($(uname -s))${NC}"
echo -e "${CYAN}Project root: $PROJECT_ROOT${NC}"
echo

# Check for required tools
echo -e "${BLUE}Checking requirements...${NC}"

# Check for Node.js
if ! command_exists node; then
  echo -e "${RED}Error: Node.js is not installed.${NC}"
  echo -e "Please install Node.js from https://nodejs.org/"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${YELLOW}Warning: Node.js version $NODE_VERSION is below the recommended version (18+).${NC}"
  echo -e "Some features may not work correctly. Consider upgrading Node.js."
else
  echo -e "${GREEN}Node.js version $NODE_VERSION detected.${NC}"
fi

# Check for Docker if needed for cross-platform work
if command_exists docker; then
  echo -e "${GREEN}Docker is available for cross-platform testing.${NC}"
else
  echo -e "${YELLOW}Warning: Docker is not installed.${NC}"
  echo -e "Docker is recommended for cross-platform development and testing."
fi

# Check if dependencies are installed
echo -e "${BLUE}Checking dependencies...${NC}"

if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo -e "${YELLOW}Node modules not found. Installing dependencies...${NC}"
  cd "$PROJECT_ROOT" && npm install
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to install dependencies.${NC}"
    exit 1
  else
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
  fi
else
  echo -e "${GREEN}Dependencies already installed.${NC}"
fi

# Create Docker indicator file
touch "$PROJECT_ROOT/.mcp-in-docker"
touch "$PROJECT_ROOT/mcp-servers/mcp-docker-running"

echo -e "${GREEN}MCP servers are configured to run in Docker.${NC}"

# Show available commands
echo
echo -e "${MAGENTA}===== DocGen Commands =====${NC}"
echo -e "Available npm commands for DocGen:"
echo -e "${GREEN}npm test${NC} - Run tests"
echo -e "${GREEN}npm run interview${NC} - Start interactive interview"
echo -e "${GREEN}npm run validate${NC} - Validate documentation"
echo -e "${GREEN}npm run generate-reports${NC} - Generate reports"
echo -e "${GREEN}npm run docgen${NC} - Run DocGen command line tool"
echo

# Show Docker commands
echo -e "${MAGENTA}===== Docker Commands =====${NC}"
echo -e "${GREEN}npm run docker:build${NC} - Build the Docker image"
echo -e "${GREEN}npm run docker:start${NC} - Start the Docker container"
echo -e "${GREEN}npm run docker:stop${NC} - Stop the Docker container"
echo -e "${GREEN}npm run docker:status${NC} - Check Docker container status"
echo -e "${GREEN}npm run docker:exec -- <command>${NC} - Run a command in Docker"
echo -e "${GREEN}npm run docker:shell${NC} - Open a shell in Docker"
echo

echo -e "${CYAN}Your DocGen environment is ready.${NC}"
echo -e "${CYAN}For more information, see the README.md file.${NC}"