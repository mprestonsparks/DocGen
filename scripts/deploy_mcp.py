#!/usr/bin/env python3
"""
MCP Deployment Script for DocGen

This script automates the deployment of MCP servers and configures Windsurf integration.
It handles:
1. Building and starting Docker containers for all MCP servers
2. Building and configuring the MCP bridge for Windsurf integration
3. Setting up environment variables

Usage:
    python deploy_mcp.py [--config CONFIG] [--no-windsurf] [--dev]

Options:
    --config CONFIG     Path to custom configuration file (default: .env)
    --no-windsurf       Skip Windsurf configuration
    --dev               Use development mode (hot reloading, debug logs)
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

# Constants
DEFAULT_CONFIG_PATH = ".env"
DOCKER_COMPOSE_PATH = "docker/mcp/docker-compose.mcp.yml"
MCP_ENV_PATH = "docker/mcp/.env.mcp"
WINDSURF_CONFIG_DIR = {
    "win32": os.path.expanduser("~/.codeium/windsurf"),
    "darwin": os.path.expanduser("~/.codeium/windsurf"),
    "linux": os.path.expanduser("~/.codeium/windsurf")
}
WINDSURF_CONFIG_FILE = "mcp_config.json"
MCP_BRIDGE_DIR = "src/mcp/bridge"
MCP_BRIDGE_DIST_DIR = os.path.join(MCP_BRIDGE_DIR, "dist")


def load_env_file(file_path: str) -> Dict[str, str]:
    """Load environment variables from .env file"""
    env_vars = {}
    
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
        
        return env_vars
    except Exception as e:
        print(f"Error loading environment file: {e}")
        sys.exit(1)


def check_docker_installed() -> bool:
    """Check if Docker is installed and running"""
    try:
        subprocess.run(
            ["docker", "--version"], 
            check=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        
        # Check if Docker daemon is running
        subprocess.run(
            ["docker", "info"], 
            check=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE
        )
        
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def update_mcp_env(env_vars: Dict[str, str]) -> None:
    """Update the MCP environment file with values from the main .env file"""
    print("Updating MCP environment configuration...")
    
    # Create a template for the MCP environment file if it doesn't exist
    if not os.path.exists(MCP_ENV_PATH):
        mcp_env_template = """# MCP Server Configuration
MCP_ENV=development
MCP_LOG_LEVEL=info

# Security Configuration
VAULT_TOKEN=dev_token

# Dynamic Port Ranges (each server will use one port from its range)
GITHUB_MCP_PORT_RANGE=3000-3100
MAIN_MCP_PORT_RANGE=3200-3300
MAIN_MCP_HEALTH_PORT_RANGE=8800-8900
ORCHESTRATOR_PORT_RANGE=8080-8180

# Resource Limits
MCP_MEMORY_LIMIT=2g
MCP_CPU_LIMIT=1.0

# GitHub Configuration
GITHUB_OWNER={github_owner}
GITHUB_REPO={github_repo}

