# Claude Workflow Manager

The Claude Workflow Manager is an intelligent system that automates the process of determining and recommending optimal workflow steps for Claude Code when working with the DocGen project.

## Overview

The workflow manager provides a seamless way to:

1. **Automatically Start Services**: Ensures MCP servers are running before any work begins
2. **Analyze Project State**: Examines the current state of the project, issues, and code
3. **Determine Optimal Actions**: Uses AI-driven logic to find the most effective next steps
4. **Provide Clear Guidance**: Outputs step-by-step instructions for Claude Code
5. **Maintain Context**: Keeps track of the project state as work progresses

![Claude Workflow Manager](./assets/claude-workflow-manager.png)

## Getting Started

The easiest way to use the Claude Workflow Manager is with the "get to work" command:

```bash
# Run the complete workflow manager
./get-to-work.sh

# Alternative npm command
npm run get-to-work
```

When working with Claude Code, simply say:
- "Get to work"
- "What should I work on next?"

Claude will launch the workflow manager and follow its guidance.

## Components

### 1. Workflow Manager Script

The core component is `scripts/claude-workflow-manager.js`, which:

- Checks if MCP servers are running and starts them if needed
- Analyzes the project state by querying MCP servers
- Determines the optimal workflow based on the current state
- Generates step-by-step guidance for Claude

### 2. MCP Server Integration

The workflow manager integrates with two MCP servers:

- **GitHub Issues MCP**: For tracking implementation gaps and issues
- **Coverage Analysis MCP**: For identifying code coverage issues

### 3. Intelligent Analysis

The system analyzes multiple aspects of the project:

- **Implementation Status**: Current progress on implementation gaps
- **Coverage Analysis**: Files with low test coverage
- **GitHub Issues**: Open implementation issues
- **Code Repository**: Uncommitted changes and TODO items
- **Correlation Analysis**: Relationships between issues and code files

### 4. Workflow Determination

Based on the analysis, the system determines the optimal workflow, which typically includes:

1. Checking current implementation status
2. Identifying and prioritizing implementation gaps
3. Creating issues for gaps without associated tickets
4. Working on the most critical open issues
5. Correlating issues with code coverage
6. Updating implementation status after making changes

## Usage Patterns

### 1. Start of Session

At the beginning of a development session, run:

```bash
./get-to-work.sh
```

Claude will see the guidance and begin following the recommended workflow steps.

### 2. New Work Determination

When unsure what to work on next, ask Claude:

```
What should I work on next based on the current project state?
```

Claude will run the workflow manager again and provide updated guidance.

### 3. Implementation Gap Workflow

The most common workflow follows this pattern:

1. Identify files with implementation gaps
2. Create GitHub issues for gaps that need attention
3. Work on the highest priority issues
4. Update issue status and regenerate reports
5. Repeat the process

## Advanced Usage

### Custom Workflow Steps

You can direct Claude to execute specific parts of the workflow:

```
# Get implementation status
@github status

# Find implementation gaps
@coverage getImplementationGaps

# Correlate issues with coverage
@coverage correlateIssuesWithCoverage
```

### Script Configuration

The workflow manager can be customized by editing `scripts/claude-workflow-manager.js`:

- Adjust thresholds for implementation gap detection
- Change prioritization logic for issues
- Modify the workflow steps generated

## Troubleshooting

If the workflow manager encounters issues:

1. **MCP Server Connection**: Ensure both MCP servers are running (`npm run mcp:start`)
2. **GitHub API**: Check that the GitHub token is configured correctly
3. **Coverage Data**: Make sure test coverage data exists (`npm test -- --coverage`)
4. **Node.js Issues**: Verify that Node.js is installed and in the right version

## Related Documents

- [GitHub Issues Workflow](./github-issues-workflow.md)
- [Monitoring System](./monitoring-system.md)
- [Implementation Plan](./implementation-plan.md)