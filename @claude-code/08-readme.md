# Documentation Template System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/Node.js-v18.x-green.svg)](https://nodejs.org/)
[![Template Version](https://img.shields.io/badge/Version-1.0.0-orange.svg)](./CHANGELOG.md)

## Overview

The Documentation Template System is an intelligent, LLM-powered platform that automates the creation of high-quality software project documentation. Using an interactive interview process and AI-enhanced content generation, it produces comprehensive, consistent documentation that follows best practices and standards.

🚀 **Perfect for teams who want to:**
- Generate complete documentation with minimal effort
- Ensure consistency across all project artifacts
- Maintain high-quality documentation throughout the project lifecycle
- Benefit from best practices without extensive documentation expertise

## Features

### 🤖 LLM-Powered Intelligence
- Smart project type detection and recommendations
- Intelligent technology stack suggestions
- Adaptive questioning based on project context
- Gap analysis and completeness validation

### 📝 Comprehensive Templates
- Project Overview and Vision
- Technical Requirements Specification
- System Architecture Documentation
- Implementation Planning
- API Documentation
- Test Plans and Strategies
- Deployment and Operations Guides
- And more!

### 🔍 Validation and Quality Assurance
- Terminology consistency checking
- Requirements coverage analysis
- Cross-reference validation
- Document completeness verification
- Readability assessment

### 🔄 Version Management
- Automatic versioning across documents
- Changelog generation
- Document synchronization
- Update tracking

### 🔌 Integration Capabilities
- GitHub template repository
- CI/CD workflow integration
- Custom validation hooks
- Export to various formats

## Quick Start

### Prerequisites
- Node.js v18 or later
- npm v9 or later
- An OpenAI or Anthropic API key (for LLM-powered features)

### Installation

1. Click "Use this template" on GitHub to create a new repository from this template
2. Clone your new repository:
   ```bash
   git clone https://github.com/yourusername/your-project-docs.git
   cd your-project-docs
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env to add your API keys
   ```

### Usage

#### Initialize a New Documentation Project

```bash
npm run docs:init
```

This will start the interactive interview process to gather information about your project. The system will guide you through a series of questions, adapting based on your responses.

#### Generate Documentation

```bash
npm run docs:generate
```

This will generate all documentation artifacts based on the collected information. The generated documents will be placed in the `docs/generated` directory.

#### Validate Documentation

```bash
npm run docs:validate
```

This will analyze your documentation for completeness, consistency, and quality, producing a validation report with improvement recommendations.

#### Update Documentation

```bash
npm run docs:update
```

This will update your documentation based on changes to the project information, while preserving any custom modifications you've made.

## Documentation Structure

The generated documentation follows a consistent structure:

```
docs/
├── project-overview.md          # Vision, objectives, and success metrics
├── requirements/
│   ├── requirements-spec.md     # Functional and non-functional requirements
│   └── user-stories.md          # User stories and acceptance criteria
├── architecture/
│   ├── system-architecture.md   # Overall system architecture
│   ├── data-model.md            # Data structures and relationships
│   └── api-design.md            # API specifications
├── implementation/
│   ├── implementation-plan.md   # Development approach and timeline
│   └── coding-standards.md      # Coding guidelines and best practices
├── testing/
│   ├── test-plan.md             # Testing strategy and approach
│   └── test-cases.md            # Specific test scenarios
├── deployment/
│   ├── deployment-guide.md      # Deployment instructions
│   └── operations-manual.md     # Operational procedures
└── support/
    ├── user-guide.md            # End-user documentation
    └── troubleshooting.md       # Common issues and solutions
```

## Customization

### Template Customization

Edit the templates in the `templates` directory to customize the generated documentation. Templates use Handlebars syntax with custom helpers for advanced functionality.

### Question Customization

Modify the question definitions in `config/questions` to add, remove, or change interview questions. Each question can include conditional logic, validation rules, and help text.

### Validation Rules

Customize validation rules in `config/validation` to adapt to your organization's specific documentation standards and requirements.

## Advanced Features

### LLM Provider Configuration

The system supports multiple LLM providers. Configure your preferred provider in `.env`:

```
LLM_PROVIDER=anthropic  # or openai
ANTHROPIC_API_KEY=your-key-here
# or
OPENAI_API_KEY=your-key-here
```

### Offline Mode

Run in offline mode with reduced functionality:

```bash
npm run docs:init -- --offline
```

### Custom Document Types

Add your own document types by creating new templates and registering them in `config/document-types.json`.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgements

- Inspired by the success of comprehensive documentation in accelerating development
- Built with [Node.js](https://nodejs.org/), [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/), and [Handlebars](https://handlebarsjs.com/)
- Enhanced by [Claude](https://www.anthropic.com/claude) and [ChatGPT](https://openai.com/chatgpt) language models
