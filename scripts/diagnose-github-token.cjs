#!/usr/bin/env node
/**
 * GitHub Token Diagnostic Tool
 * 
 * This script provides comprehensive diagnostics for GitHub token issues:
 * 1. Checks token format and validity
 * 2. Tests authentication with GitHub API
 * 3. Verifies permissions and scopes
 * 4. Analyzes error patterns
 * 5. Provides specific recommendations for fixing token issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Try to load Octokit from project dependencies
let Octokit;
try {
  Octokit = require('@octokit/rest').Octokit;
} catch (error) {
  console.error('Error loading @octokit/rest package. Installing it now...');
  execSync('npm install @octokit/rest', { stdio: 'inherit' });
  Octokit = require('@octokit/rest').Octokit;
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// Log directory for persistent diagnostics
const logDir = path.join(__dirname, '../logs/mcp-debug');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Output file for diagnostic results
const outputPath = path.join(logDir, 'github-token-diagnostic.log');
let outputStream = fs.createWriteStream(outputPath, { flags: 'a' });

/**
 * Log message to console and file
 */
function log(message, {color = null, bold = false, timestamp = true} = {}) {
  // Format for console
  let consoleMessage = message;
  if (color) consoleMessage = colors[color] + consoleMessage;
  if (bold) consoleMessage = colors.bold + consoleMessage;
  if (color || bold) consoleMessage += colors.reset;
  
  // Log to console
  console.log(consoleMessage);
  
  // Format for file (without colors)
  let fileMessage = message;
  if (timestamp) {
    const now = new Date().toISOString();
    fileMessage = `[${now}] ${fileMessage}`;
  }
  
  // Log to file
  outputStream.write(fileMessage + '\\n');
}

/**
 * Load and parse .env file
 */
function loadEnvFile(envPath) {
  try {
    if (!fs.existsSync(envPath)) {
      log(`Environment file not found: ${envPath}`, {color: 'red'});
      return null;
    }
    
    log(`Loading environment from: ${envPath}`, {color: 'blue'});
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\\n').forEach(line => {
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    log(`Error loading .env file: ${error.message}`, {color: 'red'});
    return null;
  }
}

/**
 * Diagnose token format
 */
function diagnoseTokenFormat(token) {
  log('\\n== Token Format Diagnosis ==', {color: 'cyan', bold: true});
  
  if (!token) {
    log('❌ No token provided.', {color: 'red'});
    return false;
  }
  
  log(`Token length: ${token.length}`, {color: 'blue'});
  log(`Token prefix: ${token.substring(0, 5)}...`, {color: 'blue'});
  
  // Basic format checks
  let formatValid = true;
  
  // Check length
  if (token.length < 30) {
    log('❌ Token is too short. GitHub tokens are typically 36-40+ characters long.', {color: 'red'});
    formatValid = false;
  }
  
  // Check for known prefixes
  const validPrefixes = ['ghp_', 'gho_', 'github_pat_'];
  const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));
  
  if (!hasValidPrefix) {
    log('⚠️ Token does not start with a known GitHub prefix (ghp_, gho_, github_pat_).', {color: 'yellow'});
    formatValid = false;
  }
  
  // Check for whitespace or newlines
  if (token.match(/\\s/)) {
    log('❌ Token contains whitespace characters.', {color: 'red'});
    formatValid = false;
  }
  
  // Check character set
  if (!token.match(/^[a-zA-Z0-9_-]+$/)) {
    log('❌ Token contains invalid characters. Only letters, numbers, underscore, and dash are allowed.', {color: 'red'});
    formatValid = false;
  }
  
  if (formatValid) {
    log('✅ Token format appears valid.', {color: 'green'});
  } else {
    log('Token format has issues that need to be fixed.', {color: 'yellow'});
  }
  
  return formatValid;
}

/**
 * Test authentication with GitHub API
 */
async function testGitHubAuth(token, owner, repo) {
  log('\\n== GitHub Authentication Test ==', {color: 'cyan', bold: true});
  
  if (!token) {
    log('❌ Cannot test authentication without a token.', {color: 'red'});
    return false;
  }
  
  try {
    log('Creating Octokit client with token...', {color: 'blue'});
    const octokit = new Octokit({ auth: token });
    
    // Test 1: Authenticate
    log('Test 1: Authenticating with GitHub...', {color: 'blue'});
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      log(`✅ Authentication successful! Authenticated as: ${user.login}`, {color: 'green'});
      log(`User type: ${user.type}`, {color: 'blue'});
      log(`Created: ${user.created_at}`, {color: 'blue'});
    } catch (error) {
      log(`❌ Authentication failed: ${error.message}`, {color: 'red'});
      
      // Analyze specific error codes
      if (error.status === 401) {
        log('   - Error 401 Unauthorized: Token is invalid or expired', {color: 'red'});
      } else if (error.status === 403) {
        log('   - Error 403 Forbidden: Insufficient permissions', {color: 'red'});
      }
      
      return false;
    }
    
    // Test 2: Repository access (if owner and repo provided)
    if (owner && repo) {
      log(`Test 2: Accessing repository ${owner}/${repo}...`, {color: 'blue'});
      try {
        const { data: repository } = await octokit.rest.repos.get({
          owner,
          repo
        });
        
        log(`✅ Repository access successful! Full name: ${repository.full_name}`, {color: 'green'});
        log(`Description: ${repository.description || 'No description'}`, {color: 'blue'});
        log(`Visibility: ${repository.private ? 'Private' : 'Public'}`, {color: 'blue'});
      } catch (error) {
        log(`❌ Repository access failed: ${error.message}`, {color: 'red'});
        
        if (error.status === 404) {
          log(`   - Error 404 Not Found: Repository ${owner}/${repo} does not exist or is not accessible`, {color: 'red'});
        } else if (error.status === 403) {
          log('   - Error 403 Forbidden: Insufficient permissions to access this repository', {color: 'red'});
        }
        
        // Continue with tests even if repo access fails
      }
    }
    
    // Test 3: Check token scopes
    log('Test 3: Checking token scopes...', {color: 'blue'});
    try {
      // This API call includes the 'x-oauth-scopes' header
      const { headers } = await octokit.request('GET /user');
      const scopes = headers['x-oauth-scopes'] || '';
      
      if (scopes) {
        const scopeList = scopes.split(', ');
        log(`✅ Token has the following scopes: ${scopes}`, {color: 'green'});
        
        // Check for critical scopes
        const hasRepoScope = scopeList.includes('repo');
        if (!hasRepoScope) {
          log('⚠️ WARNING: Token does not have the "repo" scope required for full repository access', {color: 'yellow'});
        }
      } else {
        log('⚠️ No scopes found for this token', {color: 'yellow'});
      }
    } catch (error) {
      log(`❌ Failed to check token scopes: ${error.message}`, {color: 'red'});
    }
    
    return true;
  } catch (error) {
    log(`❌ Unexpected error during authentication tests: ${error.message}`, {color: 'red'});
    return false;
  }
}

