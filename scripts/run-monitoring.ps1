# PowerShell wrapper for run-monitoring.sh
# This script runs the run-monitoring.sh script inside the Docker container

# Display a banner
Write-Host "`n`n" -ForegroundColor Green
Write-Host " ███╗   ███╗ ██████╗ ███╗   ██╗██╗████████╗ ██████╗ ██████╗ ██╗███╗   ██╗ ██████╗ " -ForegroundColor Green
Write-Host " ████╗ ████║██╔═══██╗████╗  ██║██║╚══██╔══╝██╔═══██╗██╔══██╗██║████╗  ██║██╔════╝ " -ForegroundColor Green
Write-Host " ██╔████╔██║██║   ██║██╔██╗ ██║██║   ██║   ██║   ██║██████╔╝██║██╔██╗ ██║██║  ███╗" -ForegroundColor Green
Write-Host " ██║╚██╔╝██║██║   ██║██║╚██╗██║██║   ██║   ██║   ██║██╔══██╗██║██║╚██╗██║██║   ██║" -ForegroundColor Green
Write-Host " ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║██║   ██║   ╚██████╔╝██║  ██║██║██║ ╚████║╚██████╔╝" -ForegroundColor Green
Write-Host " ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ " -ForegroundColor Green
Write-Host "`nImplementation Monitoring System (Windows Docker Version)`n" -ForegroundColor Cyan

# Get the script directory and project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$dockerRunnerPath = Join-Path $projectRoot "utils\docker-runner.js"

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed or not in PATH. Please install Docker Desktop for Windows." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Run the run-monitoring.sh script in Docker
Write-Host "Running run-monitoring.sh in Docker container..." -ForegroundColor Cyan
node $dockerRunnerPath bash /app/scripts/run-monitoring.sh $args

# Exit with the same exit code as the Docker command
exit $LASTEXITCODE
