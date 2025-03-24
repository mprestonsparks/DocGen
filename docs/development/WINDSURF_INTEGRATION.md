# DocGen Windsurf Integration Specification

## Overview

This document outlines the implementation plan for integrating Windsurf IDE's AI capabilities into the Windows version of DocGen. The goal is to maintain feature parity between the macOS version (which uses Claude Code) and the Windows version by leveraging Windsurf's Model Context Protocol (MCP) support.

## Background

DocGen currently has two distinct components:
1. **Standard DocGen**: Core functionality that works without AI involvement
2. **AI-Powered DocGen**: Enhanced capabilities powered by AI assistance

The macOS version uses Anthropic's Claude Code with custom MCP servers for GitHub issues and test coverage analysis. However, Claude Code is not available on Windows, creating a feature gap between platforms.

By integrating Windsurf IDE as the AI provider for Windows, we can maintain consistent functionality across platforms while adhering to DocGen's cross-platform design principles.

## Current Architecture

### MCP Servers

DocGen currently implements two MCP servers:

1. **GitHub Issues MCP** (Port 7867)
   - Enables AI interaction with GitHub issues
   - Provides issue creation, updating, and querying functionality
   - Integrates with GitHub's REST API

2. **Coverage Analysis MCP** (Port 7868)
   - Provides test coverage analysis capabilities
   - Parses Istanbul coverage reports
   - Generates markdown coverage reports
   - Correlates coverage with implementation issues

These servers are started via platform-specific scripts:
- `mcp-servers/start-mcp-servers.sh` (Unix)
- `mcp-servers/start-mcp-servers.ps1` (Windows)

Both scripts execute the same core functionality but with platform-specific adaptations.

## Integration Goals

1. Enable Windows users to leverage DocGen's AI capabilities through Windsurf IDE
2. Maintain feature parity between macOS (Claude Code) and Windows (Windsurf) versions
3. Follow existing cross-platform design patterns established in DocGen
4. Design for future extensibility to other Windows IDEs (e.g., VSCode, Cursor)
5. Minimize divergence between platform-specific implementations

## Implementation Approach

### Core Components

1. **OS Detection Layer**
   - Detects operating system, not specific IDE
   - Determines appropriate AI provider based on OS
   - Allows override via environment variables or configuration

2. **AI Provider Adapters**
   - Factory pattern for different AI providers
   - Initial implementations for Claude Code and Windsurf
   - Abstract interface for future providers

3. **Windsurf MCP Configuration**
   - Configuration generator for Windsurf's MCP settings
   - Maps DocGen MCP servers to Windsurf's expected format

4. **Setup Scripts**
   - Enhanced Windows scripts for Windsurf integration
   - Configuration installation and validation

### Required Changes

#### 1. Core AI Provider Detection

Create a new module to detect and initialize the appropriate AI provider:

```javascript
// src/ai-provider/detect.js
const os = require('os');
const config = require('../config');

function detectAIProvider() {
  const isWindows = os.platform() === 'win32';
  const defaultProvider = isWindows ? 'windsurf' : 'claude-code';
  
  // Allow override through environment or config
  return process.env.DOCGEN_AI_PROVIDER || 
         config.aiProvider || 
         defaultProvider;
}

module.exports = detectAIProvider;
```

#### 2. AI Provider Factory

Create a factory to initialize the appropriate AI provider:

```javascript
// src/ai-provider/factory.js
const detectAIProvider = require('./detect');

function createAIProvider() {
  const provider = detectAIProvider();
  
  switch(provider) {
    case 'windsurf':
      return require('./providers/windsurf');
    case 'vscode':
      return require('./providers/vscode'); // Future support
    case 'cursor':
      return require('./providers/cursor');  // Future support
    case 'claude-code':
    default:
      return require('./providers/claude-code');
  }
}

module.exports = createAIProvider;
```

#### 3. AI Provider Interface

