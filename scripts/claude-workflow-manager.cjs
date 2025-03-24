#!/usr/bin/env node
/**
 * Claude Workflow Manager
 * 
 * An intelligent workflow orchestrator for Claude Code that automates the process of:
 * 1. Starting MCP servers
 * 2. Analyzing the project state
 * 3. Determining the most appropriate actions
 * 4. Outputting step-by-step guidance for Claude
 * 
 * Usage: npm run claude:workflow
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:7867';
const COVERAGE_MCP_URL = process.env.COVERAGE_MCP_URL || 'http://localhost:7868';
const PROJECT_ROOT = path.resolve(process.cwd());

// ANSI color codes for terminal output
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

// Claude directive styles for output
const claude = {
  instruction: (text) => `${colors.magenta}[CLAUDE INSTRUCTION] ${text}${colors.reset}`,
  command: (text) => `${colors.cyan}[CLAUDE COMMAND] ${text}${colors.reset}`,
  analysis: (text) => `${colors.blue}[CLAUDE ANALYSIS] ${text}${colors.reset}`,
  action: (text) => `${colors.green}[CLAUDE ACTION] ${text}${colors.reset}`,
  note: (text) => `${colors.yellow}[CLAUDE NOTE] ${text}${colors.reset}`,
  error: (text) => `${colors.red}[CLAUDE ERROR] ${text}${colors.reset}`,
};

// Utility function for delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if MCP servers are running
 */
