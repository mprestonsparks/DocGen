/**
 * Test Coverage Analysis MCP Server for Claude Code
 * 
 * This server implements the Claude Code MCP (Model Context Protocol) interface
 * for analyzing test coverage and correlating it with implementation issues.
 */

import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import * as fs from 'fs';
import * as winston from 'winston';
import * as istanbulLibCoverage from 'istanbul-lib-coverage';
import * as istanbulLibReport from 'istanbul-lib-report';
import * as istanbulReports from 'istanbul-reports';
import { Octokit } from '@octokit/rest';

// Type definitions
interface CoverageMetrics {
  total: number;
  covered: number;
  percentage: number;
}

interface CoverageSummary {
  statements: CoverageMetrics;
  branches: CoverageMetrics;
  functions: CoverageMetrics;
  lines: CoverageMetrics;
  uncoveredLines?: number[];
}

interface FileCoverage {
  file: string;
  metrics: CoverageSummary;
  uncoveredLines?: number[];
  gapScore?: number;
  neededScore?: number;
}

interface DirectoryCoverage {
  [key: string]: CoverageSummary;
}

interface CoverageHistoryEntry {
  date: string;
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

interface IssueDetails {
  number: number;
  title: string;
  state: string;
  url: string;
  labels: string[];
}

interface IssueCorrelation {
  issue: IssueDetails;
  relatedFiles: FileCoverage[];
  averageCoverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  implementationStatus: string;
}

interface TokenDiagnosis {
  issue: string;
  description: string;
  resolution?: string;
  errorMessage?: string;
  username?: string;
}

interface DefaultConfig {
  coveragePath: string;
  outputPath: string;
  githubOwner: string;
  githubRepo: string;
}

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
async function diagnoseTokenIssue(token: string | undefined): Promise<TokenDiagnosis> {
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
  } catch (error: any) {
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
let octokit: Octokit | null = null;
let tokenDiagnosis: TokenDiagnosis | null = null;

(async () => {
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
    } catch (error: any) {
      logger.error(`Fatal error initializing GitHub client: ${error.message}`);
      debugLogger.error('GitHub client initialization error', { 
        error: error.message,
        stack: error.stack
      });
      
      // No fallback to mock data - just create a client that will fail appropriately
      octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    }
  }
})();

// Default configuration
const defaultConfig: DefaultConfig = {
  coveragePath: process.env.COVERAGE_PATH || 'coverage',
  outputPath: process.env.OUTPUT_PATH || 'docs/reports',
  githubOwner: process.env.GITHUB_OWNER || 'mprestonsparks',
  githubRepo: process.env.GITHUB_REPO || 'DocGen'
};

/**
 * MCP Server Capabilities
 */
