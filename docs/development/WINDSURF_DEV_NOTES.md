# Windsurf IDE Integration - Developer Notes

## Architecture Overview

The Windsurf IDE integration for DocGen follows the Provider design pattern to enable AI provider abstraction across platforms. This document explains the technical implementation for developers maintaining or extending this code.

## Component Structure

```
src/ai-provider/
├── provider-interface.js     # Abstract interface for AI providers
├── detect.js                 # Platform detection logic
├── factory.js                # Factory pattern implementation
├── configure-windsurf.js     # Windsurf configuration utility
└── providers/
    ├── windsurf.js           # Windsurf IDE provider implementation
    ├── claude-code.js        # Claude Code provider implementation
    └── no-op.js              # Fallback provider implementation
```

### Key Design Patterns

1. **Interface Segregation**: A common interface defines what all AI providers must implement
2. **Factory Pattern**: Runtime selection of appropriate provider implementation
3. **Platform Detection**: Automatic selection based on OS and available tools
4. **Singleton**: Each provider is exported as a singleton instance
5. **Strategy Pattern**: Different implementations for the same interface

## Provider Interface

The core interface that all AI providers must implement:

```javascript
class AIProviderInterface {
  async initialize() { ... }
  async isAvailable() { ... }
  async configureMCP(config) { ... }
  getInfo() { ... }
}
```

### Methods

- **initialize()**: Set up the provider and prepare it for use
- **isAvailable()**: Check if this provider can be used on the current system
- **configureMCP(config)**: Configure MCP servers for the provider
- **getInfo()**: Return metadata about the provider

## Factory Implementation

The factory pattern creates the appropriate provider instance:

```javascript
function createAIProvider(options = {}) {
  const providerName = detectAIProvider(options);
  
  switch (providerName) {
    case 'windsurf':
      return require('./providers/windsurf');
    case 'claude-code':
      return require('./providers/claude-code');
    // ...other providers...
    default:
      return require('./providers/no-op');
  }
}
```

This allows DocGen to work with any AI provider through a consistent interface, while the implementation details are hidden.

## Platform Detection

The platform detection logic determines which provider to use:

```javascript
function detectAIProvider(options = {}) {
  // Check for explicit environment variable or option overrides
  if (process.env.DOCGEN_AI_PROVIDER) {
    return process.env.DOCGEN_AI_PROVIDER;
  }
  
  // Platform detection
  const isWindows = os.platform() === 'win32';
  const isMac = os.platform() === 'darwin';
  
  // Provider selection logic based on platform and availability
  // ...
}
```

## Windsurf Provider

The Windsurf provider implements the interface for Windows users:

### Configuration

Windsurf requires a configuration file at `%USERPROFILE%\.codeium\windsurf\mcp_config.json` with this structure:

```json
{
  "mcpServers": {
    "docgen-github": {
      "command": "node",
      "args": ["C:\\path\\to\\DocGen\\mcp-servers\\github-issues\\server.cjs"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
        "GITHUB_OWNER": "${env:GITHUB_OWNER}",
        "GITHUB_REPO": "${env:GITHUB_REPO}",
        "PORT": "7867"
      }
    },
    "docgen-coverage": {
      "command": "node",
      "args": ["C:\\path\\to\\DocGen\\mcp-servers\\coverage-analysis\\server.cjs"],
      "env": {
        "PORT": "7868"
      }
    }
  }
}
```

The configuration specifies:
1. The command to run each MCP server
2. The arguments to pass to the command
3. Environment variables required by the servers

### Path Handling

Special care is taken to handle Windows paths correctly:

```javascript
const formatPath = (p) => {
  if (this.isWindows) {
    // Use Windows-style paths with double backslashes for JSON
    return path.resolve(p).replace(/\\/g, '\\\\');
  }
  return path.resolve(p);
};
```

This ensures paths with backslashes are properly escaped in the JSON configuration.

## Claude Code Provider

The Claude Code provider is primarily for macOS users:

### MCP Registration

Claude Code can auto-detect MCP servers, but explicit registration is supported:

```javascript
async configureMCP(config) {
  if (config && config.forceRegister) {
    await execPromise(`claude mcp remove github --scope user`);
    await execPromise(`claude mcp add-http github http://localhost:7867 --scope user`);
    // ... similar for coverage MCP ...
  }
  return true;
}
```

## Integration with DocGen CLI

The AI provider system is integrated with the DocGen CLI:

```javascript
// In docgen.ts
program
  .command('configure-windsurf')
  .description('Configure Windsurf IDE integration for Windows')
  .action(async () => {
    // Import and run the Windsurf configuration utility
    // ...
  });
```

## Error Handling and Fallbacks

The system includes robust error handling:

1. **Provider Availability**: Each provider checks if it can run on the current system
2. **Graceful Fallbacks**: If a provider fails, the system falls back to a no-op provider
3. **Informative Errors**: Clear error messages for troubleshooting
4. **Missing Dependency Handling**: Checks for required software and suggests installations

## Environment Variables

The integration respects these environment variables:

- **DOCGEN_AI_PROVIDER**: Explicitly set which provider to use
- **GITHUB_TOKEN**, **GITHUB_OWNER**, **GITHUB_REPO**: For GitHub MCP functionality

## Future Extensions

The architecture is designed for extensibility:

### Adding New Providers

To add a new AI provider:

1. Create a new provider class in `src/ai-provider/providers/`
2. Implement the `AIProviderInterface` methods
3. Add a case to the factory's switch statement
4. Add detection logic to `detectAIProvider()`

### Planned Providers

The system is designed with future providers in mind:

```javascript
case 'vscode':
  // Future support
  provider = require('./providers/vscode');
  break;
case 'cursor':
  // Future support
  provider = require('./providers/cursor');
  break;
```

## Testing Considerations

When testing this system, consider:

1. **Cross-Platform Testing**: Test on Windows, macOS, and Linux
2. **Provider Availability**: Test with and without each provider installed
3. **Configuration Generation**: Verify correct paths and settings in configs
4. **Error Cases**: Test graceful handling of missing dependencies
5. **Environment Variables**: Test override behavior with environment variables

## Common Issues and Solutions

### Windows Path Issues

Windows paths need special handling due to backslashes:

```javascript
// Convert Windows paths to format suitable for JSON
path.resolve(p).replace(/\\/g, '\\\\')
```

### Module Loading

ESM vs CommonJS can cause issues. This implementation uses CommonJS for wider compatibility.

### Singleton Pattern

Providers are implemented as singletons:

```javascript
// Export a singleton instance
module.exports = new WindsurfProvider();
```

This prevents multiple instances with different states from being created.