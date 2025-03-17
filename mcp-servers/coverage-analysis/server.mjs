/**
 * Test Coverage Analysis MCP Server for Claude Code
 * 
 * This server implements the Claude Code MCP (Model Context Protocol) interface
 * for analyzing test coverage and correlating it with implementation issues.
 */

// ESM module format
import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import winston from 'winston';
import istanbulLibCoverage from 'istanbul-lib-coverage';
import istanbulLibReport from 'istanbul-lib-report';
import istanbulReports from 'istanbul-reports';
import { Octokit } from '@octokit/rest';
import { fileURLToPath } from 'url';

// Initialize environment variables
dotenv.config();

// Get current file and directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'coverage-analysis-mcp.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Initialize Express app
const app = express();
app.use(bodyParser.json());

// Configure additional file logger for persistent debugging
const debugLogDir = path.join(__dirname, '../../logs/mcp-debug');
if (!fs.existsSync(debugLogDir)) {
  fs.mkdirSync(debugLogDir, { recursive: true });
}
const debugLogPath = path.join(debugLogDir, 'coverage-github-auth.log');
const debugLogger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: debugLogPath,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Function to diagnose token issues
async function diagnoseTokenIssue(token) {
  debugLogger.debug('Diagnosing token issue', { 
    tokenLength: token ? token.length : 0,
    tokenPrefix: token ? token.substring(0, 4) : 'none',
    tokenSet: !!token,
    timestamp: new Date().toISOString()
  });
  
  // Check token format
  if (!token) {
    return {
      issue: 'MISSING_TOKEN',
      description: 'No GitHub token was provided',
      resolution: 'Set GITHUB_TOKEN in .env file'
    };
  }
  
  if (token === 'null' || token === 'undefined' || token === '') {
    return {
      issue: 'EMPTY_TOKEN',
      description: 'GitHub token is empty or set to null/undefined',
      resolution: 'Update GITHUB_TOKEN with a valid token in .env file'
    };
  }
  
  // Test authentication 
  try {
    const octo = new Octokit({ auth: token });
    const { data } = await octo.rest.users.getAuthenticated();
    
    // If we get here, the token is working
    return {
      issue: 'NONE',
      description: 'Token is valid',
      username: data.login
    };
  } catch (error) {
    // Analyze error to determine cause
    if (error.status === 401) {
      return {
        issue: 'UNAUTHORIZED',
        description: 'Token is invalid or expired (401 Unauthorized)',
        errorMessage: error.message,
        resolution: 'Generate a new token at https://github.com/settings/tokens'
      };
    } else if (error.status === 403) {
      return {
        issue: 'FORBIDDEN',
        description: 'Token lacks required permissions (403 Forbidden)',
        errorMessage: error.message,
        resolution: 'Generate a new token with repo scope at https://github.com/settings/tokens'
      };
    } else {
      return {
        issue: 'UNKNOWN_ERROR',
        description: `Unexpected error (${error.status || 'unknown status'})`,
        errorMessage: error.message,
        resolution: 'Check network connectivity and GitHub status'
      };
    }
  }
}

// Initialize GitHub client with thorough error handling
let octokit = null;
let tokenDiagnosis = null;

if (process.env.GITHUB_TOKEN) {
  try {
    const token = process.env.GITHUB_TOKEN;
    
    // Log token information (safely)
    debugLogger.debug('Token information', {
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.substring(0, 4) : 'none',
      tokenSet: !!token
    });
    
    // Diagnose token issues
    tokenDiagnosis = await diagnoseTokenIssue(token);
    debugLogger.debug('Token diagnosis result', tokenDiagnosis);
    
    if (tokenDiagnosis.issue !== 'NONE') {
      // Log detailed error information
      logger.error(`GitHub token issue: ${tokenDiagnosis.description}`);
      logger.error(`Resolution: ${tokenDiagnosis.resolution}`);
      
      // Write to debug log
      debugLogger.error('GitHub authentication failed', tokenDiagnosis);
      
      // Continue without mock data - will fail properly
      octokit = new Octokit({ auth: token });
    } else {
      logger.info(`GitHub token validated successfully. Authenticated as ${tokenDiagnosis.username}`);
      octokit = new Octokit({ auth: token });
    }
  } catch (error) {
    logger.error(`Fatal error initializing GitHub client: ${error.message}`);
    debugLogger.error('GitHub client initialization error', { 
      error: error.message,
      stack: error.stack
    });
    
    // No fallback to mock data - just create a client that will fail appropriately
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }
}

