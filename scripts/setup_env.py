#!/usr/bin/env python3
"""
Cross-platform environment setup script for DocGen.

This script handles environment setup for development and testing.
"""

import os
import sys
import platform
import subprocess
import argparse
from typing import List, Optional, Dict

def get_platform_info() -> Dict[str, str]:
    """Get information about the current platform."""
    return {
        "system": platform.system().lower(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor()
    }

def check_dependencies() -> List[str]:
    """Check for required development dependencies."""
    missing = []
    
    # Check Node.js
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        missing.append("Node.js")
    
    # Check npm
    try:
        subprocess.run(["npm", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        missing.append("npm")
    
    # Check Python
    try:
        subprocess.run(["python", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        try:
            subprocess.run(["python3", "--version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            missing.append("Python")
    
    # Check Docker
    try:
        subprocess.run(["docker", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        missing.append("Docker")
    
    return missing

def setup_node_environment() -> int:
    """Set up Node.js development environment."""
    commands = [
        ["npm", "install"],
        ["npm", "run", "build"]
    ]
    
    for cmd in commands:
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Error running {' '.join(cmd)}: {e}", file=sys.stderr)
            return 1
    
    return 0

def setup_python_environment() -> int:
    """Set up Python development environment."""
    try:
        # Create virtual environment if it doesn't exist
        if not os.path.exists("venv"):
            subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        
        # Determine the pip command based on platform
        if platform.system().lower() == "windows":
            pip_cmd = os.path.join("venv", "Scripts", "pip")
        else:
            pip_cmd = os.path.join("venv", "bin", "pip")
        
        # Install Python dependencies
        subprocess.run([pip_cmd, "install", "-r", "requirements.txt"], check=True)
        
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Error setting up Python environment: {e}", file=sys.stderr)
        return 1

def main() -> int:
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Set up DocGen development environment")
    parser.add_argument("--check-only", action="store_true",
                       help="Only check dependencies without setting up")
    
    args = parser.parse_args()
    
    # Print platform information
    platform_info = get_platform_info()
    print("Platform Information:")
    for key, value in platform_info.items():
        print(f"  {key}: {value}")
    
    # Check dependencies
    missing_deps = check_dependencies()
    if missing_deps:
        print("\nMissing Dependencies:")
        for dep in missing_deps:
            print(f"  - {dep}")
        if args.check_only:
            return 1
        print("\nPlease install missing dependencies before continuing.")
        return 1
    
    if args.check_only:
        print("\nAll dependencies are installed.")
        return 0
    
    # Set up environments
    print("\nSetting up Node.js environment...")
    if setup_node_environment() != 0:
        return 1
    
    print("\nSetting up Python environment...")
    if setup_python_environment() != 0:
        return 1
    
    print("\nEnvironment setup completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
