#!/usr/bin/env node
/**
 * DocGen CLI
 * 
 * Command-line interface for DocGen that exposes the functionality
 * of the integration layers to users.
 */

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { ProjectType } from '../core/types';
import * as newStandard from '../integrations/new-standard';
import * as newPaper from '../integrations/new-paper';
import * as existingStandard from '../integrations/existing-standard';
import * as existingPaper from '../integrations/existing-paper';

// Create commander program
const program = new Command();

// Set up CLI metadata
program
  .name('docgen')
  .description('Documentation generator with paper implementation support')
  .version('0.1.0');

// Common options for all commands
const addCommonOptions = (command: Command) => {
  return command
    .option('-o, --output-dir <directory>', 'Output directory for generated files', './docgen-output')
    .option('--preserve', 'Preserve existing files', false);
};

// New standard project command
addCommonOptions(
  program
    .command('new-standard')
    .description('Create a new standard project with documentation')
    .argument('<project-name>', 'Name of the project')
    .option('-d, --description <description>', 'Project description')
    .option('-p, --path <path>', 'Project path', process.cwd())
    .option('-t, --template <template>', 'Template type (basic, comprehensive, minimal)', 'comprehensive')
    .action(async (projectName, options) => {
      try {
        console.log(`Creating new standard project: ${projectName}`);
        
        await newStandard.initializeNewStandardProject({
          projectName,
          projectDescription: options.description,
          projectPath: path.resolve(options.path),
          templateType: options.template,
          outputDirectory: options.outputDir,
          preserveExisting: options.preserve
        });
        
        console.log('Project created successfully!');
      } catch (error) {
        console.error('Error creating project:', error);
        process.exit(1);
      }
    })
);

// New paper project command
addCommonOptions(
  program
    .command('new-paper')
    .description('Create a new project based on an academic paper')
    .argument('<project-name>', 'Name of the project')
    .requiredOption('--paper <file>', 'Path to the academic paper file (PDF, etc.)')
    .option('-d, --description <description>', 'Project description')
    .option('-p, --path <path>', 'Project path', process.cwd())
    .option('--language <language>', 'Implementation language', 'typescript')
    .option('--no-knowledge-graph', 'Skip knowledge graph generation')
    .option('--no-implementation-plan', 'Skip implementation plan generation')
    .option('--no-specifications', 'Skip specifications generation')
    .action(async (projectName, options) => {
      try {
        console.log(`Creating new paper-based project: ${projectName}`);
        
        if (!fs.existsSync(options.paper)) {
          console.error(`Paper file not found: ${options.paper}`);
          process.exit(1);
        }
        
        await newPaper.initializeNewPaperProject({
          projectName,
          projectDescription: options.description,
          projectPath: path.resolve(options.path),
          paperPath: path.resolve(options.paper),
          generateKnowledgeGraph: options.knowledgeGraph,
          generateImplementationPlan: options.implementationPlan,
          generateSpecifications: options.specifications,
          implementationLanguage: options.language,
          outputDirectory: options.outputDir,
          preserveExisting: options.preserve
        });
        
        console.log('Paper-based project created successfully!');
      } catch (error) {
        console.error('Error creating paper-based project:', error);
        process.exit(1);
      }
    })
);

// Analyze existing project command
addCommonOptions(
  program
    .command('analyze')
    .description('Analyze an existing project')
    .argument('[project-path]', 'Path to the project', process.cwd())
    .option('--depth <depth>', 'Analysis depth (basic, standard, deep)', 'standard')
    .option('--include-dot-files', 'Include dot files in analysis', false)
    .option('--max-file-size <size>', 'Maximum file size in bytes to analyze', '1000000')
    .option('--include-node-modules', 'Include node_modules in analysis', false)
    .option('--generate-docs', 'Generate documentation', true)
    .option('--validate-docs', 'Validate existing documentation', true)
    .action(async (projectPath, options) => {
      try {
        console.log(`Analyzing project: ${projectPath}`);
        
        const result = await existingStandard.analyzeExistingStandardProject({
          projectPath: path.resolve(projectPath),
          analysisDepth: options.depth,
          includeDotFiles: options.includeDotFiles,
          maxFileSize: parseInt(options.maxFileSize),
          includeNodeModules: options.includeNodeModules,
          generateDocumentation: options.generateDocs,
          validateExistingDocs: options.validateDocs,
          outputDirectory: options.outputDir,
          preserveExisting: options.preserve
        });
        
        console.log('Analysis completed successfully!');
        console.log(`Project type: ${result.detectedType}`);
        console.log(`Languages: ${result.languages.map(l => l.name).join(', ')}`);
        console.log(`Frameworks: ${result.frameworks.join(', ')}`);
        console.log(`Output directory: ${options.outputDir}`);
      } catch (error) {
        console.error('Error analyzing project:', error);
        process.exit(1);
      }
    })
);

