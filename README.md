# DocGen

A modular documentation generation system with support for academic paper implementation.

## Overview

DocGen is designed to automate the creation and management of documentation for software projects. It supports a 2x2 matrix of project types:

- **New Standard Projects**: Creating documentation for new projects from scratch
- **New Paper-Based Projects**: Creating implementations based on academic papers
- **Existing Standard Projects**: Analyzing and documenting existing codebases
- **Existing Paper-Based Projects**: Adding or improving paper-based implementations in existing projects

## Project Structure

```
src/
├── core/            # Core types and utilities
│   ├── types/       # Shared type definitions
│   └── utils/       # Common utility functions
├── modules/         # Reusable modules
│   ├── project-base/        # Base project functionality
│   ├── existing-analyzer/   # Analysis for existing projects
│   └── paper-architect/     # Paper processing and implementation
├── integrations/    # Integration layers for specific project types
│   ├── new-standard/        # New + Standard integration
│   ├── new-paper/           # New + Paper integration
│   ├── existing-standard/   # Existing + Standard integration
│   └── existing-paper/      # Existing + Paper integration
├── cli/             # Command-line interface
└── index.ts         # Main entry point for the library
```

## Technology Stack

- **Application Code**: TypeScript (strict)
- **Infrastructure**: Python
- **Documentation**: Markdown with YAML frontmatter
- **Dependencies**: Node.js, npm

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link for development
npm link
```

## Usage

DocGen can be used as a command-line tool:

```bash
# Create a new standard project
docgen new-standard my-project --description "My awesome project"

# Create a project based on an academic paper
docgen new-paper my-paper-impl --paper path/to/paper.pdf

# Analyze an existing project
docgen analyze path/to/project

# Analyze an existing paper-based project
docgen analyze-paper path/to/project --paper path/to/paper.pdf

# Auto-detect project type
docgen auto path/to/project
```

## Development

### Prerequisites

- Node.js (>= 14.0.0)
- npm (>= 6.0.0)
- Python (>= 3.8) for infrastructure scripts

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd DocGen

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Coding Guidelines

- All application code must be written in TypeScript
- Infrastructure and DevOps scripts are written in Python
- Follow the modular structure for adding new features
- Maintain separation of concerns between modules and integrations

## Documentation

For detailed documentation, see the [docs](./docs) directory.

## Scripts

- Scripts for development are organized in:
  - `scripts/windows/` - Windows-specific scripts (.ps1)
  - `scripts/unix/` - Unix-specific scripts (.sh)
  - `scripts/` - Cross-platform scripts

## License

[License information]