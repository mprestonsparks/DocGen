# DocGen GitHub CLI Commands

This document provides a reference for using GitHub CLI (`gh`) with DocGen.

## Repository Commands

### Create a new DocGen project

```bash
# Create a new repository from the DocGen template
gh repo create my-project-docs --template mprestonsparks/docgen

# Clone and set up the repository
gh repo clone my-project-docs
cd my-project-docs
npm install
```

## Workflow Commands

### List and View Workflows

```bash
# List available workflows
gh workflow list

# View details of a specific workflow
gh workflow view docs-ci.yml
```

### Run Workflows

```bash
# Run documentation CI
gh workflow run docs-ci.yml

# Run documentation release with version parameter
gh workflow run release-docs.yml -f version=patch

# View status of workflow runs
gh run list --workflow=docs-ci.yml

# View details of a specific run
gh run view <run-id>
```

### Download Artifacts

```bash
# Download validation reports from a workflow run
gh run download <run-id> -n documentation-reports
```

## Issue Management

### Create Issues

```bash
# Create a documentation issue using template
gh issue create --template "Documentation Issue"

# Create a feature request
gh issue create --template "Feature Request"
```

### List and Filter Issues

```bash
# List all documentation issues
gh issue list --label documentation

# List all open bug reports
gh issue list --label bug --state open
```

### Manage Issues

```bash
# View issue details
gh issue view <issue-number>

# Add labels to an issue
gh issue edit <issue-number> --add-label "high-priority"

# Assign an issue
gh issue edit <issue-number> --assignee @me
```

## Pull Request Management

### Create Pull Requests

```bash
# Create a PR for documentation changes
gh pr create --title "Update documentation" --body "This PR updates..." --label documentation

# Create a PR from a specific branch
gh pr create --head feature-branch --base main
```

### Review and Merge

```bash
# View PR details
gh pr view <pr-number>

# Check validation status on PR
gh pr checks <pr-number>

# Approve a PR
gh pr review <pr-number> --approve

# Merge a PR
gh pr merge <pr-number> --squash
```

## Custom DocGen Operations

Using GitHub CLI as a proxy for DocGen operations:

```bash
# Run documentation validation remotely via workflow
gh workflow run docs-ci.yml -f validate-only=true

# Release new documentation version
gh workflow run release-docs.yml -f version=minor

# Generate specific documentation type
gh workflow run custom-doc.yml -f doc-type=SRS -f project-name="Example Project"
```

## Environment Setup

```bash
# Set required secrets via CLI
gh secret set ANTHROPIC_API_KEY

# Set environment variables for workflows
gh variable set LOG_LEVEL --body "debug"
```

## Advanced Usage

Creating a GitHub CLI extension for DocGen:

```bash
# Create DocGen extension (if implemented)
gh extension install mprestonsparks/gh-docgen

# Example commands with custom extension
gh docgen validate                  # Run validation on documentation
gh docgen update-versions patch     # Update document versions
gh docgen generate-reports          # Generate documentation reports
gh docgen interview                 # Start documentation interview
```