# API Keys (passed directly to Docker Compose)
ANTHROPIC_API_KEY={anthropic_key}
GITHUB_TOKEN={github_token}
"""
        
        with open(MCP_ENV_PATH, 'w') as f:
            f.write(mcp_env_template.format(
                github_owner=env_vars.get("GITHUB_OWNER", ""),
                github_repo=env_vars.get("GITHUB_REPO", ""),
                anthropic_key=env_vars.get("ANTHROPIC_API_KEY", ""),
                github_token=env_vars.get("GITHUB_TOKEN", "")
            ))
        
        print(f"Created MCP environment file: {MCP_ENV_PATH}")
    else:
        # Load existing MCP environment file
        mcp_env = load_env_file(MCP_ENV_PATH)
        
        # Update GitHub configuration and API keys
        mcp_env["GITHUB_OWNER"] = env_vars.get("GITHUB_OWNER", mcp_env.get("GITHUB_OWNER", ""))
        mcp_env["GITHUB_REPO"] = env_vars.get("GITHUB_REPO", mcp_env.get("GITHUB_REPO", ""))
        mcp_env["ANTHROPIC_API_KEY"] = env_vars.get("ANTHROPIC_API_KEY", mcp_env.get("ANTHROPIC_API_KEY", ""))
        mcp_env["GITHUB_TOKEN"] = env_vars.get("GITHUB_TOKEN", mcp_env.get("GITHUB_TOKEN", ""))
        
        # Write updated MCP environment file
        with open(MCP_ENV_PATH, 'w') as f:
            for key, value in mcp_env.items():
                f.write(f"{key}={value}\n")
        
        print(f"Updated MCP environment file: {MCP_ENV_PATH}")


def build_docker_images() -> None:
    """Build Docker images for MCP servers"""
    print("Building Docker images for MCP servers...")
    
    try:
        subprocess.run(
            ["docker-compose", "-f", DOCKER_COMPOSE_PATH, "build"],
            check=True
        )
        print("Docker images built successfully")
    except subprocess.SubprocessError as e:
        print(f"Error building Docker images: {e}")
        sys.exit(1)


def start_docker_containers(dev_mode: bool = False) -> None:
    """Start Docker containers for MCP servers"""
    print("Starting Docker containers for MCP servers...")
    
    try:
        # Set environment variables for Docker Compose
        env = os.environ.copy()
        
        # Load MCP environment variables
        mcp_env = load_env_file(MCP_ENV_PATH)
        for key, value in mcp_env.items():
            env[key] = value
        
        cmd = ["docker-compose", "-f", DOCKER_COMPOSE_PATH, "up"]
        
        # Run in detached mode unless in dev mode
        if not dev_mode:
            cmd.append("-d")
        
        subprocess.run(cmd, env=env, check=True)
        
        if not dev_mode:
            print("Docker containers started in detached mode")
            print("To view logs, run: docker-compose -f docker/mcp/docker-compose.mcp.yml logs -f")
        else:
            print("Docker containers started in development mode")
            print("Press Ctrl+C to stop containers")
    except subprocess.SubprocessError as e:
        print(f"Error starting Docker containers: {e}")
        sys.exit(1)


def build_mcp_bridge() -> None:
    """Build the TypeScript MCP bridge for Windsurf integration"""
    print("Building MCP bridge for Windsurf integration...")
    
    try:
        # Navigate to the bridge directory
        bridge_dir = os.path.abspath(MCP_BRIDGE_DIR)
        
        # Install dependencies
        print("Installing bridge dependencies...")
        subprocess.run(
            ["npm", "install"],
            cwd=bridge_dir,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Build the TypeScript bridge
        print("Compiling TypeScript bridge...")
        subprocess.run(
            ["npm", "run", "build"],
            cwd=bridge_dir,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        print("MCP bridge built successfully")
        return True
    except subprocess.SubprocessError as e:
        print(f"Error building MCP bridge: {e}")
        print("Windsurf integration will not be available")
        return False


def configure_windsurf(env_vars: Dict[str, str]) -> None:
    """Configure Windsurf to use the MCP bridge"""
    print("Configuring Windsurf integration...")
    
    # Get platform-specific config directory
    config_dir = WINDSURF_CONFIG_DIR.get(sys.platform)
    if not config_dir:
        print(f"Unsupported platform: {sys.platform}")
        return
    
    # Create config directory if it doesn't exist
    os.makedirs(config_dir, exist_ok=True)
    
    # Get the absolute path to the bridge script
    bridge_script_path = os.path.abspath(os.path.join(MCP_BRIDGE_DIR, "dist", "mcp-bridge.js"))
    
    # Define MCP server configuration in the format Windsurf expects
    mcp_config = {
        "mcpServers": {
            "docgen-mcp-bridge": {
                "command": "node",
                "args": [
                    bridge_script_path
                ],
                "env": {
                    "MCP_ORCHESTRATOR_URL": "http://localhost:8080/mcp",
                    "MCP_API_KEY": "development_key",
                    "GITHUB_TOKEN": env_vars.get("GITHUB_TOKEN", ""),
                    "ANTHROPIC_API_KEY": env_vars.get("ANTHROPIC_API_KEY", "")
                }
            }
        }
    }
    
    # Write configuration to file
    config_path = os.path.join(config_dir, WINDSURF_CONFIG_FILE)
    with open(config_path, 'w') as f:
        json.dump(mcp_config, f, indent=2)
    
    print(f"Windsurf configuration written to: {config_path}")
    print("Restart Windsurf to apply the configuration")


def wait_for_servers(timeout: int = 60) -> bool:
    """Wait for MCP servers to be ready"""
    print("Waiting for MCP servers to be ready...")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            # Check if orchestrator is responding
            result = subprocess.run(
                ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:8080/health"],
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            if result.returncode == 0 and result.stdout.decode().strip() == "200":
                print("MCP servers are ready")
                return True
            
            time.sleep(2)
        except subprocess.SubprocessError:
            time.sleep(2)
    
    print(f"Timed out waiting for MCP servers after {timeout} seconds")
    return False


def check_environment_variables(env_vars: Dict[str, str]) -> bool:
    """Check if required environment variables are set"""
    required_vars = [
        "ANTHROPIC_API_KEY",
        "GITHUB_TOKEN",
        "GITHUB_OWNER",
        "GITHUB_REPO"
    ]
    
    missing_vars = [var for var in required_vars if not env_vars.get(var)]
    
    if missing_vars:
        print("Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        return False
    
    return True


def main() -> None:
    """Main function to deploy MCP servers and configure Windsurf"""
    parser = argparse.ArgumentParser(description="Deploy MCP servers for DocGen")
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="Path to configuration file")
    parser.add_argument("--no-windsurf", action="store_true", help="Skip Windsurf configuration")
    parser.add_argument("--dev", action="store_true", help="Use development mode")
    args = parser.parse_args()
    
    # Check if Docker is installed and running
    if not check_docker_installed():
        print("Docker is not installed or not running")
        print("Please install Docker and start the Docker daemon")
        sys.exit(1)
    
    # Load environment variables
    env_vars = load_env_file(args.config)
    
    # Check if required environment variables are set
    if not check_environment_variables(env_vars):
        print("Please set the required environment variables in .env file")
        sys.exit(1)
    
    # Update MCP environment file
    update_mcp_env(env_vars)
    
    # Build Docker images
    build_docker_images()
    
    # Start Docker containers
    start_docker_containers(args.dev)
    
    # Wait for servers to be ready
    server_ready = wait_for_servers()
    if not server_ready:
        print("Warning: MCP servers may not be fully initialized")
    
    # Configure Windsurf integration
    if not args.no_windsurf:
        # Build the MCP bridge
        bridge_built = build_mcp_bridge()
        
        if bridge_built:
            # Configure Windsurf to use the MCP bridge
            configure_windsurf(env_vars)
    
    print("MCP deployment completed successfully")


if __name__ == "__main__":
    main()
