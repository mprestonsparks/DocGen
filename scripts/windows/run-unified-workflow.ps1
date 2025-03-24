#!/usr/bin/env pwsh
# DocGen Unified Workflow Runner for Windows
# This script runs the sequential workflow manager for DocGen

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dockerContainer = "docker-docgen-1"
$workflowDir = Join-Path $projectRoot "scripts\workflow"
$workflowRunnerPath = Join-Path $workflowDir "run-workflow.ts"
$tsconfigPath = Join-Path $workflowDir "tsconfig.workflow.json"

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

# Check Node.js version
try {
    $nodeVersion = node -v
    Write-Host "Using Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js v16 or later." -ForegroundColor Red
    exit 1
}

# Install required dependencies
Write-Host "Installing required dependencies..." -ForegroundColor Yellow
Push-Location $projectRoot
npm install --no-save typescript ts-node @types/node
Pop-Location

# Check Docker
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
    Write-Host "Docker not available. Will run locally." -ForegroundColor Yellow
}

# First compile TypeScript to JavaScript
Write-Host "Compiling TypeScript to JavaScript..." -ForegroundColor Yellow
Push-Location $workflowDir
npx tsc --project $tsconfigPath
Pop-Location

# Then execute the workflow
if ($dockerAvailable) {
    Write-Host "Executing workflow in Docker environment..." -ForegroundColor Green

    # Copy workflow files to container
    $distDir = Join-Path $workflowDir "dist"
    Write-Host "Copying workflow files to Docker container..." -ForegroundColor Yellow
    docker cp $distDir "${dockerContainer}:/app/scripts/workflow/dist"
    
    # Create execution script for Docker
    $dockerScriptPath = Join-Path $projectRoot "docker-run-workflow.sh"
    $dockerScriptContent = @"
#!/bin/bash
# DocGen workflow execution script for Docker

cd /app

# Execute the compiled workflow
echo "Executing workflow in Docker..."
node scripts/workflow/dist/run-workflow.js
"@
    Set-Content -Path $dockerScriptPath -Value $dockerScriptContent
    
    # Copy and execute in Docker
    docker cp $dockerScriptPath "${dockerContainer}:/app/run-workflow.sh"
    docker exec $dockerContainer chmod +x /app/run-workflow.sh
    docker exec $dockerContainer /app/run-workflow.sh
    
    # Clean up
    Remove-Item -Path $dockerScriptPath -Force -ErrorAction SilentlyContinue
} else {
    # Run locally
    Write-Host "Executing workflow locally..." -ForegroundColor Green
    Push-Location $projectRoot
    node $workflowDir/dist/run-workflow.js
    Pop-Location
}

# Completion banner
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "     DocGen Workflow Execution Complete" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
