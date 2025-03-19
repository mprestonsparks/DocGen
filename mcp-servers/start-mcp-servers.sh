#!/bin/bash
# MCP Server Startup Script with Error Handling and Diagnostics

# Set variable for script directory
SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/mcp-debug"
ROOT_ENV_FILE="$PROJECT_ROOT/.env"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"
STARTUP_LOG="$LOG_DIR/server-startup.log"
ERROR_LOG="$LOG_DIR/server-errors.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function for both console and file
log() {
  local level="$1"
  local message="$2"
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  
  # Format message
  if [[ "$level" == "ERROR" ]]; then
    echo -e "${RED}[${timestamp}] ${level}: ${message}${NC}"
  elif [[ "$level" == "WARNING" ]]; then
    echo -e "${YELLOW}[${timestamp}] ${level}: ${message}${NC}"
  elif [[ "$level" == "SUCCESS" ]]; then
    echo -e "${GREEN}[${timestamp}] ${level}: ${message}${NC}"
  elif [[ "$level" == "INFO" ]]; then
    echo -e "${BLUE}[${timestamp}] ${level}: ${message}${NC}"
  else
    echo -e "[${timestamp}] ${level}: ${message}"
  fi
  
  # Log to file
  echo "[${timestamp}] ${level}: ${message}" >> "$STARTUP_LOG"
  
  # Also log errors to error log
  if [[ "$level" == "ERROR" ]]; then
    echo "[${timestamp}] ${level}: ${message}" >> "$ERROR_LOG"
  fi
}

# Function to check if a server is already running
is_server_running() {
  local service_name="$1"
  local pid_file="$2"
  
  # Check if PID file exists and contains a valid PID
  if [[ -f "$pid_file" ]]; then
    local pid=$(cat "$pid_file" | grep -o '[0-9]*')
    if [[ -n "$pid" ]] && ps -p "$pid" > /dev/null; then
      log "INFO" "${service_name} is already running with PID ${pid}"
      return 0
    else
      log "WARNING" "Stale PID file found for ${service_name}. Removing it."
      rm "$pid_file"
    fi
  fi
  
  # Check if there's a process matching the pattern
  local pattern="$3"
  if pgrep -f "$pattern" > /dev/null; then
    log "WARNING" "Found running ${service_name} without PID file"
    local found_pid=$(pgrep -f "$pattern" | head -n1)
    log "INFO" "Recording PID ${found_pid} for existing ${service_name}"
    echo "${service_name} PID: ${found_pid}" > "$pid_file"
    return 0
  fi
  
  return 1
}

# Function to test GitHub token
test_github_token() {
  local token_file="$1"
  
  if [[ ! -f "$token_file" ]]; then
    log "ERROR" "Token file not found: $token_file"
    return 1
  fi
  
  # Extract token from .env file
  local token=$(grep GITHUB_TOKEN "$token_file" | cut -d '=' -f2)
  
  if [[ -z "$token" || "$token" == "your_token_here" ]]; then
    log "ERROR" "GitHub token not set in $token_file"
    log "INFO" "Please edit $token_file and add your GitHub token"
    return 1
  fi
  
  log "INFO" "Testing GitHub token validity..."
  
  # Use curl to test token
  local auth_result=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $token" https://api.github.com/user)
  
  if [[ "$auth_result" == "200" ]]; then
    log "SUCCESS" "GitHub token is valid"
    return 0
  elif [[ "$auth_result" == "401" ]]; then
    log "ERROR" "GitHub token is invalid or expired (401 Unauthorized)"
    log "INFO" "Please generate a new token at https://github.com/settings/tokens"
    log "INFO" "Required scopes: repo, workflow, admin:repo_hook, notifications"
    return 1
  elif [[ "$auth_result" == "403" ]]; then
    log "ERROR" "GitHub token lacks required permissions (403 Forbidden)"
    log "INFO" "Please generate a new token with the required scopes"
    return 1
  else
    log "ERROR" "GitHub API returned unexpected status code: $auth_result"
    log "INFO" "For detailed diagnostics, run: node scripts/diagnose-github-token.cjs"
    return 1
  fi
}

