# DocGen Windows Setup Script
param (
    [switch]$Dev,
    [switch]$CheckOnly
)

# Set error action preference
$ErrorActionPreference = "Stop"

function Write-Header {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Check-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Check Python installation
Write-Header "Checking Python Installation"
if (-not (Check-Command "python")) {
    Write-Host "Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check Node.js installation
Write-Header "Checking Node.js Installation"
if (-not (Check-Command "node")) {
    Write-Host "Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check npm installation
Write-Header "Checking npm Installation"
if (-not (Check-Command "npm")) {
    Write-Host "npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Exit if only checking dependencies
if ($CheckOnly) {
    Write-Host "`nAll required dependencies are installed." -ForegroundColor Green
    exit 0
}

# Create Python virtual environment
Write-Header "Setting up Python Environment"
if (-not (Test-Path "venv")) {
    python -m venv venv
}

# Activate virtual environment and install dependencies
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

# Install Node.js dependencies
Write-Header "Setting up Node.js Environment"
npm install

# Build TypeScript project
Write-Header "Building TypeScript Project"
npm run build

if ($Dev) {
    # Set up development-specific configurations
    Write-Header "Setting up Development Environment"
    Copy-Item .env.example .env -Force
    npm install --save-dev
}

Write-Host "`nSetup completed successfully!" -ForegroundColor Green
