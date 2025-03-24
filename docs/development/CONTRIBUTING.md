# Contributing to DocGen

## Development Setup

1. **Prerequisites**
   - Node.js (>= 14.0.0)
   - npm (>= 6.0.0)
   - Python (>= 3.8) for infrastructure scripts

2. **Installation**
   ```bash
   # Clone the repository
   git clone <repository-url>
   cd DocGen

   # Install dependencies
   npm install

   # Build the project
   npm run build
   ```

3. **Development Workflow**
   - Write code in TypeScript
   - Follow the modular architecture
   - Add tests for new functionality
   - Update documentation as needed

## Project Structure

```
src/
├── core/            # Core types and utilities
├── modules/         # Reusable modules
├── integrations/    # Integration layers
└── cli/            # Command-line interface
```

## Coding Guidelines

1. **TypeScript**
   - Use strict mode
   - Define types for all public interfaces
   - Avoid `any` types
   - Use meaningful type names

2. **Documentation**
   - Document all public APIs
   - Include JSDoc comments
   - Update README.md for major changes
   - Keep architecture docs current

3. **Testing**
   - Write unit tests for new functionality
   - Maintain test coverage
   - Test edge cases
   - Add integration tests for modules

4. **Git Workflow**
   - Create feature branches
   - Write clear commit messages
   - Keep commits focused
   - Update documentation with changes

## Infrastructure

- Application code is in TypeScript
- DevOps scripts are in Python
- Documentation uses Markdown with YAML frontmatter

## Building and Testing

```bash
# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## Adding New Features

1. **Plan**
   - Review architecture docs
   - Identify affected modules
   - Plan test coverage
   - Document design decisions

2. **Implement**
   - Follow modular structure
   - Add necessary types
   - Write tests first
   - Implement functionality

3. **Document**
   - Update API docs
   - Add usage examples
   - Update architecture docs
   - Write changelog entry

4. **Review**
   - Run all tests
   - Check code coverage
   - Verify documentation
   - Test manually

## Getting Help

- Review architecture documentation
- Check existing code for examples
- Follow the modular structure
- Ask for clarification when needed