# Stop existing servers
stop_mcp_servers() {
  log "INFO" "Stopping any existing MCP servers..."
  local github_pid_file="$SCRIPT_DIR/github-mcp-server.pid"
  local coverage_pid_file="$SCRIPT_DIR/coverage-mcp-server.pid"
  
  for pid_file in "$github_pid_file" "$coverage_pid_file"; do
    if [[ -f "$pid_file" ]]; then
      local service=$(head -n1 "$pid_file" | cut -d ':' -f1)
      local pid=$(grep -o '[0-9]*' "$pid_file")
      
      if [[ -n "$pid" ]] && ps -p "$pid" > /dev/null; then
        log "INFO" "Stopping $service (PID: $pid)..."
        kill "$pid"
        sleep 1
        
        # Verify process stopped
        if ps -p "$pid" > /dev/null; then
          log "WARNING" "$service did not stop gracefully, forcing termination..."
          kill -9 "$pid" 2>/dev/null || true
        else
          log "SUCCESS" "$service stopped successfully"
        fi
      else
        log "WARNING" "PID file exists but $service is not running"
      fi
      
      rm "$pid_file" 2>/dev/null || true
    fi
  done
  
  # Ensure all related processes are stopped
  pkill -f "node.*github-issues/server.js" 2>/dev/null || true
  pkill -f "node.*coverage-analysis/server.js" 2>/dev/null || true
  
  log "INFO" "All MCP servers stopped"
}

# Setup dependencies
setup_dependencies() {
  log "INFO" "Setting up MCP server dependencies..."
  
  # Check GitHub Issues MCP
  if [[ ! -d "$SCRIPT_DIR/github-issues/node_modules" ]]; then
    log "INFO" "Installing GitHub Issues MCP dependencies..."
    (cd "$SCRIPT_DIR/github-issues" && npm install --silent)
    if [[ $? -ne 0 ]]; then
      log "ERROR" "Failed to install GitHub Issues MCP dependencies"
      return 1
    fi
    log "SUCCESS" "GitHub Issues MCP dependencies installed"
  fi
  
  # Check Coverage Analysis MCP
  if [[ ! -d "$SCRIPT_DIR/coverage-analysis/node_modules" ]]; then
    log "INFO" "Installing Coverage Analysis MCP dependencies..."
    (cd "$SCRIPT_DIR/coverage-analysis" && npm install --silent)
    if [[ $? -ne 0 ]]; then
      log "ERROR" "Failed to install Coverage Analysis MCP dependencies"
      return 1
    fi
    log "SUCCESS" "Coverage Analysis MCP dependencies installed"
  fi
  
  return 0
}

# Verify required environment variables
verify_env_variables() {
  log "INFO" "Verifying environment variables from root .env file..."
  
  # Check if root .env file exists
  if [[ ! -f "$ROOT_ENV_FILE" ]]; then
    log "ERROR" "Root .env file not found at $ROOT_ENV_FILE"
    log "INFO" "Please create a .env file in the project root with required variables"
    return 1
  fi
  
  # Load environment variables from root .env file
  set -a
  source "$ROOT_ENV_FILE"
  set +a
  
  log "INFO" "Loaded environment from root .env file"
  
  # Check required variables
  if [[ -z "$GITHUB_TOKEN" ]]; then
    log "ERROR" "GITHUB_TOKEN is not set in $ROOT_ENV_FILE"
    return 1
  fi
  
  if [[ -z "$GITHUB_OWNER" || -z "$GITHUB_REPO" ]]; then
    log "ERROR" "GITHUB_OWNER or GITHUB_REPO not set in $ROOT_ENV_FILE"
    return 1
  fi
  
  if [[ -z "$MCP_SERVER_PORT" ]]; then
    log "WARNING" "MCP_SERVER_PORT not set in $ROOT_ENV_FILE, using default port 7867"
    export MCP_SERVER_PORT=7867
  fi
  
  # Test the GitHub token
  log "INFO" "Validating GitHub token..."
  if ! test_github_token "$ROOT_ENV_FILE"; then
    log "WARNING" "GitHub authentication may fail. See errors above."
    log "INFO" "For detailed diagnostics, run: node $SCRIPT_DIR/../scripts/diagnose-github-token.cjs"
  fi
  
  return 0
}

