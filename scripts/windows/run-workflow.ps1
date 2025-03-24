#!/usr/bin/env pwsh
# DocGen Workflow - Windows Implementation
# Executes the sequential workflow manager with Docker-first approach

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dockerContainer = "docker-docgen-1"
$dockerBashScriptPath = Join-Path $projectRoot "scripts\unix\docker-run-workflow.sh"

# Banner
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "     DocGen Sequential Workflow Manager" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting automated workflow sequence:" -ForegroundColor Yellow
Write-Host "1. Testing Phase" -ForegroundColor Yellow
Write-Host "2. Issues Phase" -ForegroundColor Yellow
Write-Host "3. TODOs Phase" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "Using Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. This is required for TypeScript support." -ForegroundColor Red
}

# Check Docker availability (follow Docker-first approach)
$dockerAvailable = $false
try {
    $dockerVersion = docker --version
    Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
    $dockerAvailable = $true
    
    # Check if container is running
    $containerRunning = docker ps --filter "name=$dockerContainer" --format "{{.Names}}"
    if (-not $containerRunning) {
        Write-Host "Docker container not running. Starting container..." -ForegroundColor Yellow
        docker-compose -f "$projectRoot\.docker\docker-compose.yml" up -d
        Start-Sleep -Seconds 5
    } else {
        Write-Host "Docker container is running." -ForegroundColor Green
    }
} catch {
    Write-Host "Docker not detected, cannot execute workflow without Docker." -ForegroundColor Red
    Write-Host "The DocGen project follows a Docker-first approach for cross-platform compatibility." -ForegroundColor Yellow
    exit 1
}

# Execute workflow in Docker
Write-Host "Executing workflow in Docker environment..." -ForegroundColor Green

# Copy bash script to Docker container
Write-Host "Copying workflow script to Docker container..." -ForegroundColor Yellow
docker cp $dockerBashScriptPath "${dockerContainer}:/app/run-workflow.sh"

# Make executable and run
Write-Host "Running workflow in Docker container..." -ForegroundColor Green
docker exec $dockerContainer chmod +x /app/run-workflow.sh
docker exec $dockerContainer /app/run-workflow.sh

# Completion banner for Windows script
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "     DocGen Workflow Execution Complete" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
