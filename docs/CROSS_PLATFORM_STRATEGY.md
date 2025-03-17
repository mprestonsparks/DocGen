# Cross-Platform Strategy for DocGen

## Background and Requirements

DocGen was originally developed primarily for macOS/Linux environments with some initial Docker support. To make it fully cross-platform compatible and prepare for multi-language support, we're implementing a Docker-first approach that will:

1. Support all major platforms (Windows, macOS, Linux)
2. Maintain the existing bash scripts for Unix-based systems
3. Add Docker-based execution for Windows users
4. Prepare for multi-language support (TypeScript, Python, and future languages)
5. Ensure compatibility with Claude Code's REPL-based workflow

## Technical Approach: Docker-First with Native Fallbacks

### Core Strategy

1. **Docker as Primary Development Environment**
   - Enhanced Docker configuration to support all target languages
   - Provides consistent environment across all platforms
   - Simplifies onboarding for new developers

2. **Maintain Shell Scripts with PowerShell Alternatives**
   - Kept all Unix shell scripts (.sh) as they are
   - Created Windows-compatible PowerShell scripts (.ps1)
   - Ensured Claude Code can continue to work with bash scripts

3. **Cross-Platform Script Execution**
   - Uses platform detection to run appropriate scripts
   - Provides Docker execution as a fallback for Windows when PowerShell scripts aren't available
   - Allows native execution as an option for power users

### Benefits

1. **Consistency**: Same development environment across all platforms
2. **Simplicity**: Minimal changes to existing code
3. **Flexibility**: Support for both Docker and native execution
4. **Scalability**: Easy addition of new language support
5. **Compatibility**: Works with Claude Code's REPL-based workflow

## Implementation Details

### Docker Configuration

The Docker environment has been enhanced to support both TypeScript and Python:

```dockerfile
# Install Python and dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install --no-cache-dir \
    networkx \
    matplotlib \
    requests \
    pytest \
    black \
    pylint
```

### Cross-Platform Script Execution

A JavaScript utility (`scripts/cross-platform.js`) detects the platform and runs the appropriate script:

```javascript
function runPlatformScript(scriptBasePath, args) {
  // Check for platform-specific scripts
  const shScript = path.join(scriptDir, `${scriptBaseName}.sh`);
  const ps1Script = path.join(scriptDir, `${scriptBaseName}.ps1`);
  
  if (platform.isWindows) {
    // On Windows, try PowerShell script first
    if (fs.existsSync(ps1Script)) {
      // Run PowerShell script
    } else if (fs.existsSync(shScript)) {
      // Use Docker to run bash script
    }
  } else {
    // On Unix, use bash script
  }
}
```

### PowerShell Wrapper Scripts

PowerShell wrapper scripts have been created for key shell scripts:

- `get-to-work.ps1`
- `mcp-servers/start-mcp-servers.ps1`
- `scripts/run-github-workflow.ps1`
- `scripts/run-monitoring.ps1`

These scripts use the Docker environment to execute the corresponding bash scripts.

### Docker Command Utility

A Docker command utility (`scripts/docker-commands.js`) provides simple commands for Docker operations:

```javascript
// Available commands
// start: Start the Docker container
// stop: Stop the Docker container
// exec: Execute a command in the Docker container
// status: Check the status of the Docker container
```

### Package.json Scripts

The `package.json` has been updated with cross-platform scripts:

```json
{
  "scripts": {
    "docker:start": "node scripts/docker-commands.js start",
    "docker:stop": "node scripts/docker-commands.js stop",
    "docker:exec": "node scripts/docker-commands.js exec",
    "mcp:start": "node scripts/cross-platform.js mcp-servers/start-mcp-servers",
    "github:workflow": "node scripts/cross-platform.js scripts/run-github-workflow",
    "get-to-work": "node scripts/cross-platform.js get-to-work"
  }
}
```

## Modular Architecture

To further enhance cross-platform compatibility and maintainability, DocGen now implements a modular architecture that separates core functionality from platform-specific features, particularly Claude Code integration.

### Core Modules vs. Claude-Specific Modules

The modular architecture separates functionality into two main categories:

1. **Core Modules**: Available to all developers regardless of platform
   - `project-analyzer.cjs`: Analyzes project state
   - `mcp-server-manager.cjs`: Manages MCP servers
   - `workflow-manager.cjs`: Manages development workflows

2. **Claude-Specific Modules**: Optional modules that integrate with Claude Code
   - `claude-workflow-manager.cjs`: Extends core functionality with Claude integration

### Unified Command Interface

The new `docgen.js` command interface provides a consistent way to interact with DocGen across all platforms:

```javascript
// docgen.js - Unified command interface
const program = require('commander');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = fs.existsSync('.env') ? '.env' : '.env.example';
dotenv.config({ path: envPath });

// Core modules
const projectAnalyzer = require('./scripts/core/project-analyzer.cjs');
const mcpServerManager = require('./scripts/core/mcp-server-manager.cjs');
const workflowManager = require('./scripts/core/workflow-manager.cjs');

// Conditionally load Claude-specific modules
let claudeWorkflowManager = null;
if (process.env.ENABLE_CLAUDE_FEATURES === 'true') {
  try {
    claudeWorkflowManager = require('./scripts/claude/claude-workflow-manager.cjs');
  } catch (error) {
    console.warn('Claude features are enabled but modules could not be loaded:', error.message);
  }
}

// Command definitions
program
  .command('init')
  .description('Initialize the development workflow')
  .action(() => workflowManager.initWorkflow());

// Additional commands...
```

### Environment Variable Control

The modular architecture uses environment variables to control feature flags:

```
# .env or .env.example
ENABLE_CLAUDE_FEATURES=true|false
```

When set to `true`, Claude-specific features are enabled. When set to `false`, only core functionality is available.

### Cross-Platform Benefits

This modular architecture provides several benefits for cross-platform development:

1. **Decoupled Dependencies**: Core functionality doesn't depend on Claude-specific packages
2. **Conditional Loading**: Claude-specific modules are only loaded when needed
3. **Unified Interface**: The same command interface works across all platforms
4. **Feature Flags**: Environment variables control which features are enabled
5. **Graceful Degradation**: The system works even when Claude features are unavailable

For more details on the modular architecture, see [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md).

## Usage Examples

### Docker Workflow (All Platforms)
```bash
# Start Docker environment
npm run docker:start

# Run interview process
npm run docker:interview

# Validate documentation
npm run docker:validate

# Run tests
npm run docker:test
```

### Native Workflow (Platform-Specific)

#### macOS/Linux:
```bash
# Start the interview
npm run interview

# Start MCP servers
npm run mcp:start

# Run the GitHub workflow
npm run github:workflow
```

#### Windows:
```powershell
# Start the interview
npm run interview

# Start MCP servers
npm run mcp:start

# Run the GitHub workflow
npm run github:workflow
```

The npm scripts automatically detect your platform and run the appropriate version of each script.

## Next Steps

1. Implement Docker enhancements for TypeScript and Python
2. Create cross-platform script execution wrappers
3. Create PowerShell wrapper scripts for Windows users
4. Update package.json for cross-platform execution
5. Update documentation for Windows users
6. Test on all target platforms
7. Add support for additional languages in the future
