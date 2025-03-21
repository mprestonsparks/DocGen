#!/bin/bash

# Get-to-work script for Unix platforms
# This script is the entry point for developers working on DocGen on Unix platforms

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

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for required tools
check_requirements() {
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
  
  # Check for npm
  if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    echo -e "npm should be installed with Node.js. Please check your installation."
    exit 1
  fi
  
  # Check for Docker if needed for cross-platform work
  if command_exists docker; then
    echo -e "${GREEN}Docker is available for cross-platform testing.${NC}"
  else
    echo -e "${YELLOW}Warning: Docker is not installed.${NC}"
    echo -e "Docker is recommended for cross-platform development and testing."
  fi
  
  echo -e "${GREEN}All critical requirements satisfied.${NC}"
}

# Check if dependencies are installed
check_dependencies() {
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
}

# Check and start MCP servers if needed
start_mcp_servers() {
  echo -e "${BLUE}Checking MCP servers...${NC}"
  
  # Simplify MCP server check - just check if files exist
  if [ -f "$PROJECT_ROOT/mcp-servers/mcp-docker-running" ]; then
    # Docker mode - MCP servers are running in Docker
    echo -e "${GREEN}MCP servers are running in Docker.${NC}"
    return 0
  fi
  
  # Check for indicator file instead of process IDs
  if [ -f "$PROJECT_ROOT/.mcp-in-docker" ]; then
    echo -e "${GREEN}MCP servers are configured to run in Docker.${NC}"
    
    # Create Docker indicator file in mcp-servers directory
    touch "$PROJECT_ROOT/mcp-servers/mcp-docker-running"
    return 0
  fi
  
  # Try to start MCP adapters
  echo -e "${YELLOW}Starting MCP servers...${NC}"
  
  if [ -f "$PROJECT_ROOT/mcp-servers/start-mcp-adapters.sh" ]; then
    # Make the script executable
    chmod +x "$PROJECT_ROOT/mcp-servers/start-mcp-adapters.sh"
    
    # Start the MCP servers
    cd "$PROJECT_ROOT/mcp-servers" && bash start-mcp-adapters.sh
    
    # Check result
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}MCP servers started successfully.${NC}"
    else
      echo -e "${YELLOW}Warning: Could not start MCP servers.${NC}"
      echo -e "This is not critical - you can still use DocGen."
    fi
  else
    echo -e "${YELLOW}MCP server script not found.${NC}"
    echo -e "This is not critical - you can still use DocGen without MCP servers."
  fi
}

# Display the interactive menu
show_menu() {
  clear
  echo -e "${MAGENTA}===== DocGen Development Workflow =====${NC}"
  echo -e "${CYAN}Current platform: Unix ($(uname -s))${NC}"
  echo -e "${CYAN}Project root: $PROJECT_ROOT${NC}"
  echo
  echo -e "1. ${GREEN}Check project status${NC}"
  echo -e "2. ${BLUE}Run tests${NC}"
  echo -e "3. ${BLUE}Start interactive interview${NC}"
  echo -e "4. ${BLUE}Generate documentation${NC}"
  echo -e "5. ${BLUE}Validate documentation${NC}"
  echo -e "6. ${BLUE}Generate reports${NC}"
  echo -e "7. ${YELLOW}GitHub workflow${NC}"
  echo -e "8. ${YELLOW}Toggle Claude features${NC}"
  echo -e "9. ${RED}Exit${NC}"
  echo
  echo -n "Enter your choice [1-9]: "
}

# Execute the user's choice
execute_choice() {
  local choice=$1
  
  case $choice in
    1)
      echo -e "${GREEN}Checking project status...${NC}"
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/docgen.js" ]; then
        node docgen.js analyze
      else
        echo -e "${RED}Error: docgen.js not found. Using fallback command...${NC}"
        npm run docgen:analyze
      fi
      ;;
    2)
      echo -e "${BLUE}Running tests...${NC}"
      cd "$PROJECT_ROOT" && npm test
      ;;
    3)
      echo -e "${BLUE}Starting interactive interview...${NC}"
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/scripts/initialize.ts" ]; then
        npx ts-node scripts/initialize.ts
      else
        npm run interview
      fi
      ;;
    4)
      echo -e "${BLUE}Generating documentation...${NC}"
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/docgen.js" ]; then
        node docgen.js generate
      else
        echo "Documentation generation not yet implemented"
      fi
      ;;
    5)
      echo -e "${BLUE}Validating documentation...${NC}"
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/scripts/validate-docs.js" ]; then
        node scripts/validate-docs.js
      else
        npm run validate
      fi
      ;;
    6)
      echo -e "${BLUE}Generating reports...${NC}"
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/scripts/generate-reports.js" ]; then
        node scripts/generate-reports.js
      else
        npm run generate-reports
      fi
      ;;
    7)
      echo -e "${YELLOW}Running GitHub workflow...${NC}"
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/scripts/run-github-workflow.sh" ]; then
        bash scripts/run-github-workflow.sh
      else
        npm run github:workflow
      fi
      ;;
    8)
      echo -e "${YELLOW}Toggling Claude features...${NC}"
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/docgen.js" ]; then
        node docgen.js toggle-claude
      else
        npm run docgen:toggle-claude
      fi
      ;;
    9)
      echo -e "${RED}Exiting...${NC}"
      exit 0
      ;;
    *)
      echo -e "${RED}Invalid choice. Please enter a number between 1 and 9.${NC}"
      ;;
  esac
  
  # Pause before returning to menu
  echo
  echo -n "Press Enter to continue..."
  read
}

# Main execution
main() {
  # Run initial checks
  check_requirements
  check_dependencies
  start_mcp_servers
  
  # Display interactive menu
  while true; do
    show_menu
    read choice
    execute_choice "$choice"
  done
}

# Execute the main function
main