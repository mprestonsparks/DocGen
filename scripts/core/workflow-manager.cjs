/**
 * Workflow Manager
 * 
 * Core module for managing development workflows, including:
 * - Analyzing project state
 * - Determining optimal workflow
 * - Providing guidance for next steps
 * 
 * This module is platform-agnostic and can be used by any developer
 * regardless of whether they're using Claude Code.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const projectAnalyzer = require('./project-analyzer.cjs');
const mcpServerManager = require('./mcp-server-manager.cjs');

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const { colors } = projectAnalyzer;

/**
 * Initialize the workflow
 */
async function initializeWorkflow() {
  try {
    console.log(`${colors.magenta}=== DocGen Workflow Manager ====${colors.reset}`);
    console.log(`${colors.blue}Initializing workflow...${colors.reset}`);
    
    // Check if MCP servers are running
    const serverStatus = await mcpServerManager.checkMcpServers();
    
    // Start MCP servers if they're not running
    if (!serverStatus.githubRunning || !serverStatus.coverageRunning) {
      console.log(`${colors.yellow}MCP servers are not running. Starting them...${colors.reset}`);
      await mcpServerManager.startMcpServers();
    }
    
    // Check test status
    const testStatus = await projectAnalyzer.checkTestStatus();
    
    // Get implementation status
    const implementationStatus = await projectAnalyzer.getImplementationStatus();
    
    // Get repository analysis
    const repoAnalysis = await projectAnalyzer.analyzeCodeRepository();
    
    // Determine workflow
    const workflow = await projectAnalyzer.determineWorkflow();
    
    // Return the workflow state
    return {
      serverStatus,
      testStatus,
      implementationStatus,
      repoAnalysis,
      workflow
    };
  } catch (error) {
    console.error(`${colors.red}Error initializing workflow: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

/**
 * Display workflow guidance
 */
function displayWorkflowGuidance(workflowState) {
  try {
    if (workflowState.error) {
      console.error(`${colors.red}Error in workflow state: ${workflowState.error}${colors.reset}`);
      return;
    }
    
    console.log(`${colors.magenta}=== Workflow Guidance ====${colors.reset}`);
    
    // Display server status
    console.log(`${colors.cyan}MCP Servers:${colors.reset}`);
    console.log(`  GitHub MCP: ${workflowState.serverStatus.githubRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
    console.log(`  Coverage MCP: ${workflowState.serverStatus.coverageRunning ? colors.green + 'Running' : colors.red + 'Not running'}${colors.reset}`);
    
    // Display test status
    console.log(`${colors.cyan}Tests:${colors.reset}`);
    if (workflowState.testStatus.passing) {
      console.log(`  ${colors.green}All tests are passing${colors.reset}`);
    } else {
      console.log(`  ${colors.red}${workflowState.testStatus.failingTests?.length || 0} tests are failing${colors.reset}`);
      if (workflowState.testStatus.failingTests?.length > 0) {
        console.log(`  Failing tests:`);
        workflowState.testStatus.failingTests.slice(0, 5).forEach(test => {
          console.log(`    - ${colors.red}${test}${colors.reset}`);
        });
        if (workflowState.testStatus.failingTests.length > 5) {
          console.log(`    ... and ${workflowState.testStatus.failingTests.length - 5} more`);
        }
      }
    }
    
    // Display implementation status
    if (!workflowState.implementationStatus.error) {
      console.log(`${colors.cyan}Implementation:${colors.reset}`);
      console.log(`  Source files: ${workflowState.implementationStatus.sourceFiles}`);
      console.log(`  Test files: ${workflowState.implementationStatus.testFiles}`);
      console.log(`  Test coverage: ${workflowState.implementationStatus.coveragePercent}%`);
    }
    
    // Display workflow steps
    console.log(`${colors.cyan}Recommended Workflow:${colors.reset}`);
    if (workflowState.workflow.steps.length === 0) {
      console.log(`  ${colors.green}No immediate actions needed${colors.reset}`);
    } else {
      workflowState.workflow.steps.forEach((step, index) => {
        const priorityColor = 
          step.priority === 'high' ? colors.red :
          step.priority === 'medium' ? colors.yellow :
          colors.green;
        
        console.log(`  ${index + 1}. ${priorityColor}[${step.priority}]${colors.reset} ${step.action}`);
        if (step.details) {
          console.log(`     ${colors.cyan}${step.details}${colors.reset}`);
        }
      });
    }
    
    // Display recommendations
    if (workflowState.workflow.recommendations?.length > 0) {
      console.log(`${colors.cyan}Additional Recommendations:${colors.reset}`);
      workflowState.workflow.recommendations.forEach(recommendation => {
        console.log(`  - ${recommendation}`);
      });
    }
    
    console.log(`${colors.magenta}==========================${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error displaying workflow guidance: ${error.message}${colors.reset}`);
  }
}

/**
 * Execute workflow step
 */
async function executeWorkflowStep(stepIndex, workflowState) {
  try {
    if (workflowState.error) {
      console.error(`${colors.red}Error in workflow state: ${workflowState.error}${colors.reset}`);
      return { success: false, error: workflowState.error };
    }
    
    if (!workflowState.workflow.steps || stepIndex >= workflowState.workflow.steps.length) {
      console.error(`${colors.red}Invalid step index: ${stepIndex}${colors.reset}`);
      return { success: false, error: 'Invalid step index' };
    }
    
    const step = workflowState.workflow.steps[stepIndex];
    console.log(`${colors.blue}Executing workflow step: ${step.action}${colors.reset}`);
    
    // Execute the step based on the action
    switch (step.action) {
      case 'Fix failing tests':
        console.log(`${colors.yellow}Opening test log...${colors.reset}`);
        if (workflowState.testStatus.logPath) {
          try {
            // Open the test log with the default application
            const command = process.platform === 'win32' 
              ? `start ${workflowState.testStatus.logPath}`
              : `open ${workflowState.testStatus.logPath}`;
            
            execSync(command);
            return { success: true, message: 'Opened test log' };
          } catch (error) {
            console.error(`${colors.red}Error opening test log: ${error.message}${colors.reset}`);
            return { success: false, error: error.message };
          }
        }
        break;
        
      case 'Improve test coverage':
        // Get implementation gaps
        const gapsResult = await projectAnalyzer.getImplementationGaps();
        
        if (!gapsResult.error && gapsResult.gaps.length > 0) {
          console.log(`${colors.yellow}Components needing test coverage:${colors.reset}`);
          gapsResult.gaps.forEach(gap => {
            console.log(`  - ${gap.component}: ${gap.coveragePercent}% coverage (${gap.testFiles}/${gap.sourceFiles} files)`);
          });
          
          return { 
            success: true, 
            message: 'Identified components needing test coverage',
            gaps: gapsResult.gaps
          };
        }
        break;
        
      case 'Add project documentation':
        // Create docs directory if it doesn't exist
        const docsDir = path.join(PROJECT_ROOT, 'docs');
        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true });
          
          // Create basic documentation files
          fs.writeFileSync(
            path.join(docsDir, 'README.md'),
            '# DocGen Documentation\n\nThis directory contains documentation for the DocGen project.\n'
          );
          
          console.log(`${colors.green}Created docs directory and README${colors.reset}`);
          return { success: true, message: 'Created documentation directory' };
        }
        break;
        
      default:
        console.log(`${colors.yellow}No automated action available for: ${step.action}${colors.reset}`);
        return { success: false, error: 'No automated action available for this step' };
    }
    
    return { success: false, error: 'Failed to execute step' };
  } catch (error) {
    console.error(`${colors.red}Error executing workflow step: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get workflow summary
 */
function getWorkflowSummary(workflowState) {
  try {
    if (workflowState.error) {
      return { error: workflowState.error };
    }
    
    // Create a summary object
    const summary = {
      timestamp: new Date().toISOString(),
      serverStatus: {
        githubRunning: workflowState.serverStatus.githubRunning,
        coverageRunning: workflowState.serverStatus.coverageRunning
      },
      testStatus: {
        passing: workflowState.testStatus.passing,
        failingCount: workflowState.testStatus.failingTests?.length || 0
      },
      implementationStatus: {
        sourceFiles: workflowState.implementationStatus.sourceFiles,
        testFiles: workflowState.implementationStatus.testFiles,
        coveragePercent: workflowState.implementationStatus.coveragePercent
      },
      workflowSteps: workflowState.workflow.steps.map(step => ({
        action: step.action,
        priority: step.priority
      }))
    };
    
    return summary;
  } catch (error) {
    console.error(`${colors.red}Error getting workflow summary: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

module.exports = {
  initializeWorkflow,
  displayWorkflowGuidance,
  executeWorkflowStep,
  getWorkflowSummary,
  colors
};
