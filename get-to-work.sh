#!/bin/bash
#
# Get to Work - Workflow Bootstrapper for Claude
#
# This script provides a simple entry point for Claude to start working intelligently 
# on the DocGen project, automatically:
# 1. Checking for failing tests that need to be fixed first
# 2. Ensuring MCP servers are running
# 3. Analyzing the project state and GitHub issues
# 4. Determining and recommending the optimal workflow steps
#
# Usage: ./get-to-work.sh
#

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ASCII art banner
echo -e "${MAGENTA}"
echo " ██████╗ ███████╗████████╗    ████████╗ ██████╗     ██╗    ██╗ ██████╗ ██████╗ ██╗  ██╗"
echo "██╔════╝ ██╔════╝╚══██╔══╝    ╚══██╔══╝██╔═══██╗    ██║    ██║██╔═══██╗██████╔╝██║ ██╔╝"
echo "██║  ███╗█████╗     ██║          ██║   ██║   ██║    ██║ █╗ ██║██║   ██║██████╔╝█████╔╝ "
echo "██║   ██║██╔══╝     ██║          ██║   ██║   ██║    ██║███╗██║██║   ██║██╔══██╗██╔═██╗ "
echo "╚██████╔╝███████╗   ██║          ██║   ╚██████╔╝    ╚███╔███╔╝╚██████╔╝██║  ██║██║  ██╗"
echo " ╚═════╝ ╚══════╝   ╚═╝          ╚═╝    ╚═════╝      ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
                                                                
echo -e "${BOLD}Intelligent Workflow Manager for Claude Code${NC}\n"

echo -e "${CYAN}Starting DocGen workflow automation...${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed or not in PATH${NC}"
    echo "Please install Node.js and npm, then try again."
    exit 1
fi

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$SCRIPT_DIR"

# Function to check for failing tests
check_failing_tests() {
  echo -e "${BLUE}Checking for failing tests...${NC}"
  
  # Create log directory if it doesn't exist
  mkdir -p logs
  local test_log="logs/test-output.log"
  
  # Run tests with proper output capture
  npm test > "$test_log" 2>&1
  test_exit_code=$?
  
  # Check if the tests failed
  if [ $test_exit_code -ne 0 ] || grep -q "FAIL" "$test_log"; then
    echo -e "${RED}Found failing tests.${NC} You should fix these first."
    echo -e "${YELLOW}Summary of failing tests:${NC}"
    grep -A 3 "FAIL" "$test_log" | head -n 20
    echo -e "\n${BLUE}Complete test logs available at: ${CYAN}$test_log${NC}"
    return 1
  else
    echo -e "${GREEN}All tests are passing!${NC}"
    return 0
  fi
}

# Function to ensure MCP servers are running
ensure_mcp_servers() {
  echo -e "${BLUE}Ensuring MCP servers are running...${NC}"
  
  # Check if MCP startup script exists
  if [ ! -f "mcp-servers/start-mcp-servers.sh" ]; then
    echo -e "${RED}Error: MCP server startup script not found${NC}"
    echo -e "${YELLOW}Expected path: mcp-servers/start-mcp-servers.sh${NC}"
    return 1
  fi
  
  # Make sure script is executable
  chmod +x mcp-servers/start-mcp-servers.sh
  
  # Check if servers are already running
  local github_pid_file="mcp-servers/github-mcp-server.pid"
  local coverage_pid_file="mcp-servers/coverage-mcp-server.pid"
  local already_running=false
  
  for pid_file in "$github_pid_file" "$coverage_pid_file"; do
    if [ -f "$pid_file" ]; then
      local pid=$(grep -o '[0-9]*' "$pid_file")
      if [ -n "$pid" ] && ps -p "$pid" > /dev/null; then
        already_running=true
      fi
    fi
  done
  
  if [ "$already_running" = true ]; then
    echo -e "${GREEN}MCP servers are already running${NC}"
  else
    echo -e "${CYAN}Starting MCP servers...${NC}"
    
    # Create log directory if it doesn't exist
    mkdir -p logs/mcp-debug
    local mcp_log="logs/mcp-debug/startup.log"
    
    # Start the MCP servers
    bash mcp-servers/start-mcp-servers.sh > "$mcp_log" 2>&1
    mcp_exit_code=$?
    
    if [ $mcp_exit_code -ne 0 ]; then
      echo -e "${RED}Failed to start MCP servers${NC}"
      echo -e "${YELLOW}Last 5 lines of MCP startup log:${NC}"
      tail -n 5 "$mcp_log"
      echo -e "\n${BLUE}Complete MCP logs available at: ${CYAN}$mcp_log${NC}"
      echo -e "${YELLOW}Note: MCP servers require a valid GitHub token${NC}"
      echo -e "${YELLOW}Run: node scripts/diagnose-github-token.cjs for detailed diagnostics${NC}"
      return 1
    else
      echo -e "${GREEN}MCP servers started successfully${NC}"
    fi
  fi
  
  # Test if MCP servers are actually responding
  echo -e "${BLUE}Testing MCP server connectivity...${NC}"
  local github_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/capabilities 2>/dev/null)
  local coverage_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/capabilities 2>/dev/null)
  
  if [ "$github_response" = "200" ] && [ "$coverage_response" = "200" ]; then
    echo -e "${GREEN}Both MCP servers are responding correctly${NC}"
    return 0
  else
    echo -e "${YELLOW}Warning: One or more MCP servers are not responding:${NC}"
    [ "$github_response" != "200" ] && echo -e "  - ${RED}GitHub Issues MCP: Not responding (HTTP $github_response)${NC}"
    [ "$coverage_response" != "200" ] && echo -e "  - ${RED}Coverage Analysis MCP: Not responding (HTTP $coverage_response)${NC}"
    echo -e "${YELLOW}Some functionality may be limited.${NC}"
    return 1
  fi
}

