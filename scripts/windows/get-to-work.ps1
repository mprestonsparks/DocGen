<#
.SYNOPSIS
    DocGen Workflow Manager for Windows
.DESCRIPTION
    This script provides a clean interface for running the DocGen workflow manager on Windows.
    It handles Docker command execution with proper output formatting.
.NOTES
    This script uses a clean output approach that:
    1. Captures Docker command output to a temporary file
    2. Filters out Docker-specific noise
    3. Presents clean, readable output to the user
    
    This approach aligns with the Docker-first strategy for cross-platform compatibility.
#>

# PowerShell wrapper for DocGen Workflow Manager
# This script provides a Windows-compatible entry point for the DocGen workflow

# Define a function to run Docker commands with clean output
function Invoke-DockerCommand {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    Write-Host ""
    Write-Host ""
    
    # Create a temporary file for output
    $tempFile = [System.IO.Path]::GetTempFileName()
    
    try {
        # Use docker-commands.ts exec instead of direct docker exec
        $projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
        $execCmd = "npx ts-node `"$projectRoot\scripts\docker-commands.ts`" exec `"$Command`" > `"$tempFile`" 2>&1"
        Invoke-Expression $execCmd
        
        # Read and filter the output
        $output = Get-Content -Path $tempFile -Raw
        if ($output) {
            # Filter out common Docker noise
            $output = $output -replace '(\x1b\[\d+m|\x1b\[m)', ''
            Write-Host $output
        }
    }
    finally {
        # Clean up the temporary file
        if (Test-Path $tempFile) {
            Remove-Item -Path $tempFile -Force
        }
    }
    
    Write-Host ""
}

