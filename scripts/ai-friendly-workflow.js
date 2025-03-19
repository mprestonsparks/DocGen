#!/usr/bin/env node
/**
 * AI-friendly workflow script for DocGen
 * 
 * This script runs docgen commands in sequence without requiring interactive input.
 * It's designed to be usable by AI assistants in Docker environments.
 * 
 * Features:
 * - Supports iterative workflows with state persistence
 * - Can run until max iterations reached or user requests completion
 * - Supports customizable command sequences
 */

import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Set colors for output
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// State file path for persisting workflow state
const STATE_FILE = path.join(projectRoot, 'temp', 'ai-workflow-state.json');

// Parse command line arguments
const args = process.argv.slice(2);
const MAX_ITERATIONS = args.includes('--max-iterations') 
  ? parseInt(args[args.indexOf('--max-iterations') + 1]) 
  : 3;
const HEADLESS_MODE = args.includes('--headless');
const RESET_STATE = args.includes('--reset');

/**
 * Run a command and display its output
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments for the command
 * @param {string} description - Description of what the command does
 * @param {object} options - Additional options for the command
 * @returns {object} Result object with exit code and captured output
 */
function runCommand(command, args, description, options = {}) {
  console.log(`\n${colors.magenta}==== ${description} ====${colors.reset}`);
  
  // Capture output if requested
  const spawnOptions = { 
    shell: true,
    ...(options.captureOutput ? { stdio: 'pipe' } : { stdio: 'inherit' })
  };
  
  const result = spawnSync(command, args, spawnOptions);
  
  let output = '';
  if (options.captureOutput) {
    output = result.stdout ? result.stdout.toString() : '';
    console.log(output);
  }
  
  if (result.status !== 0) {
    console.log(`${colors.yellow}Command completed with exit code ${result.status}${colors.reset}`);
  } else {
    console.log(`${colors.green}Command completed successfully${colors.reset}`);
  }
  
  return {
    exitCode: result.status || 0,
    output
  };
}

/**
 * Load workflow state from file
 * @returns {object} Current workflow state
 */