Define a common interface for all AI providers:

```javascript
// src/ai-provider/provider-interface.js
/**
 * Abstract interface for AI providers
 * All concrete providers must implement these methods
 */
class AIProviderInterface {
  /**
   * Initialize the AI provider
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if the provider is available on this system
   * @returns {Promise<boolean>} Availability status
   */
  async isAvailable() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Configure the provider with MCP servers
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>} Success status
   */
  async configureMCP(config) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get provider information
   * @returns {Object} Provider metadata
   */
  getInfo() {
    throw new Error('Method not implemented');
  }
}

module.exports = AIProviderInterface;
```

#### 4. Windsurf Provider Implementation

Implement the Windsurf-specific provider:

```javascript
// src/ai-provider/providers/windsurf.js
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const AIProviderInterface = require('../provider-interface');

class WindsurfProvider extends AIProviderInterface {
  constructor() {
    super();
    this.configPath = path.join(os.homedir(), '.codeium', 'windsurf', 'mcp_config.json');
  }
  
  async initialize() {
    if (!(await this.isAvailable())) {
      console.log('Windsurf is not available on this system');
      return false;
    }
    
    return true;
  }
  
  async isAvailable() {
    try {
      // Check if Windsurf is installed
      const windsurf = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'windsurf', 'Windsurf.exe');
      await fs.access(windsurf);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async configureMCP(config) {
    // Ensure the directory exists
    const configDir = path.dirname(this.configPath);
    await fs.mkdir(configDir, { recursive: true });
    
    // Read existing config or create new one
    let mcpConfig = { mcpServers: {} };
    try {
      const existingConfig = await fs.readFile(this.configPath, 'utf8');
      mcpConfig = JSON.parse(existingConfig);
    } catch (error) {
      // File doesn't exist or is invalid, use default
    }
    
    // Update with DocGen MCP servers
    mcpConfig.mcpServers['docgen-github'] = {
      command: 'node',
      args: [path.resolve(config.serverPaths.github)],
      env: {
        GITHUB_TOKEN: '${env:GITHUB_TOKEN}',
        GITHUB_OWNER: '${env:GITHUB_OWNER}',
        GITHUB_REPO: '${env:GITHUB_REPO}',
        PORT: '7867'
      }
    };
    
    mcpConfig.mcpServers['docgen-coverage'] = {
      command: 'node',
      args: [path.resolve(config.serverPaths.coverage)],
      env: {
        PORT: '7868'
      }
    };
    
    // Write updated config
    await fs.writeFile(this.configPath, JSON.stringify(mcpConfig, null, 2));
    return true;
  }
  
  getInfo() {
    return {
      name: 'Windsurf',
      type: 'IDE',
      version: 'latest',
      configPath: this.configPath
    };
  }
}

module.exports = new WindsurfProvider();
```

#### 5. Claude Code Provider Implementation

Implement the Claude Code provider for completeness:

```javascript
// src/ai-provider/providers/claude-code.js
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const AIProviderInterface = require('../provider-interface');

class ClaudeCodeProvider extends AIProviderInterface {
  async initialize() {
    return await this.isAvailable();
  }
  
  async isAvailable() {
    try {
      // Check if Claude CLI is installed
      const { stdout } = await execPromise('claude --version');
      return !!stdout;
    } catch (error) {
      return false;
    }
  }
  
  async configureMCP(config) {
    // Claude Code automatically detects running MCP servers
    // No additional configuration needed
    return true;
  }
  
  getInfo() {
    return {
      name: 'Claude Code',
      type: 'CLI',
      version: 'latest'
    };
  }
}

module.exports = new ClaudeCodeProvider();
```

#### 6. Enhanced MCP Server Startup for Windows

Update the PowerShell script to support Windsurf integration:

