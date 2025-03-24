# Docker-Based CI/CD Guide

## Overview

This document explains the Docker-based Continuous Integration (CI) and Continuous Deployment (CD) setup for DocGen. The system uses GitHub Actions to run tests and validations in Docker containers, ensuring consistent behavior across different environments.

## GitHub Actions Workflows

### Cross-Platform CI

The `cross-platform-ci.yml` workflow tests DocGen across multiple platforms:

1. **Docker-based tests**: Tests running in Docker containers on Linux
2. **Windows tests**: Native tests on Windows
3. **macOS tests**: Native tests on macOS
4. **AI Provider tests**: Tests for the AI provider abstraction layer

This workflow runs on push to main/develop branches, on pull requests, or via manual dispatch.

## Docker Test Setup

### Docker Image

The CI pipeline uses a Docker image defined in `.docker/Dockerfile` which includes:

1. Node.js 20 environment
2. Python 3 with key packages
3. All npm dependencies pre-installed
4. Development tools and utilities

### Test Runner Script

The `scripts/ci/docker-test-runner.js` script provides a CLI for Docker-based testing:

```bash
# Build the Docker image
npm run ci:docker:build

# Run tests in Docker
npm run ci:docker:test

# Verify MCP servers in Docker
npm run ci:docker:verify-mcp

# Run the full test suite
npm run ci:docker:full
```

This script handles:
- Building Docker images with the right context
- Running tests in isolated containers
- Verifying MCP servers work correctly in Docker
- Cleaning up containers after tests

## Windows Testing

The Windows CI tests verify:

1. All tests pass on Windows
2. PowerShell scripts execute correctly
3. Path handling works correctly across platforms
4. Environment variables are correctly processed

## macOS Testing

The macOS CI tests verify:

1. All tests pass on macOS
2. Bash scripts execute correctly
3. Claude Code integration works as expected

## AI Provider Testing

This job tests the AI provider abstraction layer:

1. Provider factory creates the correct providers
2. Platform detection works correctly
3. Fallback mechanisms work when primary providers are unavailable
4. Configuration generation works for all providers

## Running CI Locally

You can run the same CI tests locally:

```bash
# Run Docker-based tests
npm run ci:docker:full

# Run specific tests in Docker
npm run ci:docker:test "cd /app && npm test -- tests/validation.test.ts"

# Verify MCP servers
npm run ci:docker:verify-mcp
```

## Adding Tests to CI

When adding new tests to the CI pipeline:

1. Add test files to the `tests/` directory
2. Ensure tests are platform-agnostic or use platform detection
3. For platform-specific tests, use `os.platform()` to conditionally run them
4. Add any new dependencies to both `package.json` and `.docker/Dockerfile`

## CI Environment Variables

The CI pipeline uses these environment variables:

- **GITHUB_TOKEN**: Used for GitHub API access (provided by GitHub Actions)
- **NODE_ENV**: Set to `test` during test runs
- **CI**: Set to `true` to indicate CI environment
- **DOCKER_BUILDKIT**: Set to `1` to use BuildKit for Docker builds

## Docker Compose Configuration

For local development and testing, a Docker Compose configuration is provided:

```yaml
# .docker/docker-compose.yml
services:
  docgen:
    build:
      context: ..
      dockerfile: .docker/Dockerfile
    volumes:
      - ..:/app
      - node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
    ports:
      - "7865:7865"  # Coverage MCP
      - "7866:7866"  # GitHub MCP
      - "7867:7867"  # Coverage REST API
      - "7868:7868"  # GitHub REST API
```

## Windows-Specific CI Considerations

When testing on Windows:

1. Use Windows-style paths with double backslashes in config files
2. Set the execution policy for PowerShell scripts
3. Use correct line endings (CRLF for Windows, LF for Linux/macOS)
4. Consider drive letter and UNC path differences

## Troubleshooting CI Issues

### Docker Build Failures

If Docker build fails:
- Check `.docker/Dockerfile` for syntax errors
- Verify all dependencies are correctly specified
- Look for filesystem permission issues
- Check for network errors during dependency installation

### Test Failures on Specific Platforms

If tests fail on specific platforms:
- Check for platform-specific path handling
- Verify environment variable usage
- Check for temp directory handling differences
- Look for filesystem case sensitivity issues
- Validate line ending handling

### MCP Server Issues

If MCP server verification fails:
- Check network binding configurations
- Verify port mappings in Docker Compose
- Look for port conflicts
- Check for correct environment variables

## Future Improvements

1. **Caching Improvements**: Better caching for Docker layers and npm dependencies
2. **Windows Docker Support**: Add testing in Windows Docker containers
3. **Performance Optimization**: Parallel test execution for faster CI runs
4. **Cross-Browser Testing**: Add browser testing with Playwright or Selenium
5. **Coverage Reporting**: Merge coverage reports from all platforms