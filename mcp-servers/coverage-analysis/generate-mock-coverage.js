#!/usr/bin/env node
/**
 * Generate Mock Coverage Data
 * 
 * This script generates mock coverage data for the DocGen project.
 * It creates a coverage directory and populates it with coverage data
 * for use by the Coverage Analysis MCP server.
 */

const fs = require('fs');
const path = require('path');

// Project paths
const COVERAGE_DIR = path.resolve(__dirname, 'coverage');
const COVERAGE_FILE = path.join(COVERAGE_DIR, 'coverage-final.json');

// Ensure coverage directory exists
if (!fs.existsSync(COVERAGE_DIR)) {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  console.log(`Created coverage directory: ${COVERAGE_DIR}`);
}

// Generate mock coverage data for a file
function generateFileCoverage(filePath, coverage = {}) {
  const defaultCoverage = {
    lines: { total: 100, covered: 70, skipped: 0, pct: 70 },
    functions: { total: 20, covered: 12, skipped: 0, pct: 60 },
    statements: { total: 120, covered: 84, skipped: 0, pct: 70 },
    branches: { total: 40, covered: 24, skipped: 0, pct: 60 }
  };

  const fileCoverage = {
    path: filePath,
    statementMap: {},
    fnMap: {},
    branchMap: {},
    s: {},
    f: {},
    b: {},
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "hash-value",
    ...coverage
  };

  // Generate statement coverage
  for (let i = 0; i < defaultCoverage.statements.total; i++) {
    fileCoverage.statementMap[i] = {
      start: { line: i + 1, column: 0 },
      end: { line: i + 1, column: 50 }
    };
    fileCoverage.s[i] = i < defaultCoverage.statements.covered ? 1 : 0;
  }

  // Generate function coverage
  for (let i = 0; i < defaultCoverage.functions.total; i++) {
    fileCoverage.fnMap[i] = {
      name: `function${i}`,
      decl: {
        start: { line: i * 5 + 1, column: 0 },
        end: { line: i * 5 + 1, column: 20 }
      },
      loc: {
        start: { line: i * 5 + 1, column: 0 },
        end: { line: i * 5 + 5, column: 1 }
      }
    };
    fileCoverage.f[i] = i < defaultCoverage.functions.covered ? 1 : 0;
  }

  // Generate branch coverage
  for (let i = 0; i < defaultCoverage.branches.total; i++) {
    fileCoverage.branchMap[i] = {
      loc: {
        start: { line: i * 3 + 2, column: 0 },
        end: { line: i * 3 + 2, column: 50 }
      },
      type: 'if',
      locations: [
        {
          start: { line: i * 3 + 2, column: 0 },
          end: { line: i * 3 + 2, column: 20 }
        },
        {
          start: { line: i * 3 + 2, column: 21 },
          end: { line: i * 3 + 2, column: 50 }
        }
      ]
    };
    fileCoverage.b[i] = [
      i < defaultCoverage.branches.covered / 2 ? 1 : 0,
      i < defaultCoverage.branches.covered ? 1 : 0
    ];
  }

  return fileCoverage;
}

// Files to generate coverage for
const files = [
  'src/utils/ast-analyzer.ts',
  'src/utils/todo-validator.ts',
  'src/utils/llm.ts',
  'src/utils/project-analyzer.ts',
  'src/utils/logger.ts',
  'src/utils/config.ts',
  'src/utils/validation.ts',
  'src/utils/session.ts',
  'src/utils/generator.ts',
  'src/index.ts',
  'src/paper_architect/index.ts',
  'src/paper_architect/extraction/index.ts',
  'src/paper_architect/knowledge/index.ts',
  'src/paper_architect/specifications/index.ts',
  'src/paper_architect/traceability/index.ts',
  'src/paper_architect/utils/index.ts',
  'src/paper_architect/workflow/index.ts'
];

// Generate coverage data
const coverageData = {};

