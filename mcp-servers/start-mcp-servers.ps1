# PowerShell wrapper for start-mcp-servers.sh
# This script runs the start-mcp-servers.sh script inside the Docker container
# Now supports TypeScript versions of the server files as well

# Display a banner
Write-Host "`n`n" -ForegroundColor Cyan
Write-Host " ███╗   ███╗ ██████╗██████╗     ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ ███████╗" -ForegroundColor Cyan
Write-Host " ████╗ ████║██╔════╝██╔══██╗    ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗██╔════╝" -ForegroundColor Cyan
Write-Host " ██╔████╔██║██║     ██████╔╝    ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝███████╗" -ForegroundColor Cyan
Write-Host " ██║╚██╔╝██║██║     ██╔═══╝     ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║" -ForegroundColor Cyan
Write-Host " ██║ ╚═╝ ██║╚██████╗██║         ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║███████║" -ForegroundColor Cyan
Write-Host " ╚═╝     ╚═╝ ╚═════╝╚═╝         ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝" -ForegroundColor Cyan
Write-Host "`nMCP Servers Manager (Windows Docker Version)`n" -ForegroundColor Cyan

# Get the script directory and project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$dockerRunnerPath = Join-Path $projectRoot "scripts\utils\docker-runner.js"

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed or not in PATH. Please install Docker Desktop for Windows." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Run the start-mcp-servers.sh script in Docker
Write-Host "Running start-mcp-servers.sh in Docker container..." -ForegroundColor Cyan
node $dockerRunnerPath bash /app/mcp-servers/start-mcp-servers.sh $args

# Exit with the same exit code as the Docker command
exit $LASTEXITCODE
