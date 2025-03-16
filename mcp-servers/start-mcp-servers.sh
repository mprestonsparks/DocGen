#!/bin/bash

# Stop any existing MCP servers
echo "Stopping any existing MCP servers..."
pkill -f "node.*server.js" || true

# Install dependencies if needed
echo "Installing MCP server dependencies..."
cd "$(dirname "$0")/github-issues" && npm install
cd "$(dirname "$0")/coverage-analysis" && npm install

# Start the GitHub MCP server
echo "Starting GitHub MCP server..."
cd "$(dirname "$0")/github-issues" && node server.js &
GITHUB_PID=$!

# Start the Coverage Analysis MCP server
echo "Starting Coverage Analysis MCP server..."
cd "$(dirname "$0")/coverage-analysis" && node server.js &
COVERAGE_PID=$!

echo "GitHub MCP server started with PID: $GITHUB_PID"
echo "Coverage Analysis MCP server started with PID: $COVERAGE_PID"
echo "Configuring Claude to use the MCP servers..."

# Give servers time to start
sleep 2

# Configure Claude MCP
cd "$(dirname "$0")/.." 
claude mcp remove github 2>/dev/null || true
claude mcp add github "http://localhost:7867"
claude mcp remove coverage 2>/dev/null || true
claude mcp add coverage "http://localhost:7868"

echo "MCP servers setup complete. You can now use 'claude mcp' to check status."
echo "To stop the servers, run: kill $GITHUB_PID $COVERAGE_PID"
echo "GitHub Server PID: $GITHUB_PID" > "$(dirname "$0")/github-mcp-server.pid"
echo "Coverage Server PID: $COVERAGE_PID" > "$(dirname "$0")/coverage-mcp-server.pid"