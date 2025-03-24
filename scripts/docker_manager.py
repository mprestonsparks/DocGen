#!/usr/bin/env python3
"""
Docker container management script for DocGen.

This script handles container lifecycle management for development and testing.
"""

import os
import sys
import argparse
import subprocess
from typing import List, Optional

def run_command(command: List[str], cwd: Optional[str] = None) -> int:
    """Run a shell command and return its exit code."""
    try:
        result = subprocess.run(command, cwd=cwd, check=True)
        return result.returncode
    except subprocess.CalledProcessError as e:
        print(f"Error running command {' '.join(command)}: {e}", file=sys.stderr)
        return e.returncode

def build_containers(dev: bool = False) -> int:
    """Build Docker containers for DocGen."""
    build_args = []
    if dev:
        build_args.extend(["--build-arg", "NODE_ENV=development"])
    
    return run_command([
        "docker", "compose",
        "-f", "docker-compose.yml",
        *(["-f", "docker-compose.dev.yml"] if dev else []),
        "build"
    ])

def start_containers(dev: bool = False) -> int:
    """Start Docker containers for DocGen."""
    return run_command([
        "docker", "compose",
        "-f", "docker-compose.yml",
        *(["-f", "docker-compose.dev.yml"] if dev else []),
        "up", "-d"
    ])

def stop_containers() -> int:
    """Stop Docker containers for DocGen."""
    return run_command(["docker", "compose", "down"])

def main() -> int:
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Manage DocGen Docker containers")
    parser.add_argument("action", choices=["build", "start", "stop", "restart"],
                       help="Action to perform")
    parser.add_argument("--dev", action="store_true",
                       help="Use development configuration")
    
    args = parser.parse_args()
    
    if args.action == "build":
        return build_containers(args.dev)
    elif args.action == "start":
        return start_containers(args.dev)
    elif args.action == "stop":
        return stop_containers()
    elif args.action == "restart":
        stop_containers()
        return start_containers(args.dev)
    
    return 1

if __name__ == "__main__":
    sys.exit(main())
