# DocGen MCP Servers

This directory contains Model Context Protocol (MCP) servers for enhancing AI functionality with the DocGen project.

## What is MCP?

Model Control Protocol (MCP) allows Claude Code to connect to external servers for enhanced capabilities. These servers provide specialized functionality that extends Claude's abilities beyond its built-in tools.

## Available Servers

### 1. GitHub Issues MCP
[./github-issues](./github-issues)

Enables Claude to directly interact with GitHub issues:
- Query, create, and update GitHub issues
- Track implementation gaps
- Update issue progress automatically
- Generate implementation status reports

### 2. Test Coverage Analysis MCP
[./coverage-analysis](./coverage-analysis)

Provides test coverage analysis capabilities:
- Parse Istanbul coverage reports
- Generate markdown coverage reports
- Correlate coverage with implementation issues
- Track coverage metrics history
- Update GitHub issues with coverage information

### 3. Code Quality MCP
[./code-quality](./code-quality) (Coming soon)

Will provide code quality analysis:
- Integration with ESLint
- Static analysis for implementation completeness
- Custom linting rules for TO-DO comments
- Implementation gap analysis

### 4. Documentation Generation MCP
[./doc-generation](./doc-generation) (Coming soon)

Will automate documentation updates:
- Generate implementation progress documentation
- Update component documentation based on code changes
- Track documentation completeness
- Generate implementation diagrams

## Using MCP Servers with Claude Code

1. Install server dependencies:
   ```bash
   cd mcp-servers/github-issues
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Configure Claude Code to use the server:
   ```bash
   claude mcp add github "node server.js" --cwd "/path/to/mcp-servers/github-issues"
   ```

5. Use the server from Claude Code:
   ```
   @github getIssues --labels "implementation-gap"
   ```

## MCP Server Security

MCP servers can access external services and APIs, so follow these security practices:

1. Never commit API tokens or sensitive credentials
2. Run servers locally rather than on public networks when possible
3. Limit server permissions to only what is needed
4. Review server code for security issues before deployment
5. Use environment variables for all sensitive configuration

## Contributing

To create a new MCP server:

1. Create a new directory with a descriptive name
2. Implement the server using the MCP protocol
3. Include a README.md with usage instructions
4. Add environment variable examples in .env.example
5. Document the server's capabilities
6. Create tests to verify functionality

## License

MIT
