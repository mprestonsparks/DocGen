#!/usr/bin/env node
/**
 * GitHub Issues Workflow for Claude Code
 * 
 * This script provides a streamlined interface for Claude Code to interact with GitHub issues
 * as part of the implementation monitoring workflow.
 */

import axios from 'axios';
import chalk from 'chalk';
import { program } from 'commander';
import { resolve } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// GitHub Issues MCP server URL
const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL || 'http://localhost:7867';

// Coverage Analysis MCP server URL
const COVERAGE_MCP_URL = process.env.COVERAGE_MCP_URL || 'http://localhost:7868';

// Initialize CLI
program
  .name('github-issues-workflow')
  .description('GitHub Issues Workflow CLI for Claude Code')
  .version('0.1.0');

/**
 * Help for Claude integration
 */
program
  .command('help-claude')
  .description('Show help for Claude Code integration')
  .action(() => {
    console.log(chalk.bold.blue('GitHub Issues Workflow for Claude Code'));
    console.log('\nYou can use the following commands in your Claude Code sessions:');
    
    console.log(chalk.bold('\nQuerying Implementation Status:'));
    console.log('```');
    console.log('@claude Let\'s check our project implementation status');
    console.log('@github status');
    console.log('```');
    
    console.log(chalk.bold('\nGetting Issues:'));
    console.log('```');
    console.log('@claude Show me our open implementation gap issues');
    console.log('@github issues --implementation-gaps');
    console.log('```');
    
    console.log(chalk.bold('\nFinding Coverage Gaps:'));
    console.log('```');
    console.log('@claude Find files with low test coverage');
    console.log('@coverage getImplementationGaps --threshold 70');
    console.log('```');
    
    console.log(chalk.bold('\nCorrelating Issues with Coverage:'));
    console.log('```');
    console.log('@claude Show me the correlation between issues and test coverage');
    console.log('@coverage correlateIssuesWithCoverage');
    console.log('```');
    
    console.log(chalk.bold('\nCreating Issues:'));
    console.log('```');
    console.log('@claude Create an issue for missing implementation in the extraction module');
    console.log('@github create --title "Implement PDF extraction support" --body "We need to add support for extracting text and structure from PDF papers." --implementation-gap');
    console.log('```');
    
    console.log(chalk.bold('\nExample Workflow:'));
    console.log('```');
    console.log('1. @github status                        # Check overall implementation status');
    console.log('2. @coverage getImplementationGaps       # Find files needing implementation');
    console.log('3. <Make code improvements>              # Work on implementation gaps');
    console.log('4. @github update --number 123 --state closed  # Close fixed issues');
    console.log('5. @coverage generateCoverageReport      # Generate updated coverage report');
    console.log('```');
  });

// Parse command line arguments and execute
program.parse(process.argv);