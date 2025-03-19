# DocGen Windsurf IDE User Guide

This guide provides instructions for Windows users to set up and use DocGen with Windsurf IDE, enabling AI-powered documentation generation capabilities similar to those available with Claude Code on macOS.

## What is Windsurf IDE?

[Windsurf IDE](https://www.codeium.com/windsurf) is a modern code editor by Codeium that includes Cascade AI, which supports Model Context Protocol (MCP) extensions that DocGen can use to provide its AI capabilities.

## Installation

1. **Install Windsurf IDE**
   - Download and install Windsurf IDE from [codeium.com/windsurf](https://www.codeium.com/windsurf)
   - Complete the initial setup process

2. **Install DocGen**
   - Clone the DocGen repository: 
     ```powershell
     git clone https://github.com/mprestonsparks/DocGen.git
     cd DocGen
     ```
   - Install dependencies:
     ```powershell
     npm install
     ```
   - Create environment file:
     ```powershell
     Copy-Item .env.example .env
     # Edit the .env file to add any necessary configuration
     ```

## Configure Windsurf Integration

After installing both Windsurf IDE and DocGen, you need to configure the integration:

1. **Start MCP servers**
   ```powershell
   .\get-to-work.ps1
   ```
   This script will start the necessary MCP servers in Docker.

2. **Configure Windsurf**
   ```powershell
   node docgen.js configure-windsurf
   ```
   This command will:
   - Verify if Windsurf is installed
   - Create or update the Windsurf MCP configuration
   - Set up DocGen's MCP servers in Windsurf's configuration

3. **Success confirmation**
   - You should see a success message confirming the integration
   - The configuration is saved to `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

## Using DocGen with Windsurf IDE

1. **Open Windsurf IDE**
   - Launch Windsurf IDE
   - Open your DocGen project folder

2. **Access Cascade AI panel**
   - Press `Ctrl+L` to open the Cascade AI panel
   - Or click the Cascade icon in the sidebar

3. **Available DocGen capabilities**
   
   With the DocGen MCP servers running, Cascade now has access to the following capabilities:

   ### GitHub Integration
   - Query and create GitHub issues
   - Update issue progress 
   - Generate implementation status reports
   
   Examples:
   ```
   @github getIssues --labels "implementation-gap"
   @github getImplementationStatus
   ```

   ### Coverage Analysis
   - Parse test coverage reports
   - Generate coverage reports
   - Identify implementation gaps

   Examples:
   ```
   @coverage getCoverageMetrics
   @coverage getImplementationGaps
   ```

## Troubleshooting

If you encounter issues with the Windsurf integration:

1. **Verify MCP servers are running**
   ```powershell
   node docgen.js check-servers
   ```

2. **Restart DocGen services**
   ```powershell
   .\get-to-work.ps1 restart
   ```

3. **Reconfigure Windsurf integration**
   ```powershell
   node docgen.js configure-windsurf
   ```

4. **Check Windsurf configuration**
   - Open `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
   - Verify that the DocGen MCP servers are properly configured

5. **Logs and Diagnostics**
   - DocGen logs: `logs/mcp-debug/`
   - Windsurf logs: Check Windsurf's log directory for any MCP-related errors

## Limitations

- Some features may work differently than in the Claude Code workflow on macOS
- The user interface and workflow are adapted to Windsurf's Cascade AI interface
- You must keep the DocGen MCP servers running while using Windsurf with DocGen

## FAQ

### Q: Do I need Claude Code on Windows?
A: No. Windsurf IDE with Cascade AI provides similar capabilities on Windows without requiring Claude Code.

### Q: Can I use both Claude Code and Windsurf together?
A: Yes, if you have both installed. DocGen will use Claude Code on macOS and Windsurf on Windows by default.

### Q: How do I update the Windsurf integration?
A: Run `node docgen.js configure-windsurf` again after updating DocGen.