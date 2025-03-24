#!/bin/bash
# Copy MCP files to Docker container and configure port mapping

# Get the script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
  local level="$1"
  local message="$2"
  
  if [[ "$level" == "ERROR" ]]; then
    echo -e "${RED}[ERROR] ${message}${NC}"
  elif [[ "$level" == "WARNING" ]]; then
    echo -e "${YELLOW}[WARNING] ${message}${NC}"
  elif [[ "$level" == "SUCCESS" ]]; then
    echo -e "${GREEN}[SUCCESS] ${message}${NC}"
  elif [[ "$level" == "INFO" ]]; then
    echo -e "${BLUE}[INFO] ${message}${NC}"
  else
    echo -e "${message}"
  fi
}

# Check if Docker container is running
CONTAINER_RUNNING=$(docker ps --filter "name=docker-docgen" --format "{{.Names}}")
if [ -z "$CONTAINER_RUNNING" ]; then
    log "INFO" "Docker container is not running. Starting it now..."
    cd "$PROJECT_ROOT" && docker-compose up -d
fi

# Verify Docker container is running
CONTAINER_RUNNING=$(docker ps --filter "name=docker-docgen" --format "{{.Names}}")
if [ -z "$CONTAINER_RUNNING" ]; then
    log "ERROR" "Failed to start Docker container. Please check Docker configuration."
    exit 1
fi

log "INFO" "Creating MCP directories in Docker container..."
docker exec docker-docgen-1 bash -c "mkdir -p /app/mcp-servers/github-issues /app/mcp-servers/coverage-analysis /app/logs/mcp-debug /app/scripts"

# Copy core MCP files to Docker container
log "INFO" "Copying MCP adapter files to Docker container..."
docker cp "$PROJECT_ROOT/mcp-servers/github-issues/mcp-adapter.cjs" docker-docgen-1:/app/mcp-servers/github-issues/
docker cp "$PROJECT_ROOT/mcp-servers/coverage-analysis/mcp-adapter.cjs" docker-docgen-1:/app/mcp-servers/coverage-analysis/
docker cp "$PROJECT_ROOT/mcp-servers/docker-mcp-adapters.sh" docker-docgen-1:/app/mcp-servers/
docker cp "$PROJECT_ROOT/mcp-servers/start-mcp-servers.sh" docker-docgen-1:/app/mcp-servers/
docker cp "$PROJECT_ROOT/mcp-servers/docker-check-mcp.cjs" docker-docgen-1:/app/mcp-servers/

# Copy Docker debug file
if [ -f "$PROJECT_ROOT/mcp-servers/docker-debug.js" ]; then
    log "INFO" "Copying Docker debug utility..."
    docker cp "$PROJECT_ROOT/mcp-servers/docker-debug.js" docker-docgen-1:/app/mcp-servers/
fi

# Copy proxy and manager files
log "INFO" "Copying MCP proxy and manager files..."
docker exec docker-docgen-1 bash -c "mkdir -p /app/scripts/core"
docker cp "$PROJECT_ROOT/scripts/core/mcp-server-manager.cjs" docker-docgen-1:/app/scripts/core/

# Check if we have mcp-proxy.js or mcp-proxy.cjs
if [ -f "$PROJECT_ROOT/scripts/mcp-proxy.cjs" ]; then
    docker cp "$PROJECT_ROOT/scripts/mcp-proxy.cjs" docker-docgen-1:/app/scripts/
elif [ -f "$PROJECT_ROOT/scripts/mcp-proxy.js" ]; then
    docker cp "$PROJECT_ROOT/scripts/mcp-proxy.js" docker-docgen-1:/app/scripts/
else
    log "WARNING" "No MCP proxy file found at $PROJECT_ROOT/scripts/mcp-proxy.cjs or $PROJECT_ROOT/scripts/mcp-proxy.js"
fi

# Copy server files to Docker container
log "INFO" "Copying server files to Docker container..."
docker cp "$PROJECT_ROOT/mcp-servers/github-issues/server.cjs" docker-docgen-1:/app/mcp-servers/github-issues/
docker cp "$PROJECT_ROOT/mcp-servers/coverage-analysis/server.cjs" docker-docgen-1:/app/mcp-servers/coverage-analysis/

# Make scripts executable in container
log "INFO" "Making scripts executable in container..."
docker exec docker-docgen-1 bash -c "chmod +x /app/mcp-servers/docker-mcp-adapters.sh /app/mcp-servers/start-mcp-servers.sh"

# Configure Docker port forwarding for MCP servers
log "INFO" "Configuring port forwarding for MCP servers..."

# Get current Docker container ID
CONTAINER_ID=$(docker ps --filter "name=docker-docgen" --format "{{.ID}}")

# Check if ports are already published
PORT_CHECK=$(docker port "$CONTAINER_ID" | grep "7865/tcp\|7866/tcp")
if [ -z "$PORT_CHECK" ]; then
    log "WARNING" "MCP ports are not exposed. This might cause connectivity issues."
    log "INFO" "Stopping container to reconfigure ports..."
    
    docker stop "$CONTAINER_ID"
    
    # Create or update port mappings in docker-compose.yml
    log "INFO" "Setting up port mappings in Docker configuration..."
    
    # For now, just tell the user how to fix it manually
    log "WARNING" "Please manually add these port mappings to your Docker configuration:"
    log "INFO" "      - \"7865:7865\"  # Coverage MCP"
    log "INFO" "      - \"7866:7866\"  # GitHub MCP"
    log "INFO" "      - \"7867:7867\"  # Coverage REST API"
    log "INFO" "      - \"7868:7868\"  # GitHub REST API"
    
    log "INFO" "Restarting Docker container..."
    cd "$PROJECT_ROOT" && docker-compose up -d
else
    log "SUCCESS" "MCP ports are already exposed: $PORT_CHECK"
fi

# Configure MCP in Docker flag
log "INFO" "Creating MCP in Docker flag file..."
echo "1" > "$PROJECT_ROOT/.mcp-in-docker"
docker exec docker-docgen-1 bash -c "echo '1' > /app/.mcp-in-docker"

log "SUCCESS" "MCP files copied to Docker container successfully!"
log "INFO" ""
log "INFO" "To start MCP servers in Docker, run:"
log "INFO" "docker exec docker-docgen-1 bash -c 'cd /app && /app/mcp-servers/docker-mcp-adapters.sh'"
log "INFO" ""
log "INFO" "To check MCP server status in Docker, run:"
log "INFO" "docker exec docker-docgen-1 bash -c 'cd /app && node /app/mcp-servers/docker-check-mcp.cjs'"