// Default configuration
const defaultConfig = {
  coveragePath: process.env.COVERAGE_PATH || 'coverage',
  outputPath: process.env.OUTPUT_PATH || 'docs/reports',
  githubOwner: process.env.GITHUB_OWNER || 'mprestonsparks',
  githubRepo: process.env.GITHUB_REPO || 'DocGen'
};

/**
 * MCP Server Capabilities
 */
app.get('/capabilities', (req, res) => {
  res.json({
    name: 'Coverage Analysis MCP',
    version: '0.1.0',
    description: 'Test coverage analysis for Claude Code',
    capabilities: [
      {
        name: 'getCoverageMetrics',
        description: 'Get overall coverage metrics',
        parameters: {
          coveragePath: { type: 'string', description: 'Path to coverage directory', optional: true }
        }
      },
      {
        name: 'getFileCoverage',
        description: 'Get coverage metrics for a specific file',
        parameters: {
          file: { type: 'string', description: 'File path (relative to project root)' },
          coveragePath: { type: 'string', description: 'Path to coverage directory', optional: true }
        }
      },
      {
        name: 'generateCoverageReport',
        description: 'Generate a coverage report in markdown format',
        parameters: {
          outputPath: { type: 'string', description: 'Output path for the report', optional: true },
          updateIssues: { type: 'boolean', description: 'Update GitHub issues with coverage info', optional: true }
        }
      },
      {
        name: 'analyzeIssueImpact',
        description: 'Analyze which files and coverage metrics are impacted by an issue',
        parameters: {
          issueNumber: { type: 'number', description: 'The GitHub issue number' }
        }
      },
      {
        name: 'getCoverageHistory',
        description: 'Get coverage metrics history',
        parameters: {
          days: { type: 'number', description: 'Number of days in history', default: 30 }
        }
      },
      {
        name: 'getImplementationGaps',
        description: 'Identify files with implementation gaps using coverage data',
        parameters: {
          coveragePath: { type: 'string', description: 'Path to coverage directory', optional: true },
          threshold: { type: 'number', description: 'Coverage threshold percentage for identifying gaps', default: 80 }
        }
      },
      {
        name: 'correlateIssuesWithCoverage',
        description: 'Correlate GitHub issues with coverage metrics',
        parameters: {
          issueLabel: { type: 'string', description: 'Label to filter GitHub issues', default: 'implementation-gap' }
        }
      }
    ]
  });
});

/**
 * Load Istanbul coverage data from the coverage directory
 */
function loadCoverageData(coveragePath) {
  try {
    const coverageDir = path.join(process.cwd(), coveragePath);
    const coverageFile = path.join(coverageDir, 'coverage-final.json');
    
    if (!fs.existsSync(coverageFile)) {
      logger.error('Coverage file not found', { path: coverageFile });
      return null;
    }
    
    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    return istanbulLibCoverage.createCoverageMap(coverageData);
  } catch (error) {
    logger.error('Error loading coverage data', { error: error.message });
    return null;
  }
}

/**
 * Get coverage summary from Istanbul coverage map
 */
function getCoverageSummary(coverageMap) {
  const summary = coverageMap.getCoverageSummary();
  
  return {
    statements: {
      total: summary.statements.total,
      covered: summary.statements.covered,
      percentage: roundPercentage(summary.statements.pct)
    },
    branches: {
      total: summary.branches.total,
      covered: summary.branches.covered,
      percentage: roundPercentage(summary.branches.pct)
    },
    functions: {
      total: summary.functions.total,
      covered: summary.functions.covered,
      percentage: roundPercentage(summary.functions.pct)
    },
    lines: {
      total: summary.lines.total,
      covered: summary.lines.covered,
      percentage: roundPercentage(summary.lines.pct)
    }
  };
}

/**
 * Get file coverage metrics
 */
function getFileCoverageMetrics(fileCoverage) {
  const summary = fileCoverage.toSummary();
  
  return {
    statements: {
      total: summary.statements.total,
      covered: summary.statements.covered,
      percentage: roundPercentage(summary.statements.pct)
    },
    branches: {
      total: summary.branches.total,
      covered: summary.branches.covered,
      percentage: roundPercentage(summary.branches.pct)
    },
    functions: {
      total: summary.functions.total,
      covered: summary.functions.covered,
      percentage: roundPercentage(summary.functions.pct)
    },
    lines: {
      total: summary.lines.total,
      covered: summary.lines.covered,
      percentage: roundPercentage(summary.lines.pct)
    },
    uncoveredLines: getUncoveredLines(fileCoverage)
  };
}

