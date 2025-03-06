# DocGen

[![Documentation CI](https://github.com/yourusername/DocGen/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/yourusername/DocGen/actions/workflows/docs-ci.yml)

A powerful documentation generation system for software projects, featuring AI-powered interviews and machine-readable templates.

## Features

- **Interactive Interview System**: AI-powered CLI interview gathers project details
- **Machine-Readable Templates**: YAML metadata + Markdown content for structured docs
- **Swift Integration**: First-class support for Swift/iOS projects
- **Multi-language Support**: Planned support for many programming languages
- **Validation System**: Ensures document completeness and cross-references
- **Version Management**: Synchronizes document versions

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/DocGen.git
cd DocGen

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

## Usage

### Interview Mode

Start the interactive interview to generate documentation:

```bash
# Using JavaScript implementation
npm run interview

# Using TypeScript implementation
npm run interview:ts
```

### Validation

Validate your documentation:

```bash
npm run validate
```

### Other Commands

```bash
# Generate documentation reports
npm run generate-reports

# Update document versions (patch, minor, major)
npm run update-versions patch

# Run tests
npm test
```

## GitHub CLI Integration

DocGen works seamlessly with GitHub CLI:

```bash
# Create a new project from DocGen template
gh repo create my-project-docs --template yourusername/docgen

# Run workflows
gh workflow run docs-ci.yml

# Release documentation (prompts for version type)
gh workflow run release-docs.yml
```

## License

MIT

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.