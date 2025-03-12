# DocGen Configuration

This directory contains configuration files for DocGen:

## Available Configuration Files

- **project-defaults.yaml**: Default values for new project interviews
- **tech-stacks.json**: Supported technology stacks with their components 
- **existing-project.yaml**: Configuration for existing project analysis

## Existing Project Configuration

The `existing-project.yaml` file contains settings for analyzing and documenting existing projects:

```yaml
analysis:
  depth: "standard"  # basic | standard | deep
  includeDotFiles: false
  maxFileSize: 10MB
  includeNodeModules: false
  
output:
  directory: "docgen-output"
  createSubdirectories: true
  subdirectoryTemplate: "{documentType}/"
  
integration:
  generateGuide: true
  suggestMergeStrategy: true
  
validation:
  validateExistingDocs: true
  reportNonCompliance: true
  attemptFixes: false
```

### Analysis Settings

- **depth**: Controls how deeply DocGen analyzes your project
  - `basic`: Quick analysis of primary files only (fastest)
  - `standard`: Balanced analysis of key files and structures (recommended)
  - `deep`: Comprehensive analysis of all files (slowest)
- **includeDotFiles**: Whether to analyze hidden files (starting with `.`)
- **maxFileSize**: Maximum file size to analyze
- **includeNodeModules**: Whether to analyze dependencies (not recommended)

### Output Settings

- **directory**: Where to store generated documentation
- **createSubdirectories**: Create separate folders for each document type
- **subdirectoryTemplate**: Pattern for subdirectory names

### Integration Settings

- **generateGuide**: Create a guide for integrating with existing documentation
- **suggestMergeStrategy**: Provide strategies for combining documentation

### Validation Settings

- **validateExistingDocs**: Check existing docs against DocGen schema
- **reportNonCompliance**: Report issues with existing documentation
- **attemptFixes**: Try to automatically fix non-compliant documentation