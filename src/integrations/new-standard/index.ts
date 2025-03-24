/**
 * New Standard Project Integration
 * 
 * This integration handles the creation and management of new standard projects.
 * It represents the New+Standard quadrant of the 2x2 matrix.
 */

import { BaseProjectOptions } from '../../core/types';
import * as projectBase from '../../modules/project-base';
import path from 'path';
import fs from 'fs';

/**
 * Options for creating a new standard project
 */
export interface NewStandardProjectOptions extends BaseProjectOptions {
  projectName: string;
  projectDescription?: string;
  projectPath: string;
  templateType?: 'basic' | 'comprehensive' | 'minimal';
}

/**
 * Initialize a new standard project
 */
export async function initializeNewStandardProject(options: NewStandardProjectOptions): Promise<void> {
  // Initialize project directory
  projectBase.initializeProjectDirectory({
    projectPath: options.projectPath,
    projectName: options.projectName,
    projectDescription: options.projectDescription,
    outputDirectory: options.outputDirectory,
    preserveExisting: options.preserveExisting
  });
  
  // Create project configuration
  projectBase.createProjectConfigFile({
    projectPath: options.projectPath,
    projectName: options.projectName,
    projectDescription: options.projectDescription,
    outputDirectory: options.outputDirectory,
    preserveExisting: options.preserveExisting
  });
  
  // Create standard documentation structure
  await createStandardDocumentation(options);
}

/**
 * Create standard documentation for a new project
 */
async function createStandardDocumentation(options: NewStandardProjectOptions): Promise<void> {
  const { projectPath, projectName, projectDescription, templateType = 'comprehensive' } = options;
  const outputDir = projectBase.getProjectOutputDir(projectPath, options.outputDirectory);
  
  // Create docs directory if it doesn't exist
  const docsDir = path.join(outputDir, 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // Create README.md
  const readmePath = path.join(projectPath, 'README.md');
  if (!fs.existsSync(readmePath) || !options.preserveExisting) {
    const readmeContent = generateReadmeContent(projectName, projectDescription || '', templateType);
    fs.writeFileSync(readmePath, readmeContent, 'utf8');
  }
  
  // Create project overview document
  const overviewPath = path.join(docsDir, 'PROJECT_OVERVIEW.md');
  if (!fs.existsSync(overviewPath) || !options.preserveExisting) {
    const overviewContent = generateOverviewContent(projectName, projectDescription || '', templateType);
    fs.writeFileSync(overviewPath, overviewContent, 'utf8');
  }
  
  // Create additional documentation based on template type
  if (templateType === 'comprehensive' || templateType === 'basic') {
    // Create architecture document
    const architecturePath = path.join(docsDir, 'ARCHITECTURE.md');
    if (!fs.existsSync(architecturePath) || !options.preserveExisting) {
      const architectureContent = generateArchitectureContent(projectName, templateType);
      fs.writeFileSync(architecturePath, architectureContent, 'utf8');
    }
    
    // Create API documentation template
    const apiDocsPath = path.join(docsDir, 'API.md');
    if (!fs.existsSync(apiDocsPath) || !options.preserveExisting) {
      const apiContent = generateApiDocContent(projectName, templateType);
      fs.writeFileSync(apiDocsPath, apiContent, 'utf8');
    }
  }
  
  if (templateType === 'comprehensive') {
    // Create development guide
    const devGuidePath = path.join(docsDir, 'DEVELOPMENT.md');
    if (!fs.existsSync(devGuidePath) || !options.preserveExisting) {
      const devGuideContent = generateDevelopmentGuideContent(projectName);
      fs.writeFileSync(devGuidePath, devGuideContent, 'utf8');
    }
    
    // Create user guide
    const userGuidePath = path.join(docsDir, 'USER_GUIDE.md');
    if (!fs.existsSync(userGuidePath) || !options.preserveExisting) {
      const userGuideContent = generateUserGuideContent(projectName);
      fs.writeFileSync(userGuidePath, userGuideContent, 'utf8');
    }
  }
}

/**
 * Generate README.md content
 */
function generateReadmeContent(projectName: string, projectDescription: string, templateType: string): string {
  return `---
title: ${projectName}
description: ${projectDescription}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
---

# ${projectName}

${projectDescription}

## Overview

[Brief overview of the project]

## Getting Started

### Prerequisites

[List of prerequisites]

### Installation

\`\`\`bash
# Installation steps
\`\`\`

## Usage

[Basic usage examples]

## Documentation

For more detailed documentation, see the [docs](./docs) directory.

## License

[License information]
`;
}

/**
 * Generate project overview content
 */
function generateOverviewContent(projectName: string, projectDescription: string, templateType: string): string {
  return `---
title: ${projectName} Overview
description: Comprehensive overview of the ${projectName} project
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: project_overview
---

# ${projectName} Overview

${projectDescription}

## Purpose and Scope

[Detailed explanation of project purpose and scope]

## Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Technology Stack

- [Technology 1]
- [Technology 2]
- [Technology 3]

## Project Structure

\`\`\`
project-root/
├── src/               # Source code
├── docs/              # Documentation
├── tests/             # Tests
└── README.md          # Project README
\`\`\`

## Roadmap

[Project roadmap and future plans]
`;
}

/**
 * Generate architecture document content
 */
function generateArchitectureContent(projectName: string, templateType: string): string {
  return `---
title: ${projectName} Architecture
description: Architectural overview of the ${projectName} project
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: architecture
---

# ${projectName} Architecture

## System Overview

[High-level overview of the system architecture]

## Components

### Component 1

[Description of component 1]

### Component 2

[Description of component 2]

## Data Flow

[Description of data flow between components]

## Technologies

[List of technologies used and why they were selected]

## Deployment Architecture

[Overview of deployment architecture]
`;
}

/**
 * Generate API documentation content
 */
function generateApiDocContent(projectName: string, templateType: string): string {
  return `---
title: ${projectName} API Documentation
description: API reference for ${projectName}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: api_documentation
---

# ${projectName} API Documentation

## Overview

[Overview of the API]

## Authentication

[Authentication methods]

## Endpoints

### Endpoint 1

\`\`\`
GET /api/resource
\`\`\`

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| param1 | string | Description of param1 |

**Response**

\`\`\`json
{
  "id": 1,
  "name": "Resource name"
}
\`\`\`
`;
}

/**
 * Generate development guide content
 */
function generateDevelopmentGuideContent(projectName: string): string {
  return `---
title: ${projectName} Development Guide
description: Guide for developers working on ${projectName}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: development_guide
---

# ${projectName} Development Guide

## Development Environment Setup

[Instructions for setting up the development environment]

## Coding Standards

[Coding standards and guidelines]

## Build Process

[Build process documentation]

## Testing

[Testing strategies and practices]

## Contribution Guidelines

[Guidelines for contributing to the project]
`;
}

/**
 * Generate user guide content
 */
function generateUserGuideContent(projectName: string): string {
  return `---
title: ${projectName} User Guide
description: User guide for ${projectName}
created: ${new Date().toISOString()}
last_updated: ${new Date().toISOString()}
type: user_guide
---

# ${projectName} User Guide

## Getting Started

[Getting started with the project]

## Features

### Feature 1

[How to use feature 1]

### Feature 2

[How to use feature 2]

## Troubleshooting

[Common issues and solutions]

## FAQ

[Frequently asked questions]
`;
}
