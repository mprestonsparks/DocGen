#!/usr/bin/env ts-node
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
 * Get implementation status
 */
program
  .command('status')
  .description('Get implementation status overview')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      const response = await axios.post(`${GITHUB_MCP_URL}/getImplementationStatus`);
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      const { implementationStatus } = response.data;
      
      console.log(chalk.bold.blue('Implementation Status Overview:'));
      console.log(chalk.bold(`Total implementation gap issues: ${implementationStatus.totalIssues}`));
      console.log(`  ${chalk.green(`✓ Closed: ${implementationStatus.closedIssues}`)}`);
      console.log(`  ${chalk.yellow(`◌ Open: ${implementationStatus.openIssues}`)}`);
      
      console.log(chalk.bold.blue('\nImplementation by Module:'));
      
      Object.keys(implementationStatus.byModule).forEach(module => {
        const moduleStats = implementationStatus.byModule[module];
        const completionPercentage = Math.round((moduleStats.closedIssues / moduleStats.issues) * 100);
        
        console.log(chalk.bold(`${module}: ${completionPercentage}% complete`));
        console.log(`  Issues: ${moduleStats.issues} (${moduleStats.openIssues} open, ${moduleStats.closedIssues} closed)`);
      });
      
      // Show TODO information if available
      if (implementationStatus.existingTodos !== undefined) {
        console.log(chalk.bold.blue('\nTODO Analysis:'));
        console.log(`  Existing TODOs: ${implementationStatus.existingTodos}`);
        console.log(`  Missing TODOs: ${implementationStatus.missingTodos || 0}`);
      }
      
      // Show coverage information if available
      console.log(chalk.bold.blue('\nCoverage Status:'));
      console.log(`  Coverage Issues: ${implementationStatus.coverageIssues.total} (${implementationStatus.coverageIssues.open} open, ${implementationStatus.coverageIssues.closed} closed)`);
      console.log(`  Monitoring Issues: ${implementationStatus.monitoringIssues.total} (${implementationStatus.monitoringIssues.open} open, ${implementationStatus.monitoringIssues.closed} closed)`);
      
    } catch (error) {
      console.error(chalk.red('Error fetching implementation status:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Get issues
 */
program
  .command('issues')
  .description('Get list of issues')
  .option('-s, --state <state>', 'Issue state (open, closed, all)', 'open')
  .option('-l, --labels <labels>', 'Comma-separated list of label names')
  .option('-i, --implementation-gaps', 'Show only implementation gap issues')
  .option('-c, --coverage', 'Show only coverage improvement issues')
  .option('-m, --monitoring', 'Show only monitoring system issues')
  .option('-j, --json', 'Output as JSON')
  .option('-n, --limit <number>', 'Maximum number of issues to return', '10')
  .action(async (options) => {
    try {
      // Determine labels based on options
      let labels = options.labels;
      if (options.implementationGaps) {
        labels = 'implementation-gap';
      } else if (options.coverage) {
        labels = 'coverage-improvement';
      } else if (options.monitoring) {
        labels = 'monitoring-system';
      }
      
      const response = await axios.post(`${GITHUB_MCP_URL}/getIssues`, {
        state: options.state,
        labels,
        limit: parseInt(options.limit)
      });
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      const { issues } = response.data;
      
      console.log(chalk.bold.blue(`GitHub Issues (${issues.length}):`));
      
      issues.forEach(issue => {
        const title = `#${issue.number}: ${issue.title}`;
        const labels = issue.labels.map(label => chalk.cyan(`[${label}]`)).join(' ');
        
        console.log(chalk.bold(title));
        console.log(`  State: ${issue.state === 'open' ? chalk.green('open') : chalk.red('closed')}`);
        console.log(`  Labels: ${labels}`);
        console.log(`  URL: ${issue.url}`);
        console.log(`  Created: ${new Date(issue.created_at).toLocaleDateString()}`);
        console.log(`  Updated: ${new Date(issue.updated_at).toLocaleDateString()}`);
        console.log();
      });
      
    } catch (error) {
      console.error(chalk.red('Error fetching issues:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Get implementation gaps from coverage
 */
program
  .command('gaps')
  .description('Identify implementation gaps from coverage data')
  .option('-t, --threshold <number>', 'Coverage threshold percentage', '80')
  .option('-j, --json', 'Output as JSON')
  .option('-c, --create-issues', 'Create GitHub issues for gaps')
  .action(async (options) => {
    try {
      const response = await axios.post(`${COVERAGE_MCP_URL}/getImplementationGaps`, {
        threshold: parseInt(options.threshold)
      });
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      const { implementationGaps, summary } = response.data;
      
      console.log(chalk.bold.blue(`Implementation Gaps (Coverage < ${options.threshold}%):`));
      console.log(chalk.bold(`Found ${implementationGaps.length} files with gaps (${summary.gapPercentage}% of total files)`));
      
      implementationGaps.forEach(gap => {
        console.log(chalk.bold(`${gap.file}:`));
        console.log(`  Statements: ${gap.metrics.statements.percentage}%`);
        console.log(`  Branches: ${gap.metrics.branches.percentage}%`);
        console.log(`  Functions: ${gap.metrics.functions.percentage}%`);
        console.log(`  Lines: ${gap.metrics.lines.percentage}%`);
        console.log(`  Gap Score: ${gap.gapScore.toFixed(2)}`);
        
        if (gap.uncoveredLines.length > 0) {
          console.log(`  Uncovered Lines: ${gap.uncoveredLines.slice(0, 10).join(', ')}${gap.uncoveredLines.length > 10 ? '...' : ''}`);
        }
        
        console.log();
      });
      
      // Create issues if requested
      if (options.createIssues) {
        console.log(chalk.bold.yellow('Creating GitHub issues for implementation gaps...'));
        
        for (const gap of implementationGaps.slice(0, 5)) { // Limit to top 5 to avoid creating too many issues
          try {
            const issueResponse = await axios.post(`${GITHUB_MCP_URL}/createIssue`, {
              title: `Implementation Gap: ${gap.file}`,
              body: `# Implementation Gap Detected

This issue was automatically created by the implementation monitoring system.

## File Details
- **File**: "${gap.file}"
- **Module**: "${gap.file.split('/').slice(0, -1).join('/')}"

## Coverage Metrics
- Statements: ${gap.metrics.statements.percentage}% (${gap.metrics.statements.covered}/${gap.metrics.statements.total})
- Branches: ${gap.metrics.branches.percentage}% (${gap.metrics.branches.covered}/${gap.metrics.branches.total})
- Functions: ${gap.metrics.functions.percentage}% (${gap.metrics.functions.covered}/${gap.metrics.functions.total})
- Lines: ${gap.metrics.lines.percentage}% (${gap.metrics.lines.covered}/${gap.metrics.lines.total})

## Gap Details
- Gap Score: ${gap.gapScore.toFixed(2)}
- Uncovered Lines: ${gap.uncoveredLines.slice(0, 20).join(', ')}${gap.uncoveredLines.length > 20 ? '...' : ''}

## Action Required
1. Implement missing functionality
2. Write tests to cover the uncovered code
3. Run coverage analysis to verify improvement
              `,
              labels: ['implementation-gap', 'coverage-improvement']
            });
            
            console.log(chalk.green(`Created issue #${issueResponse.data.issue.number} for ${gap.file}`));
          } catch (error) {
            console.error(chalk.red(`Error creating issue for ${gap.file}:`));
            console.error(error.response?.data || error.message);
          }
        }
      }
      
    } catch (error) {
      console.error(chalk.red('Error fetching implementation gaps:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Correlate issues with coverage
 */
program
  .command('correlate')
  .description('Correlate GitHub issues with coverage metrics')
  .option('-l, --label <label>', 'Label to filter GitHub issues', 'implementation-gap')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      const response = await axios.post(`${COVERAGE_MCP_URL}/correlateIssuesWithCoverage`, {
        issueLabel: options.label
      });
      
      if (options.json) {
        console.log(JSON.stringify(response.data, null, 2));
        return;
      }
      
      const { correlations, overallStats } = response.data;
      
      console.log(chalk.bold.blue(`Issue-Coverage Correlation for '${options.label}' issues:`));
      console.log(chalk.bold(`Total Issues: ${overallStats.totalIssues} (${overallStats.openIssues} open, ${overallStats.closedIssues} closed)`));
      console.log(chalk.bold(`Issues with Coverage Data: ${overallStats.issuesWithCoverage}`));
      
      if (overallStats.issuesWithCoverage > 0) {
        console.log(chalk.bold.blue('\nAverage Coverage for Issues:'));
        console.log(`  Statements: ${overallStats.averageCoverage.statements}%`);
        console.log(`  Branches: ${overallStats.averageCoverage.branches}%`);
        console.log(`  Functions: ${overallStats.averageCoverage.functions}%`);
        console.log(`  Lines: ${overallStats.averageCoverage.lines}%`);
      }
      
      console.log(chalk.bold.blue('\nIssue Details:'));
      
      correlations.forEach(corr => {
        console.log(chalk.bold(`#${corr.issue.number}: ${corr.issue.title}`));
        console.log(`  State: ${corr.issue.state === 'open' ? chalk.green('open') : chalk.red('closed')}`);
        console.log(`  Implementation Status: ${corr.implementationStatus === 'Completed' ? chalk.green('Completed') : chalk.yellow('In Progress')}`);
        console.log(`  URL: ${corr.issue.url}`);
        
        if (corr.relatedFiles.length > 0) {
          console.log(`  Related Files: ${corr.relatedFiles.length}`);
          console.log(chalk.bold(`  Average Coverage:`));
          console.log(`    Statements: ${corr.averageCoverage.statements}%`);
          console.log(`    Branches: ${corr.averageCoverage.branches}%`);
          console.log(`    Functions: ${corr.averageCoverage.functions}%`);
          console.log(`    Lines: ${corr.averageCoverage.lines}%`);
        } else {
          console.log(`  No coverage data available for related files`);
        }
        
        console.log();
      });
      
    } catch (error) {
      console.error(chalk.red('Error correlating issues with coverage:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Create new issue
 */
program
  .command('create')
  .description('Create a new GitHub issue')
  .requiredOption('-t, --title <title>', 'Issue title')
  .requiredOption('-b, --body <body>', 'Issue body')
  .option('-l, --labels <labels>', 'Comma-separated list of label names')
  .option('-a, --assignees <assignees>', 'Comma-separated list of assignee usernames')
  .option('-i, --implementation-gap', 'Add implementation-gap label')
  .option('-c, --coverage', 'Add coverage-improvement label')
  .option('-m, --monitoring', 'Add monitoring-system label')
  .action(async (options) => {
    try {
      // Parse labels
      let labels = options.labels ? options.labels.split(',') : [];
      
      // Add special labels based on options
      if (options.implementationGap) {
        labels.push('implementation-gap');
      }
      if (options.coverage) {
        labels.push('coverage-improvement');
      }
      if (options.monitoring) {
        labels.push('monitoring-system');
      }
      
      // Parse assignees
      const assignees = options.assignees ? options.assignees.split(',') : [];
      
      const response = await axios.post(`${GITHUB_MCP_URL}/createIssue`, {
        title: options.title,
        body: options.body,
        labels,
        assignees
      });
      
      console.log(chalk.green(`Issue #${response.data.issue.number} created successfully: ${response.data.issue.url}`));
      
    } catch (error) {
      console.error(chalk.red('Error creating issue:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Update an issue
 */
program
  .command('update')
  .description('Update an existing GitHub issue')
  .requiredOption('-n, --number <number>', 'Issue number')
  .option('-t, --title <title>', 'New issue title')
  .option('-b, --body <body>', 'New issue body')
  .option('-s, --state <state>', 'New issue state (open, closed)')
  .option('-l, --labels <labels>', 'Comma-separated list of label names')
  .option('-a, --assignees <assignees>', 'Comma-separated list of assignee usernames')
  .action(async (options) => {
    try {
      // Prepare request payload
      const payload: any = {
        issueNumber: parseInt(options.number)
      };
      
      if (options.title) payload.title = options.title;
      if (options.body) payload.body = options.body;
      if (options.state) payload.state = options.state;
      if (options.labels) payload.labels = options.labels.split(',');
      if (options.assignees) payload.assignees = options.assignees.split(',');
      
      const response = await axios.post(`${GITHUB_MCP_URL}/updateIssue`, payload);
      
      console.log(chalk.green(`Issue #${response.data.issue.number} updated successfully: ${response.data.issue.url}`));
      
    } catch (error) {
      console.error(chalk.red('Error updating issue:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Add a comment to an issue
 */
program
  .command('comment')
  .description('Add a comment to a GitHub issue')
  .requiredOption('-n, --number <number>', 'Issue number')
  .requiredOption('-b, --body <body>', 'Comment body')
  .action(async (options) => {
    try {
      const response = await axios.post(`${GITHUB_MCP_URL}/addComment`, {
        issueNumber: parseInt(options.number),
        body: options.body
      });
      
      console.log(chalk.green(`Comment added to issue #${options.number}: ${response.data.comment.url}`));
      
    } catch (error) {
      console.error(chalk.red('Error adding comment:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Generate a coverage report
 */
program
  .command('coverage-report')
  .description('Generate a coverage report')
  .option('-u, --update-issues', 'Update GitHub issues with coverage info')
  .option('-o, --output-path <path>', 'Output path for the report')
  .action(async (options) => {
    try {
      const response = await axios.post(`${COVERAGE_MCP_URL}/generateCoverageReport`, {
        updateIssues: options.updateIssues,
        outputPath: options.outputPath
      });
      
      console.log(chalk.green(`Coverage report generated: ${response.data.reportPath}`));
      
      if (options.updateIssues && response.data.issuesUpdated) {
        console.log(chalk.green('GitHub issues updated with coverage information.'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error generating coverage report:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Update all implementation gap issues with coverage data
 */
program
  .command('update-all-issues')
  .description('Update all implementation gap issues with coverage data')
  .action(async () => {
    try {
      // Step 1: Generate coverage report and update issues
      console.log(chalk.blue('Generating coverage report and updating issues...'));
      
      const reportResponse = await axios.post(`${COVERAGE_MCP_URL}/generateCoverageReport`, {
        updateIssues: true
      });
      
      console.log(chalk.green(`Coverage report generated: ${reportResponse.data.reportPath}`));
      
      if (reportResponse.data.issuesUpdated) {
        console.log(chalk.green('GitHub issues updated with coverage information.'));
      }
      
      // Step 2: Correlate issues with coverage
      console.log(chalk.blue('\nCorrelating issues with coverage...'));
      
      const correlateResponse = await axios.post(`${COVERAGE_MCP_URL}/correlateIssuesWithCoverage`, {
        issueLabel: 'implementation-gap'
      });
      
      const { correlations, overallStats } = correlateResponse.data;
      
      console.log(chalk.green(`Correlated ${overallStats.issuesWithCoverage} issues with coverage data.`));
      
      // Step 3: Find implementation gaps and create issues
      console.log(chalk.blue('\nIdentifying new implementation gaps...'));
      
      const gapsResponse = await axios.post(`${COVERAGE_MCP_URL}/getImplementationGaps`, {
        threshold: 70
      });
      
      const { implementationGaps } = gapsResponse.data;
      
      console.log(chalk.green(`Found ${implementationGaps.length} files with coverage gaps.`));
      
      // Step 4: Create issues for gaps (limit to top 5)
      const existingIssueFiles = correlations
        .flatMap(corr => corr.relatedFiles.map(file => file.file));
      
      const newGaps = implementationGaps
        .filter(gap => !existingIssueFiles.includes(gap.file))
        .slice(0, 5);
      
      if (newGaps.length > 0) {
        console.log(chalk.blue(`\nCreating issues for ${newGaps.length} new implementation gaps...`));
        
        for (const gap of newGaps) {
          try {
            const issueResponse = await axios.post(`${GITHUB_MCP_URL}/createIssue`, {
              title: `Implementation Gap: ${gap.file}`,
              body: `# Implementation Gap Detected

This issue was automatically created by the implementation monitoring system.

## File Details
- **File**: "${gap.file}"
- **Module**: "${gap.file.split('/').slice(0, -1).join('/')}"

## Coverage Metrics
- Statements: ${gap.metrics.statements.percentage}% (${gap.metrics.statements.covered}/${gap.metrics.statements.total})
- Branches: ${gap.metrics.branches.percentage}% (${gap.metrics.branches.covered}/${gap.metrics.branches.total})
- Functions: ${gap.metrics.functions.percentage}% (${gap.metrics.functions.covered}/${gap.metrics.functions.total})
- Lines: ${gap.metrics.lines.percentage}% (${gap.metrics.lines.covered}/${gap.metrics.lines.total})

## Gap Details
- Gap Score: ${gap.gapScore.toFixed(2)}
- Uncovered Lines: ${gap.uncoveredLines.slice(0, 20).join(', ')}${gap.uncoveredLines.length > 20 ? '...' : ''}

## Action Required
1. Implement missing functionality
2. Write tests to cover the uncovered code
3. Run coverage analysis to verify improvement
              `,
              labels: ['implementation-gap', 'coverage-improvement']
            });
            
            console.log(chalk.green(`Created issue #${issueResponse.data.issue.number} for ${gap.file}`));
          } catch (error) {
            console.error(chalk.red(`Error creating issue for ${gap.file}:`));
            console.error(error.response?.data || error.message);
          }
        }
      } else {
        console.log(chalk.green('No new implementation gaps found.'));
      }
      
      // Step 5: Update implementation status
      console.log(chalk.blue('\nUpdating implementation status...'));
      
      await axios.post(`${GITHUB_MCP_URL}/getImplementationStatus`);
      
      console.log(chalk.green('Implementation status updated.'));
      console.log(chalk.green.bold('\nAll implementation gap issues have been updated.'));
      
    } catch (error) {
      console.error(chalk.red('Error updating issues:'));
      console.error(error.response?.data || error.message);
      process.exit(1);
    }
  });

/**
 * Integration with Claude Code
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