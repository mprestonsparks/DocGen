#!/bin/bash
#
# GitHub Issues Workflow for Claude Code
#
# This script runs the complete GitHub Issues workflow to:
# 1. Start the MCP servers if not already running
# 2. Update all implementation gap issues with coverage data
# 3. Correlate issues with coverage data
# 4. Generate a coverage report
# 5. Display implementation status
#

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Function to check if MCP servers are running
check_mcp_servers() {
  echo -e "${BLUE}Checking if MCP servers are running...${NC}"
  
  # Check GitHub MCP
  GITHUB_PID=$(pgrep -f "node.*github-issues/server.js" || echo "")
  if [ -z "$GITHUB_PID" ]; then
    echo -e "${YELLOW}GitHub Issues MCP server is not running.${NC}"
    GITHUB_RUNNING=false
  else
    echo -e "${GREEN}GitHub Issues MCP server is running with PID: $GITHUB_PID${NC}"
    GITHUB_RUNNING=true
  fi
  
  # Check Coverage MCP
  COVERAGE_PID=$(pgrep -f "node.*coverage-analysis/server.js" || echo "")
  if [ -z "$COVERAGE_PID" ]; then
    echo -e "${YELLOW}Coverage Analysis MCP server is not running.${NC}"
    COVERAGE_RUNNING=false
  else
    echo -e "${GREEN}Coverage Analysis MCP server is running with PID: $COVERAGE_PID${NC}"
    COVERAGE_RUNNING=true
  fi
  
  # Return true if both servers are running
  if [ "$GITHUB_RUNNING" = true ] && [ "$COVERAGE_RUNNING" = true ]; then
    return 0
  else
    return 1
  fi
}

# Function to start MCP servers
start_mcp_servers() {
  echo -e "${BLUE}Starting MCP servers...${NC}"
  cd "$PROJECT_ROOT" && npm run mcp:start
  
  # Wait for servers to start
  echo -e "${YELLOW}Waiting for servers to initialize...${NC}"
  sleep 5
  
  # Verify servers are running
  if check_mcp_servers; then
    echo -e "${GREEN}MCP servers started successfully.${NC}"
  else
    echo -e "${RED}Failed to start MCP servers. Please check for errors and try again.${NC}"
    exit 1
  fi
}

# Check if MCP servers are running
if ! check_mcp_servers; then
  echo -e "${YELLOW}One or both MCP servers are not running. Starting them now...${NC}"
  start_mcp_servers
fi

# Run the GitHub Issues workflow
echo -e "\n${MAGENTA}=== Running GitHub Issues Workflow ===${NC}\n"

echo -e "${CYAN}Step 1: Updating all implementation gap issues with coverage data${NC}"
cd "$PROJECT_ROOT" && npm run github:update-all

echo -e "\n${CYAN}Step 2: Correlating issues with coverage${NC}"
cd "$PROJECT_ROOT" && npm run github:correlate

echo -e "\n${CYAN}Step 3: Generating coverage report${NC}"
cd "$PROJECT_ROOT" && npm run github:coverage-report -- --update-issues

echo -e "\n${CYAN}Step 4: Displaying implementation status${NC}"
cd "$PROJECT_ROOT" && npm run github:status

echo -e "\n${GREEN}GitHub Issues Workflow completed successfully!${NC}"
echo -e "${YELLOW}You can now use the GitHub Issues MCP and Coverage Analysis MCP in Claude Code.${NC}"
echo -e "${YELLOW}For example, try these commands in Claude Code:${NC}"
echo -e "  ${CYAN}@github status${NC}"
echo -e "  ${CYAN}@github issues --implementation-gaps${NC}"
echo -e "  ${CYAN}@coverage getImplementationGaps${NC}"
echo -e "\n${MAGENTA}For more information, see docs/github-issues-workflow.md${NC}"