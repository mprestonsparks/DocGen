#!/usr/bin/env python3
"""
MCP Server Health Monitoring Script for DocGen
Provides comprehensive health monitoring for MCP servers with multiple validation layers
"""

import os
import sys
import time
import json
import socket
import argparse
import subprocess
import requests
from pathlib import Path
from contextlib import closing
from datetime import datetime

# Constants
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DOCKER_DIR = PROJECT_ROOT / "docker" / "mcp"
ENV_FILE = DOCKER_DIR / ".env.mcp"

def load_env_vars():
    """Load environment variables from .env.mcp file"""
    env_vars = {}
    if ENV_FILE.exists():
        with open(ENV_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    return env_vars

def get_server_ports():
    """Get the ports for each MCP server from environment variables"""
    env_vars = load_env_vars()
    ports = {}
    
    # Extract ports from port ranges
    for key, value in env_vars.items():
        if key.endswith('_PORT_RANGE') and '-' in value:
            service_name = key.replace('_PORT_RANGE', '').lower()
            if service_name == 'github_mcp':
                service_name = 'github'
            elif service_name == 'code_analysis':
                service_name = 'code_analysis'
            elif service_name == 'main_mcp':
                service_name = 'main'
            elif service_name == 'main_mcp_health':
                service_name = 'main_health'
                
            start_port = int(value.split('-')[0])
            ports[service_name] = start_port
            
    return ports

def check_container_status():
    """Check if all MCP containers are running and healthy"""
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=docgen-mcp", "--format", "{{.Names}}: {{.Status}}"],
            capture_output=True,
            text=True,
            check=True
        )
        
        statuses = result.stdout.strip().split('\n')
        containers = {}
        
        for status_line in statuses:
            if not status_line:
                continue
                
            parts = status_line.split(': ', 1)
            if len(parts) == 2:
                container_name = parts[0]
                status = parts[1]
                is_healthy = "healthy" in status
                is_running = "Up" in status
                
                containers[container_name] = {
                    "running": is_running,
                    "healthy": is_healthy,
                    "status": status
                }
                
        return containers
    except subprocess.CalledProcessError as e:
        print(f"Error checking container status: {e}")
        return {}

def check_tcp_connectivity(ports):
    """Check TCP connectivity to all MCP server ports"""
    results = {}
    
    for name, port in ports.items():
        if name == 'main_health':
            continue  # Skip health port in service checks
            
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
            s.settimeout(2)
            result = s.connect_ex(('localhost', port))
            results[name] = {
                "port": port,
                "accessible": result == 0
            }
            
    return results

def check_http_health_endpoints(ports):
    """Check HTTP health endpoints for all MCP servers"""
    results = {}
    
    for name, port in ports.items():
        check_port = port
        if name == 'main':
            check_port = ports.get('main_health', port)  # Use health port for main service
            
        try:
            response = requests.get(f"http://localhost:{check_port}/health", timeout=5)
            status_code = response.status_code
            response_body = response.json() if response.ok else {}
            
            results[name] = {
                "port": check_port,
                "status_code": status_code,
                "healthy": response.ok,
                "response": response_body
            }
        except requests.RequestException as e:
            results[name] = {
                "port": check_port,
                "status_code": None,
                "healthy": False,
                "error": str(e)
            }
            
    return results

def check_resource_usage():
    """Check resource usage for MCP containers"""
    try:
        result = subprocess.run(
            ["docker", "stats", "--no-stream", "--format", 
             "{{.Name}},{{.CPUPerc}},{{.MemPerc}},{{.MemUsage}}", 
             "docgen-mcp-github", "docgen-mcp-code-analysis", "docgen-mcp-main"],
            capture_output=True,
            text=True,
            check=True
        )
        
        resources = {}
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
                
            parts = line.split(',')
            if len(parts) >= 4:
                container_name = parts[0]
                cpu_usage = parts[1]
                mem_percentage = parts[2]
                mem_usage = parts[3]
                
                resources[container_name] = {
                    "cpu": cpu_usage,
                    "memory_percent": mem_percentage,
                    "memory_usage": mem_usage
                }
                
        return resources
    except subprocess.CalledProcessError as e:
        print(f"Error checking resource usage: {e}")
        return {}

