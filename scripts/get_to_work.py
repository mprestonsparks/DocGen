#!/usr/bin/env python3
"""
GET-TO-WORK Script for DocGen

This script orchestrates the get-to-work workflow by communicating with the MCP servers
to run tests, analyze GitHub issues, and scan for TODOs in the codebase.

Usage:
    python get_to_work.py [--directory DIR] [--owner OWNER] [--repo REPO] [--no-create-issues]

Options:
    --directory DIR      Directory to scan for tests and TODOs (default: current directory)
    --owner OWNER        GitHub repository owner (default: from git config)
    --repo REPO          GitHub repository name (default: from git config)
    --no-create-issues   Don't create GitHub issues from TODOs
"""

import argparse
import json
import os
import subprocess
import sys
import uuid
from typing import Dict, List, Optional, Any, Union
import requests
from datetime import datetime

# Constants
DEFAULT_ORCHESTRATOR_URL = "http://localhost:8080/mcp"
JSON_RPC_VERSION = "2.0"


class MCPClient:
    """Client for communicating with MCP servers"""

    def __init__(self, url: str = DEFAULT_ORCHESTRATOR_URL):
        """Initialize the MCP client with the orchestrator URL"""
        self.url = url
        self.session_id = str(uuid.uuid4())

    def _send_request(self, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Send a JSON-RPC request to the MCP server"""
        request_id = str(uuid.uuid4())
        
        payload = {
            "jsonrpc": JSON_RPC_VERSION,
            "method": method,
            "params": params or {},
            "id": request_id
        }
        
        try:
            response = requests.post(
                self.url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=300  # 5 minutes timeout for long-running operations
            )
            
            response.raise_for_status()
            result = response.json()
            
            if "error" in result:
                error = result["error"]
                print(f"Error {error.get('code')}: {error.get('message')}")
                return {"error": error.get("message")}
            
            return result.get("result", {})
        except requests.RequestException as e:
            print(f"Request failed: {e}")
            return {"error": str(e)}
        except json.JSONDecodeError:
            print(f"Invalid JSON response: {response.text}")
            return {"error": "Invalid JSON response"}

    def create_workflow_session(self, owner: str, repo: str) -> Dict[str, Any]:
        """Create a new workflow session"""
        return self._send_request("workflow.create", {
            "owner": owner,
            "repo": repo,
            "sessionId": self.session_id
        })

    def execute_testing_phase(self, directory: str) -> Dict[str, Any]:
        """Execute the testing phase of the workflow"""
        return self._send_request("workflow.testing.execute", {
            "sessionId": self.session_id,
            "directory": directory,
            "parallel": True
        })

    def execute_issues_phase(self) -> Dict[str, Any]:
        """Execute the issues phase of the workflow"""
        return self._send_request("workflow.issues.execute", {
            "sessionId": self.session_id
        })

    def execute_todos_phase(self, directory: str, create_issues: bool) -> Dict[str, Any]:
        """Execute the TODOs phase of the workflow"""
        return self._send_request("workflow.todos.execute", {
            "sessionId": self.session_id,
            "directory": directory,
            "createIssues": create_issues
        })

    def execute_full_workflow(self, owner: str, repo: str, directory: str) -> Dict[str, Any]:
        """Execute the full workflow"""
        return self._send_request("workflow.execute", {
            "owner": owner,
            "repo": repo,
            "sessionId": self.session_id,
            "directory": directory
        })

    def get_workflow_status(self) -> Dict[str, Any]:
        """Get the status of the current workflow session"""
        return self._send_request("workflow.get", {
            "sessionId": self.session_id
        })


def load_env_vars() -> Dict[str, str]:
    """Load environment variables from .env files"""
    env_vars = {}
    
    # Try to load from root .env file
    try:
        with open(".env", 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    except (FileNotFoundError, IOError):
        pass
    
    # Try to load from MCP .env file
    try:
        with open("docker/mcp/.env.mcp", 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    except (FileNotFoundError, IOError):
        pass
    
    return env_vars


def get_git_info() -> Dict[str, str]:
    """Get the GitHub repository owner and name from git config"""
    try:
        # Get the remote URL
        remote_url = subprocess.check_output(
            ["git", "config", "--get", "remote.origin.url"],
            universal_newlines=True
        ).strip()
        
        # Extract owner and repo from the URL
        if "github.com" in remote_url:
            # Handle different URL formats
            if remote_url.startswith("git@github.com:"):
                path = remote_url.split("git@github.com:")[1]
            elif remote_url.startswith("https://github.com/"):
                path = remote_url.split("https://github.com/")[1]
            else:
                return {"owner": "", "repo": ""}
            
            # Remove .git suffix if present
            if path.endswith(".git"):
                path = path[:-4]
            
            parts = path.split("/")
            if len(parts) >= 2:
                return {"owner": parts[0], "repo": parts[1]}
    except (subprocess.SubprocessError, IndexError):
        pass
    
    return {"owner": "", "repo": ""}


def print_phase_header(phase_name: str) -> None:
    """Print a formatted header for a workflow phase"""
    print("\n" + "=" * 80)
    print(f" {phase_name} PHASE ".center(80, "="))
    print("=" * 80 + "\n")


def print_phase_result(phase_result: Dict[str, Any]) -> None:
    """Print the results of a workflow phase"""
    if phase_result.get("error"):
        print(f"❌ Phase failed: {phase_result['error']}")
        return
    
    status = phase_result.get("status", "unknown")
    if status == "completed":
        print(f"✅ Phase completed successfully")
    elif status == "failed":
        print(f"❌ Phase failed: {phase_result.get('error', 'Unknown error')}")
    else:
        print(f"⏳ Phase status: {status}")
    
    # Print start and end times if available
    if phase_result.get("startTime"):
        start_time = datetime.fromisoformat(phase_result["startTime"].replace("Z", "+00:00"))
        print(f"Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    if phase_result.get("endTime"):
        end_time = datetime.fromisoformat(phase_result["endTime"].replace("Z", "+00:00"))
        print(f"Ended: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Print phase-specific results
    result = phase_result.get("result", {})
    if result:
        print("\nResults:")
        print(json.dumps(result, indent=2))


def print_summary(workflow_result: Dict[str, Any]) -> None:
    """Print a summary of the workflow execution"""
    print("\n" + "=" * 80)
    print(" WORKFLOW SUMMARY ".center(80, "="))
    print("=" * 80 + "\n")
    
    if workflow_result.get("error"):
        print(f"❌ Workflow failed: {workflow_result['error']}")
        return
    
    status = workflow_result.get("status", "unknown")
    if status == "completed":
        print("✅ Workflow completed successfully")
    elif status == "failed":
        print(f"❌ Workflow failed")
    else:
        print(f"⏳ Workflow status: {status}")
    
    # Print start and end times
    if workflow_result.get("startTime"):
        start_time = datetime.fromisoformat(workflow_result["startTime"].replace("Z", "+00:00"))
        print(f"Started: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    if workflow_result.get("endTime"):
        end_time = datetime.fromisoformat(workflow_result["endTime"].replace("Z", "+00:00"))
        print(f"Ended: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Calculate duration
        duration = end_time - start_time
        print(f"Duration: {duration}")
    
    # Print phase summaries
    phases = workflow_result.get("phases", {})
    if phases:
        print("\nPhase Statuses:")
        for phase_name, phase_data in phases.items():
            status_icon = "✅" if phase_data.get("status") == "completed" else "❌"
            print(f"{status_icon} {phase_name.capitalize()}: {phase_data.get('status', 'unknown')}")
    
    # Print next steps based on results
    print("\nNext Steps:")
    
    # Check testing phase
    testing_phase = phases.get("testing", {})
    if testing_phase.get("status") == "completed":
        test_results = testing_phase.get("result", {})
        if test_results.get("failed", 0) > 0:
            print("1. Fix failing tests")
    
    # Check issues phase
    issues_phase = phases.get("issues", {})
    if issues_phase.get("status") == "completed":
        issue_results = issues_phase.get("result", {})
        prioritized_issues = issue_results.get("prioritizedIssues", [])
        if prioritized_issues:
            print(f"2. Work on prioritized issues ({len(prioritized_issues)} issues)")
            for i, issue in enumerate(prioritized_issues[:5]):  # Show top 5
                print(f"   - #{issue.get('number')}: {issue.get('title')}")
            if len(prioritized_issues) > 5:
                print(f"   - ... and {len(prioritized_issues) - 5} more")
    
    # Check TODOs phase
    todos_phase = phases.get("todos", {})
    if todos_phase.get("status") == "completed":
        todo_results = todos_phase.get("result", {})
        todos = todo_results.get("todos", [])
        if todos:
            print(f"3. Address TODOs in the codebase ({len(todos)} TODOs)")


def main() -> None:
    """Main function to run the get-to-work workflow"""
    parser = argparse.ArgumentParser(description="GET-TO-WORK Script for DocGen")
    parser.add_argument("--directory", default=".", help="Directory to scan for tests and TODOs")
    parser.add_argument("--owner", help="GitHub repository owner")
    parser.add_argument("--repo", help="GitHub repository name")
    parser.add_argument("--orchestrator-url", default=DEFAULT_ORCHESTRATOR_URL, 
                        help="URL of the MCP Orchestrator server")
    parser.add_argument("--no-create-issues", action="store_true", 
                        help="Don't create GitHub issues from TODOs")
    parser.add_argument("--phase", choices=["testing", "issues", "todos", "all"], 
                        default="all", help="Specific phase to run")
    
    args = parser.parse_args()
    
    # Load environment variables
    env_vars = load_env_vars()
    
    # Get repository info
    git_info = get_git_info()
    owner = args.owner or env_vars.get("GITHUB_OWNER") or git_info.get("owner", "")
    repo = args.repo or env_vars.get("GITHUB_REPO") or git_info.get("repo", "")
    
    if not owner or not repo:
        print("Error: GitHub repository owner and name are required.")
        print("Please provide them using --owner and --repo options, configure git remote,")
        print("or set GITHUB_OWNER and GITHUB_REPO in your .env file.")
        sys.exit(1)
    
    # Initialize MCP client
    client = MCPClient(args.orchestrator_url)
    
    # Create workflow session
    print(f"Creating workflow session for {owner}/{repo}...")
    session = client.create_workflow_session(owner, repo)
    
    if session.get("error"):
        print(f"Failed to create workflow session: {session['error']}")
        sys.exit(1)
    
    print(f"Workflow session created with ID: {client.session_id}")
    
    # Execute workflow phases
    if args.phase in ["testing", "all"]:
        print_phase_header("TESTING")
        testing_result = client.execute_testing_phase(args.directory)
        print_phase_result(testing_result)
    
    if args.phase in ["issues", "all"]:
        print_phase_header("ISSUES")
        issues_result = client.execute_issues_phase()
        print_phase_result(issues_result)
    
    if args.phase in ["todos", "all"]:
        print_phase_header("TODOS")
        todos_result = client.execute_todos_phase(
            args.directory, 
            not args.no_create_issues
        )
        print_phase_result(todos_result)
    
    # Get final workflow status
    workflow_result = client.get_workflow_status()
    
    # Print summary
    print_summary(workflow_result)


if __name__ == "__main__":
    main()
