# DocGen

<!-- Project Status Badges -->
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/mprestonsparks/DocGen/blob/main/LICENSE)
[![Documentation CI](https://img.shields.io/badge/CI-Documentation-blue)](https://github.com/mprestonsparks/DocGen/actions/workflows/docs-ci.yml)
[![PR Validation](https://img.shields.io/badge/PR-Validation-green)](https://github.com/mprestonsparks/DocGen/actions/workflows/pr-validation.yml)

<!-- Test & Coverage Badges -->
[![Tests](https://github.com/mprestonsparks/DocGen/actions/workflows/docs-ci.yml/badge.svg?event=push)](https://github.com/mprestonsparks/DocGen/actions/workflows/docs-ci.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/mprestonsparks/DocGen/main/.github/badges/coverage.json)](https://github.com/mprestonsparks/DocGen/actions/workflows/docs-ci.yml)
[![Documentation Status](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/mprestonsparks/DocGen/main/.github/badges/documentation-status.json)](https://github.com/mprestonsparks/DocGen/actions/workflows/validate-docs.yml)

<!-- GitHub Stats Badges -->
[![GitHub Stars](https://img.shields.io/github/stars/mprestonsparks/DocGen)](https://github.com/mprestonsparks/DocGen/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/mprestonsparks/DocGen)](https://github.com/mprestonsparks/DocGen/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/mprestonsparks/DocGen)](https://github.com/mprestonsparks/DocGen/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/mprestonsparks/DocGen)](https://github.com/mprestonsparks/DocGen/commits/main)

<!-- Custom Badges -->
[![AI-Powered](https://img.shields.io/badge/AI-Powered-blue)](https://github.com/mprestonsparks/DocGen#ai-features)
[![Documentation Template System](https://img.shields.io/badge/Documentation-Template_System-brightgreen)](https://github.com/mprestonsparks/DocGen#features)

DocGen is a comprehensive documentation generation system designed to streamline the creation of high-quality software project documentation. Leveraging AI-powered interviews and structured templates, it guides developers through the documentation process while ensuring consistency, completeness, and cross-referencing integrity.

## Features

- **Interactive Interview System**: AI-powered CLI interview gathers project details and creates tailored documentation
- **Machine-Readable Templates**: YAML metadata + Markdown content for structured, consistent documentation
- **Swift Integration**: First-class support for Swift/iOS projects with specialized templates
- **Multi-language Support**: Planned support for many programming languages and frameworks
- **Validation System**: Ensures document completeness and cross-references for technical accuracy
- **Version Management**: Synchronizes document versions across your project documentation
- **Docker Support**: Containerized development environment for consistent setup and collaboration

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm 7.x or higher
- An Anthropic API key (for AI-enhanced features)
- Docker and Docker Compose (optional, for containerized setup)

### Installation

```bash
# Clone the repository
git clone https://github.com/mprestonsparks/DocGen.git
cd DocGen

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

## Usage Guide

### Creating Documentation

DocGen uses an interactive interview process to gather project information:

1. Start the interview:
   ```bash
   npm run interview
   ```

2. Answer the questions about your project, technology stack, and documentation needs.

3. The system will generate initial documentation templates in the `docs/generated/` directory.

4. Review and customize the generated documents according to your specific needs.

### Key Commands

```bash
# Start interview (JavaScript implementation)
npm run interview

# Start interview (TypeScript implementation - more features)
npm run interview:ts

# Validate documentation
npm run validate

# Generate documentation reports
npm run generate-reports

# Update document versions (patch, minor, major)
npm run update-versions patch

# Run tests
npm test

# Run linting
npm run lint
```

## Docker Support

For consistent development environments and easier team collaboration, DocGen provides Docker configuration:

```bash
# Build the Docker image
npm run docker:build

# Start the container
npm run docker:up

# Enter the container shell
npm run docker:shell

# Stop the container
npm run docker:down
```

These npm commands use Docker Compose to manage the containers. See the [Docker setup instructions](.docker/README.md) for more details.

## Template Structure

DocGen uses a structured approach to documentation:

1. **YAML Metadata Headers**: Version information, status, cross-references
2. **JSON Content Blocks**: Structured data with unique IDs for validation
3. **Markdown Content**: Rich text with cross-reference support

### Template System

The template system has a three-tier fallback mechanism:

1. **Primary Templates**: Handlebars templates in `docs/_templates/*.hbs`
2. **Fallback Templates**: Simple markdown templates in `docs/_templates/fallback/*.md`
3. **Dynamic Generation**: Automatic basic template creation if no templates are available

### Document Types

Documents generated include:
- **PRD**: Product Requirements Document
- **SRS**: Software Requirements Specification
- **SAD**: System Architecture Document
- **SDD**: Software Design Document
- **STP**: Software Test Plan
- **Swift-SDD**: Swift-specific Software Design Document (for iOS projects)

## GitHub Integration

DocGen works seamlessly with GitHub CLI for version control and CI/CD:

```bash
# Create a new project from DocGen template
gh repo create my-project-docs --template mprestonsparks/docgen

# Run documentation validation workflows
gh workflow run docs-ci.yml

# Release documentation (prompts for version type)
gh workflow run release-docs.yml
```

## Extending DocGen

DocGen is designed to be extensible:

1. **Custom Templates**: Add new templates in `docs/_templates/` using Handlebars (.hbs)
2. **New Document Types**: Extend the system with specialized documents for your domain
3. **Additional LLM Features**: Enhance the AI capabilities in `utils/llm.ts`

## AI Enhancement

When an Anthropic API key is provided, DocGen offers enhanced features:
- Smart technology stack recommendations
- Context-aware follow-up questions
- Documentation content improvement and expansion
- Consistency checking across document sections

## Troubleshooting

Common issues and solutions:

- **Interview doesn't start**: Check Node.js version (14+ required)
- **LLM features unavailable**: Verify ANTHROPIC_API_KEY in .env file
- **Docker issues**: Ensure Docker and Docker Compose are installed
- **Validation errors**: Check cross-references and required fields

## License

MIT

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.