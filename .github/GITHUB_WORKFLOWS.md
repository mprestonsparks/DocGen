# GitHub Configuration

This directory contains GitHub-specific configuration files and workflows.

## Workflows

The following GitHub Actions workflows are available:

- **docs-ci.yml**: Runs tests, linting, and generates coverage badges
- **pr-validation.yml**: Validates PRs with tests and documentation checks
- **validate-docs.yml**: Validates documentation structure and cross-references
- **release-docs.yml**: Creates a new documentation release

## Badges

The `.github/badges` directory contains badge data files that are updated by workflows to provide status indicators in the README.

## Usage

You can manually trigger workflows with the GitHub CLI:

```bash
# Run documentation validation
gh workflow run validate-docs.yml

# Run the full CI pipeline
gh workflow run docs-ci.yml
```