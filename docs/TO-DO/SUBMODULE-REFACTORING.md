# DocGen Repository Structure with Git Submodules: Implementation Guide

## Overview

This document provides a detailed implementation plan for refactoring the DocGen project into three Git repositories using submodules:

1. `docgen-core`: Shared code repository
2. `docgen-windsurf`: Windsurf implementation repository
3. `docgen-claude-code`: Claude Code implementation repository

## Target Repository Structure

```
/docgen-core/                       # Core shared library repository
├── src/                            # Common code shared between implementations
│   ├── mcp/                        # MCP server core functionality
│   │   ├── github/                 # GitHub API integration 
│   │   ├── main/                   # Main MCP server code
│   │   └── orchestrator/           # MCP orchestration logic
│   └── workflow/                   # Common workflow logic
│       ├── testing/                # Testing phase implementation
│       ├── issues/                 # Issues phase implementation
│       └── todos/                  # TODOs phase implementation
├── docker/                         # Common Docker configurations
│   ├── base/                       # Base Docker configurations
│   └── compose-templates/          # Templates for docker-compose
├── scripts/                        # Cross-platform utility scripts
│   ├── common/                     # Shared script functionality
│   ├── mac/                        # Mac-specific script wrappers
│   └── windows/                    # Windows-specific script wrappers
└── .gitignore                      # Common gitignore patterns

/docgen-windsurf/                   # Windsurf-specific implementation
├── .windsurf/                      # Windsurf IDE configuration
│   └── mcp/                        # MCP configuration for Windsurf integration
├── docker/                         # Windsurf-specific Docker configurations
│   ├── docker-compose.yml          # Compose file for Windsurf version
│   └── windsurf-env.template       # Environment template for Windsurf
├── scripts/                        # Windsurf-specific scripts
├── core/                           # Git submodule pointing to docgen-core
└── README.md                       # Windsurf implementation documentation

/docgen-claude-code/                # Claude Code implementation
├── cli/                            # Command-line interface for Claude Code
├── docker/                         # Claude Code-specific Docker configurations
│   ├── docker-compose.yml          # Compose file for Claude Code version
│   └── claude-env.template         # Environment template for Claude Code
├── scripts/                        # Claude Code-specific scripts
├── core/                           # Git submodule pointing to docgen-core
└── README.md                       # Claude Code implementation documentation
```

## Implementation Steps

### 1. Create the GitHub Repositories

1. Log in to GitHub and create three new repositories:
   - `docgen-core`
   - `docgen-windsurf`
   - `docgen-claude-code`
   
2. Leave all repositories empty (no README, no .gitignore) to simplify migration

### 2. Set Up Working Directory

```bash
# Create a temporary working directory
mkdir ~/docgen-refactor
cd ~/docgen-refactor

# Clone the original repository
git clone https://github.com/mprestonsparks/DocGen.git original-docgen
```

### 3. Create and Populate Core Repository

```bash
# Install git-filter-repo if needed (requires Python)
pip install git-filter-repo

# Create directory for core repository
mkdir docgen-core
cd docgen-core

# Initialize git repository
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create branch
git checkout -b main

# Add remote
git remote add origin https://github.com/mprestonsparks/docgen-core.git
```

Next, identify and migrate core files:

```bash
# Create a temporary file listing core paths to keep
cd ../original-docgen
git ls-files > ../core-files.txt
```

Edit `core-files.txt` to contain only paths for code that should be in the core repository. Include:
- Common MCP server code
- Shared workflow logic
- Base Docker configurations
- Cross-platform utility scripts

For example:
```
src/mcp/github/**
src/mcp/main/**
src/mcp/orchestrator/**
src/workflow/**
docker/base/**
scripts/common/**
package.json
tsconfig.json
```

Copy files to the new repository:
```bash
cd ../docgen-core

# Create necessary directories
mkdir -p src/mcp/github src/mcp/main src/mcp/orchestrator src/workflow
mkdir -p docker/base scripts/common

# Copy files from original repository according to core-files.txt
while read -r file; do
  if [ -f "../original-docgen/$file" ]; then
    # Create directory structure if needed
    mkdir -p "$(dirname "$file")"
    # Copy the file
    cp "../original-docgen/$file" "$file"
  fi
done < ../core-files.txt

# Initial commit
git add .
git commit -m "Initial commit for core repository"
git push -u origin main
```

### 4. Create and Populate the Windsurf Repository

