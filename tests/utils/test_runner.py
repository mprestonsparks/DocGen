#!/usr/bin/env python3
"""
Test runner utility for DocGen.

This script provides utilities for running tests and generating reports.
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime
from typing import List, Optional, Dict

def run_jest_tests(report_dir: str, coverage: bool = True) -> int:
    """Run Jest tests for TypeScript code."""
    cmd = ["npm", "test"]
    if coverage:
        cmd.extend(["--", "--coverage", f"--coverageDirectory={report_dir}"])
    
    try:
        subprocess.run(cmd, check=True)
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Error running Jest tests: {e}", file=sys.stderr)
        return e.returncode

def run_python_tests(report_dir: str, coverage: bool = True) -> int:
    """Run Python tests for infrastructure code."""
    cmd = ["pytest"]
    if coverage:
        cmd.extend([
            f"--cov-report=html:{os.path.join(report_dir, 'python')}",
            "--cov=scripts"
        ])
    
    try:
        subprocess.run(cmd, check=True)
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Error running Python tests: {e}", file=sys.stderr)
        return e.returncode

def generate_test_report(ts_coverage: bool, py_coverage: bool) -> str:
    """Generate a test report combining TypeScript and Python results."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_dir = os.path.join("tests", "reports", f"report_{timestamp}")
    os.makedirs(report_dir, exist_ok=True)
    
    exit_code = 0
    
    # Run TypeScript tests
    print("\nRunning TypeScript tests...")
    ts_result = run_jest_tests(report_dir, ts_coverage)
    if ts_result != 0:
        exit_code = ts_result
    
    # Run Python tests
    print("\nRunning Python tests...")
    py_result = run_python_tests(report_dir, py_coverage)
    if py_result != 0:
        exit_code = py_result
    
    return exit_code

def main() -> int:
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Run DocGen tests")
    parser.add_argument("--no-ts-coverage", action="store_true",
                       help="Disable TypeScript coverage reporting")
    parser.add_argument("--no-py-coverage", action="store_true",
                       help="Disable Python coverage reporting")
    
    args = parser.parse_args()
    
    return generate_test_report(
        not args.no_ts_coverage,
        not args.no_py_coverage
    )

if __name__ == "__main__":
    sys.exit(main())