def comprehensive_health_check(timeout=60, verbose=False):
    """Perform comprehensive health check with all validation layers"""
    start_time = time.time()
    healthy = False
    
    print(f"Starting comprehensive health check at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    while time.time() - start_time < timeout:
        # Get server ports
        ports = get_server_ports()
        if not ports:
            print("No MCP server ports found in environment file")
            time.sleep(5)
            continue
            
        if verbose:
            print(f"Found MCP server ports: {json.dumps(ports, indent=2)}")
            
        # Layer 1: Container status check
        containers = check_container_status()
        if not containers:
            print("No MCP containers found running")
            time.sleep(5)
            continue
            
        if verbose:
            print(f"Container status: {json.dumps(containers, indent=2)}")
            
        # Check if all containers are healthy
        container_healthy = all(
            container["healthy"] for container in containers.values()
        )
        
        if not container_healthy:
            print("Waiting for container health checks to pass...")
            time.sleep(5)
            continue
            
        print("All containers appear to be running and healthy")
            
        # Layer 2: TCP port checks
        tcp_results = check_tcp_connectivity(ports)
        if verbose:
            print(f"TCP connectivity: {json.dumps(tcp_results, indent=2)}")
            
        tcp_healthy = all(result["accessible"] for result in tcp_results.values())
        
        if not tcp_healthy:
            print("Waiting for TCP port checks to pass...")
            time.sleep(5)
            continue
            
        print("All TCP port checks passed")
            
        # Layer 3: HTTP health endpoint checks
        http_results = check_http_health_endpoints(ports)
        if verbose:
            print(f"HTTP health endpoints: {json.dumps(http_results, indent=2)}")
            
        http_healthy = all(result["healthy"] for result in http_results.values())
        
        if not http_healthy:
            print("Waiting for HTTP health checks to pass...")
            time.sleep(5)
            continue
            
        print("All HTTP health checks passed")
            
        # Layer 4: Resource usage checks
        resources = check_resource_usage()
        if verbose:
            print(f"Resource usage: {json.dumps(resources, indent=2)}")
            
        # All checks passed
        healthy = True
        break
        
        time.sleep(5)
    
    if healthy:
        print(f"All MCP servers are healthy! (Checked at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})")
        return True
    else:
        print(f"MCP servers failed to become healthy within {timeout} seconds")
        return False

def generate_health_report():
    """Generate a comprehensive health report for MCP servers"""
    report = {
        "timestamp": datetime.now().isoformat(),
        "servers": {}
    }
    
    # Get server ports
    ports = get_server_ports()
    
    # Layer 1: Container status
    containers = check_container_status()
    
    # Layer 2: TCP connectivity
    tcp_results = check_tcp_connectivity(ports)
    
    # Layer 3: HTTP health endpoints
    http_results = check_http_health_endpoints(ports)
    
    # Layer 4: Resource usage
    resources = check_resource_usage()
    
    # Compile report
    for container_name, container_status in containers.items():
        server_name = container_name.replace('docgen-mcp-', '')
        
        report["servers"][server_name] = {
            "container": container_status,
            "tcp": tcp_results.get(server_name, {"accessible": False}),
            "http": http_results.get(server_name, {"healthy": False}),
            "resources": resources.get(container_name, {})
        }
    
    # Overall health status
    all_container_healthy = all(container["healthy"] for container in containers.values())
    all_tcp_accessible = all(result["accessible"] for result in tcp_results.values())
    all_http_healthy = all(result["healthy"] for result in http_results.values())
    
    report["overall"] = {
        "healthy": all_container_healthy and all_tcp_accessible and all_http_healthy,
        "containers_healthy": all_container_healthy,
        "tcp_accessible": all_tcp_accessible,
        "http_healthy": all_http_healthy
    }
    
    return report

def main():
    """Main function for MCP health monitoring"""
    parser = argparse.ArgumentParser(description="MCP Server Health Monitoring")
    parser.add_argument("action", choices=["check", "report"], 
                        help="Action to perform (check: perform health check, report: generate health report)")
    parser.add_argument("--timeout", type=int, default=60,
                        help="Health check timeout in seconds")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable verbose output")
    parser.add_argument("--output", "-o", type=str,
                        help="Output file for health report (JSON format)")
    args = parser.parse_args()
    
    if args.action == "check":
        healthy = comprehensive_health_check(args.timeout, args.verbose)
        sys.exit(0 if healthy else 1)
    elif args.action == "report":
        report = generate_health_report()
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(report, f, indent=2)
            print(f"Health report written to {args.output}")
        else:
            print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
