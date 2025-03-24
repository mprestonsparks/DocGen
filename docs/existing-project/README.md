# DocGen Existing Project Support

> **Non-destructive documentation generation for existing projects**

This feature enables DocGen to analyze your existing codebase and generate complementary documentation without modifying your current project files.

## Overview

The existing project support feature:

- Analyzes your project structure to detect languages, frameworks, and components
- Discovers existing documentation to avoid duplication
- Provides smart defaults for the interview process based on analysis
- Generates documentation in an isolated directory to avoid conflicts
- Creates an integration guide to help combine DocGen output with existing documentation

## Getting Started

To use DocGen with an existing project:

```bash
# Navigate to your DocGen directory
cd path/to/docgen

# Run the interview with the existing project flag
npm run interview -- --existing-project /path/to/your/project
```

## Command Line Options

```bash
npm run interview -- --existing-project <path> [options]
```

Available options:

- `--analysis-depth <depth>`: Set the depth of analysis (basic, standard, deep)
- `--output-dir <path>`: Specify a custom output directory for generated docs
- `--resume <sessionId>`: Resume a previous existing project interview session

## Project Analysis

DocGen analyzes your project to detect:

1. **Languages**: Identifies programming languages used in your project
2. **Frameworks**: Detects frameworks and libraries based on configuration files and imports
3. **Project Structure**: Maps the directory structure and component relationships
4. **Existing Documentation**: Finds and examines documentation files

The analysis results are used to:
- Pre-fill interview answers with smart defaults
- Customize the interview flow based on detected technologies
- Generate appropriate documentation templates
- Ensure generated documentation complements existing documentation

## Output Isolation

By default, DocGen generates documentation in a separate directory (`docgen-output`) to avoid modifying any existing files. This isolation ensures:

- Non-destructive operation
- Clear separation between existing and generated documentation
- Ability to review and selectively integrate generated content

## Integration Guide

After generating documentation, DocGen provides an integration guide that helps you:

1. Understand how generated documentation relates to your existing codebase
2. Combine DocGen output with your existing documentation
3. Maintain documentation consistency across your project

## Configuration

You can customize the existing project support feature through:

- Command line options for specific runs
- Configuration in `config/existing-project.yaml` for persistent settings

### Sample Configuration

```yaml
# config/existing-project.yaml
analysis:
  depth: "standard"  # basic | standard | deep
  includeDotFiles: false
  maxFileSize: 10MB
  includeNodeModules: false
  
output:
  directory: "docgen-output"
  createSubdirectories: true
  
integration:
  generateGuide: true
  suggestMergeStrategy: true
```

## Workflow Example

1. **Analysis**: Run DocGen with `--existing-project` flag to analyze your project
2. **Review Analysis**: Confirm or adjust the detected project structure and technologies
3. **Interview**: Answer questions with pre-filled defaults based on analysis
4. **Generate**: Create documentation in isolated directory
5. **Integration**: Use the integration guide to combine with existing documentation

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Project analysis fails | • Check project path is correct <br> • Try running with `--analysis-depth basic` <br> • Ensure you have read permissions for all files |
| Technology detection inaccurate | • Manually specify frameworks in the interview <br> • Create an issue with your project type for future improvements |
| Integration guide not helpful | • Provide feedback for improvements <br> • Customize the integration guide template |

## Extending

You can extend existing project support by:

1. Enhancing `src/utils/project-analyzer.ts` for better detection
2. Customizing the integration guide template
3. Adding support for additional project types and frameworks

## FAQ

**Q: Will DocGen modify my existing documentation?**  
A: No, DocGen is non-destructive by default and will not modify any existing files.

**Q: Can DocGen analyze large projects?**  
A: Yes, but for very large projects, using `--analysis-depth basic` is recommended for performance.

**Q: How does DocGen handle mixed programming languages?**  
A: DocGen detects all languages in your project and will identify the primary language based on code distribution.

**Q: Can I integrate with existing documentation workflows?**  
A: Yes, the integration guide provides strategies for combining DocGen output with various documentation workflows.