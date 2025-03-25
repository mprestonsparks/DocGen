#!/usr/bin/env python3
"""
MCP Health Monitor - Monitors health of MCP servers

This script provides functionality to:
1. Check health of MCP Gateway
2. Check health of individual MCP servers
3. Report detailed health metrics
4. Automatically restart unhealthy services (optional)
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Constants
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_CHECK_INTERVAL = 60  # seconds
DEFAULT_GATEWAY_PORT = 8950
DEFAULT_HEALTH_LOG = PROJECT_ROOT / "logs" / "mcp_health.log"

class MCPHealthMonitor:
    """Monitors health of MCP servers"""
    
    def __init__(self, gateway_port: int = DEFAULT_GATEWAY_PORT, 
                 log_file: Path = DEFAULT_HEALTH_LOG):
        """Initialize the MCP Health Monitor
        
        Args:
            gateway_port: Port for the MCP Gateway
            log_file: Path to the health log file
        """
        self.gateway_port = gateway_port
        self.log_file = log_file
        self.gateway_url = f"http://localhost:{gateway_port}"
        
        # Ensure log directory exists
        if not self.log_file.parent.exists():
            self.log_file.parent.mkdir(parents=True, exist_ok=True)
    
    def check_gateway_health(self) -> Tuple[bool, str]:
        """Check health of the MCP Gateway
        
        Returns:
            Tuple[bool, str]: Health status and message
        """
        try:
            result = subprocess.run(
                ["curl", "-s", "-f", f"{self.gateway_url}/health"],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode == 0:
                return True, "Gateway is healthy"
            else:
                return False, f"Gateway health check failed: {result.stderr}"
        except subprocess.TimeoutExpired:
            return False, "Gateway health check timed out"
        except Exception as e:
            return False, f"Error checking gateway health: {str(e)}"
    
    def get_running_servers(self) -> List[Dict]:
        """Get list of running MCP servers
        
        Returns:
            List[Dict]: Information about running servers
        """
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", "name=mcp_server_", "--format", "{{.Names}}"],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode != 0:
                return []
                
            server_names = [name for name in result.stdout.strip().split('\n') if name]
            servers = []
            
            for name in server_names:
                # Extract model name from server name
                model_name = name.replace("mcp_server_", "")
                
                # Get container details
                inspect_result = subprocess.run(
                    ["docker", "inspect", "--format", "{{json .}}", name],
                    capture_output=True, text=True, timeout=5
                )
                
                if inspect_result.returncode == 0:
                    try:
                        container_info = json.loads(inspect_result.stdout)
                        
                        # Extract port from environment variables
                        env_vars = container_info.get("Config", {}).get("Env", [])
                        port = None
                        
                        for env in env_vars:
                            if env.startswith("MCP_SERVER_PORT="):
                                port = int(env.split("=")[1])
                                break
                        
                        if port:
                            servers.append({
                                "name": name,
                                "model": model_name,
                                "port": port,
                                "status": container_info.get("State", {}).get("Status", "unknown"),
                                "health": container_info.get("State", {}).get("Health", {}).get("Status", "unknown")
                            })
                    except json.JSONDecodeError:
                        pass
            
            return servers
        except Exception as e:
            print(f"Error getting running servers: {str(e)}")
            return []
    
    def check_server_health(self, server: Dict) -> Tuple[bool, str]:
        """Check health of a specific MCP server
        
        Args:
            server: Server information
            
        Returns:
            Tuple[bool, str]: Health status and message
        """
        # First check container status
        if server.get("status") != "running":
            return False, f"Server {server['name']} is not running"
        
        # Check Docker health status
        if server.get("health") != "healthy":
            return False, f"Server {server['name']} health check failing"
        
        # Check HTTP health endpoint
        try:
            port = server.get("port")
            
            if not port:
                return False, f"Server {server['name']} has no port configured"
                
            result = subprocess.run(
                ["curl", "-s", "-f", f"http://localhost:{port}/health"],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode == 0:
                return True, f"Server {server['name']} is healthy"
            else:
                return False, f"Server {server['name']} health check failed: {result.stderr}"
        except subprocess.TimeoutExpired:
            return False, f"Server {server['name']} health check timed out"
        except Exception as e:
            return False, f"Error checking {server['name']} health: {str(e)}"
    
    def restart_service(self, service_name: str) -> bool:
        """Restart an unhealthy service
        
        Args:
            service_name: Name of the service to restart
            
        Returns:
            bool: True if restart was successful
        """
        try:
            print(f"Restarting {service_name}...")
            
            result = subprocess.run(
                ["docker", "restart", service_name],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                print(f"Successfully restarted {service_name}")
                return True
            else:
                print(f"Failed to restart {service_name}: {result.stderr}")
                return False
        except Exception as e:
            print(f"Error restarting {service_name}: {str(e)}")
            return False
    
    def log_health_status(self, status: Dict) -> None:
        """Log health status to the log file
        
        Args:
            status: Health status information
        """
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "status": status
        }
        
        with open(self.log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
    
    def check_all(self, auto_restart: bool = False) -> Dict:
        """Check health of all MCP services
        
        Args:
            auto_restart: Whether to automatically restart unhealthy services
            
        Returns:
            Dict: Health status information
        """
        status = {
            "timestamp": datetime.now().isoformat(),
            "gateway": {},
            "servers": []
        }
        
        # Check gateway health
        gateway_healthy, gateway_msg = self.check_gateway_health()
        status["gateway"] = {
            "healthy": gateway_healthy,
            "message": gateway_msg
        }
        
        # If gateway is unhealthy and auto_restart is enabled, try to restart it
        if not gateway_healthy and auto_restart:
            self.restart_service("mcp_gateway")
            # Re-check gateway health after restart
            gateway_healthy, gateway_msg = self.check_gateway_health()
            status["gateway"] = {
                "healthy": gateway_healthy,
                "message": gateway_msg,
                "restarted": True
            }
        
        # Check server health
        servers = self.get_running_servers()
        
        for server in servers:
            server_healthy, server_msg = self.check_server_health(server)
            server_status = {
                "name": server["name"],
                "model": server["model"],
                "healthy": server_healthy,
                "message": server_msg
            }
            
            # If server is unhealthy and auto_restart is enabled, try to restart it
            if not server_healthy and auto_restart:
                self.restart_service(server["name"])
                # Re-check server health after restart
                server_healthy, server_msg = self.check_server_health(server)
                server_status["healthy"] = server_healthy
                server_status["message"] = server_msg
                server_status["restarted"] = True
            
            status["servers"].append(server_status)
        
        # Log health status
        self.log_health_status(status)
        
        return status
    
    def monitor(self, interval: int = DEFAULT_CHECK_INTERVAL, 
                auto_restart: bool = False, count: Optional[int] = None) -> None:
        """Continuously monitor MCP services
        
        Args:
            interval: Check interval in seconds
            auto_restart: Whether to automatically restart unhealthy services
            count: Number of checks to perform (None for infinite)
        """
        checks_performed = 0
        
        print(f"Starting MCP health monitor (interval: {interval}s, auto-restart: {auto_restart})")
        
        try:
            while count is None or checks_performed < count:
                print(f"\n[{datetime.now().isoformat()}] Checking MCP services health...")
                
                status = self.check_all(auto_restart)
                
                # Print summary
                gateway_status = "✅" if status["gateway"]["healthy"] else "❌"
                print(f"Gateway: {gateway_status} - {status['gateway']['message']}")
                
                if status["servers"]:
                    print("Servers:")
                    for server in status["servers"]:
                        server_status = "✅" if server["healthy"] else "❌"
                        print(f"  {server['name']}: {server_status} - {server['message']}")
                else:
                    print("No MCP servers running")
                
                checks_performed += 1
                
                if count is not None and checks_performed >= count:
                    break
                    
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\nMCP health monitor stopped")

def main():
    """Main entry point for the MCP Health Monitor CLI"""
    parser = argparse.ArgumentParser(description="MCP Health Monitor")
    parser.add_argument("--gateway-port", type=int, default=DEFAULT_GATEWAY_PORT,
                       help=f"Gateway port (default: {DEFAULT_GATEWAY_PORT})")
    parser.add_argument("--log-file", type=str, default=str(DEFAULT_HEALTH_LOG),
                       help=f"Health log file (default: {DEFAULT_HEALTH_LOG})")
    parser.add_argument("--check-interval", type=int, default=DEFAULT_CHECK_INTERVAL,
                       help=f"Check interval in seconds (default: {DEFAULT_CHECK_INTERVAL})")
    parser.add_argument("--auto-restart", action="store_true",
                       help="Automatically restart unhealthy services")
    parser.add_argument("--single-check", action="store_true",
                       help="Perform a single health check and exit")
    
    args = parser.parse_args()
    
    monitor = MCPHealthMonitor(
        gateway_port=args.gateway_port,
        log_file=Path(args.log_file)
    )
    
    if args.single_check:
        status = monitor.check_all(args.auto_restart)
        print(json.dumps(status, indent=2))
    else:
        monitor.monitor(
            interval=args.check_interval,
            auto_restart=args.auto_restart
        )

if __name__ == "__main__":
    main()
