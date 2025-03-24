# GitHub Issues Workflow for Claude Code

This document outlines the comprehensive workflow for using Claude Code with GitHub Issues for implementation tracking and monitoring.

## Overview

The GitHub Issues Workflow provides a seamless integration between Claude Code and GitHub issues, enabling:

1. **Implementation Gap Tracking**: Track incomplete code through GitHub issues
2. **Coverage Analysis**: Correlate test coverage with implementation status
3. **Automated Issue Management**: Create, update, and monitor issues directly from Claude
4. **Implementation Monitoring**: Generate reports on implementation completeness

![GitHub Issues Workflow](./assets/github-issues-workflow.png)

## Prerequisites

To use the GitHub Issues Workflow, you need:

1. **MCP Servers Running**: Both the GitHub Issues and Coverage Analysis MCP servers must be running
2. **GitHub Personal Access Token**: With repo scope
3. **Claude Code Setup**: Claude Code CLI installed and configured with MCP servers

## Workflow Components

### 1. MCP Servers

Two Model Context Protocol (MCP) servers provide the foundation for this workflow:

- **GitHub Issues MCP** (`mcp-servers/github-issues`): Interacts with GitHub Issues API
- **Coverage Analysis MCP** (`mcp-servers/coverage-analysis`): Analyzes test coverage data

Start the servers using:

```bash
./mcp-servers/start-mcp-servers.sh
```

### 2. CLI Tool

The workflow includes a dedicated CLI tool for both command-line use and Claude Code integration:

```bash
# View available commands
ts-node scripts/github-issues-workflow.ts --help

# Get implementation status
ts-node scripts/github-issues-workflow.ts status

# Get implementation gap issues
ts-node scripts/github-issues-workflow.ts issues --implementation-gaps

# Find coverage gaps
ts-node scripts/github-issues-workflow.ts gaps

# Update all issues with coverage data
ts-node scripts/github-issues-workflow.ts update-all-issues
```

### 3. Claude Code Integration

Claude Code can interact with the workflow using MCP commands:

```
@github status
@github issues --implementation-gaps
@coverage getImplementationGaps
@coverage correlateIssuesWithCoverage
```

## Common Workflows

### 1. Implementation Gap Identification

To identify implementation gaps in the codebase:

1. Claude analyzes code for TODO comments using the todo-validator
2. Claude analyzes test coverage using the Coverage Analysis MCP
3. Claude identifies files with low coverage using `getImplementationGaps`
4. Claude creates GitHub issues for each identified gap with `createIssue`

Example Claude interaction:

```
User: Let's identify implementation gaps in the codebase.

Claude: I'll analyze the codebase for implementation gaps.

@coverage getImplementationGaps --threshold 70

Based on the coverage analysis, I found 5 files with implementation gaps. Would you like me to create GitHub issues for these gaps?

User: Yes, please create issues for the top 3 gaps.

Claude: Creating GitHub issues for implementation gaps...

@github gaps --create-issues --threshold 70

Issues created successfully:
- #42: Implementation Gap: src/paper_architect/extraction/index.ts
- #43: Implementation Gap: src/paper_architect/knowledge/index.ts
- #44: Implementation Gap: src/utils/llm.ts
```

### 2. Implementation Progress Tracking

To track implementation progress:

1. Claude fetches current implementation status with `getImplementationStatus`
2. Claude analyzes open implementation gap issues with `getIssues`
3. Claude correlates issues with coverage using `correlateIssuesWithCoverage`
4. Claude generates a comprehensive report

Example Claude interaction:

```
User: What's our current implementation status?

Claude: Let me check the current implementation status.

@github status

Implementation Status Overview:
- Total implementation gap issues: 18
- Closed: 12 (67% complete)
- Open: 6 (33% remaining)

Implementation by Module:
- paper_architect/extraction: 80% complete
- paper_architect/knowledge: 60% complete
- paper_architect/workflow: 90% complete
- utils: 75% complete
```

### 3. Coverage Improvement Workflow

To improve test coverage for implementation gaps:

