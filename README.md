# DocGen

<!-- Project Status Badges -->
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/mprestonsparks/DocGen/blob/main/LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![npm Version](https://img.shields.io/badge/npm-%3E%3D7.0.0-brightgreen)](https://www.npmjs.com/)

<!-- Workflow Status Badges -->
[![Documentation CI](https://img.shields.io/badge/Documentation%20CI-passing-success)](https://github.com/mprestonsparks/DocGen/actions/workflows/docs-ci.yml)
[![Validation](https://img.shields.io/badge/Validation-passing-success)](https://github.com/mprestonsparks/DocGen/actions/workflows/validate-docs.yml)
[![PR Validation](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/mprestonsparks/DocGen/main/.github/badges/pr-validation.json)](https://github.com/mprestonsparks/DocGen/actions/workflows/pr-validation.yml)

<!-- Coverage Badges -->
[![Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/mprestonsparks/DocGen/main/.github/badges/coverage.json)](https://github.com/mprestonsparks/DocGen/actions/workflows/docs-ci.yml)
[![Documentation Status](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/mprestonsparks/DocGen/main/.github/badges/documentation-status.json)](https://github.com/mprestonsparks/DocGen/actions/workflows/validate-docs.yml)
[![Code Quality](https://img.shields.io/badge/Code_Quality-A-brightgreen)](https://github.com/mprestonsparks/DocGen/blob/main/tests/README.md)

<!-- GitHub Stats Badges -->
[![GitHub Issues](https://img.shields.io/github/issues/mprestonsparks/DocGen)](https://github.com/mprestonsparks/DocGen/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/mprestonsparks/DocGen)](https://github.com/mprestonsparks/DocGen/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/mprestonsparks/DocGen)](https://github.com/mprestonsparks/DocGen/commits/main)

<!-- Custom Badges -->
[![AI-Powered](https://img.shields.io/badge/AI-Powered-blue)](https://github.com/mprestonsparks/DocGen#ai-enhancement)
[![Template System](https://img.shields.io/badge/Template-System-brightgreen)](https://github.com/mprestonsparks/DocGen#template-structure)
[![Test Suite](https://img.shields.io/badge/Tests-308_passed-success)](https://github.com/mprestonsparks/DocGen/blob/main/tests/README.md)

DocGen is a comprehensive documentation generation system designed to streamline the creation of high-quality software project documentation. Leveraging AI-powered interviews and structured templates, it guides developers through the documentation process while ensuring consistency, completeness, and cross-referencing integrity.

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white" alt="TypeScript Ready">
  <img src="https://img.shields.io/badge/Handlebars-Templates-F0772B?logo=handlebarsdotjs&logoColor=white" alt="Handlebars Templates">
  <img src="https://img.shields.io/badge/Jest-308_Tests-C21325?logo=jest&logoColor=white" alt="Jest Tests">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker Ready">
  <img src="https://img.shields.io/badge/AI-Powered-8A2BE2" alt="AI-Powered">
</p>

## Features

- **🤖 Interactive Interview System**: AI-powered CLI interview gathers project details and creates tailored documentation
- **📝 Machine-Readable Templates**: YAML metadata + Markdown content for structured, consistent documentation
- **🍎 Swift Integration**: First-class support for Swift/iOS projects with specialized templates
- **🌐 Multi-language Support**: Planned support for many programming languages and frameworks
- **✅ Validation System**: Ensures document completeness and cross-references for technical accuracy
- **🔄 Version Management**: Synchronizes document versions across your project documentation
- **🐳 Docker Support**: Containerized development environment for consistent setup and collaboration
- **🧪 Comprehensive Testing**: 308 tests with 59% overall coverage and 95% utility module coverage

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- An Anthropic API key (for AI-enhanced features)
  - Create an account at [Anthropic](https://www.anthropic.com/)
  - Get your API key from the [Anthropic Console](https://console.anthropic.com/)
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

DocGen uses the Anthropic Claude API to provide intelligent documentation assistance. When an API key is provided in your `.env` file, the following enhanced features are enabled:

### 🧠 Smart Technology Recommendations
- Analyzes your project description to suggest appropriate tech stacks
- Recommends technologies based on project type (web, mobile, API, etc.)
- Provides tailored suggestions for front-end, back-end, and database technologies

### 🔍 Context-Aware Interview
- Generates targeted follow-up questions based on your previous answers
- Focuses on gathering the most relevant information for your specific project
- Adapts to your project's domain and complexity

### 📝 Documentation Enhancement
- Expands generated documentation with more detailed explanations
- Improves formatting and structure of documentation
- Adds relevant technical details based on your selected technology stack

### 🔄 Consistency Checking
- Ensures terminology is used consistently across all documents
- Validates cross-references between document sections
- Identifies potential gaps or inconsistencies in documentation

### 🛡️ Privacy & Security
- Your project data is only used for documentation generation
- No data is retained by Anthropic after processing
- Set `AI_ENHANCEMENT=false` in your `.env` file to disable AI features

## Troubleshooting

If you encounter issues while using DocGen, here are some common problems and their solutions:

| Problem | Solution |
|---------|----------|
| Interview doesn't start | • Verify Node.js version is 16+ <br> • Check `npm install` completed successfully <br> • Try running with `--verbose` flag |
| AI features not working | • Confirm `ANTHROPIC_API_KEY` is set in `.env` file <br> • Check your API key hasn't expired <br> • Verify network connectivity to Anthropic API |
| Docker container issues | • Run `docker-compose logs` to view error messages <br> • Ensure Docker and Docker Compose are installed <br> • Try rebuilding with `npm run docker:build` |
| Validation errors | • Check document cross-references match expected format <br> • Verify all required metadata fields are present <br> • Make sure document structure follows the template |
| Test failures | • Run `npm test -- --verbose` for detailed error messages <br> • Check test logs for specific assertion failures <br> • Verify environment setup matches test requirements |

## License

MIT

## Testing

DocGen has a comprehensive test suite to ensure reliability and quality:

- **308 Unit and Integration Tests**: Covering core functionality and edge cases
- **95% Coverage of Utility Modules**: All utility modules have near-complete test coverage
- **Jest Test Framework**: Full TypeScript support with mocking capabilities
- **Continuous Integration**: Tests run automatically on all PRs and pushes to main branch

To run the tests locally:

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific tests
npm test -- tests/validation.test.ts
```

For more information on the testing strategy, see the [tests/README.md](tests/README.md) file.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Credits

- Documentation templates based on industry best practices
- Test suite improved with assistance from [Claude](https://anthropic.com/claude)
- Icon set provided by various open-source projects