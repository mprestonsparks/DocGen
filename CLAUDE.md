# DocGen - Claude Assistant Guide

## Project Overview
DocGen is a system for generating AI-optimized documentation using machine-readable templates
with YAML metadata headers, JSON-structured content blocks, and formal cross-referencing.
The system uses an LLM-powered CLI interview process to gather project information and guide
documentation generation with intelligent follow-up questions.

DocGen is designed to be delivered as a GitHub template repository that users can instantiate
for their own projects. The template includes all necessary documentation structures, scripts,
and configuration files to quickly bootstrap project documentation.

The system uses Handlebars templates stored in the `docs/_templates` directory, with fallback
simple templates generated dynamically if needed.

## Build Commands
```
# Installation
npm install

# Run interactive interview system
npm run interview

# Run template validation
npm run validate

# Generate documentation
npm run generate

# Single test execution
npm test -- -f <test-name>

# Docker commands
npm run docker:build    # Build Docker image
npm run docker:up       # Start Docker container
npm run docker:shell    # Enter Docker container shell
npm run docker:down     # Stop Docker container
```

## Key Components
- GitHub Template Repository: Ready-to-use project structure and workflow
- Interview System: LLM-powered CLI gathering project context and requirements
- Template Repository: Structured document templates with schema definitions
- Validation System: Ensures document consistency and cross-reference integrity
- Document Generation: Populates templates based on interview responses

## Code Style Guidelines
- **File Structure**: Follow template formats in `docs/_templates` directory
- **Metadata**: Use YAML headers with explicit versioning and cross-references
- **Content Blocks**: Structure data as JSON objects with unique IDs
- **Naming**: Use uppercase for section headings, camelCase for properties
- **References**: Always use explicit IDs for cross-references (format: DOC-TYPE-NUMBER)
- **Validation**: Include validation criteria for all requirements
- **Error Handling**: Document error codes and validation response formats
- **Types**: Include type definitions in schema documentation
- **Comments**: Document complex relationships between document sections