/**
 * Main diagnostic function
 */
async function diagnoseGitHubToken() {
  log('GitHub Token Diagnostic Tool', {color: 'magenta', bold: true});
  log('==========================', {color: 'magenta'});
  log(`Executed at: ${new Date().toISOString()}\\n`, {color: 'blue', timestamp: false});
  
  // 1. Find and read .env file(s)
  const envFiles = [
    path.join(__dirname, '../mcp-servers/github-issues/.env'),
    path.join(__dirname, '../mcp-servers/coverage-analysis/.env'),
    path.join(__dirname, '../.env')
  ];
  
  let githubToken = null;
  let githubOwner = null;
  let githubRepo = null;
  
  // Try to load from each env file
  for (const envFile of envFiles) {
    const env = loadEnvFile(envFile);
    if (env) {
      if (env.GITHUB_TOKEN && !githubToken) {
        githubToken = env.GITHUB_TOKEN;
        log(`Found GitHub token in ${envFile}`, {color: 'green'});
      }
      
      if (env.GITHUB_OWNER && !githubOwner) {
        githubOwner = env.GITHUB_OWNER;
      }
      
      if (env.GITHUB_REPO && !githubRepo) {
        githubRepo = env.GITHUB_REPO;
      }
    }
  }
  
  // 2. Check for environment variables
  if (!githubToken) {
    if (process.env.GITHUB_TOKEN) {
      githubToken = process.env.GITHUB_TOKEN;
      log('Found GitHub token in environment variables', {color: 'green'});
    }
  }
  
  if (!githubOwner && process.env.GITHUB_OWNER) {
    githubOwner = process.env.GITHUB_OWNER;
  }
  
  if (!githubRepo && process.env.GITHUB_REPO) {
    githubRepo = process.env.GITHUB_REPO;
  }
  
  // Log repository information
  if (githubOwner && githubRepo) {
    log(`Repository: ${githubOwner}/${githubRepo}`, {color: 'blue'});
  } else {
    log('Repository information is incomplete', {color: 'yellow'});
  }
  
  // 3. Check token format
  const formatValid = diagnoseTokenFormat(githubToken);
  
  // 4. Test GitHub authentication
  const authSuccess = await testGitHubAuth(githubToken, githubOwner, githubRepo);
  
  // 5. Provide summary and recommendations
  log('\\n== Diagnostic Summary ==', {color: 'cyan', bold: true});
  
  if (!githubToken) {
    log('❌ No GitHub token found', {color: 'red'});
    log('\\nRecommendations:', {color: 'yellow', bold: true});
    log('1. Generate a new GitHub token at https://github.com/settings/tokens', {color: 'yellow'});
    log('2. Add the token to .env files:', {color: 'yellow'});
    log('   - /mcp-servers/github-issues/.env');
    log('   - /mcp-servers/coverage-analysis/.env');
    log('3. Ensure the token has the "repo" scope');
  } else if (!formatValid) {
    log('❌ GitHub token format is invalid', {color: 'red'});
    log('\\nRecommendations:', {color: 'yellow', bold: true});
    log('1. Check the token for whitespace, newlines, or invalid characters', {color: 'yellow'});
    log('2. Ensure the token was not truncated during copy/paste', {color: 'yellow'});
    log('3. Generate a new token if necessary at https://github.com/settings/tokens', {color: 'yellow'});
  } else if (!authSuccess) {
    log('❌ GitHub token authentication failed', {color: 'red'});
    log('\\nRecommendations:', {color: 'yellow', bold: true});
    log('1. Generate a new GitHub token at https://github.com/settings/tokens', {color: 'yellow'});
    log('2. Ensure the token has the following scopes:', {color: 'yellow'});
    log('   - repo (full control of private repositories)');
    log('   - workflow (update GitHub Action workflows)');
    log('   - admin:repo_hook (full control of repository hooks)');
    log('   - notifications (access notifications)');
    log('3. Replace the token in the .env files and keep it secure');
  } else {
    log('✅ GitHub token authenticated successfully!', {color: 'green'});
    log('You\'re all set! The MCP servers should work correctly with this token.', {color: 'green'});
  }
  
  // Output log file location
  log(`\\nDetailed diagnostic logs saved to: ${outputPath}`, {color: 'blue'});
  
  // Close the log file stream
  outputStream.end();
}

// Run the diagnostics
diagnoseGitHubToken()
  .then(() => {
    console.log('\\nDiagnostics completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error(`\\nError during diagnostics: ${error.message}`);
    process.exit(1);
  });