1. Claude identifies files with low coverage using `getImplementationGaps`
2. Claude examines the specific uncovered lines in those files
3. Claude suggests test cases to improve coverage
4. Claude monitors coverage improvement with `generateCoverageReport`
5. Claude updates issues when coverage meets thresholds

Example Claude interaction:

```
User: Let's improve test coverage for the extraction module.

Claude: I'll analyze the coverage for the extraction module.

@coverage getFileCoverage --file "src/paper_architect/extraction/index.ts"

The file has 65% statement coverage, 40% branch coverage, and 70% function coverage.

Looking at the uncovered lines (23-45, 78-92), these appear to be error handling code paths and the PDF extraction functionality.

Would you like me to help write tests for these uncovered areas?

User: Yes, please focus on the PDF extraction functionality.

Claude: [Proceeds to help write tests for the PDF extraction functionality]

Let's check if our new tests improved coverage:

@coverage getFileCoverage --file "src/paper_architect/extraction/index.ts"

Great improvement! The file now has 85% statement coverage, 70% branch coverage, and 90% function coverage.

Should I update the related implementation gap issue?

User: Yes, please.

Claude: @github update --number 42 --state closed --body "Implementation gap resolved. Test coverage now meets thresholds."
```

## Implementation Guidelines

When working with the GitHub Issues Workflow, follow these guidelines:

1. **Issue Creation**:
   - Use clear, descriptive titles
   - Include file paths in the format `file: "path/to/file.ts"`
   - Use module references in the format `module: "path/to/module"`
   - Apply appropriate labels (`implementation-gap`, `coverage-improvement`, etc.)

2. **Coverage Analysis**:
   - Coverage thresholds: Statements 80%, Branches 60%, Functions 70%, Lines 80%
   - Focus on high gap scores first (weighted formula of missing coverage)
   - Look for semantic gaps in addition to coverage gaps

3. **Implementation Status Reporting**:
   - Run `update-all-issues` regularly to keep issues in sync with coverage
   - Generate coverage reports to track progress over time
   - Update the main tracking issue (#19) with progress updates

## Troubleshooting

If you encounter issues with the workflow:

1. **MCP Server Connection Issues**:
   - Ensure both MCP servers are running (`ps aux | grep server.js`)
   - Check server logs for errors (`cat github-issues-mcp.log`)
   - Verify Claude Code MCP configuration (`claude mcp status`)

2. **GitHub API Issues**:
   - Check if your GitHub token has the correct permissions
   - Ensure it hasn't expired or been revoked
   - Verify repository access permissions

3. **Coverage Analysis Issues**:
   - Ensure coverage reports exist (`coverage/coverage-final.json`)
   - Run tests with coverage enabled (`npm test -- --coverage`)
   - Check for parsing errors in coverage reports

## Command Reference

### GitHub Issues MCP Commands

| Command | Description |
|---------|-------------|
| `getIssues` | Get list of issues |
| `getIssue` | Get a specific issue by number |
| `createIssue` | Create a new issue |
| `updateIssue` | Update an existing issue |
| `addComment` | Add a comment to an issue |
| `getImplementationStatus` | Get implementation status information |
| `getPullRequests` | Get list of pull requests |
| `getPullRequest` | Get a specific pull request |
| `createPullRequest` | Create a new pull request |
| `getFilesChanged` | Get files changed in a pull request |

### Coverage Analysis MCP Commands

| Command | Description |
|---------|-------------|
| `getCoverageMetrics` | Get overall coverage metrics |
| `getFileCoverage` | Get coverage for a specific file |
| `generateCoverageReport` | Generate a coverage report |
| `analyzeIssueImpact` | Analyze which files are impacted by an issue |
| `getCoverageHistory` | Get coverage metrics history |
| `getImplementationGaps` | Identify implementation gaps using coverage data |
| `correlateIssuesWithCoverage` | Correlate issues with coverage metrics |

## Related Documents

- [Monitoring System](./monitoring-system.md)
- [Monitoring System Architecture](./monitoring-system-architecture.md)
- [Implementation Plan](./implementation-plan.md)
- [Traceability Matrix](./traceability/matrix.yaml)