#!/usr/bin/env python3
"""
MCP Server Manager - Docker-based MCP server deployment and management

This script provides functionality to:
1. Start/stop MCP servers using Docker
2. Dynamically allocate ports
3. Configure the gateway for routing
4. Monitor server health
"""

import argparse
import json
import os
import socket
import subprocess
import sys
import time
from contextlib import closing
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

# Constants
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DOCKER_DIR = PROJECT_ROOT / ".docker" / "mcp"
CONFIG_DIR = DOCKER_DIR / "config"
COMPOSE_FILE = PROJECT_ROOT / "docker-compose.mcp.yml"
DEFAULT_ENV_FILE = PROJECT_ROOT / ".env.mcp"
GATEWAY_CONF_PATH = CONFIG_DIR / "gateway.conf"

# Port range for MCP servers
DEFAULT_PORT_RANGE_START = 9000
DEFAULT_PORT_RANGE_END = 9999

class MCPServerManager:
    """Manager for MCP servers using Docker Compose"""
    
    def __init__(self, env_file: Path = DEFAULT_ENV_FILE):
        """Initialize the MCP Server Manager
        
        Args:
            env_file: Path to the environment file for Docker Compose
        """
        self.env_file = env_file
        self.running_servers: Dict[str, Dict] = {}
        self._load_env_vars()
        
    def _load_env_vars(self) -> None:
        """Load environment variables from .env.mcp file"""
        self.env_vars = {}
        
        if self.env_file.exists():
            with open(self.env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    
                    key, value = line.split('=', 1)
                    self.env_vars[key] = value
        
        # Set defaults if not specified
        self.port_range_start = int(self.env_vars.get('MCP_PORT_RANGE_START', DEFAULT_PORT_RANGE_START))
        self.port_range_end = int(self.env_vars.get('MCP_PORT_RANGE_END', DEFAULT_PORT_RANGE_END))
        self.gateway_port = int(self.env_vars.get('MCP_GATEWAY_PORT', 8950))
        
    def find_free_port(self) -> int:
        """Find an available port within the configured range
        
        Returns:
            int: An available port number
        """
        for port in range(self.port_range_start, self.port_range_end + 1):
            with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
                if sock.connect_ex(('127.0.0.1', port)) != 0:
                    return port
        
        raise RuntimeError(f"No available ports in range {self.port_range_start}-{self.port_range_end}")
    
    def _run_docker_compose(self, command: str, **kwargs) -> subprocess.CompletedProcess:
        """Run a Docker Compose command
        
        Args:
            command: Docker Compose command (up, down, etc.)
            **kwargs: Additional arguments for subprocess.run
            
        Returns:
            CompletedProcess: Result of the subprocess call
        """
        cmd = [
            "docker", "compose", 
            "-f", str(COMPOSE_FILE),
            command
        ]
        
        if 'env' not in kwargs:
            kwargs['env'] = os.environ.copy()
            
        if self.env_file.exists():
            cmd.extend(["--env-file", str(self.env_file)])
            
        return subprocess.run(cmd, **kwargs)
    
    def start_gateway(self) -> bool:
        """Start the MCP Gateway service
        
        Returns:
            bool: True if successful, False otherwise
        """
        print("Starting MCP Gateway...")
        result = self._run_docker_compose(
            "up",
            "-d",
            "mcp_gateway",
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"Failed to start MCP Gateway: {result.stderr}")
            return False
            
        print(f"MCP Gateway started on port {self.gateway_port}")
        return True
    
    def start_server(self, model_name: str, model_path: str, 
                    memory_limit: str = "4G", cpu_limit: str = "1.0") -> Optional[Dict]:
        """Start a new MCP server for a specific model
        
        Args:
            model_name: Name of the model (used for container naming)
            model_path: Path to the model files
            memory_limit: Memory limit for the container (e.g., "4G")
            cpu_limit: CPU limit for the container (e.g., "1.0")
            
        Returns:
            dict: Server information if successful, None otherwise
        """
        # Generate a unique name for this server instance
        server_name = f"mcp_server_{model_name}"
        
        # Check if server is already running
        if server_name in self.running_servers:
            print(f"Server for model {model_name} is already running")
            return self.running_servers[server_name]
        
        # Find an available port
        port = self.find_free_port()
        
        # Prepare environment variables for this server
        env = os.environ.copy()
        env.update({
            "MCP_SERVER_NAME": server_name,
            "MCP_SERVER_PORT": str(port),
            "MCP_MODEL_PATH": model_path,
            "MCP_SERVER_MEMORY_LIMIT": memory_limit,
            "MCP_SERVER_CPU_LIMIT": cpu_limit
        })
        
        # Create a specific service for this server based on the template
        print(f"Starting MCP server for model {model_name} on port {port}...")
        result = subprocess.run([
            "docker", "compose",
            "-f", str(COMPOSE_FILE),
            "up", "-d",
            "--scale", f"mcp_server=0",  # Ensure template is not started
            f"--name={server_name}"
        ], env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Failed to start MCP server: {result.stderr}")
            return None
        
        # Wait for the server to be healthy
        healthy = self._wait_for_server_health(server_name)
        if not healthy:
            print(f"Server {server_name} failed health check. Stopping...")
            self.stop_server(model_name)
            return None
        
        # Store server info
        server_info = {
            "name": server_name,
            "port": port,
            "model": model_name,
            "model_path": model_path
        }
        self.running_servers[server_name] = server_info
        
        # Update the gateway configuration
        self._update_gateway_config()
        
        print(f"MCP server for model {model_name} started successfully")
        return server_info
    
    def stop_server(self, model_name: str) -> bool:
        """Stop a running MCP server
        
        Args:
            model_name: Name of the model server to stop
            
        Returns:
            bool: True if successful, False otherwise
        """
        server_name = f"mcp_server_{model_name}"
        
        if server_name not in self.running_servers:
            print(f"No server found for model {model_name}")
            return False
        
        print(f"Stopping MCP server for model {model_name}...")
        result = subprocess.run([
            "docker", "stop", server_name,
            "&&", "docker", "rm", server_name
        ], shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Failed to stop MCP server: {result.stderr}")
            return False
        
        # Remove from running servers
        del self.running_servers[server_name]
        
        # Update the gateway configuration
        self._update_gateway_config()
        
        print(f"MCP server for model {model_name} stopped successfully")
        return True
    
    def stop_all(self) -> bool:
        """Stop all running MCP servers and the gateway
        
        Returns:
            bool: True if successful, False otherwise
        """
        print("Stopping all MCP servers and gateway...")
        result = self._run_docker_compose("down", capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"Failed to stop MCP services: {result.stderr}")
            return False
        
        self.running_servers = {}
        print("All MCP services stopped successfully")
        return True
    
    def _update_gateway_config(self) -> None:
        """Update the NGINX gateway configuration with current servers"""
        if not self.running_servers:
            return
        
        # Get the template configuration
        with open(GATEWAY_CONF_PATH, 'r') as f:
            config = f.read()
        
        # Build the upstream server list
        upstream_servers = "upstream mcp_servers {\n"
        for server in self.running_servers.values():
            upstream_servers += f"    server {server['name']}:{server['port']};\n"
        upstream_servers += "}"
        
        # Replace the placeholder with actual servers
        config = config.replace("upstream mcp_servers {", upstream_servers)
        
        # Update server count for status endpoint
        server_count = len(self.running_servers)
        config = config.replace('$MCP_SERVER_COUNT', str(server_count))
        
        # Write the updated configuration
        with open(GATEWAY_CONF_PATH, 'w') as f:
            f.write(config)
        
        # Reload NGINX configuration
        subprocess.run(["docker", "exec", "mcp_gateway", "nginx", "-s", "reload"], 
                      capture_output=True, check=False)
        
    def _wait_for_server_health(self, server_name: str, timeout: int = 60) -> bool:
        """Wait for a server to be healthy
        
        Args:
            server_name: Name of the server container
            timeout: Maximum time to wait in seconds
            
        Returns:
            bool: True if server is healthy, False otherwise
        """
        print(f"Waiting for {server_name} to be healthy...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            result = subprocess.run(
                ["docker", "inspect", "--format", "{{.State.Health.Status}}", server_name],
                capture_output=True, text=True
            )
            
            if result.returncode == 0 and result.stdout.strip() == "healthy":
                return True
                
            time.sleep(2)
            
        return False
    
    def list_servers(self) -> List[Dict]:
        """List all running MCP servers
        
        Returns:
            List[Dict]: Information about running servers
        """
        return list(self.running_servers.values())

def main():
    """Main entry point for the MCP Server Manager CLI"""
    parser = argparse.ArgumentParser(description="MCP Server Manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Start gateway command
    start_gateway_parser = subparsers.add_parser("start-gateway", help="Start the MCP Gateway")
    
    # Start server command
    start_server_parser = subparsers.add_parser("start-server", help="Start an MCP server")
    start_server_parser.add_argument("model_name", help="Name of the model")
    start_server_parser.add_argument("model_path", help="Path to the model files")
    start_server_parser.add_argument("--memory", default="4G", help="Memory limit (default: 4G)")
    start_server_parser.add_argument("--cpu", default="1.0", help="CPU limit (default: 1.0)")
    
    # Stop server command
    stop_server_parser = subparsers.add_parser("stop-server", help="Stop an MCP server")
    stop_server_parser.add_argument("model_name", help="Name of the model")
    
    # Stop all command
    subparsers.add_parser("stop-all", help="Stop all MCP servers and gateway")
    
    # List servers command
    subparsers.add_parser("list", help="List running MCP servers")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Create manager
    manager = MCPServerManager()
    
    # Execute command
    if args.command == "start-gateway":
        success = manager.start_gateway()
        sys.exit(0 if success else 1)
    elif args.command == "start-server":
        server = manager.start_server(
            args.model_name, args.model_path, 
            args.memory, args.cpu
        )
        if not server:
            sys.exit(1)
        print(json.dumps(server, indent=2))
    elif args.command == "stop-server":
        success = manager.stop_server(args.model_name)
        sys.exit(0 if success else 1)
    elif args.command == "stop-all":
        success = manager.stop_all()
        sys.exit(0 if success else 1)
    elif args.command == "list":
        servers = manager.list_servers()
        print(json.dumps(servers, indent=2))
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