# Function to get the next GitHub issue to work on
get_next_github_issue() {
  echo -e "${BLUE}Finding the next GitHub issue to work on...${NC}"
  
  # Try first with MCP server if available
  local mcp_github_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/capabilities 2>/dev/null)
  
  if [ "$mcp_github_response" = "200" ]; then
    echo -e "${CYAN}Using GitHub Issues MCP to fetch issues...${NC}"
    
    # Create temporary files for storing results
    local issues_file="logs/mcp-debug/issues-list.json"
    mkdir -p logs/mcp-debug
    
    # Request issues from MCP server
    curl -s -X POST -H "Content-Type: application/json" \
      -d '{"state":"open","limit":7}' \
      http://localhost:3000/getIssues > "$issues_file" 2>/dev/null
    
    # Check if we got a successful response with issues
    if [ -f "$issues_file" ] && grep -q "success" "$issues_file"; then
      echo -e "${GREEN}Successfully retrieved issues from MCP server${NC}"
      
      # Get implementation-gap issues
      echo -e "${YELLOW}Implementation Gap Issues:${NC}"
      curl -s -X POST -H "Content-Type: application/json" \
        -d '{"state":"open","labels":"implementation-gap","limit":5}' \
        http://localhost:3000/getIssues | jq -r '.issues[] | "  #\(.number): \(.title)"' 2>/dev/null
      
      # Get coverage-improvement issues
      echo -e "\n${YELLOW}Coverage Improvement Issues:${NC}"
      curl -s -X POST -H "Content-Type: application/json" \
        -d '{"state":"open","labels":"coverage-improvement","limit":5}' \
        http://localhost:3000/getIssues | jq -r '.issues[] | "  #\(.number): \(.title)"' 2>/dev/null
      
      return 0
    fi
  fi
  
  # Fallback to GitHub CLI if MCP server is not available
  echo -e "${YELLOW}Falling back to GitHub CLI for issues...${NC}"
  
  # Check if GitHub CLI is installed
  if command -v gh &> /dev/null; then
    echo -e "${CYAN}Fetching open GitHub issues...${NC}"
    
    # Try to fetch authentication status
    local auth_status=$(gh auth status 2>&1 | grep -c "Logged in")
    
    if [ "$auth_status" -gt 0 ]; then
      echo -e "${YELLOW}Top priority issues:${NC}"
      gh issue list --limit 5 --state open --label "priority:high" 2>/dev/null || \
        echo -e "  ${RED}Failed to fetch priority issues${NC}"
      
      echo -e "\n${YELLOW}Recently updated issues:${NC}"
      gh issue list --limit 5 --state open --sort updated 2>/dev/null || \
        echo -e "  ${RED}Failed to fetch recent issues${NC}"
    else
      echo -e "${YELLOW}GitHub CLI not authenticated. Run 'gh auth login' first.${NC}"
      echo -e "${YELLOW}Visit github.com/mprestonsparks/DocGen/issues manually${NC}"
    fi
  else
    echo -e "${YELLOW}GitHub CLI not installed. Install with 'brew install gh' or visit github.com/mprestonsparks/DocGen/issues${NC}"
  fi
  
  echo -e "\n${YELLOW}Note: For better GitHub integration:${NC}"
  echo -e "  1. Ensure a valid GitHub token is set in mcp-servers/github-issues/.env"
  echo -e "  2. Run 'node scripts/diagnose-github-token.cjs' to verify token"
  echo -e "  3. Restart MCP servers with 'mcp-servers/start-mcp-servers.sh restart'"
}

