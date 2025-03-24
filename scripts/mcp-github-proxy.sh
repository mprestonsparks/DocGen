#!/bin/bash
# Simple shell script wrapper for the MCP proxy
# This makes it easier for Claude Code to execute

/opt/homebrew/bin/node /Users/preston/Documents/gitRepos/DocGen/scripts/mcp-proxy.cjs http://localhost:7867 "$@"