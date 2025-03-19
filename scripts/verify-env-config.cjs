#!/usr/bin/env node
/**
 * Environment Configuration Verification Tool
 * 
 * This script verifies that all required environment variables are present
 * in the root .env file and provides diagnostics for any issues.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load root environment
const rootEnvPath = path.resolve(__dirname, '../.env');
console.log('Checking root .env file at:', rootEnvPath);

if (!fs.existsSync(rootEnvPath)) {
  console.error('Root .env file not found!');
  process.exit(1);
}

const rootEnv = dotenv.config({ path: rootEnvPath }).parsed;
console.log('Root .env contains the following variables:');
console.log(Object.keys(rootEnv).join(', '));

// Verify required variables
const requiredVars = [
  'GITHUB_TOKEN', 
  'GITHUB_OWNER', 
  'GITHUB_REPO', 
  'MCP_SERVER_PORT',
  'MCP_SERVER_HOST'
];

const missing = requiredVars.filter(v => !rootEnv[v]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

// Verify token format
if (rootEnv.GITHUB_TOKEN && rootEnv.GITHUB_TOKEN.startsWith('ghp_')) {
  console.log('GitHub token format appears valid');
} else {
  console.warn('Warning: GitHub token format may be incorrect. Expected format: ghp_...');
}

// Verify port is a number
const port = parseInt(rootEnv.MCP_SERVER_PORT, 10);
if (isNaN(port)) {
  console.error('MCP_SERVER_PORT is not a valid number');
  process.exit(1);
} else {
  console.log(`MCP_SERVER_PORT is set to ${port}`);
  console.log(`Coverage MCP server will use port ${port + 1}`);
}

console.log('Environment configuration verified successfully!');
