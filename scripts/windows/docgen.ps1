# PowerShell wrapper for docgen.js
# This script provides a Windows-compatible entry point for the DocGen project

<#
.SYNOPSIS
    DocGen Command Runner for Windows
.DESCRIPTION
    This script provides a clean interface for running DocGen commands on Windows.
    It handles command execution with proper output formatting.
.NOTES
    This script uses a clean output approach that:
    1. Captures command output to a temporary file
    2. Presents clean, readable output to the user
    
    This approach aligns with the Docker-first strategy for cross-platform compatibility.
#>

# Function to invoke a command with clean output handling
function Invoke-CleanCommand {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [string[]]$Arguments
    )
    
    # Format the command for display
    $commandDisplay = "$Command $($Arguments -join ' ')"
    Write-Verbose "Executing: $commandDisplay"
    
    # Create process start info
    $processStartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processStartInfo.FileName = $Command
    $processStartInfo.Arguments = $Arguments -join ' '
    $processStartInfo.RedirectStandardOutput = $true
    $processStartInfo.RedirectStandardError = $true
    $processStartInfo.UseShellExecute = $false
    $processStartInfo.CreateNoWindow = $true
    
    # Create and start the process
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processStartInfo
    $process.Start() | Out-Null
    
    # Read output and error streams
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    
    # Wait for the process to exit
    $process.WaitForExit()
    
    # Output both stdout and stderr
    if (-not [string]::IsNullOrEmpty($stdout)) {
        Write-Host $stdout
    }
    
    if (-not [string]::IsNullOrEmpty($stderr)) {
        Write-Host $stderr -ForegroundColor Red
    }
    
    return $process.ExitCode
}

# Get the script directory and project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)

# Check if docgen.js exists
$docgenPath = Join-Path -Path $projectRoot -ChildPath "docgen.js"
if (-not (Test-Path $docgenPath)) {
    Write-Host "Error: docgen.js not found at $docgenPath" -ForegroundColor Red
    Write-Host "Please make sure the project structure is correct" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Verbose "Using Node.js $nodeVersion"
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Get the arguments passed to this script
$Arguments = $args

# Run the docgen.js command
$exitCode = Invoke-CleanCommand -Command "node" -Arguments @($docgenPath) + $Arguments

# Exit with the same exit code
exit $exitCode