# Generate coverage data
setup_coverage_data() {
  local coverage_dir="$SCRIPT_DIR/../coverage"
  local coverage_file="$coverage_dir/coverage-final.json"
  
  if [[ ! -f "$coverage_file" ]]; then
    log "INFO" "No coverage data found. Generating mock coverage..."
    
    # Create coverage directory if needed
    mkdir -p "$coverage_dir"
    
    # Run mock coverage generator
    (cd "$SCRIPT_DIR/coverage-analysis" && node generate-mock-coverage.js)
    
    if [[ $? -ne 0 || ! -f "$coverage_file" ]]; then
      log "WARNING" "Failed to generate mock coverage data"
      log "INFO" "Coverage Analysis MCP will run with limited functionality"
    else
      log "SUCCESS" "Mock coverage data generated successfully"
    fi
  else
    log "INFO" "Using existing coverage data"
  fi
}

# Start GitHub Issues MCP server
start_github_mcp() {
  local pid_file="$SCRIPT_DIR/github-mcp-server.pid"
  local log_file="$LOG_DIR/github-mcp-output.log"
  mkdir -p "$(dirname "$log_file")"
  touch "$log_file"
  local github_port=${MCP_SERVER_PORT:-7867}
  
  if is_server_running "GitHub Issues MCP" "$pid_file" "node.*github-issues/server"; then
    log "INFO" "GitHub Issues MCP is already running"
    return 0
  fi
  
  log "INFO" "Starting GitHub Issues MCP server on port $github_port..."
  
  # Log directory already created and log file already touched
  
  # Use TypeScript, .cjs extension for CommonJS, or .mjs for ESM
  if [[ -f "$SCRIPT_DIR/github-issues/server.ts" ]]; then
    log "INFO" "Using TypeScript server"
    (cd "$SCRIPT_DIR/github-issues" && PORT=$github_port npx ts-node --transpileOnly server.ts > "$log_file" 2>&1) &
    local pid=$!
  elif [[ -f "$SCRIPT_DIR/github-issues/server.cjs" ]]; then
    log "INFO" "Using CommonJS with .cjs extension"
    (cd "$SCRIPT_DIR/github-issues" && PORT=$github_port node server.cjs > "$log_file" 2>&1) &
    local pid=$!
  elif [[ -f "$SCRIPT_DIR/github-issues/server.mjs" ]]; then
    log "INFO" "Using ESM version (server.mjs)"
    (cd "$SCRIPT_DIR/github-issues" && PORT=$github_port node server.mjs > "$log_file" 2>&1) &
    local pid=$!
  else
    log "INFO" "Using default server.js"
    (cd "$SCRIPT_DIR/github-issues" && PORT=$github_port node server.js > "$log_file" 2>&1) &
    local pid=$!
  fi
  
  # Save PID file
  echo "GitHub Server PID: $pid" > "$pid_file"
  
  # Verify server started
  sleep 2
  if ps -p $pid > /dev/null; then
    log "SUCCESS" "GitHub Issues MCP server started with PID: $pid"
    
    # Check if server is responding
    local host=${MCP_SERVER_HOST:-localhost}
    if [[ "$host" == "0.0.0.0" ]]; then
      host="localhost"
    fi
    local status=$(curl -s -o /dev/null -w "%{http_code}" http://$host:$github_port/capabilities 2>/dev/null)
    if [[ "$status" == "200" ]]; then
      log "SUCCESS" "GitHub Issues MCP server is responding correctly"
    else
      log "WARNING" "GitHub Issues MCP server started but may not be responding correctly"
      log "INFO" "Check logs at $log_file for errors"
    fi
    
    return 0
  else
    log "ERROR" "Failed to start GitHub Issues MCP server"
    log "INFO" "Last 5 lines of log:"
    if [[ -f "$log_file" ]]; then
      tail -n 5 "$log_file" | while read -r line; do
        log "ERROR" "  | $line"
      done
    fi
    return 1
  fi
}

# Start Coverage Analysis MCP server
start_coverage_mcp() {
  local pid_file="$SCRIPT_DIR/coverage-mcp-server.pid"
  local log_file="$LOG_DIR/coverage-mcp-output.log"
  mkdir -p "$(dirname "$log_file")"
  touch "$log_file"
  local coverage_port=${MCP_SERVER_PORT:-7867}
  coverage_port=$((coverage_port + 1))
  
  if is_server_running "Coverage Analysis MCP" "$pid_file" "node.*coverage-analysis/server"; then
    log "INFO" "Coverage Analysis MCP is already running"
    return 0
  fi
  
  log "INFO" "Starting Coverage Analysis MCP server on port $coverage_port..."
  
  # Log directory already created and log file already touched
  
  # Use TypeScript, .cjs extension for CommonJS, or .mjs for ESM
  if [[ -f "$SCRIPT_DIR/coverage-analysis/server.ts" ]]; then
    log "INFO" "Using TypeScript server"
    (cd "$SCRIPT_DIR/coverage-analysis" && PORT=$coverage_port npx ts-node --transpileOnly server.ts > "$log_file" 2>&1) &
    local pid=$!
  elif [[ -f "$SCRIPT_DIR/coverage-analysis/server.cjs" ]]; then
    log "INFO" "Using CommonJS with .cjs extension"
    (cd "$SCRIPT_DIR/coverage-analysis" && PORT=$coverage_port node server.cjs > "$log_file" 2>&1) &
    local pid=$!
  elif [[ -f "$SCRIPT_DIR/coverage-analysis/server.mjs" ]]; then
    log "INFO" "Using ESM version (server.mjs)"
    (cd "$SCRIPT_DIR/coverage-analysis" && PORT=$coverage_port node server.mjs > "$log_file" 2>&1) &
    local pid=$!
  else
    log "INFO" "Using default server.js"
    (cd "$SCRIPT_DIR/coverage-analysis" && PORT=$coverage_port node server.js > "$log_file" 2>&1) &
    local pid=$!
  fi
  
  # Save PID file
  echo "Coverage Server PID: $pid" > "$pid_file"
  
  # Verify server started
  sleep 2
  if ps -p $pid > /dev/null; then
    log "SUCCESS" "Coverage Analysis MCP server started with PID: $pid"
    
    # Check if server is responding
    local host=${MCP_SERVER_HOST:-localhost}
    if [[ "$host" == "0.0.0.0" ]]; then
      host="localhost"
    fi
    local status=$(curl -s -o /dev/null -w "%{http_code}" http://$host:$coverage_port/capabilities 2>/dev/null)
    if [[ "$status" == "200" ]]; then
      log "SUCCESS" "Coverage Analysis MCP server is responding correctly"
    else
      log "WARNING" "Coverage Analysis MCP server started but may not be responding correctly"
      log "INFO" "Check logs at $log_file for errors"
    fi
    
    return 0
  else
    log "ERROR" "Failed to start Coverage Analysis MCP server"
    log "INFO" "Last 5 lines of log:"
    if [[ -f "$log_file" ]]; then
      tail -n 5 "$log_file" | while read -r line; do
        log "ERROR" "  | $line"
      done
    fi
    return 1
  fi
}

# Configure Claude CLI
configure_claude() {
  local claude_cmd="claude"
  local github_port=${MCP_SERVER_PORT:-7867}
  local coverage_port=$((github_port + 1))
  local github_url="http://localhost:$github_port"
  local coverage_url="http://localhost:$coverage_port"
  
  # Check if claude is installed
  if ! command -v $claude_cmd &> /dev/null; then
    log "WARNING" "Claude CLI not found. Cannot configure MCP connections."
    log "INFO" "Manual configuration:"
    log "INFO" "  $claude_cmd mcp add github $github_url"
    log "INFO" "  $claude_cmd mcp add coverage $coverage_url"
    return 1
  fi
  
  log "INFO" "Configuring Claude Code MCP connections..."
  
  # Remove existing connections
  $claude_cmd mcp remove github --scope user 2>/dev/null || true
  $claude_cmd mcp remove coverage --scope user 2>/dev/null || true
  
  # Get curl path for MCP connections
  local curl_path=$(which curl)
  
  # Add new connections with absolute curl path
  $claude_cmd mcp add github stdio "$curl_path -s $github_url" --scope user
  if [[ $? -ne 0 ]]; then
    log "ERROR" "Failed to configure GitHub MCP connection"
    return 1
  fi
  
  $claude_cmd mcp add coverage stdio "$curl_path -s $coverage_url" --scope user
  if [[ $? -ne 0 ]]; then
    log "ERROR" "Failed to configure Coverage MCP connection"
    return 1
  fi
  
  log "SUCCESS" "Claude MCP connections configured successfully"
  return 0
}

# Main function
main() {
  log "INFO" "Starting MCP Servers setup ($(date))"
  
  # Process command line arguments
  if [[ "$1" == "stop" ]]; then
    stop_mcp_servers
    exit 0
  elif [[ "$1" == "restart" ]]; then
    log "INFO" "Restarting MCP servers..."
    stop_mcp_servers
  fi
  
  # Setup steps
  setup_dependencies || log "WARNING" "Dependency setup encountered issues"
  verify_env_variables
  setup_coverage_data
  
  # Start servers
  start_github_mcp
  github_status=$?
  
  start_coverage_mcp
  coverage_status=$?
  
  # Configure Claude CLI
  if [[ $github_status -eq 0 && $coverage_status -eq 0 ]]; then
    configure_claude
  fi
  
  # Show summary
  log "INFO" "=================================================="
  log "INFO" "MCP Servers Status Summary:"
  
  local github_port=${MCP_SERVER_PORT:-7867}
  local coverage_port=$((github_port + 1))
  
  if [[ $github_status -eq 0 ]]; then
    log "SUCCESS" "GitHub Issues MCP: Running (http://localhost:$github_port)"
  else
    log "ERROR" "GitHub Issues MCP: Failed to start"
  fi
  
  if [[ $coverage_status -eq 0 ]]; then
    log "SUCCESS" "Coverage Analysis MCP: Running (http://localhost:$coverage_port)"
  else
    log "ERROR" "Coverage Analysis MCP: Failed to start"
  fi
  
  log "INFO" "Log files:"
  log "INFO" "  Server startup: $STARTUP_LOG"
  log "INFO" "  GitHub MCP: $LOG_DIR/github-mcp-output.log"
  log "INFO" "  Coverage MCP: $LOG_DIR/coverage-mcp-output.log"
  log "INFO" "  GitHub Auth Debug: $LOG_DIR/github-auth.log"
  log "INFO" "  Coverage Auth Debug: $LOG_DIR/coverage-github-auth.log"
  
  if [[ $github_status -eq 0 && $coverage_status -eq 0 ]]; then
    log "INFO" "=================================================="
    log "INFO" "Try these commands in Claude Code:"
    log "INFO" "  @github getIssues --labels \"implementation-gap\""
    log "INFO" "  @coverage getCoverageMetrics"
    log "INFO" "=================================================="
    log "SUCCESS" "MCP servers setup complete"
    
    # Print how to stop servers
    log "INFO" "To stop the servers, run:"
    log "INFO" "  $0 stop"
    
    exit 0
  else
    log "ERROR" "MCP servers setup encountered errors"
    log "INFO" "For GitHub token issues, run:"
    log "INFO" "  node $SCRIPT_DIR/../scripts/diagnose-github-token.cjs"
    log "INFO" "For detailed server logs, check the log files above"
    exit 1
  fi
}

# Execute main function
main "$@"