```powershell
# mcp-servers/start-mcp-servers.ps1
# PowerShell wrapper for start-mcp-servers.sh
# This script runs the start-mcp-servers.sh script inside the Docker container
# Now supports TypeScript versions of the server files as well
# Adds Windsurf integration for Windows

# Display a banner
Write-Host "`n`n" -ForegroundColor Cyan
Write-Host " ███╗   ███╗ ██████╗██████╗     ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ ███████╗" -ForegroundColor Cyan
Write-Host " ████╗ ████║██╔════╝██╔══██╗    ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗██╔════╝" -ForegroundColor Cyan
Write-Host " ██╔████╔██║██║     ██████╔╝    ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝███████╗" -ForegroundColor Cyan
Write-Host " ██║╚██╔╝██║██║     ██╔═══╝     ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║" -ForegroundColor Cyan
Write-Host " ██║ ╚═╝ ██║╚██████╗██║         ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║███████║" -ForegroundColor Cyan
Write-Host " ╚═╝     ╚═╝ ╚═════╝╚═╝         ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝" -ForegroundColor Cyan
Write-Host "`nMCP Servers Manager (Windows Version)`n" -ForegroundColor Cyan

# Get the script directory and project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$utilsPath = Join-Path $projectRoot "scripts\utils"
$aiProviderPath = Join-Path $projectRoot "src\ai-provider"

# Process parameters
param (
    [switch]$ConfigureWindsurf = $true,
    [switch]$NoDocker = $false
)

# Check if Docker is installed (unless NoDocker is specified)
if (-not $NoDocker) {
    try {
        $dockerVersion = docker --version
        Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "Docker is not installed or not in PATH. Please install Docker Desktop for Windows." -ForegroundColor Red
        Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        exit 1
    }
}

# Run the start-mcp-servers.sh script in Docker (unless NoDocker is specified)
if (-not $NoDocker) {
    Write-Host "Running start-mcp-servers.sh in Docker container..." -ForegroundColor Cyan
    $dockerRunnerPath = Join-Path $utilsPath "docker-runner.js"
    node $dockerRunnerPath bash /app/mcp-servers/start-mcp-servers.sh $args
}

# Configure Windsurf MCP integration if requested
if ($ConfigureWindsurf) {
    Write-Host "`nConfiguring Windsurf IDE integration for DocGen..." -ForegroundColor Cyan
    
    # Use Node.js to run the Windsurf configuration script
    $configScript = Join-Path $aiProviderPath "configure-windsurf.js"
    
    if (Test-Path $configScript) {
        try {
            node $configScript
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Windsurf IDE integration configured successfully" -ForegroundColor Green
                Write-Host "DocGen MCP servers are now available to Windsurf's Cascade AI" -ForegroundColor Green
            } else {
                Write-Host "Failed to configure Windsurf IDE integration" -ForegroundColor Red
                Write-Host "Check logs for details" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Error configuring Windsurf IDE integration: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Windsurf configuration script not found at: $configScript" -ForegroundColor Red
        Write-Host "Please ensure the DocGen project is properly installed" -ForegroundColor Yellow
    }
}

# Exit with the same exit code as the Docker command
exit $LASTEXITCODE
```

#### 7. Windsurf Configuration Script

Create a Node.js script to configure Windsurf:

```javascript
// src/ai-provider/configure-windsurf.js
const createAIProvider = require('./factory');

async function configureWindsurf() {
  try {
    // Get the AI provider (should be Windsurf on Windows)
    const provider = createAIProvider();
    
    // Check if Windsurf is available
    if (!(await provider.isAvailable())) {
      console.error('Error: Windsurf is not available on this system');
      console.log('Please install Windsurf from https://www.codeium.com/windsurf');
      process.exit(1);
    }
    
    // Configure MCP for Windsurf
    const serverPaths = {
      github: './mcp-servers/github-issues/server.js',
      coverage: './mcp-servers/coverage-analysis/server.js'
    };
    
    await provider.configureMCP({ serverPaths });
    
    console.log('Windsurf MCP integration configured successfully');
    console.log(`Configuration saved to: ${provider.getInfo().configPath}`);
    
    console.log('\nInstructions:');
    console.log('1. Open Windsurf IDE');
    console.log('2. Open the Cascade panel (Ctrl+L)');
    console.log('3. Cascade will now have access to DocGen MCP tools');
    
    process.exit(0);
  } catch (error) {
    console.error('Error configuring Windsurf:', error.message);
    process.exit(1);
  }
}