function loadState() {
  try {
    // Ensure temp directory exists
    const tempDir = path.join(projectRoot, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    if (fs.existsSync(STATE_FILE) && !RESET_STATE) {
      const stateData = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(stateData);
    }
  } catch (error) {
    console.log(`${colors.yellow}Warning: Could not load state: ${error.message}${colors.reset}`);
  }
  
  // Default initial state
  return {
    iteration: 1,
    maxIterations: MAX_ITERATIONS,
    lastRun: new Date().toISOString(),
    commandResults: {},
    issues: [],
    metrics: {
      passedTests: 0,
      failures: [],
      coverage: 0
    }
  };
}

/**
 * Save workflow state to file
 * @param {object} state - Current workflow state
 */
function saveState(state) {
  try {
    const tempDir = path.join(projectRoot, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    console.log(`${colors.green}Workflow state saved${colors.reset}`);
  } catch (error) {
    console.log(`${colors.yellow}Warning: Could not save state: ${error.message}${colors.reset}`);
  }
}

/**
 * Check and start MCP servers if needed
 */
function setupMcpServers() {
  console.log(`\n${colors.blue}Checking MCP servers...${colors.reset}`);
  
  // Simplify MCP server check - just check if files exist
  if (fs.existsSync(`${projectRoot}/mcp-servers/mcp-docker-running`)) {
    // Docker mode - MCP servers are running in Docker
    console.log(`${colors.green}MCP servers are running in Docker.${colors.reset}`);
    return;
  }
  
  // Check for indicator file
  if (fs.existsSync(`${projectRoot}/.mcp-in-docker`)) {
    console.log(`${colors.green}MCP servers are configured to run in Docker.${colors.reset}`);
    
    // Create Docker indicator file in mcp-servers directory
    fs.writeFileSync(`${projectRoot}/mcp-servers/mcp-docker-running`, '');
    return;
  }
  
  // Try to start MCP adapters
  console.log(`${colors.yellow}Starting MCP servers...${colors.reset}`);
  
  if (fs.existsSync(`${projectRoot}/mcp-servers/start-mcp-adapters.sh`)) {
    try {
      // Make the script executable
      fs.chmodSync(`${projectRoot}/mcp-servers/start-mcp-adapters.sh`, '755');
      
      // Start the MCP servers
      const result = spawnSync('bash', [`${projectRoot}/mcp-servers/start-mcp-adapters.sh`], {
        cwd: `${projectRoot}/mcp-servers`,
        stdio: 'inherit'
      });
      
      if (result.status === 0) {
        console.log(`${colors.green}MCP servers started successfully.${colors.reset}`);
      } else {
        console.log(`${colors.yellow}Warning: Could not start MCP servers.${colors.reset}`);
        console.log(`This is not critical - you can still use DocGen.`);
      }
    } catch (error) {
      console.log(`${colors.yellow}Warning: Could not start MCP servers: ${error.message}${colors.reset}`);
      console.log(`This is not critical - you can still use DocGen without MCP servers.`);
    }
  } else {
    console.log(`${colors.yellow}MCP server script not found.${colors.reset}`);
    console.log(`This is not critical - you can still use DocGen without MCP servers.`);
  }
}

/**
 * Parse test results from output
 * @param {string} output - Command output to parse
 * @returns {object} Parsed metrics
 */
function parseTestResults(output) {
  const metrics = {
    passedTests: 0,
    failures: [],
    coverage: 0
  };
  
  // Basic test result parsing
  const passedMatches = output.match(/PASS\s+tests\/.+?\.test\.(js|ts)/g);
  const failedMatches = output.match(/FAIL\s+tests\/.+?\.test\.(js|ts)/g);
  
  if (passedMatches) {
    metrics.passedTests = passedMatches.length;
  }
  
  if (failedMatches) {
    metrics.failures = failedMatches.map(match => match.replace('FAIL ', '').trim());
  }
  
  // Extract coverage percentage if available
  const coverageMatch = output.match(/All files[^\n]+?(\d+(\.\d+)?)%/);
  if (coverageMatch) {
    metrics.coverage = parseFloat(coverageMatch[1]);
  }
  
  return metrics;
}

/**
 * Parse analysis results
 * @param {string} output - Command output to parse
 * @returns {object} Parsed issues and metrics
 */
function parseAnalysisResults(output) {
  const issues = [];
  
  // Extract issues from analysis output
  const issueMatches = output.match(/ISSUE:[\s\S]+?(?=ISSUE:|$)/g);
  if (issueMatches) {
    issueMatches.forEach(issue => {
      const titleMatch = issue.match(/ISSUE:(.+?)(?=\n|$)/);
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown issue';
      issues.push({ 
        title, 
        description: issue.trim(),
        status: 'pending'
      });
    });
  }
  
  return { issues };
}

/**
 * Ask user if they want to continue the workflow
 * @returns {Promise<boolean>} True if user wants to continue
 */
async function askToContinue() {
  if (HEADLESS_MODE) {
    return true; // Always continue in headless mode
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`\n${colors.cyan}Continue to next iteration? (Y/n): ${colors.reset}`, answer => {
      rl.close();
      resolve(answer.toLowerCase() !== 'n');
    });
  });
}

/**
 * Wait for user input with a timeout
 * @param {string} prompt - The prompt to display
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<string>} User input or empty string if timeout
 */
