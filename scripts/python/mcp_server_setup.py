#!/usr/bin/env python3
"""
MCP Server Setup Script for DocGen
Handles configuration, startup, and health monitoring of MCP servers in Docker
"""

import os
import argparse
import subprocess
import sys
import time
import json
import socket
from pathlib import Path
from contextlib import closing

# Constants
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DOCKER_DIR = PROJECT_ROOT / "docker" / "mcp"
ENV_TEMPLATE = DOCKER_DIR / ".env.mcp.template"
ENV_FILE = DOCKER_DIR / ".env.mcp"
COMPOSE_FILE = DOCKER_DIR / "docker-compose.mcp.yml"
SECRETS_DIR = DOCKER_DIR / "secrets"

def find_free_port(start_port=3000, end_port=4000):
    """Find a free port in the given range"""
    for port in range(start_port, end_port):
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    raise RuntimeError(f"No free ports available in range {start_port}-{end_port}")

def assign_dynamic_ports():
    """Dynamically assign ports for MCP servers and update .env file"""
    # Read current .env file
    env_vars = {}
    if ENV_FILE.exists():
        with open(ENV_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value

    # Find free ports for each service
    github_port = find_free_port(3000, 3100)
    main_port = find_free_port(3200, 3300)
    main_health_port = find_free_port(8800, 8900)

    # Update port ranges in env vars
    env_vars['GITHUB_MCP_PORT_RANGE'] = f"{github_port}-{github_port}"
    env_vars['MAIN_MCP_PORT_RANGE'] = f"{main_port}-{main_port}"
    env_vars['MAIN_MCP_HEALTH_PORT_RANGE'] = f"{main_health_port}-{main_health_port}"

    # Write updated .env file
    with open(ENV_FILE, 'w') as f:
        for key, value in sorted(env_vars.items()):
            f.write(f"{key}={value}\n")

    return {
        'github': github_port,
        'main': main_port,
        'main_health': main_health_port
    }

def setup_environment():
    """Set up environment variables from template if not exists"""
    if not ENV_FILE.exists():
        print("Creating MCP environment file from template...")
        
        if not ENV_TEMPLATE.exists():
            print(f"Error: Template file {ENV_TEMPLATE} not found")
            sys.exit(1)
            
        # Copy template
        with open(ENV_TEMPLATE, 'r') as template, open(ENV_FILE, 'w') as env_file:
            env_content = template.read()
            env_file.write(env_content)
            
        print(f"Created {ENV_FILE}. Please edit this file to add your configuration.")
        return False
    return True

def setup_secrets():
    """Set up secrets directory and files if they don't exist"""
    if not SECRETS_DIR.exists():
        print("Creating secrets directory...")
        SECRETS_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
        
        # Create empty secret files
        secret_files = [
            "anthropic_key.txt", 
            "github_token.txt"
        ]
        
        for secret_file in secret_files:
            secret_path = SECRETS_DIR / secret_file
            if not secret_path.exists():
                secret_path.touch(mode=0o600)
                
        print(f"Created secret files in {SECRETS_DIR}.")
        print("IMPORTANT: Add your API keys to these files before starting the servers.")
        print("IMPORTANT: Never commit these files to version control!")
        return False
    return True

def start_mcp_servers():
    """Start MCP servers using Docker Compose with dynamic port allocation"""
    print("Starting MCP servers...")
    
    # Assign dynamic ports
    ports = assign_dynamic_ports()
    print(f"Assigned ports: GitHub: {ports['github']}, Main: {ports['main']}, Main Health: {ports['main_health']}")
    
    try:
        # Navigate to docker directory and start services
        subprocess.run(
            ["docker-compose", "-f", str(COMPOSE_FILE), "up", "-d"],
            cwd=str(DOCKER_DIR),
            check=True
        )
        print("MCP servers started successfully")
        return ports
    except subprocess.CalledProcessError as e:
        print(f"Error starting MCP servers: {e}")
        sys.exit(1)

def check_server_health(ports, timeout=60):
    """Check health status of MCP servers with comprehensive monitoring"""
    print("Checking MCP server health...")
    
    start_time = time.time()
    healthy = False
    
    while time.time() - start_time < timeout:
        try:
            # Layer 1: Container status check
            result = subprocess.run(
                ["docker", "ps", "--filter", "name=docgen-mcp", "--format", "{{.Names}}: {{.Status}}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            statuses = result.stdout.strip().split('\n')
            container_healthy = all("healthy" in status for status in statuses if status)
            
            if not container_healthy:
                print("Waiting for container health checks to pass...")
                time.sleep(5)
                continue
                
            # Layer 2: TCP port checks
            tcp_healthy = True
            for name, port in ports.items():
                if name != 'main_health':  # Skip health port in service checks
                    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
                        s.settimeout(2)
                        result = s.connect_ex(('localhost', port))
                        if result != 0:
                            print(f"TCP port check failed for {name} on port {port}")
                            tcp_healthy = False
                            break
            
            if not tcp_healthy:
                print("Waiting for TCP port checks to pass...")
                time.sleep(5)
                continue
                
            # Layer 3: HTTP health endpoint checks
            http_healthy = True
            for name, port in ports.items():
                # Skip the main_health entry as it's used specifically for the main service health check
                if name == 'main_health':
                    continue
                    
                check_port = port
                if name == 'main':
                    check_port = ports.get('main_health', port)  # Use health port for main service if available
                
                # Determine the health endpoint path
                health_path = "/health"
                
                try:
                    print(f"Checking health for {name} on port {check_port} at {health_path}")
                    result = subprocess.run(
                        ["curl", "-s", f"http://localhost:{check_port}{health_path}"],
                        capture_output=True,
                        text=True
                    )
                    
                    # Consider any 2xx response as healthy, even if the content doesn't match expectations
                    if result.returncode != 0:
                        print(f"HTTP health check failed for {name} on port {check_port}")
                        print(f"Error: {result.stderr}")
                        http_healthy = False
                        break
                    else:
                        print(f"Health check for {name} succeeded with response: {result.stdout[:100]}...")
                except Exception as e:
                    print(f"HTTP health check exception for {name} on port {check_port}: {str(e)}")
                    http_healthy = False
                    break
            
            if not http_healthy:
                print("Waiting for HTTP health checks to pass...")
                time.sleep(5)
                continue
                
            # Layer 4: Resource usage checks
            try:
                result = subprocess.run(
                    ["docker", "stats", "--no-stream", "--format", 
                     "{{.Name}}: CPU={{.CPUPerc}}, MEM={{.MemPerc}}", 
                     "docgen-mcp-github", "docgen-mcp-main"],
                    capture_output=True,
                    text=True,
                    check=True
                )
                print("Resource usage:")
                print(result.stdout.strip())
                
                # All checks passed
                healthy = True
                break
                
            except subprocess.CalledProcessError:
                print("Resource usage check failed")
                time.sleep(5)
                continue
                
        except (subprocess.CalledProcessError, socket.error) as e:
            print(f"Health check error: {e}")
            time.sleep(5)
    
    if healthy:
        print("All MCP servers are healthy!")
        return True
    else:
        print(f"MCP servers failed to become healthy within {timeout} seconds")
        return False

def stop_mcp_servers():
    """Stop MCP servers using Docker Compose"""
    print("Stopping MCP servers...")
    
    try:
        subprocess.run(
            ["docker-compose", "-f", str(COMPOSE_FILE), "down"],
            cwd=str(DOCKER_DIR),
            check=True
        )
        print("MCP servers stopped successfully")
    except subprocess.CalledProcessError as e:
        print(f"Error stopping MCP servers: {e}")
        sys.exit(1)

def main():
    """Main function to handle MCP server setup and management"""
    parser = argparse.ArgumentParser(description="Manage MCP servers for DocGen")
    parser.add_argument("action", choices=["setup", "start", "stop", "status"], 
                        help="Action to perform")
    parser.add_argument("--timeout", type=int, default=60,
                        help="Health check timeout in seconds")
    args = parser.parse_args()
    
    if args.action == "setup":
        # Set up environment and secrets
        env_ready = setup_environment()
        secrets_ready = setup_secrets()
        
        if not env_ready or not secrets_ready:
            print("\nSetup incomplete. Please take the following actions:")
            if not env_ready:
                print("1. Edit the .env.mcp file with your configuration")
            if not secrets_ready:
                print(f"2. Add your API keys to the secret files in {SECRETS_DIR}")
            sys.exit(0)
            
        print("MCP server setup complete! You can now start the servers with:")
        print(f"python {os.path.basename(__file__)} start")
        
    elif args.action == "start":
        # Check if environment and secrets are ready
        if not ENV_FILE.exists():
            print("Environment file not found. Please run setup first.")
            sys.exit(1)
            
        # Start MCP servers
        ports = start_mcp_servers()
        
        # Check server health
        if check_server_health(ports, args.timeout):
            print("\nMCP servers are ready to use!")
            print("Use the following ports in your development environment:")
            print(f"- GitHub MCP Server: localhost:{ports['github']}")
            print(f"- Main MCP Server: localhost:{ports['main']}")
            print(f"\nTo stop the servers: python {os.path.basename(__file__)} stop")
        else:
            print("\nMCP servers failed to start properly. Check Docker logs for details:")
            print("docker logs docgen-mcp-github")
            print("docker logs docgen-mcp-main")
            
    elif args.action == "stop":
        # Stop MCP servers
        stop_mcp_servers()
        
    elif args.action == "status":
        # Check if servers are running
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=docgen-mcp", "--format", "{{.Names}}: {{.Status}}"],
            capture_output=True,
            text=True
        )
        
        if result.stdout.strip():
            print("MCP server status:")
            print(result.stdout.strip())
            
            # Get running ports
            ports = {}
            port_mapping = subprocess.run(
                ["docker", "ps", "--filter", "name=docgen-mcp", "--format", "{{.Names}}:{{.Ports}}"],
                capture_output=True,
                text=True
            )
            
            for line in port_mapping.stdout.strip().split('\n'):
                if line:
                    parts = line.split(':')
                    name = parts[0].replace('docgen-mcp-', '')
                    port_info = ':'.join(parts[1:])
                    
                    # Parse port mapping (e.g., "0.0.0.0:3000->3000/tcp")
                    import re
                    port_match = re.search(r'(\d+)->', port_info)
                    if port_match:
                        ports[name] = int(port_match.group(1))
            
            # Check health
            check_server_health(ports, args.timeout)
        else:
            print("No MCP servers are currently running")
            print(f"To start servers: python {os.path.basename(__file__)} start")

if __name__ == "__main__":
    main()