# Function to invoke a command with clean output handling
function Invoke-CleanCommand {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Command
    )
    
    # Create a temporary file for output
    $tempFile = [System.IO.Path]::GetTempFileName()
    
    try {
        # Run the command and redirect output to the temp file
        Invoke-Expression "$Command > `"$tempFile`" 2>&1"
        
        # Read and filter the output
        $output = Get-Content -Path $tempFile -Raw
        if ($output) {
            Write-Host $output
        }
    }
    finally {
        # Clean up the temporary file
        if (Test-Path $tempFile) {
            Remove-Item -Path $tempFile -Force
        }
    }
}

# Function to check MCP servers
function Check-McpServers {
    $projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
    $checkCmd = "node `"$projectRoot\docgen.js`" check-servers"
    
    # Create a temporary file for output
    $tempFile = [System.IO.Path]::GetTempFileName()
    
    try {
        # Run the command and redirect output to the temp file
        Invoke-Expression "$checkCmd > `"$tempFile`" 2>&1"
        
        # Read the output
        $output = Get-Content -Path $tempFile -Raw
        
        if ($output -match "Not running") {
            # MCP servers are not running, start them
            Write-Host "Starting MCP servers..."
            npx ts-node "$projectRoot\scripts\cross-platform.ts" mcp start
        } else {
            Write-Host "MCP servers are running."
        }
    }
    finally {
        # Clean up the temporary file
        if (Test-Path $tempFile) {
            Remove-Item -Path $tempFile -Force
        }
    }
}

# Get the script directory and project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)

# Display header
Write-Host ""
Write-Host ""
Write-Host "=============================================="
Write-Host "           DocGen Workflow Manager"
Write-Host "=============================================="

# Check if Claude features are enabled
$claudeEnabled = $false
$claudeStatusFile = Join-Path $projectRoot ".claude-enabled"
if (Test-Path $claudeStatusFile) {
    $claudeEnabled = $true
    Write-Host "Claude features: Enabled"
} else {
    Write-Host "Claude features: Disabled"
}
Write-Host ""

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "Docker detected: $dockerVersion"
} catch {
    Write-Host "Docker not detected. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Using Node.js $nodeVersion"
} catch {
    Write-Host "Node.js not detected. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Compile TypeScript to JavaScript if needed
$docgenTS = Join-Path $projectRoot "docgen.ts"
$docgenJS = Join-Path $projectRoot "docgen.js"
if (Test-Path $docgenTS -and -not (Test-Path $docgenJS)) {
    Write-Host "Compiling TypeScript to JavaScript..."
    Push-Location $projectRoot
    npx tsc
    Pop-Location
}

# Process command-line arguments
$command = $args[0]
$useDocker = $true  # Default to using Docker

# Check MCP servers and start if needed
if ($useDocker) {
    # Setup MCP in Docker
    $dockerCopyScript = Join-Path $projectRoot "scripts\docker-copy-mcp.sh"
    if (Test-Path $dockerCopyScript) {
        Write-Host "Setting up MCP servers in Docker..."
        bash "$dockerCopyScript"
        
        # Start MCP servers in Docker
        Write-Host "Starting MCP servers in Docker..."
        docker exec docker-docgen-1 bash -c "cd /app && MCP_LISTEN_INTERFACE=0.0.0.0 MCP_SERVER_HOST=0.0.0.0 /app/mcp-servers/docker-mcp-adapters.sh"
        
        # Verify MCP servers are running in Docker
        Write-Host "Verifying MCP servers are running in Docker..."
        $mcpStatus = docker exec docker-docgen-1 bash -c "MCP_LISTEN_INTERFACE=0.0.0.0 node /app/mcp-servers/docker-check-mcp.cjs"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "MCP servers are running in Docker!" -ForegroundColor Green
            
            # Create flag files
            "1" | Out-File -FilePath (Join-Path $projectRoot ".mcp-in-docker") -NoNewline
            docker exec docker-docgen-1 bash -c "echo '1' > /app/.mcp-in-docker"
            
            # Verify port mappings
            Write-Host "Verifying Docker port mappings..."
            $containerId = docker ps --filter "name=docker-docgen" --format "{{.ID}}"
            $portCheck = docker port $containerId | Select-String -Pattern "7865/tcp|7866/tcp"
            
            if (-not $portCheck) {
                Write-Host "Warning: MCP ports are not properly mapped in Docker!" -ForegroundColor Yellow
                Write-Host "Please ensure these ports are configured in your docker-compose.yml:" -ForegroundColor Yellow
                Write-Host "  - 7865:7865  # Coverage MCP" -ForegroundColor Cyan
                Write-Host "  - 7866:7866  # GitHub MCP" -ForegroundColor Cyan
                Write-Host "  - 7867:7867  # Coverage REST API" -ForegroundColor Cyan
                Write-Host "  - 7868:7868  # GitHub REST API" -ForegroundColor Cyan
            } else {
                Write-Host "MCP port mappings confirmed: $portCheck" -ForegroundColor Green
            }
        } else {
            Write-Host "Warning: MCP servers may not be running correctly in Docker!" -ForegroundColor Red
            Write-Host "Running debug utility to investigate..." -ForegroundColor Yellow
            docker exec docker-docgen-1 bash -c "cd /app && node /app/mcp-servers/docker-debug.js"
        }
    }
} else {
    # Check and start MCP servers locally
    $mcpAdaptersScript = Join-Path $projectRoot "mcp-servers\start-mcp-adapters.sh"
    if (Test-Path $mcpAdaptersScript) {
        Check-McpServers
    }
}

# Run the DocGen workflow manager
Write-Host "Running DocGen workflow manager..."

if ($useDocker) {
    # Check if the Docker container is running
    $containerRunning = docker ps --filter "name=docker-docgen" --format "{{.Names}}"
    if (-not $containerRunning) {
        Write-Host "Docker container is not running. Starting it now..." -ForegroundColor Yellow
        # Use ts-node to run docker-commands.ts start
        npx ts-node "$projectRoot\scripts\docker-commands.ts" start
    }
    
    # Execute the command in Docker
    if ($command) {
        # Run specific command using direct docker exec
        $execCmd = "docker exec docker-docgen-1 bash -c `"cd /app && node docgen.js $command`""
        Invoke-Expression $execCmd
    } else {
        # Run init command by default
        $execCmd = "docker exec docker-docgen-1 bash -c `"cd /app && node docgen.js init`""
        Invoke-Expression $execCmd
    }
} else {
    # Execute the command locally
    if ($command) {
        # Run specific command
        Invoke-CleanCommand "node $projectRoot\docgen.js $command"
    } else {
        # Run init command by default
        Invoke-CleanCommand "node $projectRoot\docgen.js init"
    }
}

# Display available commands
Write-Host ""
Write-Host "Available commands:"
Write-Host "  node docgen.js check-servers"
Write-Host "  node docgen.js start-servers"
Write-Host "  node docgen.js check-tests"
Write-Host "  node docgen.js analyze"
Write-Host ""
Write-Host "To toggle Claude features:"
Write-Host "  node docgen.js toggle-claude"
Write-Host ""
Write-Host "MCP server commands:"
Write-Host "  npx ts-node scripts\cross-platform.ts mcp start"
Write-Host "  npx ts-node scripts\cross-platform.ts mcp stop"
Write-Host "  npx ts-node scripts\cross-platform.ts mcp check"
Write-Host ""
Write-Host "=============================================="