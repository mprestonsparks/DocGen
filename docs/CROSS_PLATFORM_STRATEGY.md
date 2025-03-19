# Cross-Platform Strategy for DocGen

## Overview

DocGen's cross-platform strategy enables seamless operation across Windows, macOS, and Linux by implementing:

1. **Platform Detection Layer**: Automatically identifies the host OS and selects appropriate scripts
2. **Docker Integration**: Provides a consistent environment across all platforms
3. **Platform-Specific Scripts**: Maintains separate script versions for different operating systems
4. **Uniform NPM Interface**: Offers consistent command experience regardless of platform

## Implementation Details

### Platform Detection

The core of our cross-platform strategy is the `scripts/cross-platform.sh` script, which:

- Identifies the host operating system (Windows, macOS, or Linux)
- Selects the appropriate script file extension (.sh or .ps1)
- Provides a fallback to Docker when native scripts aren't available

```bash
# Platform detection logic in cross-platform.sh
OS=$(uname -s)
case "$OS" in
  Linux*)     PLATFORM="Linux" ;;
  Darwin*)    PLATFORM="macOS" ;;
  CYGWIN*)    PLATFORM="Windows-Cygwin" ;;
  MINGW*)     PLATFORM="Windows-MinGW" ;;
  *)          PLATFORM="Unknown" ;;
esac
```

### Docker Integration

Docker provides a consistent environment across all platforms:

1. **Consistent Environment**: The Docker container runs the same environment regardless of host OS
2. **Automatic Fallback**: When native scripts aren't available, commands run in Docker
3. **Volume Mounting**: Local files are mounted in the container for seamless development
4. **Process Isolation**: MCP servers run consistently in the container environment

### Script Architecture

Our script architecture follows these principles:

1. **Platform-Specific Directories**:
   - `scripts/unix/`: Shell scripts for macOS and Linux
   - `scripts/windows/`: PowerShell scripts for Windows

2. **Script Variants**:
   - `get-to-work.sh`: Interactive menu script for Unix systems
   - `get-to-work-simple.sh`: Simplified non-interactive script for cross-platform compatibility
   - `docgen-help.sh`: Help script showing available commands

3. **Environment Indicators**:
   - `.mcp-in-docker`: Indicates Docker environment
   - `mcp-docker-running`: Indicates MCP servers running in Docker

### NPM Interface

The package.json provides a consistent command interface:

```json
"scripts": {
  "get-to-work": "bash get-to-work.sh",
  "get-to-work:simple": "bash get-to-work-simple.sh",
  "help": "bash docgen-help.sh",
  "docker:start": "docker-compose -f .docker/docker-compose.yml up -d",
  "docker:status": "docker-compose -f .docker/docker-compose.yml ps",
  "docker:exec": "docker-compose -f .docker/docker-compose.yml exec docgen"
}
```

## Platform-Specific Behaviors

### macOS and Linux
- Uses bash scripts directly
- MCP servers run natively
- Docker available as an option

### Windows
- Uses PowerShell scripts when available
- Falls back to Docker when required
- Cross-platform scripts handle path differences

### Docker (All Platforms)
- Consistent Node.js environment
- Pre-configured for MCP servers
- Mounted volumes for local development

## Testing Strategy

To ensure cross-platform compatibility:

1. **Automated Tests**: CI pipeline tests on all supported platforms
2. **Docker Verification**: Tests run in Docker to verify containerized operation
3. **Path Handling**: Tests path normalization between platforms
4. **MCP Verification**: Verifies MCP servers function correctly in all environments