#!/bin/bash
# Start MCP adapters in Docker environment

# Set variable for script directory
SCRIPT_DIR="$(dirname "$0")"
PROJECT_ROOT="/app"
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

# Function to stop existing adapters and servers
stop_adapters() {
  log "INFO" "Stopping any existing MCP adapters and servers..."
  
  # GitHub MCP Adapter
  local github_adapter_pid_file="$SCRIPT_DIR/github-mcp-adapter.pid"
  if [[ -f "$github_adapter_pid_file" ]]; then
    local pid=$(cat "$github_adapter_pid_file")
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
    rm "$github_adapter_pid_file" 2>/dev/null
  fi
  
  # Coverage MCP Adapter
  local coverage_adapter_pid_file="$SCRIPT_DIR/coverage-mcp-adapter.pid"
  if [[ -f "$coverage_adapter_pid_file" ]]; then
    local pid=$(cat "$coverage_adapter_pid_file")
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
    rm "$coverage_adapter_pid_file" 2>/dev/null
  fi
  
  # GitHub REST API Server
  local github_server_pid_file="$SCRIPT_DIR/github-mcp-server.pid"
  if [[ -f "$github_server_pid_file" ]]; then
    local pid=$(cat "$github_server_pid_file" | grep -o '[0-9]*')
    if is_process_running "$pid"; then
      log "INFO" "Stopping GitHub REST API Server (PID: $pid)..."
      kill "$pid" 2>/dev/null
      sleep 1
      if is_process_running "$pid"; then
        log "WARNING" "Forcing termination of GitHub REST API Server..."
        kill -9 "$pid" 2>/dev/null
      else
        log "SUCCESS" "GitHub REST API Server stopped"
      fi
    fi
    rm "$github_server_pid_file" 2>/dev/null
  fi
  
  # Coverage REST API Server
  local coverage_server_pid_file="$SCRIPT_DIR/coverage-mcp-server.pid"
  if [[ -f "$coverage_server_pid_file" ]]; then
    local pid=$(cat "$coverage_server_pid_file" | grep -o '[0-9]*')
    if is_process_running "$pid"; then
      log "INFO" "Stopping Coverage REST API Server (PID: $pid)..."
      kill "$pid" 2>/dev/null
      sleep 1
      if is_process_running "$pid"; then
        log "WARNING" "Forcing termination of Coverage REST API Server..."
        kill -9 "$pid" 2>/dev/null
      else
        log "SUCCESS" "Coverage REST API Server stopped"
      fi
    fi
    rm "$coverage_server_pid_file" 2>/dev/null
  fi
  
  # Kill any other node processes that might be running the adapters or servers
  pkill -f "node.*mcp-adapter.cjs" 2>/dev/null
  pkill -f "node.*server.cjs" 2>/dev/null
  
  log "INFO" "All MCP adapters and servers stopped"
}

# Start MCP adapters in Docker environment
start_adapters() {
  # Start the REST API servers first
  log "INFO" "Starting the underlying REST API servers..."
  
  # GitHub REST API server
  log "INFO" "Starting GitHub REST API server on port 7867..."
  PORT=7867 MCP_SERVER_HOST=0.0.0.0 node "$SCRIPT_DIR/github-issues/server.cjs" > "$LOG_DIR/github-rest-output.log" 2>&1 &
  GITHUB_REST_PID=$!
  
  # Coverage REST API server 
  log "INFO" "Starting Coverage REST API server on port 7868..."
  PORT=7868 MCP_SERVER_HOST=0.0.0.0 node "$SCRIPT_DIR/coverage-analysis/server.cjs" > "$LOG_DIR/coverage-rest-output.log" 2>&1 &
  COVERAGE_REST_PID=$!
  
  # Wait for servers to start
  sleep 3
  
  # Check if REST API servers started
  if is_process_running "$GITHUB_REST_PID" && is_process_running "$COVERAGE_REST_PID"; then
    log "SUCCESS" "REST API servers started successfully"
    # Save PID files for the REST servers
    echo "GitHub REST API Server PID: $GITHUB_REST_PID" > "$SCRIPT_DIR/github-mcp-server.pid"
    echo "Coverage REST API Server PID: $COVERAGE_REST_PID" > "$SCRIPT_DIR/coverage-mcp-server.pid"
  else
    log "ERROR" "Failed to start REST API servers"
    return 1
  fi
  
  # Set environment variables for Docker
  export MCP_SERVER_HOST="0.0.0.0"  # Listen on all interfaces
  export MCP_LISTEN_INTERFACE="0.0.0.0"  # Listen on all interfaces (for API server)
  export GITHUB_MCP_URL="http://0.0.0.0:7866"
  export COVERAGE_MCP_URL="http://0.0.0.0:7865"
  
  # Start GitHub MCP Adapter
  log "INFO" "Starting GitHub MCP Adapter..."
  local github_log_file="$LOG_DIR/github-mcp-adapter-output.log"
  
  NODE_ENV=production MCP_SERVER_HOST=0.0.0.0 MCP_LISTEN_INTERFACE=0.0.0.0 node "$SCRIPT_DIR/github-issues/mcp-adapter.cjs" > "$github_log_file" 2>&1 &
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
  
  NODE_ENV=production MCP_SERVER_HOST=0.0.0.0 MCP_LISTEN_INTERFACE=0.0.0.0 node "$SCRIPT_DIR/coverage-analysis/mcp-adapter.cjs" > "$coverage_log_file" 2>&1 &
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
  
  # Create a file to indicate MCP is running in Docker
  echo "1" > "$SCRIPT_DIR/mcp-docker-running"
  
  return 0
}

# Main function
main() {
  log "INFO" "Starting MCP Adapters in Docker ($(date))"
  
  # Process command line arguments
  if [[ "$1" == "stop" ]]; then
    stop_adapters
    rm -f "$SCRIPT_DIR/mcp-docker-running" 2>/dev/null
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