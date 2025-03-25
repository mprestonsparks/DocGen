#!/usr/bin/env python3
"""
MCP Server Deployment Script for DocGen
Handles the complete deployment process for MCP servers
"""

import os
import sys
import argparse
import subprocess
import time
import json
from pathlib import Path
from datetime import datetime

# Import MCP setup and health monitoring modules
try:
    import mcp_server_setup
    import mcp_health_monitor
except ImportError:
    # If running from a different directory, add the scripts directory to the path
    script_dir = Path(__file__).resolve().parent
    sys.path.append(str(script_dir))
    import mcp_server_setup
    import mcp_health_monitor

# Constants
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DOCKER_DIR = PROJECT_ROOT / "docker" / "mcp"
LOGS_DIR = PROJECT_ROOT / "logs" / "mcp"

def setup_logging_directory():
    """Set up logging directory for MCP deployment"""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Logs will be stored in {LOGS_DIR}")

def log_deployment_step(step, status, details=None):
    """Log deployment step to file"""
    timestamp = datetime.now().isoformat()
    log_file = LOGS_DIR / f"deployment_{datetime.now().strftime('%Y%m%d')}.log"
    
    log_entry = {
        "timestamp": timestamp,
        "step": step,
        "status": status
    }
    
    if details:
        log_entry["details"] = details
        
    with open(log_file, 'a') as f:
        f.write(f"{json.dumps(log_entry)}\n")
        
    print(f"[{timestamp}] {step}: {status}")
    if details:
        print(f"  Details: {details}")

def check_docker_installation():
    """Check if Docker is installed and running"""
    try:
        subprocess.run(["docker", "--version"], check=True, capture_output=True)
        subprocess.run(["docker-compose", "--version"], check=True, capture_output=True)
        
        # Check if Docker daemon is running
        subprocess.run(["docker", "info"], check=True, capture_output=True)
        
        log_deployment_step("Docker check", "SUCCESS", "Docker and Docker Compose are installed and running")
        return True
    except subprocess.CalledProcessError as e:
        log_deployment_step("Docker check", "FAILED", f"Docker check failed: {e}")
        return False
    except FileNotFoundError:
        log_deployment_step("Docker check", "FAILED", "Docker or Docker Compose not found")
        return False

def check_network_requirements():
    """Check if required network ports are available"""
    # Get port ranges from environment file
    env_vars = mcp_server_setup.load_env_vars() if hasattr(mcp_server_setup, 'load_env_vars') else {}
    
    port_ranges = {
        "GitHub MCP": env_vars.get("GITHUB_MCP_PORT_RANGE", "3000-3100"),
        "Code Analysis MCP": env_vars.get("CODE_ANALYSIS_PORT_RANGE", "3100-3200"),
        "Main MCP": env_vars.get("MAIN_MCP_PORT_RANGE", "3200-3300"),
        "Health": env_vars.get("MAIN_MCP_HEALTH_PORT_RANGE", "8800-8900")
    }
    
    # Check if at least one port in each range is available
    available_ports = {}
    for service, port_range in port_ranges.items():
        try:
            start_port, end_port = map(int, port_range.split('-'))
            available_port = mcp_server_setup.find_free_port(start_port, end_port)
            available_ports[service] = available_port
        except (ValueError, RuntimeError) as e:
            log_deployment_step("Network check", "FAILED", f"No available ports for {service} in range {port_range}: {e}")
            return False
    
    log_deployment_step("Network check", "SUCCESS", f"Available ports: {available_ports}")
    return True

def deploy_mcp_servers(timeout=120):
    """Deploy MCP servers with comprehensive setup and health monitoring"""
    # Step 1: Set up logging directory
    setup_logging_directory()
    log_deployment_step("Deployment", "STARTED", f"Starting MCP server deployment at {datetime.now().isoformat()}")
    
    # Step 2: Check Docker installation
    if not check_docker_installation():
        log_deployment_step("Deployment", "FAILED", "Docker installation check failed")
        return False
        
    # Step 3: Check network requirements
    if not check_network_requirements():
        log_deployment_step("Deployment", "FAILED", "Network requirements check failed")
        return False
        
    # Step 4: Set up environment and secrets
    log_deployment_step("Environment setup", "STARTED")
    try:
        env_ready = mcp_server_setup.setup_environment()
        secrets_ready = mcp_server_setup.setup_secrets()
        
        if not env_ready or not secrets_ready:
            log_deployment_step("Environment setup", "INCOMPLETE", 
                               "Environment or secrets not fully configured")
            return False
            
        log_deployment_step("Environment setup", "SUCCESS")
    except Exception as e:
        log_deployment_step("Environment setup", "FAILED", f"Error: {e}")
        return False
        
    # Step 5: Start MCP servers
    log_deployment_step("Server startup", "STARTED")
    try:
        ports = mcp_server_setup.start_mcp_servers()
        log_deployment_step("Server startup", "SUCCESS", f"Servers started with ports: {ports}")
    except Exception as e:
        log_deployment_step("Server startup", "FAILED", f"Error starting servers: {e}")
        return False
        
    # Step 6: Health check
    log_deployment_step("Health check", "STARTED", f"Waiting up to {timeout} seconds for servers to become healthy")
    try:
        healthy = mcp_health_monitor.comprehensive_health_check(timeout=timeout)
        
        if healthy:
            log_deployment_step("Health check", "SUCCESS", "All servers are healthy")
        else:
            log_deployment_step("Health check", "FAILED", "Servers failed to become healthy within timeout")
            return False
    except Exception as e:
        log_deployment_step("Health check", "FAILED", f"Error during health check: {e}")
        return False
        
    # Step 7: Generate health report
    log_deployment_step("Health report", "STARTED")
    try:
        report = mcp_health_monitor.generate_health_report()
        report_file = LOGS_DIR / f"health_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
            
        log_deployment_step("Health report", "SUCCESS", f"Health report written to {report_file}")
    except Exception as e:
        log_deployment_step("Health report", "FAILED", f"Error generating health report: {e}")
        # Continue deployment even if health report fails
        
    # Step 8: Deployment complete
    log_deployment_step("Deployment", "COMPLETED", f"MCP servers successfully deployed at {datetime.now().isoformat()}")
    return True

def undeploy_mcp_servers():
    """Undeploy MCP servers"""
    log_deployment_step("Undeployment", "STARTED", f"Stopping MCP servers at {datetime.now().isoformat()}")
    
    try:
        mcp_server_setup.stop_mcp_servers()
        log_deployment_step("Undeployment", "SUCCESS", "MCP servers stopped successfully")
        return True
    except Exception as e:
        log_deployment_step("Undeployment", "FAILED", f"Error stopping MCP servers: {e}")
        return False

def main():
    """Main function for MCP server deployment"""
    parser = argparse.ArgumentParser(description="Deploy MCP servers for DocGen")
    parser.add_argument("action", choices=["deploy", "undeploy", "redeploy"], 
                        help="Action to perform")
    parser.add_argument("--timeout", type=int, default=120,
                        help="Health check timeout in seconds")
    args = parser.parse_args()
    
    if args.action == "deploy":
        success = deploy_mcp_servers(args.timeout)
        sys.exit(0 if success else 1)
    elif args.action == "undeploy":
        success = undeploy_mcp_servers()
        sys.exit(0 if success else 1)
    elif args.action == "redeploy":
        undeploy_mcp_servers()
        time.sleep(5)  # Wait for containers to fully stop
        success = deploy_mcp_servers(args.timeout)
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