function waitForInput(prompt, timeoutMs = 300000) { // Default 5 minute timeout
  if (HEADLESS_MODE) {
    return Promise.resolve('');
  }
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    const timeoutId = setTimeout(() => {
      rl.close();
      console.log(`\n${colors.yellow}Timeout reached, continuing automatically${colors.reset}`);
      resolve('');
    }, timeoutMs);
    
    rl.question(prompt, answer => {
      clearTimeout(timeoutId);
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Determine the highest priority issue to fix
 * @param {object} state - Current workflow state
 * @returns {object} Priority issue info
 */
function determinePriorityIssue(state) {
  // Check for critical components with very low coverage
  const criticalCoverage = {
    'src/paper_architect/extraction': 0.81,
    'src/index.ts': 6.55,
    'src/utils/ast-analyzer.ts': 13.33,
    'src/utils/todo-validator.ts': 38.4,
    'src/utils/project-analyzer.ts': 36.53,
    'src/utils/llm.ts': 41.57
  };
  
  // Find the component with lowest coverage
  const lowestCoverageComponent = Object.entries(criticalCoverage)
    .sort(([,a], [,b]) => a - b)[0];
    
  if (lowestCoverageComponent && lowestCoverageComponent[1] < 50) {
    return {
      type: 'coverage',
      component: lowestCoverageComponent[0],
      coverage: lowestCoverageComponent[1],
      priority: 'high',
      action: 'implement-tests'
    };
  }
  
  // Check for test failures
  if (state.metrics.failures && state.metrics.failures.length > 0) {
    return {
      type: 'test-failure',
      tests: state.metrics.failures,
      priority: 'high',
      action: 'fix-tests'
    };
  }
  
  // Check for other issues
  if (state.issues && state.issues.length > 0) {
    return {
      type: 'issue',
      issue: state.issues[0],
      priority: 'medium',
      action: 'fix-issue'
    };
  }
  
  // Default action - improve overall coverage
  return {
    type: 'general',
    priority: 'normal',
    action: 'improve-coverage'
  };
}

/**
 * Create a plan for the current iteration based on analysis
 * @param {object} state - Current workflow state
 * @param {object} priorityIssue - Information about the priority issue
 * @returns {object} Action plan
 */
function createActionPlan(state, priorityIssue) {
  const plan = {
    goal: '',
    steps: [],
    expectedOutcome: ''
  };
  
  switch (priorityIssue.action) {
    case 'implement-tests':
      plan.goal = `Increase test coverage for ${priorityIssue.component} (currently ${priorityIssue.coverage}%)`;
      plan.steps = [
        `Analyze ${priorityIssue.component} to understand its structure and functionality`,
        'Identify untested methods and code paths',
        'Implement new test cases for key functionality',
        'Add the tests to the appropriate test file',
        'Run tests to verify coverage improvement'
      ];
      plan.expectedOutcome = `Improved test coverage for ${priorityIssue.component}`;
      break;
      
    case 'fix-tests':
      plan.goal = 'Fix failing tests';
      plan.steps = [
        'Analyze failing tests to understand the failure reason',
        'Identify whether the issue is in the test or the implementation',
        'Make necessary code changes to fix the failing tests',
        'Run tests to verify fixes'
      ];
      plan.expectedOutcome = 'All tests passing';
      break;
      
    case 'fix-issue':
      plan.goal = `Fix issue: ${priorityIssue.issue.title}`;
      plan.steps = [
        'Analyze the issue to understand its scope',
        'Identify affected components',
        'Implement necessary code changes',
        'Verify the issue is resolved'
      ];
      plan.expectedOutcome = 'Issue resolved and verified';
      break;
      
    case 'improve-coverage':
      plan.goal = 'Improve overall code coverage';
      plan.steps = [
        'Identify components with below average coverage',
        'Add tests for untested functionality',
        'Run tests to verify coverage improvement'
      ];
      plan.expectedOutcome = 'Improved overall code coverage';
      break;
  }
  
  return plan;
}

/**
 * Run a workflow iteration
 * @param {object} state - Current workflow state
 * @returns {object} Updated state
 */
async function runWorkflowIteration(state) {
  console.log(`\n${colors.magenta}===== DocGen Development Workflow - Iteration ${state.iteration}/${state.maxIterations} =====${colors.reset}`);
  console.log(`${colors.cyan}Running in automated sequence mode (AI-friendly)${colors.reset}`);
  console.log(`${colors.cyan}Project root: ${projectRoot}${colors.reset}`);
  
  // Setup MCP servers
  setupMcpServers();
  
  // Phase 1: Analysis
  console.log(`\n${colors.blue}==== Phase 1: Analysis ====${colors.reset}`);
  
  // Define analysis commands with captured output for important ones
  const analysisCommands = [
    { 
      id: 'analyze',
      cmd: 'node', 
      args: [`${projectRoot}/docgen.js`, 'analyze'], 
      desc: 'Analyzing project',
      options: { captureOutput: true },
      parser: parseAnalysisResults
    },
    { 
      id: 'test',
      cmd: 'npm', 
      args: ['test'], 
      desc: 'Running tests',
      options: { captureOutput: true },
      parser: parseTestResults
    },
    { 
      id: 'checkServers',
      cmd: 'node', 
      args: [`${projectRoot}/docgen.js`, 'check-servers'], 
      desc: 'Checking MCP servers'
    }
  ];
  
  // Run analysis commands
  for (const command of analysisCommands) {
    const result = runCommand(command.cmd, command.args, command.desc, command.options);
    
    // Store command result in state
    state.commandResults[command.id] = {
      exitCode: result.exitCode,
      timestamp: new Date().toISOString()
    };
    
    // Parse output if a parser is provided
    if (command.parser && result.output) {
      const parsedResults = command.parser(result.output);
      
      // Update state with parsed results
      if (parsedResults.metrics) {
        state.metrics = { ...state.metrics, ...parsedResults.metrics };
      }
      
      if (parsedResults.issues) {
        // Merge new issues with existing ones
        const existingIssueIds = state.issues.map(issue => issue.title);
        const newIssues = parsedResults.issues.filter(issue => !existingIssueIds.includes(issue.title));
        state.issues = [...state.issues, ...newIssues];
      }
    }
    
    // Give a short pause between commands
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Phase 2: Planning - Determine the highest priority issue to fix
  console.log(`\n${colors.blue}==== Phase 2: Planning ====${colors.reset}`);
  const priorityIssue = determinePriorityIssue(state);
  const actionPlan = createActionPlan(state, priorityIssue);
  
  console.log(`${colors.green}Priority issue: ${priorityIssue.type} - ${priorityIssue.action}${colors.reset}`);
  console.log(`${colors.green}Goal: ${actionPlan.goal}${colors.reset}`);
  console.log(`${colors.green}Steps:${colors.reset}`);
  actionPlan.steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step}`);
  });
  console.log(`${colors.green}Expected outcome: ${actionPlan.expectedOutcome}${colors.reset}`);
  
  // Save current state before implementation
  state.priorityIssue = priorityIssue;
  state.actionPlan = actionPlan;
  saveState(state);
  
  // Phase 3: Implementation - AI needs to implement the action plan
  console.log(`\n${colors.blue}==== Phase 3: Implementation ====${colors.reset}`);
  console.log(`${colors.yellow}This phase requires AI to write actual code to address the identified issues.${colors.reset}`);
  console.log(`${colors.yellow}The AI should now implement the plan above.${colors.reset}`);
  
  if (!HEADLESS_MODE) {
    // Pause to allow AI to implement the action plan
    console.log(`\n${colors.magenta}AI Implementation Phase${colors.reset}`);
    console.log(`${colors.cyan}The AI assistant should now implement the action plan.${colors.reset}`);
    console.log(`${colors.cyan}Follow these steps:${colors.reset}`);
    console.log(`1. Review the priority issue and action plan`);
    console.log(`2. Use appropriate tools to make code changes (Edit, View, etc.)`);
    console.log(`3. When implementation is complete, continue the workflow`);
    
    await waitForInput(`\n${colors.cyan}Press Enter when implementation is complete...${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Running in headless mode - implementation phase is skipped${colors.reset}`);
    
    // In headless mode, we need to simulate some implementation work
    // This can be a simple message, but in a real system this is where 
    // you'd hook into an API to trigger the implementation work
    console.log(`${colors.yellow}AI would normally perform implementation work here${colors.reset}`);
  }
  
  // Phase 4: Verification - Run tests and reports to verify improvements
  console.log(`\n${colors.blue}==== Phase 4: Verification ====${colors.reset}`);
  
  const verificationCommands = [
    { 
      id: 'verifyTests',
      cmd: 'npm', 
      args: ['test'], 
      desc: 'Running tests to verify improvements',
      options: { captureOutput: true },
      parser: parseTestResults
    },
    { 
      id: 'generateReports',
      cmd: 'node', 
      args: [`${projectRoot}/scripts/generate-reports.js`], 
      desc: 'Generating reports'
    }
  ];
  
  // Run verification commands
  for (const command of verificationCommands) {
    const result = runCommand(command.cmd, command.args, command.desc, command.options);
    
    // Store command result in state
    state.commandResults[command.id] = {
      exitCode: result.exitCode,
      timestamp: new Date().toISOString()
    };
    
    // Parse output if a parser is provided
    if (command.parser && result.output) {
      const parsedResults = command.parser(result.output);
      
      // Update state with parsed results
      if (parsedResults.metrics) {
        // Compare with previous metrics to show improvements
        const previousMetrics = { ...state.metrics };
        state.metrics = { ...state.metrics, ...parsedResults.metrics };
        
        // Show improvement in test coverage if any
        if (previousMetrics.coverage !== undefined && 
            state.metrics.coverage !== undefined &&
            state.metrics.coverage > previousMetrics.coverage) {
          console.log(`${colors.green}Coverage improved: ${previousMetrics.coverage}% → ${state.metrics.coverage}%${colors.reset}`);
        }
        
        // Show reduction in test failures if any
        if (previousMetrics.failures !== undefined && 
            state.metrics.failures !== undefined &&
            previousMetrics.failures.length > state.metrics.failures.length) {
          console.log(`${colors.green}Test failures reduced: ${previousMetrics.failures.length} → ${state.metrics.failures.length}${colors.reset}`);
        }
      }
    }
    
    // Give a short pause between commands
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Update iteration results
  state.iterationResults = state.iterationResults || [];
  state.iterationResults.push({
    iteration: state.iteration,
    priorityIssue,
    actionPlan,
    metrics: { ...state.metrics },
    timestamp: new Date().toISOString()
  });
  
  // Update state for next iteration
  state.lastRun = new Date().toISOString();
  state.iteration++;
  
  return state;
}

/**
 * Display workflow summary
 * @param {object} state - Current workflow state
 */
function displaySummary(state) {
  console.log(`\n${colors.magenta}===== Workflow Summary =====${colors.reset}`);
  
  console.log(`${colors.cyan}Completed ${state.iteration - 1} iterations${colors.reset}`);
  
  console.log(`\n${colors.blue}Test Results:${colors.reset}`);
  console.log(`${colors.green}Passed Tests: ${state.metrics.passedTests}${colors.reset}`);
  if (state.metrics.failures && state.metrics.failures.length > 0) {
    console.log(`${colors.yellow}Failed Tests: ${state.metrics.failures.length}${colors.reset}`);
    state.metrics.failures.forEach(failure => {
      console.log(`  - ${failure}`);
    });
  }
  
  if (state.metrics.coverage) {
    console.log(`${colors.blue}Code Coverage: ${state.metrics.coverage}%${colors.reset}`);
  }
  
  if (state.issues.length > 0) {
    console.log(`\n${colors.yellow}Issues (${state.issues.length}):${colors.reset}`);
    state.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.title}`);
    });
  }
  
  console.log(`\n${colors.green}===== Workflow completed =====${colors.reset}`);
  console.log(`${colors.cyan}You can now run individual commands to continue development:${colors.reset}`);
  console.log(`${colors.green}npm test${colors.reset} - Run tests`);
  console.log(`${colors.green}npm run interview${colors.reset} - Start interactive interview`);
  console.log(`${colors.green}npm run validate${colors.reset} - Validate documentation`);
  console.log(`${colors.green}npm run generate-reports${colors.reset} - Generate reports`);
  console.log(`${colors.green}node docgen.js analyze${colors.reset} - Analyze project state`);
  console.log(`${colors.green}npm run get-to-work:ai${colors.reset} - Run this workflow again`);
}

/**
 * Main function to execute the workflow sequence
 */
async function main() {
  // Load existing state or create new one
  let state = loadState();
  state.maxIterations = MAX_ITERATIONS; // Update max iterations from command line
  
  // Run iterations until max is reached or user stops
  while (state.iteration <= state.maxIterations) {
    // Run a single workflow iteration
    state = await runWorkflowIteration(state);
    
    // Save state after each iteration
    saveState(state);
    
    // Check if we should continue
    if (state.iteration <= state.maxIterations) {
      const shouldContinue = await askToContinue();
      if (!shouldContinue) {
        console.log(`${colors.yellow}Workflow stopped by user${colors.reset}`);
        break;
      }
    }
  }
  
  // Display final summary
  displaySummary(state);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});