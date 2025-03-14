/**
 * DocGen Paper Architect Module
 * 
 * This module extends DocGen to support the systematic implementation of academic papers
 * as software. The module provides tools for:
 * 
 * 1. Extracting structured information from academic papers
 * 2. Creating knowledge models of paper concepts
 * 3. Generating executable specifications
 * 4. Building traceability matrices between paper concepts and code
 * 5. Guiding implementation through a structured workflow
 * 
 * The module is designed to integrate with DocGen's existing functionality.
 */

import * as path from 'path';
import * as fs from 'fs';

// Import utils from the main DocGen project
import * as config from '../utils/config';
import * as logger from '../utils/logger';
import * as session from '../utils/session';
import * as validation from '../utils/validation';
import * as llm from '../utils/llm';

// Import paper_architect submodules
import * as extraction from './extraction';
import * as knowledge from './knowledge';
import * as specifications from './specifications';
import * as traceability from './traceability';
import * as workflow from './workflow';
import * as utils from './utils';

// Import types
import {
  PaperInfo,
  PaperContent,
  PaperKnowledgeGraph,
  ExecutableSpecification,
  PaperTraceabilityMatrix,
  PaperImplementationPlan,
  PaperArchitectOptions,
  ProjectInfo
} from '../types';

/**
 * Main function to initialize the paper_architect module with a given academic paper
 * @param paperFilePath Path to the academic paper (PDF)
 * @param options Configuration options for the paper_architect module
 * @returns A session ID that can be used to access the processing results
 */
export async function initializePaperImplementation(
  paperFilePath: string,
  options: PaperArchitectOptions = {}
): Promise<string> {
  logger.info('Initializing paper implementation', { paperFilePath });
  
  try {
    // Validate that the paper file exists
    if (!fs.existsSync(paperFilePath)) {
      throw new Error(`Paper file not found: ${paperFilePath}`);
    }
    
    // Set default options
    const defaultOptions: PaperArchitectOptions = {
      outputDirectory: path.join(process.cwd(), 'docs/generated/paper'),
      generateExecutableSpecs: true,
      generateImplementationPlan: true,
      generateTraceabilityMatrix: true,
      implementationLanguage: 'python'
    };
    
    // Merge user options with defaults
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(mergedOptions.outputDirectory!)) {
      fs.mkdirSync(mergedOptions.outputDirectory!, { recursive: true });
    }
    
    // Extract paper content
    logger.info('Extracting paper content', { paperFilePath });
    const paperContent = await extraction.extractPaperContent(paperFilePath, mergedOptions.grobidOptions);
    
    // Create project info
    const projectInfo: ProjectInfo = {
      id: `PAPER-${Math.floor(1000 + Math.random() * 9000)}`,
      name: paperContent.paperInfo.title,
      description: paperContent.paperInfo.abstract,
      type: 'ACADEMIC_PAPER',
      created: new Date().toISOString()
    };
    
    // Generate session ID
    const sessionId = session.generateSessionId(projectInfo.name);
    
    // Save initial session data
    session.saveSession(sessionId, {
      projectInfo,
      interviewAnswers: {
        'Paper Title': paperContent.paperInfo.title,
        'Paper Authors': paperContent.paperInfo.authors.join(', '),
        'Paper Abstract': paperContent.paperInfo.abstract,
        'Paper Year': String(paperContent.paperInfo.year)
      },
      _lastUpdated: new Date().toISOString()
    });
    
    // Save paper content to file
    const paperContentPath = path.join(mergedOptions.outputDirectory!, 'paper_content.json');
    fs.writeFileSync(paperContentPath, JSON.stringify(paperContent, null, 2));
    
    // Generate knowledge model
    logger.info('Generating knowledge model', { sessionId });
    const knowledgeGraph = await knowledge.generateKnowledgeModel(paperContent);
    
    // Save knowledge model to file
    const knowledgeModelPath = path.join(mergedOptions.outputDirectory!, 'knowledge_model.json');
    fs.writeFileSync(knowledgeModelPath, JSON.stringify(knowledgeGraph, null, 2));
    
    // Generate executable specifications if requested
    if (mergedOptions.generateExecutableSpecs) {
      logger.info('Generating executable specifications', { sessionId });
      const executableSpecs = await specifications.generateExecutableSpecifications(
        paperContent,
        knowledgeGraph,
        mergedOptions.implementationLanguage
      );
      
      // Save executable specifications to files
      const specsDir = path.join(mergedOptions.outputDirectory!, 'executable_specs');
      if (!fs.existsSync(specsDir)) {
        fs.mkdirSync(specsDir, { recursive: true });
      }
      
      executableSpecs.forEach(spec => {
        const specPath = path.join(specsDir, `${utils.slugify(spec.title)}.md`);
        fs.writeFileSync(specPath, specifications.formatExecutableSpecification(spec));
      });
    }
    
    // Generate initial traceability matrix if requested
    if (mergedOptions.generateTraceabilityMatrix) {
      logger.info('Generating initial traceability matrix', { sessionId });
      const traceabilityMatrix = traceability.generateInitialTraceabilityMatrix(paperContent, knowledgeGraph);
      
      // Save traceability matrix to file
      const matrixPath = path.join(mergedOptions.outputDirectory!, 'traceability_matrix.json');
      fs.writeFileSync(matrixPath, JSON.stringify(traceabilityMatrix, null, 2));
      
      // Generate visualization
      const visualizationPath = path.join(mergedOptions.outputDirectory!, 'traceability_visualization.html');
      fs.writeFileSync(visualizationPath, traceability.generateVisualization(traceabilityMatrix));
    }
    
    // Generate implementation plan if requested
    if (mergedOptions.generateImplementationPlan) {
      logger.info('Generating implementation plan', { sessionId });
      const implementationPlan = await workflow.generateImplementationPlan(
        paperContent,
        knowledgeGraph,
        mergedOptions.implementationLanguage
      );
      
      // Save implementation plan to file
      const planPath = path.join(mergedOptions.outputDirectory!, 'implementation_plan.md');
      fs.writeFileSync(planPath, workflow.formatImplementationPlan(implementationPlan));
    }
    
    logger.info('Paper implementation initialized successfully', { sessionId });
    return sessionId;
  } catch (error) {
    logger.error('Error initializing paper implementation', { 
      error: error instanceof Error ? error.message : String(error), 
      paperFilePath 
    });
    throw error;
  }
}