# Main workflow
echo -e "${CYAN}Analyzing project state...${NC}"

# First check if there are failing tests
check_failing_tests
tests_passing=$?

if [ $tests_passing -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests are passing! Moving on to next priorities...${NC}"
  
  # Ensure MCP servers are running for project analysis
  ensure_mcp_servers
  
  # Look for the next GitHub issue to work on
  get_next_github_issue
  
  # If there's a Claude workflow manager script, run it for more detailed analysis
  if [ -f "scripts/claude-workflow-manager.cjs" ]; then
    echo -e "\n${MAGENTA}Running Claude Workflow Manager for detailed analysis...${NC}"
    
    # Create log directory if it doesn't exist
    mkdir -p logs/workflow
    local workflow_log="logs/workflow/manager-output.log"
    
    # Run workflow manager with output capture
    node scripts/claude-workflow-manager.cjs > "$workflow_log" 2>&1
    workflow_exit_code=$?
    
    if [ $workflow_exit_code -ne 0 ]; then
      echo -e "${RED}Workflow manager encountered errors${NC}"
      echo -e "${YELLOW}Last 5 lines of workflow log:${NC}"
      tail -n 5 "$workflow_log"
      echo -e "\n${BLUE}Complete workflow logs available at: ${CYAN}$workflow_log${NC}"
    else
      echo -e "${GREEN}Workflow analysis completed successfully${NC}"
      echo -e "${YELLOW}Summary of workflow recommendations:${NC}"
      grep -A 10 "Recommended next steps" "$workflow_log" | head -n 10
      echo -e "\n${BLUE}Full workflow report available at: ${CYAN}$workflow_log${NC}"
    fi
  else
    echo -e "\n${YELLOW}Note: For more detailed workflow analysis, implement scripts/claude-workflow-manager.cjs${NC}"
    echo -e "${YELLOW}This script would provide intelligent recommendations based on project state${NC}"
  fi
else
  echo -e "\n${YELLOW}! Fix failing tests first before moving on to other tasks${NC}"
  echo -e "${BLUE}Tip: Run specific failing tests with: npm test -- -t 'test name'${NC}"
fi

# Display final instructions
echo -e "\n${GREEN}===========================================${NC}"
echo -e "${BOLD}DocGen Project Status${NC}"

# Check GitHub token status
if [ -f "scripts/diagnose-github-token.cjs" ]; then
  token_status=$(node scripts/diagnose-github-token.cjs 2>&1 | grep -c "GitHub token authenticated successfully")
  if [ "$token_status" -gt 0 ]; then
    echo -e "${GREEN}✓ GitHub token is valid${NC}"
  else
    echo -e "${RED}✗ GitHub token may be invalid or expired${NC}"
    echo -e "${YELLOW}  Run: node scripts/diagnose-github-token.cjs${NC}"
  fi
fi

# Check MCP server status
github_mcp=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/capabilities 2>/dev/null)
coverage_mcp=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/capabilities 2>/dev/null)

if [ "$github_mcp" = "200" ]; then
  echo -e "${GREEN}✓ GitHub Issues MCP server is running${NC}"
else
  echo -e "${RED}✗ GitHub Issues MCP server is not responding${NC}"
  echo -e "${YELLOW}  Run: mcp-servers/start-mcp-servers.sh${NC}"
fi

if [ "$coverage_mcp" = "200" ]; then
  echo -e "${GREEN}✓ Coverage Analysis MCP server is running${NC}"
else
  echo -e "${RED}✗ Coverage Analysis MCP server is not responding${NC}"
  echo -e "${YELLOW}  Run: mcp-servers/start-mcp-servers.sh${NC}"
fi

# Display test status
if [ -f "logs/test-output.log" ]; then
  test_failures=$(grep -c "FAIL" "logs/test-output.log")
  if [ "$test_failures" -gt 0 ]; then
    echo -e "${RED}✗ Tests are failing ($test_failures failures)${NC}"
  else
    echo -e "${GREEN}✓ All tests are passing${NC}"
  fi
fi

echo -e "\n${BOLD}Ready to work with Claude Code!${NC}"
echo -e "${BLUE}When working with Claude, simply say:${NC}"
echo -e "  ${MAGENTA}\"Get to work\"${NC} or ${MAGENTA}\"What should I work on next?\"${NC}"
echo -e "${BLUE}Claude will intelligently determine the optimal workflow for the current project state.${NC}"
echo -e "${GREEN}===========================================${NC}"

# Log that the script ran successfully
mkdir -p logs
echo "$(date): get-to-work.sh executed successfully" >> logs/docgen.log