app.get('/capabilities', (req: Request, res: Response) => {
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
 * Get overall coverage metrics
 */
app.post('/getCoverageMetrics', async (req: Request, res: Response) => {
  try {
    const { coveragePath } = { ...defaultConfig, ...req.body };
    logger.info('Getting coverage metrics', { coveragePath });
    
    // Load coverage data
    const coverageData = loadCoverageData(coveragePath);
    if (!coverageData) {
      return res.status(404).json({ success: false, error: 'Coverage data not found' });
    }
    
    // Extract summary metrics
    const summary = getCoverageSummary(coverageData);
    
    res.json({ success: true, metrics: summary });
  } catch (error: any) {
    logger.error('Error getting coverage metrics', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get coverage metrics for a specific file
 */
app.post('/getFileCoverage', async (req: Request, res: Response) => {
  try {
    const { file } = req.body;
    const { coveragePath } = { ...defaultConfig, ...req.body };
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'File parameter is required' });
    }
    
    logger.info('Getting file coverage', { file, coveragePath });
    
    // Load coverage data
    const coverageData = loadCoverageData(coveragePath);
    if (!coverageData) {
      return res.status(404).json({ success: false, error: 'Coverage data not found' });
    }
    
    // Get file coverage
    const fileCoverage = coverageData.fileCoverageFor(file);
    if (!fileCoverage) {
      return res.status(404).json({ success: false, error: 'File coverage not found' });
    }
    
    // Generate detailed file coverage
    const metrics = getFileCoverageMetrics(fileCoverage);
    
    res.json({ success: true, file, metrics });
  } catch (error: any) {
    logger.error('Error getting file coverage', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate a coverage report in markdown format
 */
app.post('/generateCoverageReport', async (req: Request, res: Response) => {
  try {
    const { outputPath, updateIssues = false } = { ...defaultConfig, ...req.body };
    logger.info('Generating coverage report', { outputPath, updateIssues });
    
    // Load coverage data
    const coverageData = loadCoverageData(defaultConfig.coveragePath);
    if (!coverageData) {
      return res.status(404).json({ success: false, error: 'Coverage data not found' });
    }
    
    // Generate markdown report
    const report = generateMarkdownReport(coverageData);
    
    // Ensure output directory exists
    const outputDir = path.dirname(path.join(process.cwd(), outputPath, 'coverage-report.md'));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write report to file
    const reportPath = path.join(process.cwd(), outputPath, 'coverage-report.md');
    fs.writeFileSync(reportPath, report);
    
    // Update GitHub issues if requested and GitHub token is available
    let issuesUpdated = false;
    if (updateIssues && octokit) {
      issuesUpdated = await updateGitHubIssues(coverageData);
    }
    
    res.json({
      success: true,
      reportPath,
      issuesUpdated
    });
  } catch (error: any) {
    logger.error('Error generating coverage report', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Analyze which files and coverage metrics are impacted by an issue
 */
app.post('/analyzeIssueImpact', async (req: Request, res: Response) => {
  try {
    const { issueNumber } = req.body;
    const { githubOwner, githubRepo } = { ...defaultConfig, ...req.body };
    
    if (!issueNumber) {
      return res.status(400).json({ success: false, error: 'Issue number is required' });
    }
    
    if (!octokit) {
      return res.status(400).json({ success: false, error: 'GitHub token not configured' });
    }
    
    logger.info('Analyzing issue impact', { issueNumber, githubOwner, githubRepo });
    
    // Get issue details
    const { data: issue } = await octokit.issues.get({
      owner: githubOwner,
      repo: githubRepo,
      issue_number: issueNumber
    });
    
    // Load coverage data
    const coverageData = loadCoverageData(defaultConfig.coveragePath);
    if (!coverageData) {
      return res.status(404).json({ success: false, error: 'Coverage data not found' });
    }
    
    // Extract file paths mentioned in the issue
    const fileMatches = issue.body ? issue.body.match(/file: "([^"]+)"/g) || [] : [];
    const moduleMatches = issue.body ? issue.body.match(/module: "([^"]+)"/g) || [] : [];
    
    const impactedFiles: FileCoverage[] = [];
    
    // Process file paths
    fileMatches.forEach(match => {
      const fileMatch = match.match(/file: "([^"]+)"/);
      if (fileMatch) {
        const file = fileMatch[1];
        const fileCoverage = coverageData.fileCoverageFor(file);
        if (fileCoverage) {
          impactedFiles.push({
            file,
            metrics: getFileCoverageMetrics(fileCoverage)
          });
        }
      }
    });
    
    // Process modules
    moduleMatches.forEach(match => {
      const moduleMatch = match.match(/module: "([^"]+)"/);
      if (moduleMatch) {
        const module = moduleMatch[1];
        
        // Find files that belong to this module
        coverageData.files().forEach(file => {
          if (file.includes(module) && !impactedFiles.some(f => f.file === file)) {
            const fileCoverage = coverageData.fileCoverageFor(file);
            if (fileCoverage) {
              impactedFiles.push({
                file,
                metrics: getFileCoverageMetrics(fileCoverage)
              });
            }
          }
        });
      }
    });
    
    // Calculate overall impact
    const overallImpact = {
      filesImpacted: impactedFiles.length,
      averageStatementCoverage: 0,
      averageBranchCoverage: 0,
      averageFunctionCoverage: 0,
      averageLineCoverage: 0
    };
    
    if (impactedFiles.length > 0) {
      overallImpact.averageStatementCoverage = impactedFiles.reduce((sum, file) => sum + file.metrics.statements.percentage, 0) / impactedFiles.length;
      overallImpact.averageBranchCoverage = impactedFiles.reduce((sum, file) => sum + file.metrics.branches.percentage, 0) / impactedFiles.length;
      overallImpact.averageFunctionCoverage = impactedFiles.reduce((sum, file) => sum + file.metrics.functions.percentage, 0) / impactedFiles.length;
      overallImpact.averageLineCoverage = impactedFiles.reduce((sum, file) => sum + file.metrics.lines.percentage, 0) / impactedFiles.length;
    }
    
    res.json({
      success: true,
      issue: {
        number: issue.number,
        title: issue.title,
        url: issue.html_url
      },
      impactedFiles,
      overallImpact
    });
  } catch (error: any) {
    logger.error('Error analyzing issue impact', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get coverage metrics history
 */
app.post('/getCoverageHistory', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.body;
    logger.info('Getting coverage history', { days });
    
    // Check if history file exists
    const historyPath = path.join(process.cwd(), defaultConfig.outputPath, 'coverage-history.json');
    if (!fs.existsSync(historyPath)) {
      return res.status(404).json({ success: false, error: 'Coverage history not found' });
    }
    
    // Load history data
    const historyData: CoverageHistoryEntry[] = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    
    // Filter by days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredHistory = historyData.filter(entry => new Date(entry.date) >= cutoffDate);
    
    res.json({ success: true, history: filteredHistory });
  } catch (error: any) {
    logger.error('Error getting coverage history', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Load Istanbul coverage data from the coverage directory
 */
function loadCoverageData(coveragePath: string): istanbulLibCoverage.CoverageMap | null {
  try {
    const coverageDir = path.join(process.cwd(), coveragePath);
    const coverageFile = path.join(coverageDir, 'coverage-final.json');
    
    if (!fs.existsSync(coverageFile)) {
      logger.error('Coverage file not found', { path: coverageFile });
      return null;
    }
    
    const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    return istanbulLibCoverage.createCoverageMap(coverageData);
  } catch (error: any) {
    logger.error('Error loading coverage data', { error: error.message });
    return null;
  }
}

/**
 * Get coverage summary from Istanbul coverage map
 */
function getCoverageSummary(coverageMap: istanbulLibCoverage.CoverageMap): CoverageSummary {
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

// Extended type for Istanbul file coverage - use an independent interface
interface ExtendedFileCoverageData {
  // Standard Istanbul FileCoverageData properties
  statementMap: Record<string, any>;
  s: Record<string, number>;
  branchMap: Record<string, any>;
  b: Record<string, any[]>;
  fnMap: Record<string, any>;
  f: Record<string, number>;
  path: string;
  // Extended properties
  l?: Record<string, number>;
  getLineCoverage?: () => Record<string, number>;
}

/**
 * Get file coverage metrics
 */
function getFileCoverageMetrics(fileCoverage: istanbulLibCoverage.FileCoverageData): CoverageSummary {
  // Use type assertion for extended properties
  const coverage = fileCoverage as unknown as ExtendedFileCoverageData;
  
  // Use istanbulLibCoverage's methods
  const statementMap = coverage.statementMap || {};
  const statements = coverage.s || {};
  const branchMap = coverage.branchMap || {};
  const branches = coverage.b || {};
  const functionMap = coverage.fnMap || {};
  const functions = coverage.f || {};
  
  // Get line coverage either from method or property
  let lineMap: Record<string, number> = {};
  if (typeof coverage.getLineCoverage === 'function') {
    lineMap = coverage.getLineCoverage();
  } else if (coverage.l) {
    lineMap = coverage.l;
  }
  
  // Count covered statements
  const statementsTotal = Object.keys(statementMap).length;
  const statementsCovered = Object.keys(statements).filter(s => statements[s] > 0).length;
  const statementsPct = statementsTotal ? (statementsCovered / statementsTotal) * 100 : 0;
  
  // Count covered branches
  const branchesTotal = Object.keys(branchMap).length;
  const branchesCovered = Object.keys(branches).filter(b => {
    return branches[b] && 
      Array.isArray(branches[b]) && 
      branches[b].filter((hit: number) => hit > 0).length === branches[b].length;
  }).length;
  const branchesPct = branchesTotal ? (branchesCovered / branchesTotal) * 100 : 0;
  
  // Count covered functions
  const functionsTotal = Object.keys(functionMap).length;
  const functionsCovered = Object.keys(functions).filter(f => functions[f] > 0).length;
  const functionsPct = functionsTotal ? (functionsCovered / functionsTotal) * 100 : 0;
  
  // Count covered lines
  const linesTotal = Object.keys(lineMap).length;
  const linesCovered = Object.keys(lineMap).filter(l => lineMap[l] > 0).length;
  const linesPct = linesTotal ? (linesCovered / linesTotal) * 100 : 0;
  
  return {
    statements: {
      total: statementsTotal,
      covered: statementsCovered,
      percentage: roundPercentage(statementsPct)
    },
    branches: {
      total: branchesTotal,
      covered: branchesCovered,
      percentage: roundPercentage(branchesPct)
    },
    functions: {
      total: functionsTotal,
      covered: functionsCovered,
      percentage: roundPercentage(functionsPct)
    },
    lines: {
      total: linesTotal,
      covered: linesCovered,
      percentage: roundPercentage(linesPct)
    },
    uncoveredLines: getUncoveredLines(fileCoverage)
  };
}

/**
 * Get uncovered lines from file coverage
 */
function getUncoveredLines(fileCoverage: istanbulLibCoverage.FileCoverageData): number[] {
  const uncoveredLines: number[] = [];
  const coverage = fileCoverage as unknown as ExtendedFileCoverageData;
  
  // Try to get line coverage from method first
  if (typeof coverage.getLineCoverage === 'function') {
    const lineCoverage = coverage.getLineCoverage();
    
    Object.keys(lineCoverage).forEach(line => {
      const lineNumber = parseInt(line, 10);
      if (lineCoverage[line] === 0) {
        uncoveredLines.push(lineNumber);
      }
    });
  } 
  // Otherwise, try to get line coverage from property
  else if (coverage.l) {
    const lineMap = coverage.l;
    Object.keys(lineMap).forEach(line => {
      const lineNumber = parseInt(line, 10);
      if (lineMap[line] === 0) {
        uncoveredLines.push(lineNumber);
      }
    });
  }
  
  return uncoveredLines;
}

/**
 * Generate a markdown coverage report
 */
function generateMarkdownReport(coverageMap: istanbulLibCoverage.CoverageMap): string {
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
  
  // Target thresholds
  report += `## Coverage Targets\n\n`;
  report += `| Metric | Current | Target | Status |\n`;
  report += `|--------|---------|--------|--------|\n`;
  report += `| Statements | ${summary.statements.percentage}% | 80% | ${getCoverageStatus(summary.statements.percentage, 80)} |\n`;
  report += `| Branches | ${summary.branches.percentage}% | 60% | ${getCoverageStatus(summary.branches.percentage, 60)} |\n`;
  report += `| Functions | ${summary.functions.percentage}% | 70% | ${getCoverageStatus(summary.functions.percentage, 70)} |\n`;
  report += `| Lines | ${summary.lines.percentage}% | 80% | ${getCoverageStatus(summary.lines.percentage, 80)} |\n\n`;
  
  // Per-directory coverage
  report += `## Coverage by Directory\n\n`;
  
  const directoryCoverage = getDirectoryCoverage(coverageMap);
  
  report += `| Directory | Statements | Branches | Functions | Lines |\n`;
  report += `|-----------|------------|----------|-----------|-------|\n`;
  
  Object.keys(directoryCoverage).sort().forEach(dir => {
    const metrics = directoryCoverage[dir];
    report += `| ${dir} | ${metrics.statements.percentage}% | ${metrics.branches.percentage}% | ${metrics.functions.percentage}% | ${metrics.lines.percentage}% |\n`;
  });
  
  report += '\n';
  
  // Top 10 files needing coverage
  report += `## Top Files Needing Coverage Improvements\n\n`;
  
  const filesByNeeded: FileCoverage[] = [];
  coverageMap.files().forEach(file => {
    const fileCoverage = coverageMap.fileCoverageFor(file);
    if (fileCoverage) {
      const metrics = getFileCoverageMetrics(fileCoverage);
      
      // Calculate a score based on how much coverage is needed
      const neededScore = (
        (80 - metrics.statements.percentage) + 
        (60 - metrics.branches.percentage) + 
        (70 - metrics.functions.percentage) + 
        (80 - metrics.lines.percentage)
      );
      
      if (neededScore > 0) {
        filesByNeeded.push({
          file,
          metrics,
          neededScore
        });
      }
    }
  });
  
  filesByNeeded.sort((a, b) => (b.neededScore || 0) - (a.neededScore || 0));
  
  report += `| File | Statements | Branches | Functions | Lines | Needed Score |\n`;
  report += `|------|------------|----------|-----------|-------|-------------|\n`;
  
  filesByNeeded.slice(0, 10).forEach(file => {
    report += `| ${file.file} | ${file.metrics.statements.percentage}% | ${file.metrics.branches.percentage}% | ${file.metrics.functions.percentage}% | ${file.metrics.lines.percentage}% | ${Math.round(file.neededScore || 0)} |\n`;
  });
  
  report += '\n';
  
  // Implementation gap correlation
  if (octokit) {
    report += `## Implementation Coverage Correlation\n\n`;
    report += `This section correlates code coverage with [implementation gap issues](https://github.com/${defaultConfig.githubOwner}/${defaultConfig.githubRepo}/labels/implementation-gap).\n\n`;
    report += `For detailed tracking, see the [implementation tracking issue](https://github.com/${defaultConfig.githubOwner}/${defaultConfig.githubRepo}/issues/19).\n\n`;
  }
  
  // Update coverage history
  updateCoverageHistory(summary);
  
  return report;
}

/**
 * Calculate directory coverage from file coverage
 */
function getDirectoryCoverage(coverageMap: istanbulLibCoverage.CoverageMap): DirectoryCoverage {
  const directoryCoverage: DirectoryCoverage = {};
  
  coverageMap.files().forEach(file => {
    // Get the directory from the file path
    const directory = path.dirname(file);
    
    // Initialize directory coverage if not exists
    if (!directoryCoverage[directory]) {
      directoryCoverage[directory] = {
        statements: { total: 0, covered: 0, percentage: 0 },
        branches: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 },
        lines: { total: 0, covered: 0, percentage: 0 }
      };
    }
    
    // Get file coverage metrics
    const fileCoverage = coverageMap.fileCoverageFor(file);
    if (fileCoverage) {
      const summary = fileCoverage.toSummary();
      
      // Add to directory totals
      directoryCoverage[directory].statements.total += summary.statements.total;
      directoryCoverage[directory].statements.covered += summary.statements.covered;
      directoryCoverage[directory].branches.total += summary.branches.total;
      directoryCoverage[directory].branches.covered += summary.branches.covered;
      directoryCoverage[directory].functions.total += summary.functions.total;
      directoryCoverage[directory].functions.covered += summary.functions.covered;
      directoryCoverage[directory].lines.total += summary.lines.total;
      directoryCoverage[directory].lines.covered += summary.lines.covered;
    }
  });
  
  // Calculate percentages for each directory
  Object.keys(directoryCoverage).forEach(dir => {
    const coverage = directoryCoverage[dir];
    
    coverage.statements.percentage = roundPercentage(
      (coverage.statements.covered / coverage.statements.total) * 100
    );
    
    coverage.branches.percentage = roundPercentage(
      (coverage.branches.covered / coverage.branches.total) * 100
    );
    
    coverage.functions.percentage = roundPercentage(
      (coverage.functions.covered / coverage.functions.total) * 100
    );
    
    coverage.lines.percentage = roundPercentage(
      (coverage.lines.covered / coverage.lines.total) * 100
    );
  });
  
  return directoryCoverage;
}

/**
 * Update GitHub issues with coverage information
 */
async function updateGitHubIssues(coverageMap: istanbulLibCoverage.CoverageMap): Promise<boolean> {
  try {
    if (!octokit) {
      return false;
    }
    
    // Get implementation-gap issues
    const { data: issues } = await octokit.issues.listForRepo({
      owner: defaultConfig.githubOwner,
      repo: defaultConfig.githubRepo,
      labels: 'implementation-gap',
      state: 'open'
    });
    
    let updatedCount = 0;
    
    // Update each issue with coverage information
    for (const issue of issues) {
      // Extract file paths mentioned in the issue
      const fileMatches = issue.body ? issue.body.match(/file: "([^"]+)"/g) || [] : [];
      const moduleMatches = issue.body ? issue.body.match(/module: "([^"]+)"/g) || [] : [];
      
      // Skip if no files or modules are mentioned
      if (fileMatches.length === 0 && moduleMatches.length === 0) {
        continue;
      }
      
      // Collect coverage information
      const coveredFiles: FileCoverage[] = [];
      
      // Process file paths
      fileMatches.forEach(match => {
        const fileMatch = match.match(/file: "([^"]+)"/);
        if (fileMatch) {
          const file = fileMatch[1];
          const fileCoverage = coverageMap.fileCoverageFor(file);
          if (fileCoverage) {
            coveredFiles.push({
              file,
              metrics: getFileCoverageMetrics(fileCoverage)
            });
          }
        }
      });
      
      // Process modules
      moduleMatches.forEach(match => {
        const moduleMatch = match.match(/module: "([^"]+)"/);
        if (moduleMatch) {
          const module = moduleMatch[1];
          
          // Find files that belong to this module
          coverageMap.files().forEach(file => {
            if (file.includes(module) && !coveredFiles.some(f => f.file === file)) {
              const fileCoverage = coverageMap.fileCoverageFor(file);
              if (fileCoverage) {
                coveredFiles.push({
                  file,
                  metrics: getFileCoverageMetrics(fileCoverage)
                });
              }
            }
          });
        }
      });
      
      // Skip if no coverage information found
      if (coveredFiles.length === 0) {
        continue;
      }
      
      // Build the coverage report comment
      const date = new Date().toISOString().split('T')[0];
      let comment = `## Coverage Report (${date})\n\n`;
      comment += `| File | Statements | Branches | Functions | Lines |\n`;
      comment += `|------|------------|----------|-----------|-------|\n`;
      
      coveredFiles.forEach(file => {
        comment += `| ${file.file} | ${file.metrics.statements.percentage}% | ${file.metrics.branches.percentage}% | ${file.metrics.functions.percentage}% | ${file.metrics.lines.percentage}% |\n`;
      });
      
      // Add overall metrics
      if (coveredFiles.length > 0) {
        const overall = {
          statements: roundPercentage(coveredFiles.reduce((sum, file) => sum + file.metrics.statements.percentage, 0) / coveredFiles.length),
          branches: roundPercentage(coveredFiles.reduce((sum, file) => sum + file.metrics.branches.percentage, 0) / coveredFiles.length),
          functions: roundPercentage(coveredFiles.reduce((sum, file) => sum + file.metrics.functions.percentage, 0) / coveredFiles.length),
          lines: roundPercentage(coveredFiles.reduce((sum, file) => sum + file.metrics.lines.percentage, 0) / coveredFiles.length)
        };
        
        comment += `| **Overall** | **${overall.statements}%** | **${overall.branches}%** | **${overall.functions}%** | **${overall.lines}%** |\n\n`;
      }
      
      // Add a note about uncovered lines
      comment += `### Uncovered Lines\n\n`;
      coveredFiles.forEach(file => {
        if (file.metrics.uncoveredLines && file.metrics.uncoveredLines.length > 0) {
          comment += `**${file.file}**: ${file.metrics.uncoveredLines.join(', ')}\n\n`;
        }
      });
      
      // Add the comment to the issue
      await octokit.issues.createComment({
        owner: defaultConfig.githubOwner,
        repo: defaultConfig.githubRepo,
        issue_number: issue.number,
        body: comment
      });
      
      updatedCount++;
    }
    
    return updatedCount > 0;
  } catch (error: any) {
    logger.error('Error updating GitHub issues', { error: error.message });
    return false;
  }
}

/**
 * Update the coverage history
 */
function updateCoverageHistory(summary: CoverageSummary): boolean {
  try {
    const historyPath = path.join(process.cwd(), defaultConfig.outputPath, 'coverage-history.json');
    let history: CoverageHistoryEntry[] = [];
    
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
  } catch (error: any) {
    logger.error('Error updating coverage history', { error: error.message });
    return false;
  }
}

/**
 * Helper function to generate a progress bar
 */
function getCoverageProgressBar(percentage: number): string {
  const filledLength = Math.round(percentage / 10);
  const emptyLength = 10 - filledLength;
  
  return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
}

/**
 * Helper function to get coverage status emoji
 */
function getCoverageStatus(current: number, target: number): string {
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
function roundPercentage(percentage: number): number {
  return Math.round(percentage * 100) / 100;
}

/**
 * Identify files with implementation gaps using coverage data
 */
app.post('/getImplementationGaps', async (req: Request, res: Response) => {
  try {
    const { coveragePath, threshold = 80 } = { ...defaultConfig, ...req.body };
    logger.info('Identifying implementation gaps', { coveragePath, threshold });
    
    // Load coverage data
    const coverageData = loadCoverageData(coveragePath);
    if (!coverageData) {
      return res.status(404).json({ success: false, error: 'Coverage data not found' });
    }
    
    // Analyze files for implementation gaps
    const implementationGaps: FileCoverage[] = [];
    
    coverageData.files().forEach(file => {
      const fileCoverage = coverageData.fileCoverageFor(file);
      if (fileCoverage) {
        const metrics = getFileCoverageMetrics(fileCoverage);
        
        // Check if any metrics are below threshold
        if (
          metrics.statements.percentage < threshold ||
          metrics.branches.percentage < threshold ||
          metrics.functions.percentage < threshold ||
          metrics.lines.percentage < threshold
        ) {
          implementationGaps.push({
            file,
            metrics,
            uncoveredLines: metrics.uncoveredLines,
            gapScore: calculateGapScore(metrics, threshold)
          });
        }
      }
    });
    
    // Sort gaps by gap score (highest first)
    implementationGaps.sort((a, b) => (b.gapScore || 0) - (a.gapScore || 0));
    
    res.json({
      success: true,
      threshold,
      implementationGaps,
      summary: {
        totalFiles: coverageData.files().length,
        filesWithGaps: implementationGaps.length,
        gapPercentage: roundPercentage((implementationGaps.length / coverageData.files().length) * 100)
      }
    });
  } catch (error: any) {
    logger.error('Error identifying implementation gaps', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Correlate GitHub issues with coverage metrics
 */
app.post('/correlateIssuesWithCoverage', async (req: Request, res: Response) => {
  try {
    const { issueLabel = 'implementation-gap' } = req.body;
    const config = { ...defaultConfig, ...req.body };
    
    if (!octokit) {
      return res.status(400).json({ success: false, error: 'GitHub token not configured' });
    }
    
    logger.info('Correlating issues with coverage', { issueLabel, owner: config.githubOwner, repo: config.githubRepo });
    
    // Load coverage data
    const coverageData = loadCoverageData(config.coveragePath);
    if (!coverageData) {
      return res.status(404).json({ success: false, error: 'Coverage data not found' });
    }
    
    // Get issues with the specified label
    const { data: issues } = await octokit.issues.listForRepo({
      owner: config.githubOwner,
      repo: config.githubRepo,
      labels: issueLabel,
      state: 'all',
      per_page: 100
    });
    
    // Correlate each issue with coverage data
    const correlations: IssueCorrelation[] = [];
    
    for (const issue of issues) {
      // Extract file paths mentioned in the issue
      const fileMatches = issue.body ? issue.body.match(/file: "([^"]+)"/g) || [] : [];
      const moduleMatches = issue.body ? issue.body.match(/module: "([^"]+)"/g) || [] : [];
      
      const relatedFiles: FileCoverage[] = [];
      
      // Process file paths
      fileMatches.forEach(match => {
        const fileMatch = match.match(/file: "([^"]+)"/);
        if (fileMatch) {
          const file = fileMatch[1];
          const fileCoverage = coverageData.fileCoverageFor(file);
          if (fileCoverage) {
            relatedFiles.push({
              file,
              metrics: getFileCoverageMetrics(fileCoverage)
            });
          }
        }
      });
      
      // Process modules
      moduleMatches.forEach(match => {
        const moduleMatch = match.match(/module: "([^"]+)"/);
        if (moduleMatch) {
          const module = moduleMatch[1];
          
          // Find files that belong to this module
          coverageData.files().forEach(file => {
            if (file.includes(module) && !relatedFiles.some(f => f.file === file)) {
              const fileCoverage = coverageData.fileCoverageFor(file);
              if (fileCoverage) {
                relatedFiles.push({
                  file,
                  metrics: getFileCoverageMetrics(fileCoverage)
                });
              }
            }
          });
        }
      });
      
      // Calculate average coverage for this issue
      let avgStatementCoverage = 0;
      let avgBranchCoverage = 0;
      let avgFunctionCoverage = 0;
      let avgLineCoverage = 0;
      
      if (relatedFiles.length > 0) {
        avgStatementCoverage = roundPercentage(
          relatedFiles.reduce((sum, file) => sum + file.metrics.statements.percentage, 0) / relatedFiles.length
        );
        
        avgBranchCoverage = roundPercentage(
          relatedFiles.reduce((sum, file) => sum + file.metrics.branches.percentage, 0) / relatedFiles.length
        );
        
        avgFunctionCoverage = roundPercentage(
          relatedFiles.reduce((sum, file) => sum + file.metrics.functions.percentage, 0) / relatedFiles.length
        );
        
        avgLineCoverage = roundPercentage(
          relatedFiles.reduce((sum, file) => sum + file.metrics.lines.percentage, 0) / relatedFiles.length
        );
      }
      
      correlations.push({
        issue: {
          number: issue.number,
          title: issue.title,
          state: issue.state,
          url: issue.html_url,
          labels: issue.labels.map((label: any) => label.name)
        },
        relatedFiles,
        averageCoverage: {
          statements: avgStatementCoverage,
          branches: avgBranchCoverage,
          functions: avgFunctionCoverage,
          lines: avgLineCoverage
        },
        implementationStatus: issue.state === 'closed' ? 'Completed' : 'In Progress'
      });
    }
    
    // Calculate overall statistics
    const overallStats = {
      totalIssues: issues.length,
      openIssues: issues.filter(issue => issue.state === 'open').length,
      closedIssues: issues.filter(issue => issue.state === 'closed').length,
      issuesWithCoverage: correlations.filter(corr => corr.relatedFiles.length > 0).length,
      averageCoverage: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      }
    };
    
    // Calculate average coverage across all issues
    const issuesWithCoverage = correlations.filter(corr => corr.relatedFiles.length > 0);
    if (issuesWithCoverage.length > 0) {
      overallStats.averageCoverage.statements = roundPercentage(
        issuesWithCoverage.reduce((sum, corr) => sum + corr.averageCoverage.statements, 0) / issuesWithCoverage.length
      );
      
      overallStats.averageCoverage.branches = roundPercentage(
        issuesWithCoverage.reduce((sum, corr) => sum + corr.averageCoverage.branches, 0) / issuesWithCoverage.length
      );
      
      overallStats.averageCoverage.functions = roundPercentage(
        issuesWithCoverage.reduce((sum, corr) => sum + corr.averageCoverage.functions, 0) / issuesWithCoverage.length
      );
      
      overallStats.averageCoverage.lines = roundPercentage(
        issuesWithCoverage.reduce((sum, corr) => sum + corr.averageCoverage.lines, 0) / issuesWithCoverage.length
      );
    }
    
    res.json({
      success: true,
      correlations,
      overallStats
    });
  } catch (error: any) {
    logger.error('Error correlating issues with coverage', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Calculate implementation gap score
 */
function calculateGapScore(metrics: CoverageSummary, threshold: number): number {
  // Calculate how far each metric is below the threshold
  const stmtGap = Math.max(0, threshold - metrics.statements.percentage);
  const branchGap = Math.max(0, threshold - metrics.branches.percentage);
  const fnGap = Math.max(0, threshold - metrics.functions.percentage);
  const lineGap = Math.max(0, threshold - metrics.lines.percentage);
  
  // Weight the gaps (adjust weights as needed)
  return (stmtGap * 1.0) + (branchGap * 1.5) + (fnGap * 2.0) + (lineGap * 1.0);
}

// Start the server
// Coverage MCP should run on MCP_SERVER_PORT + 1 to avoid conflict with GitHub MCP
const basePort = parseInt(process.env.MCP_SERVER_PORT || process.env.PORT || '3001', 10);
const PORT = basePort + 1;
const HOST = process.env.MCP_SERVER_HOST || 'localhost';
const server = app.listen(PORT, HOST, () => {
  logger.info(`Coverage Analysis MCP server running on ${HOST}:${PORT}`);
});

// Export for testing
export default app;