/**
 * Updates the traceability matrix with implemented code elements
 * @param sessionId The session ID from the initialization
 * @param codeMapping Information about implemented code elements
 * @returns Updated traceability matrix
 */
export async function updateTraceabilityMatrix(
  sessionId: string, 
  codeMapping: {
    paperElementId: string;
    codeElement: {
      id: string;
      type: 'class' | 'function' | 'method' | 'interface';
      name: string;
      filePath: string;
      lineNumbers?: [number, number];
    };
    type: 'implements' | 'partiallyImplements' | 'tests' | 'documents';
    confidence: number;
    notes?: string;
  }[]
): Promise<PaperTraceabilityMatrix> {
  try {
    logger.info('Updating traceability matrix', { sessionId });
    
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load existing traceability matrix
    const matrixPath = path.join(outputDir, 'traceability_matrix.json');
    if (!fs.existsSync(matrixPath)) {
      throw new Error('Traceability matrix not found. Run initializePaperImplementation first.');
    }
    
    const matrix: PaperTraceabilityMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    
    // Update the matrix with new code elements
    return traceability.updateTraceabilityMatrix(matrix, codeMapping);
  } catch (error) {
    logger.error('Error updating traceability matrix', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}

/**
 * Updates the implementation plan with progress information
 * @param sessionId The session ID from the initialization
 * @param componentUpdates Status updates for implemented components
 * @returns Updated implementation plan
 */
export async function updateImplementationProgress(
  sessionId: string,
  componentUpdates: {
    componentId: string;
    status: 'notStarted' | 'inProgress' | 'implemented' | 'verified';
    notes?: string;
  }[]
): Promise<PaperImplementationPlan> {
  try {
    logger.info('Updating implementation progress', { sessionId });
    
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load existing implementation plan
    const planPath = path.join(outputDir, 'implementation_plan.md');
    if (!fs.existsSync(planPath)) {
      throw new Error('Implementation plan not found. Run initializePaperImplementation first.');
    }
    
    // Parse the markdown file to extract the implementation plan
    const planMarkdown = fs.readFileSync(planPath, 'utf8');
    const plan = workflow.parseImplementationPlan(planMarkdown);
    
    // Update the plan with component status changes
    const updatedPlan = workflow.updateImplementationProgress(plan, componentUpdates);
    
    // Save the updated plan
    fs.writeFileSync(planPath, workflow.formatImplementationPlan(updatedPlan));
    
    return updatedPlan;
  } catch (error) {
    logger.error('Error updating implementation progress', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}

/**
 * Generates a verification report comparing implementation against paper specifications
 * @param sessionId The session ID from the initialization
 * @param testResults Results from running the verification tests
 * @returns Verification report
 */
export async function generateVerificationReport(
  sessionId: string,
  testResults: {
    specificationId: string;
    fixture: {
      id: string;
      passed: boolean;
      actual?: any;
      expected?: any;
      error?: string;
    }[];
  }[]
): Promise<string> {
  try {
    logger.info('Generating verification report', { sessionId });
    
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load the knowledge model and executable specifications
    const knowledgeModelPath = path.join(outputDir, 'knowledge_model.json');
    const specsDir = path.join(outputDir, 'executable_specs');
    
    if (!fs.existsSync(knowledgeModelPath) || !fs.existsSync(specsDir)) {
      throw new Error('Knowledge model or executable specifications not found.');
    }
    
    const knowledgeGraph: PaperKnowledgeGraph = JSON.parse(fs.readFileSync(knowledgeModelPath, 'utf8'));
    
    // Generate verification report
    const report = specifications.generateVerificationReport(knowledgeGraph, testResults);
    
    // Save the report
    const reportPath = path.join(outputDir, 'verification_report.md');
    fs.writeFileSync(reportPath, report);
    
    return report;
  } catch (error) {
    logger.error('Error generating verification report', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}

/**
 * Get paper content from a session
 * @param sessionId The session ID
 * @returns Extracted paper content
 */
export function getPaperContent(sessionId: string): PaperContent {
  try {
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load paper content
    const paperContentPath = path.join(outputDir, 'paper_content.json');
    if (!fs.existsSync(paperContentPath)) {
      throw new Error('Paper content not found. Run initializePaperImplementation first.');
    }
    
    return JSON.parse(fs.readFileSync(paperContentPath, 'utf8'));
  } catch (error) {
    logger.error('Error getting paper content', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}

/**
 * Get knowledge model from a session
 * @param sessionId The session ID
 * @returns Knowledge model
 */
export function getKnowledgeModel(sessionId: string): PaperKnowledgeGraph {
  try {
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load knowledge model
    const knowledgeModelPath = path.join(outputDir, 'knowledge_model.json');
    if (!fs.existsSync(knowledgeModelPath)) {
      throw new Error('Knowledge model not found. Run initializePaperImplementation first.');
    }
    
    return JSON.parse(fs.readFileSync(knowledgeModelPath, 'utf8'));
  } catch (error) {
    logger.error('Error getting knowledge model', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}

/**
 * Get executable specifications from a session
 * @param sessionId The session ID
 * @returns Array of executable specifications
 */
export function getExecutableSpecifications(sessionId: string): ExecutableSpecification[] {
  try {
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load specs from directory
    const specsDir = path.join(outputDir, 'executable_specs');
    if (!fs.existsSync(specsDir)) {
      throw new Error('Executable specifications not found. Run initializePaperImplementation first.');
    }
    
    const specFiles = fs.readdirSync(specsDir).filter(file => file.endsWith('.md'));
    return specFiles.map(file => {
      const specMarkdown = fs.readFileSync(path.join(specsDir, file), 'utf8');
      return specifications.parseExecutableSpecification(specMarkdown);
    });
  } catch (error) {
    logger.error('Error getting executable specifications', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}

/**
 * Get traceability matrix from a session
 * @param sessionId The session ID
 * @returns Traceability matrix
 */
export function getTraceabilityMatrix(sessionId: string): PaperTraceabilityMatrix {
  try {
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load traceability matrix
    const matrixPath = path.join(outputDir, 'traceability_matrix.json');
    if (!fs.existsSync(matrixPath)) {
      throw new Error('Traceability matrix not found. Run initializePaperImplementation first.');
    }
    
    return JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  } catch (error) {
    logger.error('Error getting traceability matrix', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}

/**
 * Get implementation plan from a session
 * @param sessionId The session ID
 * @returns Implementation plan
 */
export function getImplementationPlan(sessionId: string): PaperImplementationPlan {
  try {
    // Load session
    const sessionData = session.loadSession(sessionId);
    if (!sessionData.projectInfo || sessionData.projectInfo.type !== 'ACADEMIC_PAPER') {
      throw new Error('Session is not for a paper implementation project');
    }
    
    // Determine output directory
    const outputDir = path.join(process.cwd(), 'docs/generated/paper');
    
    // Load implementation plan
    const planPath = path.join(outputDir, 'implementation_plan.md');
    if (!fs.existsSync(planPath)) {
      throw new Error('Implementation plan not found. Run initializePaperImplementation first.');
    }
    
    const planMarkdown = fs.readFileSync(planPath, 'utf8');
    return workflow.parseImplementationPlan(planMarkdown);
  } catch (error) {
    logger.error('Error getting implementation plan', { 
      error: error instanceof Error ? error.message : String(error), 
      sessionId 
    });
    throw error;
  }
}