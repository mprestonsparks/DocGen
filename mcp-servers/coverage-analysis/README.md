# Test Coverage Analysis MCP Server for Claude Code

This server implements the Claude Code Model Context Protocol (MCP) interface for analyzing test coverage results and correlating them with implementation issues.

## Features

- Get overall coverage metrics (statements, branches, functions, lines)
- Get coverage metrics for specific files
- Generate markdown coverage reports
- Analyze issue impact on coverage metrics
- Track coverage metrics history
- Identify implementation gaps based on coverage thresholds
- Correlate GitHub issues with coverage metrics
- Update GitHub issues with coverage information

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd mcp-servers/coverage-analysis
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub token and repository settings
   ```

## Usage

1. Start the server:
   ```bash
   npm start
   ```

2. Configure Claude Code to use this MCP server:
   ```bash
   claude mcp add coverage "node server.js" --cwd "/path/to/mcp-servers/coverage-analysis"
   ```

3. Analyze coverage directly from Claude Code:
   ```
   @coverage getCoverageMetrics
   ```

## API Endpoints

### GET /capabilities
Returns the server's capabilities and parameter specifications.

### POST /getCoverageMetrics
Get overall coverage metrics.

Parameters:
- `coveragePath`: Path to coverage directory (optional)

### POST /getFileCoverage
Get coverage metrics for a specific file.

Parameters:
- `file`: File path (relative to project root)
- `coveragePath`: Path to coverage directory (optional)

### POST /generateCoverageReport
Generate a coverage report in markdown format.

Parameters:
- `outputPath`: Output path for the report (optional)
- `updateIssues`: Update GitHub issues with coverage info (optional)

### POST /analyzeIssueImpact
Analyze which files and coverage metrics are impacted by an issue.

Parameters:
- `issueNumber`: The GitHub issue number

### POST /getCoverageHistory
Get coverage metrics history.

Parameters:
- `days`: Number of days in history. Default: 30

### POST /getImplementationGaps
Identify files with implementation gaps based on coverage metrics.

Parameters:
- `coveragePath`: Path to coverage directory (optional)
- `threshold`: Coverage threshold percentage for identifying gaps. Default: 80

### POST /correlateIssuesWithCoverage
Correlate GitHub issues with coverage metrics.

Parameters:
- `issueLabel`: Label to filter GitHub issues. Default: "implementation-gap"

## Example Usage from Claude Code

```
Let's check our current test coverage metrics.

@coverage getCoverageMetrics
```

```
Find files that need implementation improvements.

@coverage getImplementationGaps --threshold 70
```

```
Correlate our implementation issues with test coverage.

@coverage correlateIssuesWithCoverage
```

## Integration with DocGen

This MCP server integrates with the DocGen implementation tracking system to correlate coverage metrics with implementation gap issues. It's part of a comprehensive approach to tracking implementation completeness as described in the [monitoring system documentation](../../docs/monitoring-system.md).

## How It Works

The server performs the following main functions:

1. **Coverage Data Analysis**: Parses Istanbul coverage reports to extract metrics
2. **Directory-Level Aggregation**: Aggregates file-level metrics to directory level
3. **Report Generation**: Creates markdown reports with tables and progress bars
4. **GitHub Integration**: Updates issues with coverage information
5. **History Tracking**: Maintains historical coverage data for trend analysis

## Files Generated

- `docs/reports/coverage-report.md`: Detailed coverage report with metrics and recommendations
- `docs/reports/coverage-history.json`: Historical coverage data for trending

## Security Considerations

- The server requires a GitHub personal access token with `repo` scope
- Never commit your `.env` file with the token
- Consider running the server locally to prevent exposing your GitHub token
- Set up proper authentication if deploying in a shared environment

## Testing

Run the test suite:
```bash
npm test
```

## License

MIT