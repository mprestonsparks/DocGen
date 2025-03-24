/**
 * Project Analyzer
 * 
 * Core module for analyzing the DocGen project state, including:
 * - Test status
 * - Code coverage
 * - Implementation gaps
 * - Repository structure
 * 
 * This module is platform-agnostic and can be used by any developer
 * regardless of whether they're using Claude Code.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PROJECT_ROOT = path.resolve(process.cwd());

// ANSI color codes for terminal output
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

/**
 * Check if tests are passing
 */
async function checkTestStatus() {
  try {
    console.log(`${colors.blue}Checking test status...${colors.reset}`);
    
    // Create log directory if it doesn't exist
    const logDir = path.join(PROJECT_ROOT, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const testLogPath = path.join(logDir, 'test-output.log');
    
    try {
      // Run tests and capture output
      execSync('npm test', { 
        cwd: PROJECT_ROOT,
        stdio: ['ignore', fs.openSync(testLogPath, 'w'), fs.openSync(testLogPath, 'a')]
      });
      
      console.log(`${colors.green}All tests are passing!${colors.reset}`);
      return { passing: true, logPath: testLogPath };
    } catch (error) {
      // Tests failed
      const testOutput = fs.readFileSync(testLogPath, 'utf8');
      const failingTests = testOutput.match(/FAIL\s+([^\n]+)/g) || [];
      
      console.log(`${colors.red}Found ${failingTests.length} failing tests.${colors.reset}`);
      return { 
        passing: false, 
        failingTests: failingTests.map(test => test.replace('FAIL', '').trim()),
        logPath: testLogPath
      };
    }
  } catch (error) {
    console.error(`${colors.red}Error checking test status: ${error.message}${colors.reset}`);
    return { passing: false, error: error.message };
  }
}

/**
 * Get implementation status
 */
async function getImplementationStatus() {
  try {
    console.log(`${colors.blue}Analyzing implementation status...${colors.reset}`);
    
    // Get list of source files
    const srcDir = path.join(PROJECT_ROOT, 'src');
    const testDir = path.join(PROJECT_ROOT, 'test');
    
    if (!fs.existsSync(srcDir)) {
      return { error: 'Source directory not found' };
    }
    
    // Count source files and test files
    const sourceFiles = countFiles(srcDir, ['.ts', '.js']);
    const testFiles = fs.existsSync(testDir) ? countFiles(testDir, ['.ts', '.js']) : 0;
    
    // Calculate test coverage ratio
    const coverageRatio = testFiles / sourceFiles;
    const coveragePercent = Math.round(coverageRatio * 100);
    
    console.log(`${colors.cyan}Source files: ${sourceFiles}${colors.reset}`);
    console.log(`${colors.cyan}Test files: ${testFiles}${colors.reset}`);
    console.log(`${colors.cyan}Test coverage ratio: ${coveragePercent}%${colors.reset}`);
    
    return {
      sourceFiles,
      testFiles,
      coverageRatio,
      coveragePercent
    };
  } catch (error) {
    console.error(`${colors.red}Error analyzing implementation status: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

/**
 * Get implementation gaps
 */
async function getImplementationGaps(threshold = 70) {
  try {
    console.log(`${colors.blue}Identifying implementation gaps...${colors.reset}`);
    
    // Get list of source directories
    const srcDir = path.join(PROJECT_ROOT, 'src');
    if (!fs.existsSync(srcDir)) {
      return { error: 'Source directory not found' };
    }
    
    const subdirs = fs.readdirSync(srcDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const gaps = [];
    
    // Analyze each subdirectory
    for (const subdir of subdirs) {
      const sourceDir = path.join(srcDir, subdir);
      const testDir = path.join(PROJECT_ROOT, 'test', subdir);
      
      const sourceFiles = countFiles(sourceDir, ['.ts', '.js']);
      const testFiles = fs.existsSync(testDir) ? countFiles(testDir, ['.ts', '.js']) : 0;
      
      if (sourceFiles > 0) {
        const coverageRatio = testFiles / sourceFiles;
        const coveragePercent = Math.round(coverageRatio * 100);
        
        if (coveragePercent < threshold) {
          gaps.push({
            component: subdir,
            sourceFiles,
            testFiles,
            coveragePercent
          });
        }
      }
    }
    
    // Sort gaps by coverage (lowest first)
    gaps.sort((a, b) => a.coveragePercent - b.coveragePercent);
    
    console.log(`${colors.yellow}Found ${gaps.length} components below ${threshold}% test coverage${colors.reset}`);
    return { gaps, threshold };
  } catch (error) {
    console.error(`${colors.red}Error identifying implementation gaps: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

/**
 * Analyze code repository
 */
async function analyzeCodeRepository() {
  try {
    console.log(`${colors.blue}Analyzing code repository...${colors.reset}`);
    
    // Get repository structure
    const structure = {
      hasTypeScript: fs.existsSync(path.join(PROJECT_ROOT, 'tsconfig.json')),
      hasPython: fs.existsSync(path.join(PROJECT_ROOT, 'requirements.txt')),
      hasDocker: fs.existsSync(path.join(PROJECT_ROOT, '.docker')),
      hasTests: fs.existsSync(path.join(PROJECT_ROOT, 'test')),
      hasDocs: fs.existsSync(path.join(PROJECT_ROOT, 'docs')),
      hasGithubWorkflow: fs.existsSync(path.join(PROJECT_ROOT, '.github')),
    };
    
    // Get dependency information
    let dependencies = {};
    const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
    }
    
    return {
      structure,
      dependencies,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`${colors.red}Error analyzing code repository: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

/**
 * Determine optimal workflow based on project state
 */
async function determineWorkflow() {
  try {
    console.log(`${colors.blue}Determining optimal workflow...${colors.reset}`);
    
    // Get test status
    const testStatus = await checkTestStatus();
    
    // Initialize workflow steps
    const workflow = {
      priority: 'normal',
      steps: [],
      recommendations: []
    };
    
    // If tests are failing, fix them first
    if (!testStatus.passing) {
      workflow.priority = 'high';
      workflow.steps.push({
        action: 'Fix failing tests',
        priority: 'high',
        details: `${testStatus.failingTests?.length || 0} tests are failing`
      });
      
      workflow.recommendations.push(
        'Run specific failing tests with: npm test -- -t "test name"',
        'Check the test logs at: ' + testStatus.logPath
      );
      
      return workflow;
    }
    
    // Get implementation gaps
    const gapsResult = await getImplementationGaps();
    
    if (!gapsResult.error && gapsResult.gaps.length > 0) {
      workflow.steps.push({
        action: 'Improve test coverage',
        priority: 'medium',
        details: `${gapsResult.gaps.length} components below ${gapsResult.threshold}% coverage`
      });
      
      // Add specific components that need coverage
      gapsResult.gaps.slice(0, 3).forEach(gap => {
        workflow.steps.push({
          action: `Add tests for ${gap.component}`,
          priority: 'medium',
          details: `Current coverage: ${gap.coveragePercent}%, ${gap.testFiles}/${gap.sourceFiles} files have tests`
        });
      });
    }
    
    // Get repository analysis
    const repoAnalysis = await analyzeCodeRepository();
    
    if (!repoAnalysis.error) {
      // Check for documentation
      if (!repoAnalysis.structure.hasDocs) {
        workflow.steps.push({
          action: 'Add project documentation',
          priority: 'medium',
          details: 'Documentation directory not found'
        });
      }
      
      // Check for GitHub workflow
      if (!repoAnalysis.structure.hasGithubWorkflow) {
        workflow.steps.push({
          action: 'Set up GitHub Actions workflow',
          priority: 'low',
          details: 'Continuous integration not configured'
        });
      }
    }
    
    console.log(`${colors.green}Determined ${workflow.steps.length} workflow steps${colors.reset}`);
    return workflow;
  } catch (error) {
    console.error(`${colors.red}Error determining workflow: ${error.message}${colors.reset}`);
    return { error: error.message };
  }
}

// Utility function to count files with specific extensions
function countFiles(dir, extensions) {
  let count = 0;
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isDirectory()) {
        count += countFiles(path.join(dir, file.name), extensions);
      } else if (file.isFile()) {
        const ext = path.extname(file.name).toLowerCase();
        if (extensions.includes(ext)) {
          count++;
        }
      }
    }
  } catch (error) {
    console.error(`Error counting files in ${dir}: ${error.message}`);
  }
  
  return count;
}

module.exports = {
  checkTestStatus,
  getImplementationStatus,
  getImplementationGaps,
  analyzeCodeRepository,
  determineWorkflow,
  colors
};
