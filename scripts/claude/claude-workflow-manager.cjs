/**
 * Claude Workflow Manager
 * 
 * Claude-specific module for managing development workflows with Claude Code integration.
 * This module extends the core workflow manager with Claude-specific functionality.
 * 
 * This module will only be loaded when ENABLE_CLAUDE_FEATURES is set to true.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');
const coreWorkflowManager = require('../core/workflow-manager.cjs');
const projectAnalyzer = require('../core/project-analyzer.cjs');
const mcpServerManager = require('../core/mcp-server-manager.cjs');

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());
const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:7867';
const COVERAGE_MCP_URL = process.env.COVERAGE_MCP_URL || 'http://localhost:7868';
const { colors } = projectAnalyzer;

/**
 * Initialize the Claude workflow
 */
async function initializeClaudeWorkflow() {
  try {
    console.log(`${colors.magenta}=== DocGen Claude Workflow Manager ====${colors.reset}`);
    console.log(`${colors.blue}Initializing Claude workflow...${colors.reset}`);
    
    // Get the core workflow state
    const coreWorkflowState = await coreWorkflowManager.initializeWorkflow();
    
    // Extend with Claude-specific information
    const claudeWorkflowState = {
      ...coreWorkflowState,
      claudeIntegration: await getClaudeIntegrationStatus()
    };
    
    return claudeWorkflowState;
  } catch (error) {
    console.error(`${colors.red}Error initializing Claude workflow: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

/**
 * Get Claude integration status
 */
async function getClaudeIntegrationStatus() {
  try {
    console.log(`${colors.blue}Checking Claude integration status...${colors.reset}`);
    
    // Check if Claude integration is enabled
    const enableClaudeFeatures = process.env.ENABLE_CLAUDE_FEATURES === 'true';
    
    if (!enableClaudeFeatures) {
      console.log(`${colors.yellow}Claude features are disabled${colors.reset}`);
      return { enabled: false };
    }
    
    // Check if MCP servers are running
    const serverStatus = await mcpServerManager.checkMcpServers();
    
    if (!serverStatus.githubRunning || !serverStatus.coverageRunning) {
      console.log(`${colors.yellow}MCP servers are not running${colors.reset}`);
      return { enabled: true, available: false, reason: 'MCP servers are not running' };
    }
    
    // Check if Claude API is available
    try {
      const githubCapabilities = await axios.get(`${GITHUB_MCP_URL}/capabilities`);
      const hasClaudeCapability = githubCapabilities.data.some(cap => cap.includes('claude'));
      
      if (!hasClaudeCapability) {
        console.log(`${colors.yellow}Claude capability not found in GitHub MCP${colors.reset}`);
        return { enabled: true, available: false, reason: 'Claude capability not found' };
      }
      
      console.log(`${colors.green}Claude integration is available${colors.reset}`);
      return { enabled: true, available: true };
    } catch (error) {
      console.error(`${colors.red}Error checking Claude capability: ${error.message}${colors.reset}`);
      return { enabled: true, available: false, reason: error.message };
    }
  } catch (error) {
    console.error(`${colors.red}Error getting Claude integration status: ${error.message}${colors.reset}`);
    return { enabled: false, error: error.message };
  }
}

/**
 * Display Claude workflow guidance
 */
function displayClaudeWorkflowGuidance(claudeWorkflowState) {
  try {
    if (claudeWorkflowState.error) {
      console.error(`${colors.red}Error in Claude workflow state: ${claudeWorkflowState.error}${colors.reset}`);
      return;
    }
    
    // Display core workflow guidance
    coreWorkflowManager.displayWorkflowGuidance(claudeWorkflowState);
    
    // Display Claude-specific guidance
    console.log(`${colors.magenta}=== Claude Integration ====${colors.reset}`);
    
    if (!claudeWorkflowState.claudeIntegration.enabled) {
      console.log(`${colors.yellow}Claude features are disabled${colors.reset}`);
      console.log(`To enable Claude features, set ENABLE_CLAUDE_FEATURES=true in your .env file`);
    } else if (!claudeWorkflowState.claudeIntegration.available) {
      console.log(`${colors.yellow}Claude integration is not available: ${claudeWorkflowState.claudeIntegration.reason}${colors.reset}`);
    } else {
      console.log(`${colors.green}Claude integration is available${colors.reset}`);
      console.log(`${colors.cyan}Claude Actions:${colors.reset}`);
      console.log(`  1. Analyze project structure`);
      console.log(`  2. Generate documentation`);
      console.log(`  3. Suggest test improvements`);
    }
    
    console.log(`${colors.magenta}==========================${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error displaying Claude workflow guidance: ${error.message}${colors.reset}`);
  }
}

/**
 * Execute Claude workflow action
 */
async function executeClaudeAction(actionIndex, claudeWorkflowState) {
  try {
    if (claudeWorkflowState.error) {
      console.error(`${colors.red}Error in Claude workflow state: ${claudeWorkflowState.error}${colors.reset}`);
      return { success: false, error: claudeWorkflowState.error };
    }
    
    if (!claudeWorkflowState.claudeIntegration.enabled) {
      console.error(`${colors.red}Claude features are disabled${colors.reset}`);
      return { success: false, error: 'Claude features are disabled' };
    }
    
    if (!claudeWorkflowState.claudeIntegration.available) {
      console.error(`${colors.red}Claude integration is not available: ${claudeWorkflowState.claudeIntegration.reason}${colors.reset}`);
      return { success: false, error: claudeWorkflowState.claudeIntegration.reason };
    }
    
    console.log(`${colors.blue}Executing Claude action: ${actionIndex}${colors.reset}`);
    
    // Execute the action based on the index
    switch (actionIndex) {
      case 1: // Analyze project structure
        return await analyzeProjectStructure();
        
      case 2: // Generate documentation
        return await generateDocumentation();
        
      case 3: // Suggest test improvements
        return await suggestTestImprovements();
        
      default:
        console.error(`${colors.red}Invalid Claude action index: ${actionIndex}${colors.reset}`);
        return { success: false, error: 'Invalid Claude action index' };
    }
  } catch (error) {
    console.error(`${colors.red}Error executing Claude action: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Analyze project structure using Claude
 */
async function analyzeProjectStructure() {
  try {
    console.log(`${colors.blue}Analyzing project structure with Claude...${colors.reset}`);
    
    // Get repository analysis
    const repoAnalysis = await projectAnalyzer.analyzeCodeRepository();
    
    if (repoAnalysis.error) {
      console.error(`${colors.red}Error analyzing repository: ${repoAnalysis.error}${colors.reset}`);
      return { success: false, error: repoAnalysis.error };
    }
    
    // Create a prompt for Claude
    const prompt = {
      task: 'analyze_project_structure',
      repository: {
        structure: repoAnalysis.structure,
        dependencies: repoAnalysis.dependencies
      }
    };
    
    // Send the prompt to Claude via GitHub MCP
    try {
      const response = await axios.post(`${GITHUB_MCP_URL}/claude/analyze`, prompt);
      
      if (response.data.error) {
        console.error(`${colors.red}Claude analysis error: ${response.data.error}${colors.reset}`);
        return { success: false, error: response.data.error };
      }
      
      // Save the analysis to a file
      const analysisDir = path.join(PROJECT_ROOT, 'analysis');
      if (!fs.existsSync(analysisDir)) {
        fs.mkdirSync(analysisDir, { recursive: true });
      }
      
      const analysisPath = path.join(analysisDir, 'project-structure.md');
      fs.writeFileSync(analysisPath, response.data.analysis);
      
      console.log(`${colors.green}Project structure analysis saved to: ${analysisPath}${colors.reset}`);
      return { success: true, analysisPath };
    } catch (error) {
      console.error(`${colors.red}Error sending prompt to Claude: ${error.message}${colors.reset}`);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error(`${colors.red}Error analyzing project structure: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Generate documentation using Claude
 */
async function generateDocumentation() {
  try {
    console.log(`${colors.blue}Generating documentation with Claude...${colors.reset}`);
    
    // Get repository analysis
    const repoAnalysis = await projectAnalyzer.analyzeCodeRepository();
    
    if (repoAnalysis.error) {
      console.error(`${colors.red}Error analyzing repository: ${repoAnalysis.error}${colors.reset}`);
      return { success: false, error: repoAnalysis.error };
    }
    
    // Create a prompt for Claude
    const prompt = {
      task: 'generate_documentation',
      repository: {
        structure: repoAnalysis.structure,
        dependencies: repoAnalysis.dependencies
      }
    };
    
    // Send the prompt to Claude via GitHub MCP
    try {
      const response = await axios.post(`${GITHUB_MCP_URL}/claude/generate`, prompt);
      
      if (response.data.error) {
        console.error(`${colors.red}Claude documentation error: ${response.data.error}${colors.reset}`);
        return { success: false, error: response.data.error };
      }
      
      // Save the documentation to a file
      const docsDir = path.join(PROJECT_ROOT, 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
      }
      
      const docsPath = path.join(docsDir, 'generated-docs.md');
      fs.writeFileSync(docsPath, response.data.documentation);
      
      console.log(`${colors.green}Documentation generated and saved to: ${docsPath}${colors.reset}`);
      return { success: true, docsPath };
    } catch (error) {
      console.error(`${colors.red}Error sending prompt to Claude: ${error.message}${colors.reset}`);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error(`${colors.red}Error generating documentation: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

/**
 * Suggest test improvements using Claude
 */
async function suggestTestImprovements() {
  try {
    console.log(`${colors.blue}Suggesting test improvements with Claude...${colors.reset}`);
    
    // Get implementation gaps
    const gapsResult = await projectAnalyzer.getImplementationGaps();
    
    if (gapsResult.error) {
      console.error(`${colors.red}Error getting implementation gaps: ${gapsResult.error}${colors.reset}`);
      return { success: false, error: gapsResult.error };
    }
    
    if (gapsResult.gaps.length === 0) {
      console.log(`${colors.green}No implementation gaps found${colors.reset}`);
      return { success: true, message: 'No implementation gaps found' };
    }
    
    // Create a prompt for Claude
    const prompt = {
      task: 'suggest_test_improvements',
      gaps: gapsResult.gaps
    };
    
    // Send the prompt to Claude via GitHub MCP
    try {
      const response = await axios.post(`${GITHUB_MCP_URL}/claude/suggest`, prompt);
      
      if (response.data.error) {
        console.error(`${colors.red}Claude suggestion error: ${response.data.error}${colors.reset}`);
        return { success: false, error: response.data.error };
      }
      
      // Save the suggestions to a file
      const suggestionsDir = path.join(PROJECT_ROOT, 'analysis');
      if (!fs.existsSync(suggestionsDir)) {
        fs.mkdirSync(suggestionsDir, { recursive: true });
      }
      
      const suggestionsPath = path.join(suggestionsDir, 'test-improvements.md');
      fs.writeFileSync(suggestionsPath, response.data.suggestions);
      
      console.log(`${colors.green}Test improvement suggestions saved to: ${suggestionsPath}${colors.reset}`);
      return { success: true, suggestionsPath };
    } catch (error) {
      console.error(`${colors.red}Error sending prompt to Claude: ${error.message}${colors.reset}`);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error(`${colors.red}Error suggesting test improvements: ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeClaudeWorkflow,
  displayClaudeWorkflowGuidance,
  executeClaudeAction,
  getClaudeIntegrationStatus,
  colors
};