/**
 * Get uncovered lines from file coverage
 */
function getUncoveredLines(fileCoverage) {
  const uncoveredLines = [];
  
  Object.keys(fileCoverage.getLineCoverage()).forEach(line => {
    const lineNumber = parseInt(line, 10);
    if (fileCoverage.getLineCoverage()[line] === 0) {
      uncoveredLines.push(lineNumber);
    }
  });
  
  return uncoveredLines;
}

/**
 * Generate a markdown coverage report
 */
function generateMarkdownReport(coverageMap) {
  const summary = getCoverageSummary(coverageMap);
  const date = new Date().toISOString().split('T')[0];
  
  let report = `# Test Coverage Report\n\n`;
  report += `Generated on: ${date}\n\n`;
  
  report += `## Overall Coverage\n\n`;
  report += `| Metric | Coverage | Progress |\n`;
  report += `|--------|----------|----------|\n`;
  report += `| Statements | ${summary.statements.covered}/${summary.statements.total} (${summary.statements.percentage}%) | ${getCoverageProgressBar(summary.statements.percentage)} |\n`;
  report += `| Branches | ${summary.branches.covered}/${summary.branches.total} (${summary.branches.percentage}%) | ${getCoverageProgressBar(summary.branches.percentage)} |\n`;
  report += `| Functions | ${summary.functions.covered}/${summary.functions.total} (${summary.functions.percentage}%) | ${getCoverageProgressBar(summary.functions.percentage)} |\n`;
  report += `| Lines | ${summary.lines.covered}/${summary.lines.total} (${summary.lines.percentage}%) | ${getCoverageProgressBar(summary.lines.percentage)} |\n\n`;
  
  // Implementation details omitted for brevity
  
  return report;
}

/**
 * Update coverage history
 */
function updateCoverageHistory(summary) {
  try {
    const historyPath = path.join(process.cwd(), defaultConfig.outputPath, 'coverage-history.json');
    let history = [];
    
    // Load existing history if available
    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
    
    // Add current coverage to history
    history.push({
      date: new Date().toISOString(),
      statements: summary.statements.percentage,
      branches: summary.branches.percentage,
      functions: summary.functions.percentage,
      lines: summary.lines.percentage
    });
    
    // Keep only the last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    history = history.filter(entry => new Date(entry.date) >= cutoffDate);
    
    // Ensure output directory exists
    const outputDir = path.dirname(historyPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write history to file
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
    
    return true;
  } catch (error) {
    logger.error('Error updating coverage history', { error: error.message });
    return false;
  }
}

/**
 * Helper function to generate a progress bar
 */
function getCoverageProgressBar(percentage) {
  const filledLength = Math.round(percentage / 10);
  const emptyLength = 10 - filledLength;
  
  return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
}

/**
 * Helper function to get coverage status emoji
 */
function getCoverageStatus(current, target) {
  if (current >= target) {
    return '✅ Met';
  } else if (current >= target * 0.9) {
    return '🟡 Almost';
  } else {
    return '❌ Not Met';
  }
}

/**
 * Helper function to round percentage to 2 decimal places
 */
function roundPercentage(percentage) {
  return Math.round(percentage * 100) / 100;
}

/**
 * Calculate implementation gap score
 */
function calculateGapScore(metrics, threshold) {
  // Calculate how far each metric is below the threshold
  const stmtGap = Math.max(0, threshold - metrics.statements.percentage);
  const branchGap = Math.max(0, threshold - metrics.branches.percentage);
  const fnGap = Math.max(0, threshold - metrics.functions.percentage);
  const lineGap = Math.max(0, threshold - metrics.lines.percentage);
  
  // Weight the gaps (adjust weights as needed)
  return (stmtGap * 1.0) + (branchGap * 1.5) + (fnGap * 2.0) + (lineGap * 1.0);
}

// Implement API endpoints...
// [Remaining implementation code omitted for brevity]

// Start the server
const PORT = process.env.PORT || 7868;
app.listen(PORT, () => {
  logger.info(`Coverage Analysis MCP server running on port ${PORT}`);
});

// Export for testing
export default app;