configureWindsurf();
```

#### 8. Update Core DocGen.js

Update the main DocGen script to use the AI provider factory:

```javascript
// In docgen.js (add to appropriate location)
const createAIProvider = require('./src/ai-provider/factory');

// Initialize AI provider based on platform
async function initializeAI() {
  const aiProvider = createAIProvider();
  await aiProvider.initialize();
  
  // Log AI provider info
  const info = aiProvider.getInfo();
  console.log(`Using AI provider: ${info.name} (${info.type})`);
  
  return aiProvider;
}

// Call this at appropriate point in startup process
initializeAI().catch(err => {
  console.warn('Failed to initialize AI provider:', err.message);
  console.log('DocGen will continue to function without AI capabilities');
});
```

## Directory Structure Updates

The following new files and directories should be created:

```
DocGen/
├── src/
│   └── ai-provider/
│       ├── detect.js
│       ├── factory.js
│       ├── provider-interface.js
│       ├── configure-windsurf.js
│       └── providers/
│           ├── windsurf.js
│           ├── claude-code.js
│           ├── vscode.js (placeholder for future)
│           └── cursor.js (placeholder for future)
├── docs/
│   └── development/
│       └── WINDSURF_INTEGRATION.md (this document)
```

## User Experience

### Windows Users

1. Windows users run DocGen normally
2. The system detects Windows OS and selects Windsurf as the AI provider
3. When MCP servers are started, Windsurf is automatically configured
4. Users open Windsurf IDE and interact with DocGen through Cascade
5. Cascade has access to all the tools that Claude Code would have on macOS

### macOS Users

1. macOS users run DocGen normally
2. The system detects macOS and selects Claude Code as the AI provider
3. Users interact with DocGen through Claude Code in the terminal
4. No change to existing workflow

## Testing Strategy

1. **Unit Tests**
   - Test OS detection logic
   - Test provider factory pattern
   - Test configuration generation

2. **Integration Tests**
   - Verify Windsurf configuration is correctly generated
   - Ensure MCP servers are properly registered
   - Test communication between DocGen and Windsurf

3. **Platform Verification**
   - Test common workflows on both Windows and macOS
   - Verify feature parity between platforms
   - Compare results of identical operations

## Implementation Timeline

1. **Phase 1: Core Detection and Factory**
   - Implement OS detection
   - Create AI provider factory
   - Define provider interface

2. **Phase 2: Windsurf Integration**
   - Implement Windsurf provider
   - Create configuration mechanism
   - Update MCP server scripts

3. **Phase 3: Testing and Documentation**
   - Write unit and integration tests
   - Complete user documentation
   - Perform cross-platform testing

## Future Considerations

1. **Additional IDE Support**
   - VSCode integration
   - Cursor integration
   - Other IDEs as they gain MCP support

2. **Enhanced Configuration**
   - UI for managing AI provider selection
   - Tool capability discovery and reporting
   - Custom tool registration

3. **Performance Optimization**
   - Startup time improvements
   - Memory usage optimization
   - Response latency reduction

## Conclusion

This integration enables DocGen to provide a consistent AI-powered experience across both macOS and Windows platforms. By leveraging Windsurf's MCP capabilities, Windows users gain access to the same powerful GitHub and coverage analysis tools that macOS users have through Claude Code.

The implementation follows DocGen's established cross-platform design principles while maintaining a clean separation of concerns between the core functionality and platform-specific integrations.