// Analyze existing paper-based project command
addCommonOptions(
  program
    .command('analyze-paper')
    .description('Analyze an existing paper-based project')
    .argument('[project-path]', 'Path to the project', process.cwd())
    .requiredOption('--paper <file>', 'Path to the academic paper file (PDF, etc.)')
    .option('--depth <depth>', 'Analysis depth (basic, standard, deep)', 'standard')
    .option('--include-dot-files', 'Include dot files in analysis', false)
    .option('--max-file-size <size>', 'Maximum file size in bytes to analyze', '1000000')
    .option('--include-node-modules', 'Include node_modules in analysis', false)
    .option('--generate-traceability', 'Generate traceability matrix', true)
    .option('--update-implementation', 'Update implementation based on paper', false)
    .action(async (projectPath, options) => {
      try {
        console.log(`Analyzing paper-based project: ${projectPath}`);
        
        if (!fs.existsSync(options.paper)) {
          console.error(`Paper file not found: ${options.paper}`);
          process.exit(1);
        }
        
        const result = await existingPaper.analyzeExistingPaperProject({
          projectPath: path.resolve(projectPath),
          paperPath: path.resolve(options.paper),
          analysisDepth: options.depth,
          includeDotFiles: options.includeDotFiles,
          maxFileSize: parseInt(options.maxFileSize),
          includeNodeModules: options.includeNodeModules,
          generateTraceability: options.generateTraceability,
          updateImplementation: options.updateImplementation,
          outputDirectory: options.outputDir,
          preserveExisting: options.preserve
        });
        
        console.log('Paper analysis completed successfully!');
        console.log(`Project type: ${result.projectAnalysis.detectedType}`);
        console.log(`Paper title: ${result.paperContent.title}`);
        console.log(`Traceability items: ${result.traceability.length}`);
        console.log(`Output directory: ${options.outputDir}`);
      } catch (error) {
        console.error('Error analyzing paper-based project:', error);
        process.exit(1);
      }
    })
);

// Auto-detect project type and run appropriate analysis
addCommonOptions(
  program
    .command('auto')
    .description('Auto-detect project type and run appropriate analysis')
    .argument('[project-path]', 'Path to the project', process.cwd())
    .option('--paper <file>', 'Path to the academic paper file (PDF, etc.)')
    .action(async (projectPath, options) => {
      try {
        console.log(`Auto-detecting project type: ${projectPath}`);
        
        // This is a placeholder for auto-detection logic
        // In a real implementation, this would analyze the project and determine
        // which integration to use based on the project's characteristics
        
        const hasExistingCode = fs.existsSync(path.join(projectPath, 'src')) || 
                               fs.existsSync(path.join(projectPath, 'package.json'));
        
        const isPaperBased = !!options.paper;
        
        let projectType: ProjectType;
        
        if (hasExistingCode && isPaperBased) {
          projectType = ProjectType.EXISTING_PAPER;
        } else if (hasExistingCode) {
          projectType = ProjectType.EXISTING_STANDARD;
        } else if (isPaperBased) {
          projectType = ProjectType.NEW_PAPER;
        } else {
          projectType = ProjectType.NEW_STANDARD;
        }
        
        console.log(`Detected project type: ${projectType}`);
        console.log('Please use the specific command for this project type.');
        
      } catch (error) {
        console.error('Error auto-detecting project:', error);
        process.exit(1);
      }
    })
);

// Parse command line arguments
program.parse();

// Display help if no arguments are provided
if (process.argv.length === 2) {
  program.help();
}
