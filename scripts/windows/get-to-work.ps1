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
        # Run the command and redirect output to the temp file
        $execCmd = "docker exec docker-docgen-1 bash -c `"cd /app && $Command`" > `"$tempFile`" 2>&1"
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

# Process command-line arguments
$command = $args[0]
$useDocker = $true  # Default to using Docker

# Run the DocGen workflow manager
Write-Host "Running DocGen workflow manager in Docker container..."

if ($useDocker) {
    # Check if the Docker container is running
    $containerRunning = docker ps --filter "name=docker-docgen" --format "{{.Names}}"
    if (-not $containerRunning) {
        Write-Host "Docker container is not running. Starting it now..." -ForegroundColor Yellow
        docker-compose up -d
    }
    
    # Execute the command in Docker
    if ($command) {
        # Run specific command
        Invoke-DockerCommand "node docgen.js $command"
    } else {
        # Run init command by default
        Invoke-DockerCommand "node docgen.js init"
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
Write-Host "=============================================="
