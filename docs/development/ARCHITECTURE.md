# DocGen Architecture

## Overview

DocGen follows a modular architecture designed around a 2x2 matrix of project types:

1. New vs. Existing Projects
2. Standard vs. Paper-Based Projects

This creates four distinct integration paths:
- New Standard Projects
- New Paper-Based Projects
- Existing Standard Projects
- Existing Paper-Based Projects

## Core Components

### 1. Core Types (`src/core/types/`)
- Shared type definitions
- Project configuration interfaces
- Common utility types

### 2. Modules (`src/modules/`)

#### Project Base (`project-base/`)
- Base classes and interfaces
- Common project operations
- Configuration management

#### Existing Analyzer (`existing-analyzer/`)
- Project structure analysis
- Dependency detection
- Documentation discovery

#### Paper Architect (`paper-architect/`)
- Paper parsing and analysis
- Knowledge graph generation
- Implementation planning

### 3. Integrations (`src/integrations/`)

Each integration combines the core modules to provide specific functionality:

#### New Standard (`new-standard/`)
- Project scaffolding
- Documentation templates
- Best practices enforcement

#### New Paper (`new-paper/`)
- Paper-based project creation
- Implementation guidance
- Traceability setup

#### Existing Standard (`existing-standard/`)
- Project analysis
- Documentation generation
- Gap detection

#### Existing Paper (`existing-paper/`)
- Paper alignment checking
- Implementation verification
- Traceability matrix generation

## Technology Stack

- **Application Code**: TypeScript
- **Infrastructure**: Python
- **Documentation**: Markdown with YAML frontmatter
- **Dependencies**: Node.js, npm

## Development Guidelines

1. **Modularity**
   - Keep modules independent
   - Use clear interfaces
   - Minimize cross-module dependencies

2. **Type Safety**
   - Use TypeScript strictly
   - Define interfaces for all public APIs
   - Maintain comprehensive type definitions

3. **Documentation**
   - Document all public APIs
   - Include usage examples
   - Maintain architecture documentation

4. **Testing**
   - Unit tests for core functionality
   - Integration tests for each module
   - End-to-end tests for each integration path
