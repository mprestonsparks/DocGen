# Project Documentation

Welcome to your project documentation repository, created with [DocGen](https://github.com/yourusername/DocGen)!

## Getting Started

This repository contains templates and tools for creating comprehensive project documentation. Follow these steps to get started:

1. Run the interview system to generate your base documentation:
   ```bash
   npm run interview
   ```

2. Review the generated documentation in the `docs/generated/` directory

3. Validate your documentation to ensure completeness:
   ```bash
   npm run validate
   ```

## Available Documentation

After running the interview, you will have these key documentation types:

- **Product Requirements Document (PRD)** - Business requirements and product features
- **Software Requirements Specification (SRS)** - Detailed technical requirements
- **System Architecture Document (SAD)** - Technical architecture design
- **Software Design Document (SDD)** - Implementation details and component design
- **Software Test Plan (STP)** - Test strategy and validation approach

## Customizing Documentation

You can customize the templates to match your organization's needs:

1. Edit templates in the `docs/_templates/` directory
2. Update configuration in the `config/` directory 
3. Modify generated documents in the `docs/generated/` directory

## Commands

```bash
# Run the interview system
npm run interview

# Validate documentation
npm run validate

# Update document versions (patch, minor, major)
npm run update-versions patch

# Generate documentation reports
npm run generate-reports
```

## GitHub Integration

This repository includes GitHub workflows for continuous documentation validation:

- **Pull Request Validation**: Automatically checks documentation on PRs
- **Documentation CI**: Runs tests and validation on pushes
- **Release Workflow**: Automates documentation versioning and release

## Need Help?

- Check the [DocGen documentation](https://github.com/yourusername/DocGen#readme)
- Use the GitHub issue templates to report bugs or request features
- Join the [discussions](https://github.com/yourusername/DocGen/discussions) for support