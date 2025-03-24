#!/usr/bin/env node
/**
 * Enhanced Todo Validator Script
 * 
 * This script provides semantic code analysis to identify implementation gaps
 * that should be marked with TODOs but aren't. It extends the basic TODO
 * validator with more advanced analysis techniques.
 * 
 * Usage:
 *   npm run enhanced-validate-todos -- [options]
 * 
 * Options:
 *   --project-path <path>           Path to the project to validate (default: current directory)
 *   --depth <level>                 Analysis depth (basic, standard, deep) (default: standard)
 *   --report-path <path>            Path to save the validation report (default: docs/reports/enhanced-todo-report.md)
 *   --include-dot-files             Include dot files in analysis
 *   --include-node-modules          Include node_modules in analysis
 *   --semantic-analysis <boolean>   Enable/disable semantic code analysis (default: true)
 *   --comment-analysis <boolean>    Enable/disable comment-code analysis (default: false)
 *   --test-quality <boolean>        Enable/disable test quality analysis (default: false)
 */

import * as path from 'path';
import * as fs from 'fs';
import { validateTodosEnhanced, generateEnhancedTodoReport } from '../src/utils/enhanced-todo-validator';
import { getLogger } from '../src/utils/logger';
import { parseArgs } from 'node:util';

const logger = getLogger('enhanced-validate-todos');

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
        default: 'docs/reports/enhanced-todo-report.md',
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
      'semantic-analysis': {
        type: 'boolean',
        default: true
      },
      'comment-analysis': {
        type: 'boolean',
        default: false
      },
      'test-quality': {
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
    semanticAnalysis: values['semantic-analysis'] as boolean,
    commentAnalysis: values['comment-analysis'] as boolean,
    testQuality: values['test-quality'] as boolean
  };
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Enhanced Todo Validator Script

This script provides semantic code analysis to identify implementation gaps
that should be marked with TODOs but aren't. It extends the basic TODO
validator with more advanced analysis techniques.

Usage:
  npm run enhanced-validate-todos -- [options]

Options:
  --project-path, -p <path>     Path to the project to validate (default: current directory)
  --depth, -d <level>           Analysis depth (basic, standard, deep) (default: standard)
  --report-path, -r <path>      Path to save the validation report (default: docs/reports/enhanced-todo-report.md)
  --include-dot-files           Include dot files in analysis
  --include-node-modules        Include node_modules in analysis
  --semantic-analysis <boolean> Enable/disable semantic code analysis (default: true)
  --comment-analysis <boolean>  Enable/disable comment-code analysis (default: false)
  --test-quality <boolean>      Enable/disable test quality analysis (default: false)
  --help, -h                    Display this help message
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
 * Main function to run enhanced todo validation
 */
async function main() {
  try {
    // Parse command line arguments
    const args = parseArguments();
    
    logger.info(`Starting enhanced TODO validation with depth: ${args.depth}`);
    logger.info(`Project path: ${args.projectPath}`);
    
    // Ensure the report directory exists
    ensureReportDirectory(args.reportPath);
    
    // Validate TODOs with enhanced options
    const result = await validateTodosEnhanced(args.projectPath, {
      depth: args.depth,
      reportMissing: true,
      suggestTodos: true,
      includeDotFiles: args.includeDotFiles,
      includeNodeModules: args.includeNodeModules,
      analyzeSemantics: args.semanticAnalysis,
      analyzeComments: args.commentAnalysis,
      analyzeTestQuality: args.testQuality
    });
    
    // Log validation results
    logger.info(`Found ${result.existingTodos.length} existing TODOs`);
    logger.info(`Identified ${result.missingTodos.length} missing TODOs`);
    
    // Count semantic issues
    const semanticIssuesCount = 
      result.semanticIssues.nullReturns.length +
      result.semanticIssues.emptyBlocks.length +
      result.semanticIssues.incompleteErrorHandling.length +
      result.semanticIssues.incompleteSwitchStatements.length +
      result.semanticIssues.suspiciousImplementations.length;
    
    logger.info(`Identified ${semanticIssuesCount} semantic code issues`);
    
    if (result.missingTodos.length > 0) {
      logger.warn(`Missing TODOs by severity:`);
      const highSeverity = result.missingTodos.filter(todo => todo.severity === 'high').length;
      const mediumSeverity = result.missingTodos.filter(todo => todo.severity === 'medium').length;
      const lowSeverity = result.missingTodos.filter(todo => todo.severity === 'low').length;
      
      logger.warn(`- High: ${highSeverity}`);
      logger.warn(`- Medium: ${mediumSeverity}`);
      logger.warn(`- Low: ${lowSeverity}`);
    }
    
    // Generate enhanced report
    await generateEnhancedTodoReport(result, args.reportPath);
    logger.info(`Enhanced TODO validation report generated at: ${args.reportPath}`);
    
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