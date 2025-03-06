# Contributing to DocGen

Thank you for considering contributing to DocGen! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in the [Issues](https://github.com/yourusername/DocGen/issues)
2. If not, create a new issue using the Bug Report template
3. Provide detailed reproduction steps and environment information

### Suggesting Features

1. Check if the feature has already been suggested in the [Issues](https://github.com/yourusername/DocGen/issues)
2. If not, create a new issue using the Feature Request template
3. Clearly describe the feature and its use cases

### Documentation Issues

1. For documentation-related issues, use the Documentation Issue template
2. Specify which documents are affected and what changes are needed

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`) and validation (`npm run validate`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request using the PR template

## Development Setup

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/DocGen.git
   cd DocGen
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Run tests
   ```bash
   npm test
   ```

## Project Structure

- `src/` - TypeScript implementation
- `scripts/` - JavaScript scripts
- `docs/_templates/` - Documentation templates
- `@claude-code/` - AI-generated documentation
- `config/` - Configuration files
- `tests/` - Test files

## Coding Standards

- Follow the existing code style
- Add appropriate comments for complex logic
- Include tests for new features
- Update documentation to reflect changes

## Documentation

When updating or adding documentation:

1. Follow the template structure in `docs/_templates/`
2. Include YAML metadata headers with version information
3. Validate documentation with `npm run validate`
4. Update cross-references when necessary

## Release Process

1. Version numbers follow [Semantic Versioning](https://semver.org/)
2. Documents are versioned independently from code
3. Release workflow is handled through GitHub Actions
4. Use `npm run update-versions` to update document versions

## Getting Help

If you need help with contributing, please:

1. Check the documentation in the `@claude-code/` directory
2. Ask questions in the Issues with the "question" label
3. Reach out to the maintainers directly for complex matters

Thank you for your contributions!