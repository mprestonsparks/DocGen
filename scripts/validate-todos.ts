#!/usr/bin/env node
/**
 * Todo Validator Script
 * 
 * This script validates a project's todo items, identifying:
 * 1. Existing TODO comments in the codebase
 * 2. Missing TODO items that should be present based on code analysis
 * 3. Generating suggestions for missing TODOs
 * 
 * Usage:
 *   npm run validate-todos -- [options]
 * 
 * Options:
 *   --project-path <path>       Path to the project to validate (default: current directory)
 *   --depth <level>             Analysis depth (basic, standard, deep) (default: standard)
 *   --report-path <path>        Path to save the validation report (default: docs/reports/todo-report.md)
 *   --include-dot-files         Include dot files in analysis
 *   --include-node-modules      Include node_modules in analysis
 *   --suggest-todos             Generate suggested content for missing TODOs
 *   --analyze-semantics         Enable semantic code analysis (default: false)
 *   --enhanced                  Generate enhanced report with semantic analysis details (default: false)
 */

import * as path from 'path';
import * as fs from 'fs';
import { validateTodos, generateTodoReport } from '../src/utils/todo-validator';
import { getLogger } from '../src/utils/logger';
import { parseArgs } from 'node:util';

const logger = getLogger('validate-todos');

/**
 * Parse command line arguments
 */
function parseArguments() {
  const {
    values
  } = parseArgs({
    options: {
      'project-path': {
        type: 'string',
        default: process.cwd(),
        short: 'p'
      },
      'depth': {
        type: 'string',
        default: 'standard',
        short: 'd'
      },
      'report-path': {
        type: 'string',
        default: 'docs/reports/todo-report.md',
        short: 'r'
      },
      'include-dot-files': {
        type: 'boolean',
        default: false
      },
      'include-node-modules': {
        type: 'boolean',
        default: false
      },
      'suggest-todos': {
        type: 'boolean',
        default: true
      },
      'analyze-semantics': {
        type: 'boolean',
        default: false
      },
      'enhanced': {
        type: 'boolean',
        default: false
      },
      'help': {
        type: 'boolean',
        default: false,
        short: 'h'
      }
    }
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  // Validate depth
  if (!['basic', 'standard', 'deep'].includes(values.depth as string)) {
    logger.error(`Invalid depth: ${values.depth}. Must be one of: basic, standard, deep`);
    process.exit(1);
  }

  return {
    projectPath: values['project-path'] as string,
    depth: values.depth as 'basic' | 'standard' | 'deep',
    reportPath: values['report-path'] as string,
    includeDotFiles: values['include-dot-files'] as boolean,
    includeNodeModules: values['include-node-modules'] as boolean,
    suggestTodos: values['suggest-todos'] as boolean,
    analyzeSemantics: values['analyze-semantics'] as boolean,
    enhanced: values['enhanced'] as boolean
  };
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Todo Validator Script

This script validates a project's todo items, identifying:
1. Existing TODO comments in the codebase
2. Missing TODO items that should be present based on code analysis
3. Generating suggestions for missing TODOs

Usage:
  npm run validate-todos -- [options]

Options:
  --project-path, -p <path>   Path to the project to validate (default: current directory)
  --depth, -d <level>         Analysis depth (basic, standard, deep) (default: standard)
  --report-path, -r <path>    Path to save the validation report (default: docs/reports/todo-report.md)
  --include-dot-files         Include dot files in analysis
  --include-node-modules      Include node_modules in analysis
  --suggest-todos             Generate suggested content for missing TODOs
  --analyze-semantics         Enable semantic code analysis
  --enhanced                  Generate enhanced report with semantic analysis details
  --help, -h                  Display this help message
`);
}

/**
 * Ensure the report directory exists
 */
function ensureReportDirectory(reportPath: string) {
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
    logger.info(`Created report directory: ${reportDir}`);
  }
}

/**
 * Main function to validate todos
 */
async function main() {
  try {
    // Parse command line arguments
    const args = parseArguments();
    
    logger.info(`Starting TODO validation with depth: ${args.depth}`);
    logger.info(`Project path: ${args.projectPath}`);
    
    // Ensure the report directory exists
    ensureReportDirectory(args.reportPath);
    
    // Validate TODOs with optional semantic analysis
    const result = await validateTodos(args.projectPath, {
      depth: args.depth,
      reportMissing: true,
      suggestTodos: args.suggestTodos,
      includeDotFiles: args.includeDotFiles,
      includeNodeModules: args.includeNodeModules,
      maxFileSize: 10485760, // 10MB
      analyzeSemantics: args.analyzeSemantics,
      semanticAnalysisDepth: args.depth
    });
    
    // Log validation results
    logger.info(`Found ${result.existingTodos.length} existing TODOs`);
    logger.info(`Identified ${result.missingTodos.length} missing TODOs`);
    
    if (result.missingTodos.length > 0) {
      logger.warn(`Missing TODOs by severity:`);
      const highSeverity = result.missingTodos.filter(todo => todo.severity === 'high').length;
      const mediumSeverity = result.missingTodos.filter(todo => todo.severity === 'medium').length;
      const lowSeverity = result.missingTodos.filter(todo => todo.severity === 'low').length;
      
      logger.warn(`- High: ${highSeverity}`);
      logger.warn(`- Medium: ${mediumSeverity}`);
      logger.warn(`- Low: ${lowSeverity}`);
    }
    
    // Generate report, using enhanced format if requested
    await generateTodoReport(args.projectPath, result, args.reportPath, args.enhanced);
    logger.info(`TODO validation report generated at: ${args.reportPath}`);
    
    if (args.enhanced) {
      logger.info(`Enhanced report with semantic analysis details was generated`);
    }
    
    // Exit with error code if high severity missing TODOs
    const highSeverityCount = result.missingTodos.filter(todo => todo.severity === 'high').length;
    if (highSeverityCount > 0) {
      logger.error(`Found ${highSeverityCount} high severity missing TODOs`);
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error(`Error validating TODOs: ${error}`);
    process.exit(1);
  }
}

// Run the main function
main();