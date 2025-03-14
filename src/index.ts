// These imports are needed for TypeScript
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Command } from 'commander';
import * as paperArchitect from './paper_architect';
import * as llm from './utils/llm';
import * as logger from './utils/logger';

// Define interfaces for paper architect options
interface PaperArchitectOptions {
  paperFilePath: string;
  outputDirectory?: string;
  implementationLanguage?: string;
  generateExecutableSpecs?: boolean;
  generateImplementationPlan?: boolean;
  generateTraceabilityMatrix?: boolean;
}

/**
 * Process an academic paper using the paper_architect module
 * @param paperPath Path to the academic paper PDF
 * @param options Command line options
 */
async function processPaper(
  paperPath: string, 
  options: { output?: string; language?: string; specs?: boolean; plan?: boolean; trace?: boolean }
): Promise<void> {
  try {
    console.log('Starting DocGen Paper Architect');
    console.log('-------------------------------');
    
    // Validate the paper file path
    const paperFilePath = path.resolve(paperPath);
    if (!fs.existsSync(paperFilePath)) {
      console.error(`Error: Paper file not found: ${paperFilePath}`);
      process.exit(1);
    }
    
    // Set up options for paper_architect
    const paperOptions: PaperArchitectOptions = {
      paperFilePath,
      outputDirectory: options.output ? path.resolve(options.output) : undefined,
      implementationLanguage: options.language || 'python',
      generateExecutableSpecs: options.specs !== false,
      generateImplementationPlan: options.plan !== false,
      generateTraceabilityMatrix: options.trace !== false
    };
    
    console.log(`Processing paper: ${paperFilePath}`);
    console.log(`Target language: ${paperOptions.implementationLanguage}`);
    console.log(`Output directory: ${paperOptions.outputDirectory || 'docs/generated/paper'}`);
    
    // Check for LLM availability
    const llmAvailable = llm.isLLMApiAvailable();
    if (!llmAvailable) {
      console.log('\n⚠️  Warning: ANTHROPIC_API_KEY environment variable not found.');
      console.log('Paper processing will still work but with limited capabilities.');
      console.log('For full functionality, set the ANTHROPIC_API_KEY environment variable.\n');
    }
    
    // Initialize paper implementation
    console.log('\nInitializing paper implementation...');
    const sessionId = await paperArchitect.initializePaperImplementation(paperFilePath, paperOptions);
    
    console.log(`\n✅ Paper processed successfully!`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Output directory: ${paperOptions.outputDirectory || path.join(process.cwd(), 'docs/generated/paper')}`);
    console.log('\nGenerated files:');
    console.log('- paper_content.json - Structured content extracted from the paper');
    console.log('- knowledge_model.json - Knowledge graph of concepts and relationships');
    console.log('- executable_specs/ - Directory with executable specifications');
    console.log('- traceability_matrix.json - Matrix linking paper concepts to implementation');
    console.log('- traceability_visualization.html - Visualization of implementation progress');
    console.log('- implementation_plan.md - Detailed plan for implementing the paper');
    
    console.log('\nNext steps:');
    console.log('1. Review the implementation plan');
    console.log('2. Follow the bottom-up implementation approach');
    console.log(`3. Update traceability with implemented code using the following command:`);
    console.log(`   npm run paper-architect -- update-trace -s ${sessionId} -t code-elements.json`);
  } catch (error) {
    console.error(`Error processing paper: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Update traceability matrix with implemented code elements
 * @param sessionId Session ID for the paper implementation
 * @param tracePath Path to the trace file containing code mappings
 */
async function updateTraceability(sessionId: string, tracePath: string): Promise<void> {
  try {
    console.log('Updating Paper Implementation Traceability');
    console.log('-----------------------------------------');
    
    // Validate the trace file
    const traceFilePath = path.resolve(tracePath);
    if (!fs.existsSync(traceFilePath)) {
      console.error(`Error: Trace file not found: ${traceFilePath}`);
      process.exit(1);
    }
    
    // Load the trace file
    const traceContent = fs.readFileSync(traceFilePath, 'utf8');
    const codeMapping = JSON.parse(traceContent);
    
    // Validate the content
    if (!Array.isArray(codeMapping)) {
      console.error('Error: Trace file must contain an array of code mappings');
      process.exit(1);
    }
    
    console.log(`Session ID: ${sessionId}`);
    console.log(`Trace file: ${traceFilePath}`);
    console.log(`Number of code mappings: ${codeMapping.length}`);
    
    // Update traceability matrix
    console.log('\nUpdating traceability matrix...');
    const updatedMatrix = await paperArchitect.updateTraceabilityMatrix(sessionId, codeMapping);
    
    console.log(`\n✅ Traceability matrix updated successfully!`);
    console.log(`Paper elements: ${updatedMatrix.paperElements.length}`);
    console.log(`Code elements: ${updatedMatrix.codeElements.length}`);
    console.log(`Relationships: ${updatedMatrix.relationships.length}`);
    
    // Calculate coverage
    const implementedElements = new Set(updatedMatrix.relationships.map((rel: { paperElementId: string }) => rel.paperElementId));
    const coveragePercentage = (implementedElements.size / updatedMatrix.paperElements.length) * 100;
    
    console.log(`Implementation coverage: ${coveragePercentage.toFixed(2)}%`);
    
    console.log('\nNext steps:');
    console.log('1. View the updated traceability visualization');
    console.log('2. Continue implementing based on the implementation plan');
    console.log('3. Update traceability as you implement more components');
  } catch (error) {
    console.error(`Error updating traceability: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Main CLI entry point for paper_architect module
 */
export function run(): void {
  const program = new Command();
  
  program
    .name('paper-architect')
    .description('DocGen Paper Architect - Implement academic papers with high fidelity')
    .version('1.0.0');
  
  // Command for processing a paper
  program
    .command('process')
    .description('Process an academic paper and generate implementation artifacts')
    .requiredOption('-p, --paper <path>', 'Path to the academic paper PDF file')
    .option('-o, --output <dir>', 'Output directory for generated artifacts')
    .option('-l, --language <lang>', 'Target implementation language', 'python')
    .option('--no-specs', 'Skip executable specifications generation')
    .option('--no-plan', 'Skip implementation plan generation')
    .option('--no-trace', 'Skip traceability matrix generation')
    .action((options) => {
      processPaper(options.paper, {
        output: options.output,
        language: options.language,
        specs: options.specs,
        plan: options.plan,
        trace: options.trace
      });
    });
  
  // Command for updating traceability
  program
    .command('update-trace')
    .description('Update traceability with implemented code elements')
    .requiredOption('-s, --session <id>', 'Session ID for the paper implementation')
    .requiredOption('-t, --trace <path>', 'Path to the trace file containing code mappings')
    .action((options) => {
      updateTraceability(options.session, options.trace);
    });
  
  // Default command handling
  program
    .argument('[command]', 'Command to execute')
    .action((cmd) => {
      if (!cmd) {
        console.log('DocGen Paper Architect - Implement academic papers with high fidelity');
        console.log('Usage: npm run paper-architect -- [options] [command]');
        console.log('\nCommands:');
        console.log('  process         Process an academic paper and generate implementation artifacts');
        console.log('  update-trace    Update traceability with implemented code elements');
        console.log('\nOptions:');
        console.log('  -h, --help     Display help for command');
        console.log('  -V, --version  Output the version number');
        console.log('\nFor more information, use: npm run paper-architect -- [command] --help');
      } else {
        console.error(`Unknown command: ${cmd}`);
        console.log('Use --help to see available commands');
        process.exit(1);
      }
    });
  
  // Parse command line arguments
  program.parse(process.argv);
}

// Main entry point
if (require.main === module) {
  // Extract the command from process.argv
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === 'paper-architect') {
    // Handle paper-architect command
    run();
  } else {
    console.error('Usage: node dist/index.js paper-architect [options] [command]');
    console.error('For more information: node dist/index.js paper-architect --help');
    process.exit(1);
  }
}

/**
 * Load project defaults from configuration file or use built-in defaults
 */
export function loadProjectDefaults() {
  try {
    const configPath = path.join(__dirname, '../config/project-defaults.yaml');
    if (fs.existsSync(configPath)) {
      return yaml.load(fs.readFileSync(configPath, 'utf8')) as any;
    }
  } catch (error) {
    logger.error(`Error loading project defaults: ${error}`);
  }
  
  return {
    schema_versions: { prd: '1.0.0', srs: '1.0.0', sad: '1.0.0', sdd: '1.0.0', stp: '1.0.0' },
    document_versions: { prd: '1.0.0', srs: '1.0.0', sad: '1.0.0', sdd: '1.0.0', stp: '1.0.0' },
    document_statuses: ['DRAFT', 'REVIEW', 'APPROVED'],
    project_types: {
      WEB: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      MOBILE: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      API: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      DESKTOP: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      OTHER: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      ACADEMIC_PAPER: { recommended_docs: ['implementation_plan', 'executable_specs', 'traceability_matrix'] }
    }
  };
}