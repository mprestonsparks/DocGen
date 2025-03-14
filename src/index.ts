// These imports are needed for TypeScript
import * as path from 'path';
import * as fs from 'fs';

/**
 * Process an academic paper using the paper_architect module
 * @param options Command line options
 */
async function processPaper(options: {
  paper: string;
  output?: string;
  language?: string;
}): Promise<void> {
  try {
    console.log('Starting DocGen Paper Architect');
    console.log('-------------------------------');
    
    // Validate the paper file path
    const paperFilePath = path.resolve(options.paper);
    if (!fs.existsSync(paperFilePath)) {
      console.error(`Error: Paper file not found: ${paperFilePath}`);
      process.exit(1);
    }
    
    // Set up options for paper_architect
    const paperOptions: PaperArchitectOptions = {
      paperFilePath,
      outputDirectory: options.output ? path.resolve(options.output) : undefined,
      implementationLanguage: options.language,
      generateExecutableSpecs: true,
      generateImplementationPlan: true,
      generateTraceabilityMatrix: true
    };
    
    console.log(`Processing paper: ${paperFilePath}`);
    console.log(`Target language: ${options.language || 'python'}`);
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
    console.log(`   npm run docgen -- paper-architect -s ${sessionId} -t code-elements.json`);
  } catch (error) {
    console.error(`Error processing paper: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Update traceability matrix with implemented code elements
 * @param options Command line options
 */
async function updateTraceability(options: {
  session: string;
  trace: string;
}): Promise<void> {
  try {
    console.log('Updating Paper Implementation Traceability');
    console.log('-----------------------------------------');
    
    // Validate the trace file
    const traceFilePath = path.resolve(options.trace);
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
    
    console.log(`Session ID: ${options.session}`);
    console.log(`Trace file: ${traceFilePath}`);
    console.log(`Number of code mappings: ${codeMapping.length}`);
    
    // Update traceability matrix
    console.log('\nUpdating traceability matrix...');
    const updatedMatrix = await paperArchitect.updateTraceabilityMatrix(options.session, codeMapping);
    
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