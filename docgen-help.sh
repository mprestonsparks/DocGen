#!/bin/bash

# DocGen Help Script - Displays available commands

# Set colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}===== DocGen Command Reference =====${NC}"
echo -e "DocGen is a documentation generation system with cross-platform support"
echo
echo -e "${BLUE}Core Commands:${NC}"
echo -e "${GREEN}npm test${NC} - Run tests"
echo -e "${GREEN}npm run interview${NC} - Start interactive interview"
echo -e "${GREEN}npm run validate${NC} - Validate documentation"
echo -e "${GREEN}npm run generate-reports${NC} - Generate reports"
echo
echo -e "${BLUE}Docker Commands:${NC}"
echo -e "${GREEN}npm run docker:build${NC} - Build Docker image"
echo -e "${GREEN}npm run docker:start${NC} - Start Docker container"
echo -e "${GREEN}npm run docker:stop${NC} - Stop Docker container"
echo -e "${GREEN}npm run docker:shell${NC} - Enter Docker shell"
echo
echo -e "${BLUE}MCP Server Commands:${NC}"
echo -e "${GREEN}npm run mcp:start${NC} - Start MCP servers"
echo -e "${GREEN}npm run docgen:check-servers${NC} - Check MCP server status"
echo
echo -e "${BLUE}GitHub Integration:${NC}"
echo -e "${GREEN}npm run github:workflow${NC} - Run GitHub workflow"
echo -e "${GREEN}npm run github:issues${NC} - List GitHub issues"
echo
echo -e "${BLUE}Cross-Platform Scripts:${NC}"
echo -e "${GREEN}npm run get-to-work${NC} - Interactive workflow"
echo -e "${GREEN}npm run get-to-work:simple${NC} - Display available commands"
echo
echo -e "${CYAN}For more information, see the README.md file.${NC}"