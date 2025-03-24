#!/usr/bin/env node

/**
 * DocGen Command Interface
 * 
 * A unified command-line interface for the DocGen project that works across platforms.
 * This script serves as the main entry point for all developers, regardless of whether
 * they're using Claude Code or not.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { Command } from 'commander';

// Type definitions for imported modules
interface WorkflowManager {
  initializeWorkflow: () => Promise<any>;
  displayWorkflowGuidance: (state: any) => void;
}

interface ClaudeWorkflowManager extends WorkflowManager {
  initializeClaudeWorkflow: () => Promise<any>;
  displayClaudeWorkflowGuidance: (state: any) => void;
  executeClaudeAction: (actionId: number, state: any) => Promise<void>;
}

interface McpServerManager {
  checkMcpServers: () => Promise<void>;
  startMcpServers: () => Promise<void>;
  stopMcpServers: () => Promise<void>;
}

interface ProjectAnalyzer {
  checkTestStatus: () => Promise<void>;
  analyzeCodeRepository: () => Promise<void>;
  getImplementationStatus: () => Promise<void>;
  getImplementationGaps: () => Promise<void>;
}

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
        const claudeWorkflowManagerModule = await import('./scripts/claude/claude-workflow-manager.cjs');
        const claudeWorkflowManager = claudeWorkflowManagerModule.default as ClaudeWorkflowManager;
        const workflowState = await claudeWorkflowManager.initializeClaudeWorkflow();
        claudeWorkflowManager.displayClaudeWorkflowGuidance(workflowState);
      } else {
        // Load core workflow manager
        const workflowManagerModule = await import('./scripts/core/workflow-manager.cjs');
        const workflowManager = workflowManagerModule.default as WorkflowManager;
        const workflowState = await workflowManager.initializeWorkflow();
        workflowManager.displayWorkflowGuidance(workflowState);
      }
    } catch (error) {
      console.error(`${colors.red}Error initializing workflow: ${(error as Error).message}${colors.reset}`);
      process.exit(1);
    }
  });

// Check MCP servers command
program
  .command('check-servers')
  .description('Check if MCP servers are running')
  .action(async () => {
    try {
      const mcpServerManagerModule = await import('./scripts/core/mcp-server-manager.cjs');
      const mcpServerManager = mcpServerManagerModule.default as McpServerManager;
      await mcpServerManager.checkMcpServers();
    } catch (error) {
      console.error(`${colors.red}Error checking MCP servers: ${(error as Error).message}${colors.reset}`);
      process.exit(1);
    }
  });

// Start MCP servers command
program
  .command('start-servers')
  .description('Start MCP servers')
  .action(async () => {
    try {
      const mcpServerManagerModule = await import('./scripts/core/mcp-server-manager.cjs');
      const mcpServerManager = mcpServerManagerModule.default as McpServerManager;
      await mcpServerManager.startMcpServers();
    } catch (error) {
      console.error(`${colors.red}Error starting MCP servers: ${(error as Error).message}${colors.reset}`);
      process.exit(1);
    }
  });

// Stop MCP servers command
program
  .command('stop-servers')
  .description('Stop MCP servers')
  .action(async () => {
    try {
      const mcpServerManagerModule = await import('./scripts/core/mcp-server-manager.cjs');
      const mcpServerManager = mcpServerManagerModule.default as McpServerManager;
      await mcpServerManager.stopMcpServers();
    } catch (error) {
      console.error(`${colors.red}Error stopping MCP servers: ${(error as Error).message}${colors.reset}`);
      process.exit(1);
    }
  });

// Check test status command
program
  .command('check-tests')
  .description('Check test status')
  .action(async () => {
    try {
      const projectAnalyzerModule = await import('./scripts/core/project-analyzer.cjs');
      const projectAnalyzer = projectAnalyzerModule.default as ProjectAnalyzer;
      await projectAnalyzer.checkTestStatus();
    } catch (error) {
      console.error(`${colors.red}Error checking test status: ${(error as Error).message}${colors.reset}`);
      process.exit(1);
    }
  });

// Analyze project command
program
  .command('analyze')
  .description('Analyze project state')
  .action(async () => {
    try {
      const projectAnalyzerModule = await import('./scripts/core/project-analyzer.cjs');
      const projectAnalyzer = projectAnalyzerModule.default as ProjectAnalyzer;
      await projectAnalyzer.analyzeCodeRepository();
      await projectAnalyzer.getImplementationStatus();
      await projectAnalyzer.getImplementationGaps();
    } catch (error) {
      console.error(`${colors.red}Error analyzing project: ${(error as Error).message}${colors.reset}`);
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
        const claudeWorkflowManagerModule = await import('./scripts/claude/claude-workflow-manager.cjs');
        const claudeWorkflowManager = claudeWorkflowManagerModule.default as ClaudeWorkflowManager;
        const workflowState = await claudeWorkflowManager.initializeClaudeWorkflow();
        await claudeWorkflowManager.executeClaudeAction(1, workflowState);
      } catch (error) {
        console.error(`${colors.red}Error analyzing with Claude: ${(error as Error).message}${colors.reset}`);
        process.exit(1);
      }
    });

  // Claude generate docs command
  program
    .command('claude-docs')
    .description('Generate documentation with Claude')
    .action(async () => {
      try {
        const claudeWorkflowManagerModule = await import('./scripts/claude/claude-workflow-manager.cjs');
        const claudeWorkflowManager = claudeWorkflowManagerModule.default as ClaudeWorkflowManager;
        const workflowState = await claudeWorkflowManager.initializeClaudeWorkflow();
        await claudeWorkflowManager.executeClaudeAction(2, workflowState);
      } catch (error) {
        console.error(`${colors.red}Error generating docs with Claude: ${(error as Error).message}${colors.reset}`);
        process.exit(1);
      }
    });

  // Claude suggest tests command
  program
    .command('claude-tests')
    .description('Suggest test improvements with Claude')
    .action(async () => {
      try {
        const claudeWorkflowManagerModule = await import('./scripts/claude/claude-workflow-manager.cjs');
        const claudeWorkflowManager = claudeWorkflowManagerModule.default as ClaudeWorkflowManager;
        const workflowState = await claudeWorkflowManager.initializeClaudeWorkflow();
        await claudeWorkflowManager.executeClaudeAction(3, workflowState);
      } catch (error) {
        console.error(`${colors.red}Error suggesting tests with Claude: ${(error as Error).message}${colors.reset}`);
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
      console.error(`${colors.red}Error toggling Claude features: ${(error as Error).message}${colors.reset}`);
      process.exit(1);
    }
  });

// Add a command to configure Windsurf IDE integration
program
  .command('configure-windsurf')
  .description('Configure Windsurf IDE integration for Windows')
  .action(async () => {
    try {
      // Import the configure-windsurf module
      const configureWindsurfPath = path.join(__dirname, 'src', 'ai-provider', 'configure-windsurf.js');
      
      if (fs.existsSync(configureWindsurfPath)) {
        // Import the module using dynamic import
        const configureWindsurfModule = await import(configureWindsurfPath);
        await configureWindsurfModule.default();
      } else {
        console.error(`${colors.red}Error: Windsurf configuration script not found at ${configureWindsurfPath}${colors.reset}`);
        console.log('Run npm install to ensure all dependencies are properly installed');
        process.exit(1);
      }
    } catch (error) {
      console.error(`${colors.red}Error configuring Windsurf: ${(error as Error).message}${colors.reset}`);
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
  
  // Detect platform and show available AI providers
  const isWindows = os.platform() === 'win32';
  console.log(`${colors.cyan}Platform: ${isWindows ? 'Windows' : os.platform()}${colors.reset}`);
  
  try {
    // Try to import the AI provider factory
    const aiProviderFactory = await import('./src/ai-provider/factory.js');
    const availableProviders = await aiProviderFactory.getAvailableProviders();
    
    if (availableProviders.length > 0) {
      console.log(`${colors.cyan}Available AI providers: ${availableProviders.join(', ')}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}No AI providers detected${colors.reset}`);
      
      // Suggest Windsurf for Windows users
      if (isWindows) {
        console.log(`${colors.yellow}For Windows users: Install Windsurf IDE and run 'npm run docgen:configure-windsurf'${colors.reset}`);
      }
    }
  } catch (error) {
    // Silently fail if AI provider factory can't be loaded
  }
  
  console.log('');
  program.outputHelp();
}