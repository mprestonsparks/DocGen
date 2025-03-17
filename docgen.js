#!/usr/bin/env node

/**
 * DocGen Command Interface
 * 
 * A unified command-line interface for the DocGen project that works across platforms.
 * This script serves as the main entry point for all developers, regardless of whether
 * they're using Claude Code or not.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Command } from 'commander';

const program = new Command();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.log(`${colors.yellow}Warning: .env file not found. Using default settings.${colors.reset}`);
  // Load from .env.example if it exists
  const exampleEnvPath = path.resolve(process.cwd(), '.env.example');
  if (fs.existsSync(exampleEnvPath)) {
    dotenv.config({ path: exampleEnvPath });
  }
}

// Check if Claude features are enabled
const enableClaudeFeatures = process.env.ENABLE_CLAUDE_FEATURES === 'true';

// Setup command line interface
program
  .name('docgen')
  .description('DocGen command-line interface')
  .version('1.0.0');

// Initialize workflow command
program
  .command('init')
  .description('Initialize the development workflow')
  .action(async () => {
    try {
      if (enableClaudeFeatures) {
        // Load Claude-specific workflow manager
        const claudeWorkflowManager = await import('./scripts/claude/claude-workflow-manager.cjs');
        const workflowState = await claudeWorkflowManager.default.initializeClaudeWorkflow();
        claudeWorkflowManager.default.displayClaudeWorkflowGuidance(workflowState);
      } else {
        // Load core workflow manager
        const workflowManager = await import('./scripts/core/workflow-manager.cjs');
        const workflowState = await workflowManager.default.initializeWorkflow();
        workflowManager.default.displayWorkflowGuidance(workflowState);
      }
    } catch (error) {
      console.error(`${colors.red}Error initializing workflow: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  });

// Check MCP servers command
program
  .command('check-servers')
  .description('Check if MCP servers are running')
  .action(async () => {
    try {
      const mcpServerManager = await import('./scripts/core/mcp-server-manager.cjs');
      await mcpServerManager.default.checkMcpServers();
    } catch (error) {
      console.error(`${colors.red}Error checking MCP servers: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  });

// Start MCP servers command
program
  .command('start-servers')
  .description('Start MCP servers')
  .action(async () => {
    try {
      const mcpServerManager = await import('./scripts/core/mcp-server-manager.cjs');
      await mcpServerManager.default.startMcpServers();
    } catch (error) {
      console.error(`${colors.red}Error starting MCP servers: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  });

// Stop MCP servers command
program
  .command('stop-servers')
  .description('Stop MCP servers')
  .action(async () => {
    try {
      const mcpServerManager = await import('./scripts/core/mcp-server-manager.cjs');
      await mcpServerManager.default.stopMcpServers();
    } catch (error) {
      console.error(`${colors.red}Error stopping MCP servers: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  });

// Check test status command
program
  .command('check-tests')
  .description('Check test status')
  .action(async () => {
    try {
      const projectAnalyzer = await import('./scripts/core/project-analyzer.cjs');
      await projectAnalyzer.default.checkTestStatus();
    } catch (error) {
      console.error(`${colors.red}Error checking test status: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  });

// Analyze project command
program
  .command('analyze')
  .description('Analyze project state')
  .action(async () => {
    try {
      const projectAnalyzer = await import('./scripts/core/project-analyzer.cjs');
      await projectAnalyzer.default.analyzeCodeRepository();
      await projectAnalyzer.default.getImplementationStatus();
      await projectAnalyzer.default.getImplementationGaps();
    } catch (error) {
      console.error(`${colors.red}Error analyzing project: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  });

// Claude-specific commands (only available when Claude features are enabled)
if (enableClaudeFeatures) {
  // Claude analyze command
  program
    .command('claude-analyze')
    .description('Analyze project structure with Claude')
    .action(async () => {
      try {
        const claudeWorkflowManager = await import('./scripts/claude/claude-workflow-manager.cjs');
        const workflowState = await claudeWorkflowManager.default.initializeClaudeWorkflow();
        await claudeWorkflowManager.default.executeClaudeAction(1, workflowState);
      } catch (error) {
        console.error(`${colors.red}Error analyzing with Claude: ${error.message}${colors.reset}`);
        process.exit(1);
      }
    });

  // Claude generate docs command
  program
    .command('claude-docs')
    .description('Generate documentation with Claude')
    .action(async () => {
      try {
        const claudeWorkflowManager = await import('./scripts/claude/claude-workflow-manager.cjs');
        const workflowState = await claudeWorkflowManager.default.initializeClaudeWorkflow();
        await claudeWorkflowManager.default.executeClaudeAction(2, workflowState);
      } catch (error) {
        console.error(`${colors.red}Error generating docs with Claude: ${error.message}${colors.reset}`);
        process.exit(1);
      }
    });

  // Claude suggest tests command
  program
    .command('claude-tests')
    .description('Suggest test improvements with Claude')
    .action(async () => {
      try {
        const claudeWorkflowManager = await import('./scripts/claude/claude-workflow-manager.cjs');
        const workflowState = await claudeWorkflowManager.default.initializeClaudeWorkflow();
        await claudeWorkflowManager.default.executeClaudeAction(3, workflowState);
      } catch (error) {
        console.error(`${colors.red}Error suggesting tests with Claude: ${error.message}${colors.reset}`);
        process.exit(1);
      }
    });
} else {
  // Add placeholder commands that inform the user that Claude features are disabled
  const claudeCommands = ['claude-analyze', 'claude-docs', 'claude-tests'];
  
  claudeCommands.forEach(cmd => {
    program
      .command(cmd)
      .description('This command requires Claude features to be enabled')
      .action(() => {
        console.log(`${colors.yellow}Claude features are disabled.${colors.reset}`);
        console.log(`To enable Claude features, set ENABLE_CLAUDE_FEATURES=true in your .env file`);
      });
  });
}

// Add a command to toggle Claude features
program
  .command('toggle-claude')
  .description('Toggle Claude features on/off')
  .action(() => {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      let envContent = '';
      
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }
      
      const currentSetting = enableClaudeFeatures;
      const newSetting = !currentSetting;
      
      if (envContent.includes('ENABLE_CLAUDE_FEATURES=')) {
        // Update existing setting
        envContent = envContent.replace(
          /ENABLE_CLAUDE_FEATURES=(true|false)/,
          `ENABLE_CLAUDE_FEATURES=${newSetting}`
        );
      } else {
        // Add new setting
        envContent += `\nENABLE_CLAUDE_FEATURES=${newSetting}\n`;
      }
      
      fs.writeFileSync(envPath, envContent);
      
      console.log(`${colors.green}Claude features ${newSetting ? 'enabled' : 'disabled'}.${colors.reset}`);
      console.log(`Restart your terminal or run 'node docgen.js' to apply the changes.`);
    } catch (error) {
      console.error(`${colors.red}Error toggling Claude features: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Display help information')
  .action(() => {
    program.outputHelp();
  });

// Parse command line arguments
program.parse(process.argv);

// If no command is provided, display help
if (!process.argv.slice(2).length) {
  console.log(`${colors.magenta}=== DocGen Command Interface ====${colors.reset}`);
  console.log(`${colors.cyan}Claude features: ${enableClaudeFeatures ? colors.green + 'Enabled' : colors.yellow + 'Disabled'}${colors.reset}`);
  console.log('');
  program.outputHelp();
}
