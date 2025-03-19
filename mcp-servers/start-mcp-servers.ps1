# PowerShell wrapper for start-mcp-servers.sh
# This script runs the start-mcp-servers.sh script inside the Docker container
# Now supports TypeScript versions of the server files as well
# Adds Windsurf integration for Windows

# Display a banner
Write-Host "`n`n" -ForegroundColor Cyan
Write-Host " ███╗   ███╗ ██████╗██████╗     ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗ ███████╗" -ForegroundColor Cyan
Write-Host " ████╗ ████║██╔════╝██╔══██╗    ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗██╔════╝" -ForegroundColor Cyan
Write-Host " ██╔████╔██║██║     ██████╔╝    ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝███████╗" -ForegroundColor Cyan
Write-Host " ██║╚██╔╝██║██║     ██╔═══╝     ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║" -ForegroundColor Cyan
Write-Host " ██║ ╚═╝ ██║╚██████╗██║         ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║███████║" -ForegroundColor Cyan
Write-Host " ╚═╝     ╚═╝ ╚═════╝╚═╝         ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝" -ForegroundColor Cyan
Write-Host "`nMCP Servers Manager (Windows Version)`n" -ForegroundColor Cyan

# Get the script directory and project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$utilsPath = Join-Path $projectRoot "scripts\utils"
$aiProviderPath = Join-Path $projectRoot "src\ai-provider"
$dockerRunnerPath = Join-Path $utilsPath "docker-runner.js"

# Process parameters
param (
    [switch]$ConfigureWindsurf = $true,
    [switch]$NoDocker = $false
)

# Check if Docker is installed (unless NoDocker is specified)
if (-not $NoDocker) {
    try {
        $dockerVersion = docker --version
        Write-Host "Docker detected: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "Docker is not installed or not in PATH. Please install Docker Desktop for Windows." -ForegroundColor Red
        Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
        exit 1
    }
}

# Run the start-mcp-servers.sh script in Docker (unless NoDocker is specified)
if (-not $NoDocker) {
    Write-Host "Running start-mcp-servers.sh in Docker container..." -ForegroundColor Cyan
    
    try {
        if (Test-Path $dockerRunnerPath) {
            node $dockerRunnerPath bash /app/mcp-servers/start-mcp-servers.sh $args
        } else {
            # Fallback to direct docker command if docker-runner.js doesn't exist
            docker exec docker-docgen-1 bash -c "cd /app && /app/mcp-servers/start-mcp-servers.sh $args"
        }
    } catch {
        Write-Host "Error starting MCP servers in Docker: $_" -ForegroundColor Red
        Write-Host "Continuing with local configuration..." -ForegroundColor Yellow
    }
}

# Configure Windsurf MCP integration if requested
if ($ConfigureWindsurf) {
    Write-Host "`nConfiguring Windsurf IDE integration for DocGen..." -ForegroundColor Cyan
    
    # Use Node.js to run the Windsurf configuration script
    $configScript = Join-Path $aiProviderPath "configure-windsurf.js"
    
    if (Test-Path $configScript) {
        try {
            node $configScript
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "Windsurf IDE integration configured successfully" -ForegroundColor Green
                Write-Host "DocGen MCP servers are now available to Windsurf's Cascade AI" -ForegroundColor Green
            } else {
                Write-Host "Failed to configure Windsurf IDE integration" -ForegroundColor Red
                Write-Host "Check logs for details" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Error configuring Windsurf IDE integration: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Windsurf configuration script not found at: $configScript" -ForegroundColor Red
        Write-Host "Please ensure the DocGen project is properly installed" -ForegroundColor Yellow
    }
}

# Exit with the same exit code as the Docker command
exit $LASTEXITCODE