```bash
# Create directory for Windsurf repository
cd ..
mkdir docgen-windsurf
cd docgen-windsurf

# Initialize git repository
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create branch
git checkout -b main

# Add remote
git remote add origin https://github.com/mprestonsparks/docgen-windsurf.git
```

Next, identify and migrate Windsurf-specific files:

```bash
# Create a temporary file listing Windsurf paths to keep
cd ../original-docgen
git ls-files > ../windsurf-files.txt
```

Edit `windsurf-files.txt` to contain only paths for Windsurf-specific code. Include:
- Windsurf IDE configuration
- Windsurf-specific scripts
- Windsurf-specific Docker configurations

For example:
```
.windsurf/**
src/windsurf/**
docker/windsurf/**
scripts/windsurf/**
```

Copy files to the Windsurf repository:
```bash
cd ../docgen-windsurf

# Create necessary directories
mkdir -p .windsurf src/windsurf docker/windsurf scripts/windsurf

# Copy files from original repository according to windsurf-files.txt
while read -r file; do
  if [ -f "../original-docgen/$file" ]; then
    # Create directory structure if needed
    mkdir -p "$(dirname "$file")"
    # Copy the file
    cp "../original-docgen/$file" "$file"
  fi
done < ../windsurf-files.txt
```

Add the core repository as a submodule:
```bash
git submodule add https://github.com/mprestonsparks/docgen-core.git core

# Initial commit
git add .
git commit -m "Initial commit for Windsurf repository"
git push -u origin main
```

### 5. Create and Populate the Claude Code Repository

```bash
# Create directory for Claude Code repository
cd ..
mkdir docgen-claude-code
cd docgen-claude-code

# Initialize git repository
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create branch
git checkout -b main

# Add remote
git remote add origin https://github.com/mprestonsparks/docgen-claude-code.git
```

Next, identify and migrate Claude Code-specific files:

```bash
# Create a temporary file listing Claude Code paths to keep
cd ../original-docgen
git ls-files > ../claude-code-files.txt
```

Edit `claude-code-files.txt` to contain only paths for Claude Code-specific code. Include:
- CLI code
- Claude Code-specific scripts
- Claude Code-specific Docker configurations

For example:
```
cli/**
src/claude-code/**
docker/claude-code/**
scripts/claude-code/**
```

Copy files to the Claude Code repository:
```bash
cd ../docgen-claude-code

# Create necessary directories
mkdir -p cli src/claude-code docker/claude-code scripts/claude-code

# Copy files from original repository according to claude-code-files.txt
while read -r file; do
  if [ -f "../original-docgen/$file" ]; then
    # Create directory structure if needed
    mkdir -p "$(dirname "$file")"
    # Copy the file
    cp "../original-docgen/$file" "$file"
  fi
done < ../claude-code-files.txt
```

Add the core repository as a submodule:
```bash
git submodule add https://github.com/mprestonsparks/docgen-core.git core

# Initial commit
git add .
git commit -m "Initial commit for Claude Code repository"
git push -u origin main
```

### 6. Update Import Paths in Each Repository

After migrating the code, you'll need to update import paths to reflect the new repository structure:

1. In the Windsurf repository:
   ```typescript
   // Old import
   import { someFunction } from '../core/utility';
   
   // New import
   import { someFunction } from '../core/src/core/utility';
   ```

2. In the Claude Code repository:
   ```typescript
   // Similar path updates as needed
   ```

### 7. Set Up GitHub Actions Automation

Create the following GitHub Actions workflows:

#### Core Update Notification (for implementation repos)

Create `.github/workflows/core-update-notification.yml` in both implementation repositories:

```yaml
name: Core Update Notification
on:
  schedule:
    - cron: '0 0 * * *'  # Run daily at midnight
  workflow_dispatch:  # Allow manual triggering

jobs:
  check-for-updates:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          submodules: true
          
      - name: Check for core updates
        id: check-updates
        run: |
          cd core
          git fetch
          LOCAL=$(git rev-parse HEAD)
          REMOTE=$(git rev-parse origin/main)
          if [ "$LOCAL" != "$REMOTE" ]; then
            echo "update_available=true" >> $GITHUB_OUTPUT
            echo "current=$LOCAL" >> $GITHUB_OUTPUT
            echo "latest=$REMOTE" >> $GITHUB_OUTPUT
          fi
      
      - name: Create issue for update
        if: steps.check-updates.outputs.update_available == 'true'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Core Update Available',
              body: `A new update to the core repository is available.\n\nCurrent: ${process.env.CURRENT}\nLatest: ${process.env.LATEST}\n\nRun the update-core workflow to update.`
            })
        env:
          CURRENT: ${{ steps.check-updates.outputs.current }}
          LATEST: ${{ steps.check-updates.outputs.latest }}
```