async function checkMcpServers() {
  try {
    console.log(`${colors.blue}Checking if MCP servers are running...${colors.reset}`);
    
    let githubRunning = false;
    let coverageRunning = false;
    
    try {
      const githubResponse = await axios.get(`${GITHUB_MCP_URL}/capabilities`, { timeout: 2000 });
      githubRunning = githubResponse.status === 200;
    } catch (e) {
      githubRunning = false;
    }
    
    try {
      const coverageResponse = await axios.get(`${COVERAGE_MCP_URL}/capabilities`, { timeout: 2000 });
      coverageRunning = coverageResponse.status === 200;
    } catch (e) {
      coverageRunning = false;
    }
    
    console.log(`GitHub MCP: ${githubRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
    console.log(`Coverage MCP: ${coverageRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
    
    return { githubRunning, coverageRunning };
  } catch (error) {
    console.error(`${colors.red}Error checking MCP servers: ${error.message}${colors.reset}`);
    return { githubRunning: false, coverageRunning: false };
  }
}

/**
 * Start MCP servers
 */
async function startMcpServers() {
  try {
    console.log(`${colors.blue}Starting MCP servers...${colors.reset}`);
    
    // Start servers using the script
    const scriptPath = path.join(PROJECT_ROOT, 'mcp-servers', 'start-mcp-servers.sh');
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${colors.red}MCP server script not found: ${scriptPath}${colors.reset}`);
      return false;
    }
    
    const serverProcess = spawn(scriptPath, [], { 
      stdio: 'inherit',
      shell: true
    });
    
    // Wait for servers to start
    console.log(`${colors.yellow}Waiting for servers to initialize...${colors.reset}`);
    await sleep(5000);
    
    // Verify servers are running
    const { githubRunning, coverageRunning } = await checkMcpServers();
    
    if (githubRunning && coverageRunning) {
      console.log(`${colors.green}MCP servers started successfully${colors.reset}`);
      return true;
    } else {
      console.error(`${colors.red}Failed to start one or both MCP servers${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}Error starting MCP servers: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Get implementation status
 */
async function getImplementationStatus() {
  try {
    const response = await axios.post(`${GITHUB_MCP_URL}/getImplementationStatus`);
    return response.data.implementationStatus;
  } catch (error) {
    console.error(`${colors.red}Error getting implementation status: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Get implementation gaps
 */
async function getImplementationGaps(threshold = 70) {
  try {
    const response = await axios.post(`${COVERAGE_MCP_URL}/getImplementationGaps`, {
      threshold
    });
    return response.data;
  } catch (error) {
    console.error(`${colors.red}Error getting implementation gaps: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Get implementation gap issues
 */
async function getImplementationGapIssues() {
  try {
    const response = await axios.post(`${GITHUB_MCP_URL}/getIssues`, {
      labels: 'implementation-gap',
      state: 'open'
    });
    return response.data.issues;
  } catch (error) {
    console.error(`${colors.red}Error getting implementation gap issues: ${error.message}${colors.reset}`);
    return [];
  }
}

/**
 * Correlate issues with coverage
 */
async function correlateIssuesWithCoverage() {
  try {
    const response = await axios.post(`${COVERAGE_MCP_URL}/correlateIssuesWithCoverage`, {
      issueLabel: 'implementation-gap'
    });
    return response.data;
  } catch (error) {
    console.error(`${colors.red}Error correlating issues with coverage: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Analyze code repository
 */
function analyzeCodeRepository() {
  console.log(`${colors.blue}Analyzing code repository...${colors.reset}`);
  
  try {
    // Using validate-todos.cjs instead of validate-todos.ts
    // This avoids the TypeScript execution error
    const todoOutput = execSync('node scripts/validate-todos.cjs --json', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let todoData;
    try {
      todoData = JSON.parse(todoOutput);
    } catch (e) {
      todoData = { count: 0, files: [] };
    }
    
    // Get git status
    const gitStatus = execSync('git status --porcelain', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf8' 
    });
    
    const hasChanges = gitStatus.trim().length > 0;
    
    return {
      todos: todoData,
      hasChanges,
      gitStatus
    };
  } catch (error) {
    console.error(`${colors.red}Error analyzing code repository: ${error.message}${colors.reset}`);
    return {
      todos: { count: 0, files: [] },
      hasChanges: false,
      gitStatus: ''
    };
  }
}

/**
 * Determine the optimal workflow
 */
async function determineWorkflow() {
  // Step 1: Get implementation status
  const implementationStatus = await getImplementationStatus();
  
  // Step 2: Get implementation gaps
  const implementationGaps = await getImplementationGaps();
  
  // Step 3: Get open implementation gap issues
  const implementationGapIssues = await getImplementationGapIssues();
  
  // Step 4: Correlate issues with coverage
  const correlation = await correlateIssuesWithCoverage();
  
  // Step 5: Analyze code repository
  const repoAnalysis = analyzeCodeRepository();
  
  // Step 6: Determine optimal workflow
  const workflow = [];
  
  // Check if we have enough data to make decisions
  if (!implementationStatus || !implementationGaps || !correlation) {
    workflow.push({
      type: 'error',
      message: 'Unable to gather enough data to determine the optimal workflow'
    });
    return workflow;
  }
  
  // Start with a status check
  workflow.push({
    type: 'instruction',
    message: 'Begin by checking the current implementation status',
    command: '@github status'
  });
  
  // Prioritize files with implementation gaps that don't have issues
  if (implementationGaps && implementationGaps.implementationGaps && implementationGaps.implementationGaps.length > 0) {
    // Find implementation gaps that don't have issues
    const gapsWithoutIssues = [];
    
    if (correlation && correlation.correlations) {
      const filesWithIssues = correlation.correlations
        .flatMap(corr => corr.relatedFiles.map(file => file.file));
      
      implementationGaps.implementationGaps.forEach(gap => {
        if (!filesWithIssues.includes(gap.file)) {
          gapsWithoutIssues.push(gap);
        }
      });
    } else {
      // If correlation failed, use all gaps
      gapsWithoutIssues.push(...implementationGaps.implementationGaps);
    }
    
    if (gapsWithoutIssues.length > 0) {
      workflow.push({
        type: 'analysis',
        message: `Found ${gapsWithoutIssues.length} implementation gaps without associated issues`,
      });
      
      workflow.push({
        type: 'instruction',
        message: 'Identify implementation gaps that need attention',
        command: '@coverage getImplementationGaps --threshold 70'
      });
      
      // Recommend creating issues for top gaps
      const topGaps = gapsWithoutIssues
        .sort((a, b) => b.gapScore - a.gapScore)
        .slice(0, 3);
      
      topGaps.forEach(gap => {
        workflow.push({
          type: 'action',
          message: `Create an issue for implementation gap in ${gap.file}`,
          command: `@github create --title "Implementation Gap: ${gap.file}" --body "This file has low test coverage (Statements: ${gap.metrics.statements.percentage}%, Branches: ${gap.metrics.branches.percentage}%, Functions: ${gap.metrics.functions.percentage}%, Lines: ${gap.metrics.lines.percentage}%). Gap score: ${gap.gapScore.toFixed(2)}." --implementation-gap`
        });
      });
    }
  }
  
  // Check open implementation gap issues
  if (implementationGapIssues && implementationGapIssues.length > 0) {
    workflow.push({
      type: 'analysis',
      message: `Found ${implementationGapIssues.length} open implementation gap issues`,
    });
    
    workflow.push({
      type: 'instruction',
      message: 'Review open implementation gap issues',
      command: '@github issues --implementation-gaps'
    });
    
    // Get the most recently updated issue
    const mostRecentIssue = implementationGapIssues
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    
    if (mostRecentIssue) {
      workflow.push({
        type: 'action',
        message: `Work on the most recently updated issue: #${mostRecentIssue.number}: ${mostRecentIssue.title}`,
        command: `@github getIssue --issue-number ${mostRecentIssue.number}`
      });
      
      if (correlation && correlation.correlations) {
        const issueCorrelation = correlation.correlations
          .find(corr => corr.issue.number === mostRecentIssue.number);
        
        if (issueCorrelation && issueCorrelation.relatedFiles.length > 0) {
          const filesToImprove = issueCorrelation.relatedFiles
            .sort((a, b) => a.metrics.statements.percentage - b.metrics.statements.percentage);
          
          workflow.push({
            type: 'action',
            message: `Improve test coverage for ${filesToImprove[0].file}`,
            command: `@coverage getFileCoverage --file "${filesToImprove[0].file}"`
          });
        }
      }
    }
  }
  
  // Check repo analysis
  if (repoAnalysis.hasChanges) {
    workflow.push({
      type: 'note',
      message: 'There are uncommitted changes in the repository',
    });
    
    workflow.push({
      type: 'instruction',
      message: 'Review uncommitted changes',
      command: 'git status'
    });
    
    workflow.push({
      type: 'action',
      message: 'Consider creating a pull request for these changes',
      command: 'git diff'
    });
  }
  
  // Add final steps
  workflow.push({
    type: 'instruction',
    message: 'After making changes, update the implementation status',
    command: '@github update-all-issues'
  });
  
  workflow.push({
    type: 'instruction',
    message: 'Generate a coverage report to see progress',
    command: '@coverage generateCoverageReport'
  });
  
  return workflow;
}

/**
 * Generate Claude workflow guidance
 */
async function generateClaudeGuidance(workflow) {
  console.log(`\n\n${colors.magenta}=== CLAUDE WORKFLOW GUIDANCE ====${colors.reset}\n`);
  console.log(`${claude.instruction("I've analyzed the project state and determined an optimal workflow for you.")}`);
  console.log(`${claude.instruction("Here's what I recommend you do next:")}`);
  console.log();
  
  // Display workflow steps
  workflow.forEach((step, index) => {
    if (step.type === 'instruction') {
      console.log(`${claude.instruction(`${index + 1}. ${step.message}`)}`);
      if (step.command) {
        console.log(`   ${claude.command(step.command)}`);
      }
    } else if (step.type === 'analysis') {
      console.log(`${claude.analysis(`${index + 1}. ${step.message}`)}`);
    } else if (step.type === 'action') {
      console.log(`${claude.action(`${index + 1}. ${step.message}`)}`);
      if (step.command) {
        console.log(`   ${claude.command(step.command)}`);
      }
    } else if (step.type === 'note') {
      console.log(`${claude.note(`${index + 1}. ${step.message}`)}`);
    } else if (step.type === 'error') {
      console.log(`${claude.error(`${index + 1}. ${step.message}`)}`);
    }
    
    console.log();
  });
  
  console.log(`${claude.instruction("This workflow is based on the current state of the project. As you make progress, run this command again for updated guidance.")}`);
  console.log(`\n${colors.magenta}=== END CLAUDE WORKFLOW GUIDANCE ====${colors.reset}\n`);
}

/**
 * Main function
 */
async function main() {
  console.log(`\n${colors.magenta}===== Claude Workflow Manager =====\n${colors.reset}`);
  
  // Step 1: Check if MCP servers are running
  const { githubRunning, coverageRunning } = await checkMcpServers();
  
  // Step 2: Start MCP servers if needed
  if (!githubRunning || !coverageRunning) {
    console.log(`${colors.yellow}One or both MCP servers are not running. Starting them now...${colors.reset}`);
    const serversStarted = await startMcpServers();
    
    if (!serversStarted) {
      console.error(`${colors.red}Failed to start MCP servers. Exiting.${colors.reset}`);
      process.exit(1);
    }
  }
  
  // Step 3: Determine the optimal workflow
  console.log(`${colors.blue}Determining optimal workflow...${colors.reset}`);
  const workflow = await determineWorkflow();
  
  // Step 4: Generate guidance for Claude
  await generateClaudeGuidance(workflow);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error in workflow manager: ${error.message}${colors.reset}`);
});