files.forEach(file => {
  // Generate random coverage percentages
  const pctStatements = Math.floor(Math.random() * 100);
  const pctFunctions = Math.floor(Math.random() * 100);
  const pctBranches = Math.floor(Math.random() * 100);
  const pctLines = Math.floor(Math.random() * 100);

  // Calculate totals
  const statementTotal = 100;
  const functionTotal = 20;
  const branchTotal = 40;
  const lineTotal = 100;

  // Calculate covered
  const statementCovered = Math.floor(statementTotal * pctStatements / 100);
  const functionCovered = Math.floor(functionTotal * pctFunctions / 100);
  const branchCovered = Math.floor(branchTotal * pctBranches / 100);
  const lineCovered = Math.floor(lineTotal * pctLines / 100);

  // Create the coverage object
  const coverage = {
    lines: { total: lineTotal, covered: lineCovered, skipped: 0, pct: pctLines },
    functions: { total: functionTotal, covered: functionCovered, skipped: 0, pct: pctFunctions },
    statements: { total: statementTotal, covered: statementCovered, skipped: 0, pct: pctStatements },
    branches: { total: branchTotal, covered: branchCovered, skipped: 0, pct: pctBranches }
  };

  // Add file coverage to the coverage data
  coverageData[file] = generateFileCoverage(file, coverage);
});

// Write coverage data to file
fs.writeFileSync(COVERAGE_FILE, JSON.stringify(coverageData, null, 2));
console.log(`Generated mock coverage data: ${COVERAGE_FILE}`);

// Create a summary file
const summary = {
  total: {
    lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
    statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
    functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
  }
};

// Calculate totals
let totalLines = 0;
let coveredLines = 0;
let totalStatements = 0;
let coveredStatements = 0;
let totalFunctions = 0;
let coveredFunctions = 0;
let totalBranches = 0;
let coveredBranches = 0;

Object.values(coverageData).forEach(file => {
  totalLines += Object.keys(file.s).length;
  coveredLines += Object.values(file.s).filter(v => v > 0).length;
  totalStatements += Object.keys(file.s).length;
  coveredStatements += Object.values(file.s).filter(v => v > 0).length;
  totalFunctions += Object.keys(file.f).length;
  coveredFunctions += Object.values(file.f).filter(v => v > 0).length;
  totalBranches += Object.values(file.b).flat().length;
  coveredBranches += Object.values(file.b).flat().filter(v => v > 0).length;
});

// Update summary
summary.total.lines.total = totalLines;
summary.total.lines.covered = coveredLines;
summary.total.lines.pct = Math.floor((coveredLines / totalLines) * 100);
summary.total.statements.total = totalStatements;
summary.total.statements.covered = coveredStatements;
summary.total.statements.pct = Math.floor((coveredStatements / totalStatements) * 100);
summary.total.functions.total = totalFunctions;
summary.total.functions.covered = coveredFunctions;
summary.total.functions.pct = Math.floor((coveredFunctions / totalFunctions) * 100);
summary.total.branches.total = totalBranches;
summary.total.branches.covered = coveredBranches;
summary.total.branches.pct = Math.floor((coveredBranches / totalBranches) * 100);

// Add file summaries
Object.entries(coverageData).forEach(([file, coverage]) => {
  summary[file] = {
    lines: {
      total: Object.keys(coverage.s).length,
      covered: Object.values(coverage.s).filter(v => v > 0).length,
      pct: Math.floor((Object.values(coverage.s).filter(v => v > 0).length / Object.keys(coverage.s).length) * 100)
    },
    functions: {
      total: Object.keys(coverage.f).length,
      covered: Object.values(coverage.f).filter(v => v > 0).length,
      pct: Math.floor((Object.values(coverage.f).filter(v => v > 0).length / Object.keys(coverage.f).length) * 100)
    },
    statements: {
      total: Object.keys(coverage.s).length,
      covered: Object.values(coverage.s).filter(v => v > 0).length,
      pct: Math.floor((Object.values(coverage.s).filter(v => v > 0).length / Object.keys(coverage.s).length) * 100)
    },
    branches: {
      total: Object.values(coverage.b).flat().length,
      covered: Object.values(coverage.b).flat().filter(v => v > 0).length,
      pct: Math.floor((Object.values(coverage.b).flat().filter(v => v > 0).length / Object.values(coverage.b).flat().length) * 100)
    }
  };
});

// Write summary to file
fs.writeFileSync(
  path.join(COVERAGE_DIR, 'coverage-summary.json'),
  JSON.stringify(summary, null, 2)
);
console.log(`Generated mock coverage summary: ${path.join(COVERAGE_DIR, 'coverage-summary.json')}`);

console.log('Mock coverage data generation complete');