#### Core Update Workflow (for implementation repos)

Create `.github/workflows/update-core.yml` in both implementation repositories:

```yaml
name: Update Core Submodule
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Core version to update to (commit SHA, branch, or tag)'
        required: false
        default: 'main'

jobs:
  update-core:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          submodules: true
          
      - name: Update submodule
        run: |
          cd core
          git fetch
          git checkout ${{ github.event.inputs.version || 'main' }}
          git pull origin ${{ github.event.inputs.version || 'main' }}
          cd ..
          git config --global user.name "GitHub Actions"
          git config --global user.email "actions@github.com"
          git add core
          git commit -m "Update core submodule to ${{ github.event.inputs.version || 'latest' }}"
          git push
```

#### Cross-Repository Testing (for core repo)

Create `.github/workflows/cross-repo-test.yml` in the core repository:

```yaml
name: Cross-Repository Testing
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-implementations:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        repo: ['docgen-windsurf', 'docgen-claude-code']
    steps:
      - name: Checkout implementation repo
        uses: actions/checkout@v3
        with:
          repository: mprestonsparks/${{ matrix.repo }}
          token: ${{ secrets.REPO_ACCESS_TOKEN }}
          
      - name: Update submodule to PR branch
        run: |
          git submodule update --init
          cd core
          git fetch origin ${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}
          git checkout ${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}
          cd ..
          
      - name: Run implementation tests
        run: |
          # Setup and run tests for the specific implementation
          npm install
          npm test
```

### 8. Create Helper Scripts

#### Core Repository Update Script

Create `scripts/update-core.ts` in both implementation repositories:

```typescript
// scripts/update-core.ts
// Updates the core submodule to the specified version or latest
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function updateCore(version?: string) {
  try {
    console.log('Updating core submodule...');
    await execAsync('git submodule update --init');
    await execAsync(`cd core && git fetch && git checkout ${version || 'main'} && git pull origin ${version || 'main'}`);
    await execAsync('git add core');
    await execAsync(`git commit -m "Update core submodule to ${version || 'latest'}" || echo "No changes to commit"`);
    console.log('Core submodule updated successfully.');
  } catch (error) {
    console.error('Error updating core:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
updateCore(args[0]); // Optional version argument
```

### 9. Validation and Testing

After migration, perform these validation steps:

1. Clone each repository with submodules:
   ```bash
   git clone --recurse-submodules https://github.com/mprestonsparks/docgen-windsurf.git
   ```

2. Verify build and tests pass in each repository:
   ```bash
   cd docgen-windsurf
   npm install
   npm run build
   npm test
   ```

3. Test submodule update workflow:
   ```bash
   cd core
   git pull origin main
   cd ..
   git add core
   git commit -m "Update core submodule"
   git push
   ```

### 10. Documentation Updates

Update README files in each repository to reflect the new structure:

1. In the core repository, explain:
   - Purpose of the core repository
   - Directory structure
   - How to contribute to core code

2. In implementation repositories, explain:
   - How to clone with submodules
   - How to update the core submodule
   - Implementation-specific details

## Working with Submodules

### Cloning a Repository with Submodules

```bash
# Clone with submodules in one command
git clone --recurse-submodules https://github.com/mprestonsparks/docgen-windsurf.git

# Or, after cloning
git clone https://github.com/mprestonsparks/docgen-windsurf.git
cd docgen-windsurf
git submodule init
git submodule update
```

### Updating Submodules

```bash
# Manual update
cd docgen-windsurf/core
git pull origin main
cd ..
git add core
git commit -m "Update core submodule to latest version"
git push

# Or use the helper script
ts-node scripts/update-core.ts
```

### Working on Core Code

```bash
# Navigate to the core submodule
cd docgen-windsurf/core

# Create a branch for your changes
git checkout -b feature/new-feature

# Make changes to core code
# ...

# Commit and push changes
git add .
git commit -m "Implement new feature"
git push origin feature/new-feature

# Create a PR for the core repository on GitHub
# After the PR is merged:
git checkout main
git pull origin main
cd ..
git add core
git commit -m "Update core submodule"
git push