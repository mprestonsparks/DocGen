#!/bin/bash
# Start MCP adapters alongside the REST API servers

# Set variable for script directory
SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/mcp-debug"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"
STARTUP_LOG="$LOG_DIR/mcp-adapters-startup.log"

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
}

# Function to check if a process is running
is_process_running() {
  local pid=$1
  if [[ -n "$pid" ]] && ps -p "$pid" > /dev/null; then
    return 0
  else
    return 1
  fi
}

# Function to stop existing adapters
stop_adapters() {
  log "INFO" "Stopping any existing MCP adapters..."
  
  # GitHub MCP Adapter
  local github_pid_file="$SCRIPT_DIR/github-mcp-adapter.pid"
  if [[ -f "$github_pid_file" ]]; then
    local pid=$(cat "$github_pid_file")
    if is_process_running "$pid"; then
      log "INFO" "Stopping GitHub MCP Adapter (PID: $pid)..."
      kill "$pid" 2>/dev/null
      sleep 1
      if is_process_running "$pid"; then
        log "WARNING" "Forcing termination of GitHub MCP Adapter..."
        kill -9 "$pid" 2>/dev/null
      else
        log "SUCCESS" "GitHub MCP Adapter stopped"
      fi
    fi
    rm "$github_pid_file" 2>/dev/null
  fi
  
  # Coverage MCP Adapter
  local coverage_pid_file="$SCRIPT_DIR/coverage-mcp-adapter.pid"
  if [[ -f "$coverage_pid_file" ]]; then
    local pid=$(cat "$coverage_pid_file")
    if is_process_running "$pid"; then
      log "INFO" "Stopping Coverage MCP Adapter (PID: $pid)..."
      kill "$pid" 2>/dev/null
      sleep 1
      if is_process_running "$pid"; then
        log "WARNING" "Forcing termination of Coverage MCP Adapter..."
        kill -9 "$pid" 2>/dev/null
      else
        log "SUCCESS" "Coverage MCP Adapter stopped"
      fi
    fi
    rm "$coverage_pid_file" 2>/dev/null
  fi
  
  # Kill any other node processes that might be running the adapters
  pkill -f "node.*mcp-adapter.cjs" 2>/dev/null
  
  log "INFO" "All MCP adapters stopped"
}

# Start MCP adapters
start_adapters() {
  # Make sure the original servers are running
  if [[ ! -f "$SCRIPT_DIR/github-mcp-server.pid" || ! -f "$SCRIPT_DIR/coverage-mcp-server.pid" ]]; then
    log "INFO" "Starting original MCP servers first..."
    "$SCRIPT_DIR/start-mcp-servers.sh"
  fi
  
  # Start GitHub MCP Adapter
  log "INFO" "Starting GitHub MCP Adapter..."
  local github_log_file="$LOG_DIR/github-mcp-adapter-output.log"
  
  node "$SCRIPT_DIR/github-issues/mcp-adapter.cjs" > "$github_log_file" 2>&1 &
  local github_pid=$!
  
  # Verify it started
  sleep 2
  if is_process_running "$github_pid"; then
    log "SUCCESS" "GitHub MCP Adapter started with PID: $github_pid"
    echo "$github_pid" > "$SCRIPT_DIR/github-mcp-adapter.pid"
  else
    log "ERROR" "Failed to start GitHub MCP Adapter"
    log "INFO" "Check log file: $github_log_file"
    return 1
  fi
  
  # Start Coverage MCP Adapter
  log "INFO" "Starting Coverage MCP Adapter..."
  local coverage_log_file="$LOG_DIR/coverage-mcp-adapter-output.log"
  
  node "$SCRIPT_DIR/coverage-analysis/mcp-adapter.cjs" > "$coverage_log_file" 2>&1 &
  local coverage_pid=$!
  
  # Verify it started
  sleep 2
  if is_process_running "$coverage_pid"; then
    log "SUCCESS" "Coverage MCP Adapter started with PID: $coverage_pid"
    echo "$coverage_pid" > "$SCRIPT_DIR/coverage-mcp-adapter.pid"
  else
    log "ERROR" "Failed to start Coverage MCP Adapter"
    log "INFO" "Check log file: $coverage_log_file"
    return 1
  fi
  
  return 0
}

# Configure Claude CLI to use MCP adapters
configure_claude() {
  local github_port=7866
  local coverage_port=7865
  
  log "INFO" "Configuring Claude Code MCP connections to use adapters..."
  
  # Remove any existing MCP configs
  claude mcp remove github --scope user 2>/dev/null || true
  claude mcp remove coverage --scope user 2>/dev/null || true
  
  # Add new MCP configurations
  claude mcp add-json github '{"type":"stdio","command":"node","args":["/Users/preston/Documents/gitRepos/DocGen/scripts/mcp-proxy.cjs","http://localhost:7866"]}' --scope user
  if [[ $? -ne 0 ]]; then
    log "ERROR" "Failed to configure GitHub MCP connection"
    return 1
  fi
  
  claude mcp add-json coverage '{"type":"stdio","command":"node","args":["/Users/preston/Documents/gitRepos/DocGen/scripts/mcp-proxy.cjs","http://localhost:7865"]}' --scope user
  if [[ $? -ne 0 ]]; then
    log "ERROR" "Failed to configure Coverage MCP connection"
    return 1
  fi
  
  log "SUCCESS" "Claude MCP connections configured successfully"
  return 0
}

# Main function
main() {
  log "INFO" "Starting MCP Adapters setup ($(date))"
  
  # Process command line arguments
  if [[ "$1" == "stop" ]]; then
    stop_adapters
    exit 0
  elif [[ "$1" == "restart" ]]; then
    log "INFO" "Restarting MCP adapters..."
    stop_adapters
  fi
  
  # Stop any existing adapters
  stop_adapters
  
  # Start adapters
  start_adapters
  local adapter_status=$?
  
  # Configure Claude CLI
  if [[ $adapter_status -eq 0 ]]; then
    configure_claude
  fi
  
  # Show summary
  log "INFO" "=================================================="
  log "INFO" "MCP Adapters Status Summary:"
  
  if [[ $adapter_status -eq 0 ]]; then
    log "SUCCESS" "GitHub MCP Adapter: Running (http://localhost:7866)"
    log "SUCCESS" "Coverage MCP Adapter: Running (http://localhost:7865)"
    
    log "INFO" "=================================================="
    log "INFO" "Try these commands in Claude Code:"
    log "INFO" "  @github getIssues --labels \"implementation-gap\""
    log "INFO" "  @coverage getCoverageMetrics"
    log "INFO" "=================================================="
    log "SUCCESS" "MCP adapters setup complete"
    
    # Print how to stop adapters
    log "INFO" "To stop the adapters, run:"
    log "INFO" "  $0 stop"
    
    exit 0
  else
    log "ERROR" "GitHub MCP Adapter: Failed to start"
    log "ERROR" "Coverage MCP Adapter: Failed to start"
    log "ERROR" "MCP adapters setup encountered errors"
    exit 1
  fi
}

# Execute main function
main "$@"