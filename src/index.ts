#!/usr/bin/env node

/**
 * DocGen - Main CLI Entry Point
 * 
 * This is the TypeScript implementation of the DocGen CLI.
 */
import { program } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';

// Import utilities
import * as config from './utils/config';
import * as llm from './utils/llm';
import * as session from './utils/session';
import * as validation from './utils/validation';
import * as logger from './utils/logger';
import * as projectAnalyzer from './utils/project-analyzer';

// Import types
import {
  ProjectInfo,
  TechStack,
  DocumentationNeeds,
  InterviewAnswers,
  ProjectDefaults,
  ProjectType,
  ExistingProjectOptions,
  SessionData,
  ProjectAnalysisResult
} from './types';

// Set up command line arguments
program
  .version('1.0.0')
  .description('DocGen - AI-optimized documentation template system');

// Interview command
program
  .command('interview')
  .description('Start or resume an interview session')
  .option('-r, --resume <sessionId>', 'Resume an existing interview session')
  .option('-l, --list', 'List available interview sessions')
  .option('-t, --type <projectType>', 'Specify the project type (WEB, MOBILE, API, DESKTOP, OTHER)')
  .option('-n, --name <projectName>', 'Specify the project name')
  .option('-e, --existing-project <path>', 'Path to existing project root directory')
  .option('-a, --analysis-depth <depth>', 'Analysis depth for existing project (basic, standard, deep)')
  .option('-o, --output-dir <path>', 'Custom output directory for generated docs')
  .action(async (options) => {
    if (options.existingProject) {
      await conductExistingProjectInterview(options);
    } else {
      await conductInterview(options);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate generated documentation')
  .option('-f, --file <filePath>', 'Validate a specific file')
  .option('-a, --all', 'Validate all documents in the output directory')
  .action(async (options) => {
    if (options.file) {
      const filePath = path.resolve(options.file);
      const result = validation.validateDocument(filePath);
      displayValidationResult(filePath, result);
    } else {
      const results = validation.validateAllDocuments();
      displayAllValidationResults(results);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

/**
 * Validates schema version compatibility
 * Ensures backward compatibility with documents using different schema versions
 * @param documentSchemaVersion The schema version in the document
 * @param currentSchemaVersion The current schema version (defaults to 1.1.0)
 * @returns Boolean indicating if the schema version is compatible
 */
export function validateSchemaVersionCompatibility(
  documentSchemaVersion: string,
  currentSchemaVersion: string = '1.1.0'
): boolean {
  try {
    // Parse versions into components
    const docParts = documentSchemaVersion.split('.').map(Number);
    const currentParts = currentSchemaVersion.split('.').map(Number);
    
    // Major version must match
    if (docParts[0] !== currentParts[0]) {
      return false;
    }
    
    // Document minor version can be lower but not higher
    if (docParts[1] > currentParts[1]) {
      return false;
    }
    
    // Document patch version can be anything if other conditions are met
    return true;
  } catch (error) {
    logger.error('Error validating schema version compatibility', { error });
    return false;
  }
}

/**
 * Load project defaults from configuration
 * Ensures schema versions comply with the 1.1.0 standard
 * @returns ProjectDefaults object with schema settings
 */
export function loadProjectDefaults(): ProjectDefaults {
  try {
    const configPath = path.join(process.cwd(), 'config/project-defaults.yaml');
    if (fs.existsSync(configPath)) {
      return yaml.load(fs.readFileSync(configPath, 'utf8')) as ProjectDefaults;
    }
  } catch (error) {
    logger.error('Error loading project defaults', { error });
  }
  
  return {
    schema_versions: { prd: '1.1.0', srs: '1.1.0', sad: '1.1.0', sdd: '1.1.0', stp: '1.1.0' },
    document_versions: { prd: '1.0.0', srs: '1.0.0', sad: '1.0.0', sdd: '1.0.0', stp: '1.0.0' },
    document_statuses: ['DRAFT', 'REVIEW', 'APPROVED'],
    project_types: {
      WEB: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      MOBILE: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      API: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      DESKTOP: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
      OTHER: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] }
    }
  };
}

/**
 * Main interview function
 */
async function conductInterview(options: {
  resume?: string;
  list?: boolean;
  type?: string;
  name?: string;
}): Promise<void> {
  console.log('Starting DocGen Interactive Interview System');
  console.log('------------------------------------------');
  
  // Handle session listing
  if (options.list) {
    const sessions = session.listSessions();
    if (sessions.length === 0) {
      console.log('No saved sessions found.\n');
    } else {
      console.log('Available sessions:');
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.projectName} (${session.sessionId})`);
        console.log(`   Last updated: ${new Date(session.lastUpdated).toLocaleString()}`);
      });
      console.log('\nTo resume a session, run:');
      console.log(`npm run interview:ts -- --resume <sessionId>`);
    }
    return;
  }
  
  // Check for LLM availability
  const llmAvailable = llm.isLLMApiAvailable();
  if (!llmAvailable) {
    console.log('⚠️  Warning: ANTHROPIC_API_KEY environment variable not found.');
    console.log('The interview system will use basic templates without LLM enhancement.');
    console.log('For full functionality, set the ANTHROPIC_API_KEY environment variable.\n');
  }
  
  let sessionId: string | null = null;
  let projectInfo: ProjectInfo | null = null;
  let techStack: TechStack | null = null;
  let documentationNeeds: DocumentationNeeds | null = null;
  let interviewAnswers: InterviewAnswers = {};
  
  // Handle session resumption
  if (options.resume) {
    try {
      const sessionData = session.loadSession(options.resume);
      projectInfo = sessionData.projectInfo || null;
      techStack = sessionData.techStack || null;
      documentationNeeds = sessionData.documentationNeeds || null;
      interviewAnswers = sessionData.interviewAnswers || {};
      sessionId = options.resume;
      
      console.log(`✅ Resumed session for project: ${projectInfo?.name || 'Unnamed Project'}`);
      console.log(`Last updated: ${new Date(sessionData._lastUpdated || '').toLocaleString()}\n`);
    } catch (error) {
      console.error(`❌ Failed to resume session: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
  }
  
  // Start or continue interview
  if (!projectInfo) {
    projectInfo = await gatherBasicProjectInfo(options);
    
    // Generate a session ID if not resuming
    if (!sessionId) {
      sessionId = session.generateSessionId(projectInfo.name);
    }
    
    // Save session after gathering basic info
    session.saveSession(sessionId!, {
      projectInfo,
      interviewAnswers
    });
    
    console.log(`✅ Session saved with ID: ${sessionId}`);
    console.log(`You can resume this session later with:\nnpm run interview:ts -- --resume ${sessionId}\n`);
  }
  
  if (!techStack) {
    techStack = await recommendTechnologyStack(projectInfo);
    
    // Save session after tech stack
    session.saveSession(sessionId!, {
      projectInfo,
      techStack,
      interviewAnswers
    });
  }
  
  if (!documentationNeeds) {
    documentationNeeds = await assessDocumentationNeeds(projectInfo, techStack);
    
    // Save session after documentation needs
    session.saveSession(sessionId!, {
      projectInfo,
      techStack,
      documentationNeeds,
      interviewAnswers
    });
  }
  
  // Ask follow-up questions if LLM is available
  if (llmAvailable) {
    const followUpQuestions = await llm.generateFollowUpQuestions(projectInfo, interviewAnswers);
    await askFollowUpQuestions(followUpQuestions, interviewAnswers);
    
    // Save session after follow-up questions
    session.saveSession(sessionId!, {
      projectInfo,
      techStack,
      documentationNeeds,
      interviewAnswers
    });
  }
  
  console.log('\nGenerating documentation templates based on your responses...');
  await generateDocumentation(projectInfo, techStack, documentationNeeds, interviewAnswers);
  
  console.log('\n✅ Interview complete!');
  console.log('Documentation templates have been generated in /docs/generated/');
  console.log('Next steps:');
  console.log('1. Review the generated templates');
  console.log('2. Run "npm run validate" to check for completeness');
  console.log('3. Customize the templates as needed for your project');
}

/**
 * Gather basic project information through user prompts
 */
async function gatherBasicProjectInfo(options: {
  type?: string;
  name?: string;
}): Promise<ProjectInfo> {
  const projectDefaults = loadProjectDefaults();
  
  // Use command line arguments if provided
  if (options.name && options.type) {
    return {
      name: options.name,
      description: 'Project created with command line arguments',
      type: options.type.toUpperCase() as ProjectType,
      id: `PROJ-${Math.floor(1000 + Math.random() * 9000)}`,
      created: new Date().toISOString()
    };
  }
  
  // Otherwise use inquirer for a better interactive experience
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Project Name:',
      validate: (input: string) => input.trim() ? true : 'Project name is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief Project Description:',
      validate: (input: string) => input.trim() ? true : 'Project description is required'
    },
    {
      type: 'list',
      name: 'type',
      message: 'Project Type:',
      choices: Object.keys(projectDefaults.project_types),
      default: 'WEB'
    }
  ];
  
  try {
    const answers = await inquirer.prompt(questions);
    
    return {
      name: answers.name,
      description: answers.description,
      type: answers.type as ProjectType,
      id: `PROJ-${Math.floor(1000 + Math.random() * 9000)}`,
      created: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error gathering project information', { error });
    throw new Error(`Error gathering project information: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Ask follow-up questions based on LLM recommendations
 */
async function askFollowUpQuestions(
  questions: string[],
  interviewAnswers: InterviewAnswers
): Promise<void> {
  if (!questions || questions.length === 0) {
    return;
  }
  
  console.log('\n🧠 Based on your project, we have some follow-up questions:');
  
  for (const question of questions) {
    try {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'response',
          message: question,
          validate: (input: string) => input.trim() ? true : 'Please provide an answer'
        }
      ]);
      
      interviewAnswers[question] = answer.response;
    } catch (error) {
      logger.error('Error asking follow-up question', { error, question });
    }
  }
}

/**
 * Recommend technology stack based on project info
 */
async function recommendTechnologyStack(projectInfo: ProjectInfo): Promise<TechStack> {
  console.log('\nAnalyzing project requirements and recommending technology stack...');
  
  let recommendations;
  
  // Use LLM for smart recommendations if available
  if (llm.isLLMApiAvailable()) {
    try {
      // Get LLM recommendations
      recommendations = await llm.recommendTechnologies(projectInfo);
      
      console.log('🧠 AI-powered technology recommendations:');
      
      // Display the recommendations by category
      if (recommendations.frontend && recommendations.frontend.length > 0) {
        console.log(`\nFrontend: ${recommendations.frontend.join(', ')}`);
      }
      
      if (recommendations.backend && recommendations.backend.length > 0) {
        console.log(`Backend: ${recommendations.backend.join(', ')}`);
      }
      
      if (recommendations.database && recommendations.database.length > 0) {
        console.log(`Database: ${recommendations.database.join(', ')}`);
      }
      
      if (recommendations.devops && recommendations.devops.length > 0) {
        console.log(`DevOps: ${recommendations.devops.join(', ')}`);
      }
    } catch (error) {
      logger.error('Error getting AI recommendations', { error });
      // Fall back to basic recommendations
      recommendations = null;
    }
  }
  
  // Fall back to basic recommendations if LLM is not available or failed
  if (!recommendations) {
    // Default technology mappings
    const techStackMap: Record<string, string[]> = {
      'WEB': ['Node.js', 'React', 'MongoDB'],
      'MOBILE': ['React Native', 'Firebase'],
      'API': ['Node.js', 'Express', 'PostgreSQL'],
      'DESKTOP': ['Electron', 'React'],
      'OTHER': ['Python', 'FastAPI']
    };
    
    // Ask if iOS-specific project for mobile projects
    if (projectInfo.type === 'MOBILE') {
      const mobileTypeQuestion = await inquirer.prompt([
        {
          type: 'list',
          name: 'mobileType',
          message: 'What type of mobile app are you developing?',
          choices: ['Cross-platform', 'iOS (Swift)', 'Android (Kotlin/Java)'],
          default: 'Cross-platform'
        }
      ]);
      
      // Update recommendations based on mobile type
      if (mobileTypeQuestion.mobileType === 'iOS (Swift)') {
        techStackMap['MOBILE'] = ['Swift', 'Core Data', 'GitHub Actions'];
      } else if (mobileTypeQuestion.mobileType === 'Android (Kotlin/Java)') {
        techStackMap['MOBILE'] = ['Kotlin', 'Room Database', 'GitHub Actions'];
      }
    }
    
    const recommendedStack = techStackMap[projectInfo.type] || techStackMap.OTHER;
    
    console.log(`Based on your project type, we recommend: ${recommendedStack.join(', ')}`);
    
    // Format for compatibility with the rest of the function
    recommendations = {
      frontend: recommendedStack.slice(0, 1),
      backend: recommendedStack.slice(1, 2),
      database: recommendedStack.slice(2),
      devops: ['GitHub Actions']
    };
  }
  
  // Let the user select from recommendations
  const selectedTech = await selectTechnologies(recommendations);
  
  return {
    recommended: Object.values(recommendations).flat(),
    selected: selectedTech
  };
}

/**
 * Let the user select technologies from recommendations
 */
async function selectTechnologies(recommendations: any): Promise<string[]> {
  const allTechnologies = [
    ...(recommendations.frontend || []),
    ...(recommendations.backend || []),
    ...(recommendations.database || []),
    ...(recommendations.mobile || []),
    ...(recommendations.devops || [])
  ];
  
  // If there are no recommendations, provide default options
  if (allTechnologies.length === 0) {
    allTechnologies.push('Node.js', 'React', 'MongoDB', 'GitHub Actions');
  }
  
  try {
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedTech',
        message: 'Select technologies for your project:',
        choices: allTechnologies.map(tech => ({ name: tech, checked: true })),
        validate: (input: string[]) => input.length > 0 ? true : 'Please select at least one technology'
      }
    ]);
    
    return answers.selectedTech;
  } catch (error) {
    logger.error('Error selecting technologies', { error });
    return allTechnologies; // Return all as selected if there's an error
  }
}

/**
 * Assess documentation needs based on project info and tech stack
 */
async function assessDocumentationNeeds(
  projectInfo: ProjectInfo,
  techStack: TechStack
): Promise<DocumentationNeeds> {
  console.log('\nAssessing documentation needs for your project...');
  
  const projectDefaults = loadProjectDefaults();
  
  // Get recommended docs from project defaults
  const projectType = projectInfo.type;
  const defaultDocs = projectDefaults.project_types[projectType]?.recommended_docs || 
                    projectDefaults.project_types.OTHER.recommended_docs;
  
  // Basic documentation needs
  const documentationNeeds: DocumentationNeeds = {
    prd: defaultDocs.includes('prd'),
    srs: defaultDocs.includes('srs'),
    sad: defaultDocs.includes('sad'),
    sdd: defaultDocs.includes('sdd'),
    stp: defaultDocs.includes('stp'),
    additional: []
  };
  
  // Add tech-specific documentation needs
  if (techStack.selected.includes('React') || techStack.selected.includes('React Native')) {
    documentationNeeds.additional.push('COMPONENT_LIBRARY');
  }
  
  if (techStack.selected.includes('Express') || techStack.selected.includes('FastAPI') || 
      techStack.selected.includes('Flask') || projectType === 'API') {
    documentationNeeds.additional.push('API_DOCUMENTATION');
  }
  
  if (techStack.selected.includes('Firebase') || techStack.selected.includes('MongoDB') || 
      techStack.selected.includes('PostgreSQL') || techStack.selected.includes('MySQL')) {
    documentationNeeds.additional.push('DATA_MODEL');
  }
  
  if (techStack.selected.includes('Docker') || techStack.selected.includes('Kubernetes')) {
    documentationNeeds.additional.push('DEPLOYMENT_GUIDE');
  }
  
  // Add Swift-specific documentation needs
  if (techStack.selected.includes('Swift')) {
    documentationNeeds.additional.push('UI_GUIDELINES');
    documentationNeeds.additional.push('LIFECYCLE_MANAGEMENT');
    documentationNeeds.additional.push('APP_STORE_SUBMISSION');
  }
  
  // Allow user to select documentation types
  const selectedDocs = await selectDocumentationTypes(documentationNeeds);
  
  console.log('\nSelected documentation artifacts:');
  if (selectedDocs.prd) console.log('- Product Requirements Document (PRD)');
  if (selectedDocs.srs) console.log('- Software Requirements Specification (SRS)');
  if (selectedDocs.sad) console.log('- System Architecture Document (SAD)');
  if (selectedDocs.sdd) console.log('- Software Design Document (SDD)');
  if (selectedDocs.stp) console.log('- Software Test Plan (STP)');
  
  if (selectedDocs.additional && selectedDocs.additional.length > 0) {
    console.log('Additional selected documentation:');
    selectedDocs.additional.forEach(doc => {
      console.log(`- ${doc.replace(/_/g, ' ').toLowerCase()}`);
    });
  }
  
  return selectedDocs;
}

/**
 * Let the user select documentation types
 */
async function selectDocumentationTypes(
  recommendations: DocumentationNeeds
): Promise<DocumentationNeeds> {
  // Create choices from recommendations
  const coreDocChoices = [
    { name: 'Product Requirements Document (PRD)', value: 'prd', checked: recommendations.prd },
    { name: 'Software Requirements Specification (SRS)', value: 'srs', checked: recommendations.srs },
    { name: 'System Architecture Document (SAD)', value: 'sad', checked: recommendations.sad },
    { name: 'Software Design Document (SDD)', value: 'sdd', checked: recommendations.sdd },
    { name: 'Software Test Plan (STP)', value: 'stp', checked: recommendations.stp }
  ];
  
  // Additional doc choices
  const additionalDocChoices = recommendations.additional.map(doc => ({
    name: doc.replace(/_/g, ' ').toLowerCase(),
    value: doc,
    checked: true
  }));
  
  try {
    // First select core documents
    const coreDocsAnswer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'coreDocs',
        message: 'Select core documentation types for your project:',
        choices: coreDocChoices,
        validate: (input: string[]) => input.length > 0 ? true : 'Please select at least one document type'
      }
    ]);
    
    // Then select additional documents if there are any
    let additionalDocsAnswer = { additionalDocs: [] };
    if (additionalDocChoices.length > 0) {
      additionalDocsAnswer = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'additionalDocs',
          message: 'Select additional documentation types based on your tech stack:',
          choices: additionalDocChoices
        }
      ]);
    }
    
    // Convert from array of values to object structure
    return {
      prd: coreDocsAnswer.coreDocs.includes('prd'),
      srs: coreDocsAnswer.coreDocs.includes('srs'),
      sad: coreDocsAnswer.coreDocs.includes('sad'),
      sdd: coreDocsAnswer.coreDocs.includes('sdd'),
      stp: coreDocsAnswer.coreDocs.includes('stp'),
      additional: additionalDocsAnswer.additionalDocs
    };
  } catch (error) {
    logger.error('Error selecting documentation types', { error });
    return recommendations; // Return the recommendations if there's an error
  }
}

/**
 * Generate documentation based on collected information
 */
async function generateDocumentation(
  projectInfo: ProjectInfo,
  techStack: TechStack,
  documentationNeeds: DocumentationNeeds,
  interviewAnswers: InterviewAnswers
): Promise<void> {
  // Ensure output directory exists
  const outputDir = config.getOutputDir();
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate each document type
  const generationPromises = [];
  
  if (documentationNeeds.prd) {
    generationPromises.push(generateDocument('prd', projectInfo, techStack, interviewAnswers));
  }
  
  if (documentationNeeds.srs) {
    generationPromises.push(generateDocument('srs', projectInfo, techStack, interviewAnswers));
  }
  
  if (documentationNeeds.sad) {
    generationPromises.push(generateDocument('sad', projectInfo, techStack, interviewAnswers));
  }
  
  if (documentationNeeds.sdd) {
    generationPromises.push(generateDocument('sdd', projectInfo, techStack, interviewAnswers));
  }
  
  if (documentationNeeds.stp) {
    generationPromises.push(generateDocument('stp', projectInfo, techStack, interviewAnswers));
  }
  
  // Generate Swift-specific documentation if Swift is selected
  if (techStack.selected.includes('Swift')) {
    generationPromises.push(generateDocument('swift-sdd', projectInfo, techStack, interviewAnswers));
    console.log('📱 Detected Swift project, generating Swift-specific documentation...');
  }
  
  // Generate all documents in parallel
  await Promise.all(generationPromises);
}

/**
 * Conduct interview for an existing project
 */
async function conductExistingProjectInterview(options: {
  existingProject: string;
  analysisDepth?: string;
  outputDir?: string;
  resume?: string;
}): Promise<void> {
  console.log('Starting DocGen Interactive Interview for Existing Project');
  console.log('----------------------------------------------------');
  
  let sessionId: string | null = null;
  let existingProject: {
    path: string;
    analysis: ProjectAnalysisResult;
    options: ExistingProjectOptions;
  } | null = null;
  let projectInfo: ProjectInfo | null = null;
  let techStack: TechStack | null = null;
  let documentationNeeds: DocumentationNeeds | null = null;
  let interviewAnswers: InterviewAnswers = {};
  
  // Handle session resumption
  if (options.resume) {
    try {
      const sessionData = session.loadSession(options.resume);
      
      if (!sessionData.existingProject) {
        console.error('❌ The resumed session is not for an existing project.');
        return;
      }
      
      existingProject = sessionData.existingProject;
      projectInfo = sessionData.projectInfo || null;
      techStack = sessionData.techStack || null;
      documentationNeeds = sessionData.documentationNeeds || null;
      interviewAnswers = sessionData.interviewAnswers || {};
      sessionId = options.resume;
      
      console.log(`✅ Resumed session for existing project: ${projectInfo?.name || existingProject.path}`);
      console.log(`Last updated: ${new Date(sessionData._lastUpdated || '').toLocaleString()}\n`);
    } catch (error) {
      console.error(`❌ Failed to resume session: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
  }
  
  // If we don't have an analysis yet, analyze the project
  if (!existingProject) {
    const projectPath = options.existingProject;
    console.log(`Analyzing existing project at: ${projectPath}`);
    
    try {
      // Get analysis depth from options or default to 'standard'
      const analysisDepth = (options.analysisDepth || 'standard') as 'basic' | 'standard' | 'deep';
      
      // Analyze the project
      const analysis = await projectAnalyzer.analyzeProject(projectPath, {
        analysisDepth,
        includeDotFiles: false,
        maxFileSize: 10_485_760, // 10MB
        includeNodeModules: false
      });
      
      console.log('\n✅ Project analysis complete');
      console.log(`Detected project type: ${analysis.detectedType}`);
      console.log('Languages detected:');
      analysis.languages.slice(0, 5).forEach(lang => {
        console.log(`- ${lang.name}: ${lang.percentage}% (${lang.files} files)`);
      });
      
      if (analysis.frameworks.length > 0) {
        console.log('Frameworks detected:');
        analysis.frameworks.forEach(framework => {
          console.log(`- ${framework}`);
        });
      }
      
      if (analysis.existingDocumentation.length > 0) {
        console.log('Existing documentation detected:');
        analysis.existingDocumentation.forEach(doc => {
          console.log(`- ${doc.path} (${doc.type})`);
        });
      }
      
      // Create existing project object
      existingProject = {
        path: projectPath,
        analysis,
        options: {
          path: projectPath,
          analysisDepth,
          outputDirectory: options.outputDir || config.getExistingProjectDefaults().outputDirectory,
          preserveExisting: true,
          generateIntegrationGuide: true
        }
      };
      
      // Generate a session ID
      sessionId = session.generateSessionId(`existing-${path.basename(projectPath)}`);
    } catch (error) {
      console.error(`❌ Error analyzing project: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
  }
  
  // Gather or validate project info
  if (!projectInfo) {
    // Pre-fill project info based on analysis
    projectInfo = await gatherExistingProjectInfo(existingProject);
    
    // Save session after gathering basic info
    session.saveSession(sessionId!, {
      projectInfo,
      existingProject,
      interviewAnswers
    });
    
    console.log(`✅ Session saved with ID: ${sessionId}`);
    console.log(`You can resume this session later with:\nnpm run interview:ts -- --resume ${sessionId}\n`);
  }
  
  // Recommend technology stack
  if (!techStack) {
    techStack = await recommendExistingTechnologyStack(projectInfo, existingProject);
    
    // Save session after tech stack
    session.saveSession(sessionId!, {
      projectInfo,
      existingProject,
      techStack,
      interviewAnswers
    });
  }
  
  // Assess documentation needs
  if (!documentationNeeds) {
    documentationNeeds = await assessExistingDocumentationNeeds(projectInfo, techStack, existingProject);
    
    // Save session after documentation needs
    session.saveSession(sessionId!, {
      projectInfo,
      existingProject,
      techStack,
      documentationNeeds,
      interviewAnswers
    });
  }
  
  // Ask follow-up questions if LLM is available
  if (llm.isLLMApiAvailable()) {
    // Include data from the project analysis in the LLM context
    const analysisContext = {
      projectType: existingProject.analysis.detectedType,
      languages: existingProject.analysis.languages.map(l => l.name).join(', '),
      frameworks: existingProject.analysis.frameworks.join(', '),
      existingDocs: existingProject.analysis.existingDocumentation.map(d => d.path).join(', ')
    };
    
    const followUpQuestions = await llm.generateFollowUpQuestionsForExistingProject(
      projectInfo, 
      analysisContext,
      interviewAnswers
    );
    
    await askFollowUpQuestions(followUpQuestions, interviewAnswers);
    
    // Save session after follow-up questions
    session.saveSession(sessionId!, {
      projectInfo,
      existingProject,
      techStack,
      documentationNeeds,
      interviewAnswers
    });
  }
  
  // Ask about output directory
  const outputDirQuestion = await inquirer.prompt([
    {
      type: 'input',
      name: 'outputDirectory',
      message: 'Where should the generated documentation be saved?',
      default: existingProject.options.outputDirectory
    }
  ]);
  
  // Update output directory
  existingProject.options.outputDirectory = outputDirQuestion.outputDirectory;
  
  // Ask about integration guide
  const integrationGuideQuestion = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'generateIntegrationGuide',
      message: 'Generate an integration guide to help combine new and existing documentation?',
      default: true
    }
  ]);
  
  // Update integration guide option
  existingProject.options.generateIntegrationGuide = integrationGuideQuestion.generateIntegrationGuide;
  
  // Save session before generating documentation
  session.saveSession(sessionId!, {
    projectInfo,
    existingProject,
    techStack,
    documentationNeeds,
    interviewAnswers
  });
  
  console.log('\nGenerating documentation for existing project...');
  await generateDocumentationForExistingProject(
    projectInfo,
    techStack,
    documentationNeeds,
    existingProject,
    interviewAnswers
  );
  
  console.log('\n✅ Interview complete!');
  console.log(`Documentation templates have been generated in ${existingProject.options.outputDirectory}`);
  console.log('Next steps:');
  console.log('1. Review the generated templates');
  console.log('2. Run "npm run validate" to check for completeness');
  console.log('3. Integrate the generated documentation with your existing project documentation');
}

/**
 * Gather project information for an existing project
 */
async function gatherExistingProjectInfo(
  existingProject: {
    path: string;
    analysis: ProjectAnalysisResult;
    options: ExistingProjectOptions;
  }
): Promise<ProjectInfo> {
  console.log('\nGathering project information...');
  
  // Extract project name from directory name as default
  const dirName = path.basename(existingProject.path);
  const projectName = dirName.charAt(0).toUpperCase() + dirName.slice(1).replace(/[-_]/g, ' ');
  
  // Detect project type from analysis
  const detectedType = existingProject.analysis.detectedType;
  
  // Prepare questions with smart defaults
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Project Name:',
      default: projectName,
      validate: (input: string) => input.trim() ? true : 'Project name is required'
    },
    {
      type: 'input',
      name: 'description',
      message: 'Brief Project Description:',
      validate: (input: string) => input.trim() ? true : 'Project description is required'
    },
    {
      type: 'list',
      name: 'type',
      message: 'Project Type:',
      choices: ['WEB', 'MOBILE', 'API', 'DESKTOP', 'OTHER'],
      default: detectedType
    }
  ];
  
  try {
    const answers = await inquirer.prompt(questions);
    
    return {
      name: answers.name,
      description: answers.description,
      type: answers.type as ProjectType,
      id: `PROJ-${Math.floor(1000 + Math.random() * 9000)}`,
      created: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error gathering project information for existing project', { error });
    throw new Error(`Error gathering project information: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Recommend technology stack for an existing project based on analysis
 */
async function recommendExistingTechnologyStack(
  projectInfo: ProjectInfo,
  existingProject: {
    path: string;
    analysis: ProjectAnalysisResult;
    options: ExistingProjectOptions;
  }
): Promise<TechStack> {
  console.log('\nAnalyzing existing technology stack...');
  
  // Extract detected technologies
  const detectedFrameworks = existingProject.analysis.frameworks;
  const detectedLanguages = existingProject.analysis.languages.map(lang => lang.name);
  const detectedBuildTools = existingProject.analysis.buildTools;
  
  // Combine all detected technologies
  const detectedTech = [
    ...detectedFrameworks,
    ...detectedLanguages.slice(0, 3), // Top 3 languages
    ...detectedBuildTools
  ];
  
  console.log('📝 Detected technologies:');
  detectedTech.forEach(tech => {
    console.log(`- ${tech}`);
  });
  
  // Get additional recommendations from LLM if available
  let recommendations;
  if (llm.isLLMApiAvailable()) {
    try {
      // Get LLM recommendations with context from detected technologies
      recommendations = await llm.recommendTechnologiesWithContext(
        projectInfo,
        detectedTech
      );
      
      console.log('\n🧠 AI-powered additional recommendations:');
      
      // Display the recommendations by category
      if (recommendations.frontend && recommendations.frontend.length > 0) {
        console.log(`Frontend: ${recommendations.frontend.join(', ')}`);
      }
      
      if (recommendations.backend && recommendations.backend.length > 0) {
        console.log(`Backend: ${recommendations.backend.join(', ')}`);
      }
      
      if (recommendations.database && recommendations.database.length > 0) {
        console.log(`Database: ${recommendations.database.join(', ')}`);
      }
      
      if (recommendations.devops && recommendations.devops.length > 0) {
        console.log(`DevOps: ${recommendations.devops.join(', ')}`);
      }
    } catch (error) {
      logger.error('Error getting AI recommendations for existing project', { error });
      // Fall back to detected technologies
      recommendations = null;
    }
  }
  
  // Combine detected and recommended technologies
  const allTechnologies = new Set<string>();
  
  // Add detected technologies
  detectedTech.forEach(tech => allTechnologies.add(tech));
  
  // Add AI recommendations if available
  if (recommendations) {
    Object.values(recommendations).flat().forEach(tech => {
      if (tech) allTechnologies.add(tech as string);
    });
  }
  
  // Let the user select from all technologies
  const techOptions = Array.from(allTechnologies);
  
  try {
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedTech',
        message: 'Select technologies for your project:',
        choices: techOptions.map(tech => ({ 
          name: tech, 
          checked: detectedTech.includes(tech) // Pre-check detected technologies
        })),
        validate: (input: string[]) => input.length > 0 ? true : 'Please select at least one technology'
      }
    ]);
    
    return {
      recommended: Array.from(allTechnologies),
      selected: answers.selectedTech
    };
  } catch (error) {
    logger.error('Error selecting technologies for existing project', { error });
    // Return detected technologies if there's an error
    return {
      recommended: Array.from(allTechnologies),
      selected: detectedTech
    };
  }
}

/**
 * Assess documentation needs for an existing project
 */
async function assessExistingDocumentationNeeds(
  projectInfo: ProjectInfo,
  techStack: TechStack,
  existingProject: {
    path: string;
    analysis: ProjectAnalysisResult;
    options: ExistingProjectOptions;
  }
): Promise<DocumentationNeeds> {
  console.log('\nAssessing documentation needs for your existing project...');
  
  const projectDefaults = loadProjectDefaults();
  
  // Check existing documentation
  const existingDocs = existingProject.analysis.existingDocumentation;
  console.log('\nFound existing documentation:');
  
  if (existingDocs.length === 0) {
    console.log('No documentation found in the project directory.');
  } else {
    existingDocs.forEach(doc => {
      console.log(`- ${doc.path} (${doc.type})`);
    });
  }
  
  // Check which documentation types might already exist
  const hasReadme = existingDocs.some(doc => doc.type === 'README');
  const hasContributing = existingDocs.some(doc => doc.type === 'CONTRIBUTING');
  const hasApiDocs = existingDocs.some(doc => doc.type === 'API');
  
  // Get recommended docs from project defaults
  const projectType = projectInfo.type;
  const defaultDocs = projectDefaults.project_types[projectType]?.recommended_docs || 
                    projectDefaults.project_types.OTHER.recommended_docs;
  
  // Basic documentation needs with defaults based on what's missing
  const documentationNeeds: DocumentationNeeds = {
    prd: defaultDocs.includes('prd'),
    srs: defaultDocs.includes('srs'),
    sad: defaultDocs.includes('sad'),
    sdd: defaultDocs.includes('sdd'),
    stp: defaultDocs.includes('stp'),
    additional: []
  };
  
  // Add tech-specific documentation needs
  if (techStack.selected.includes('React') || techStack.selected.includes('React Native')) {
    documentationNeeds.additional.push('COMPONENT_LIBRARY');
  }
  
  if (techStack.selected.includes('Express') || techStack.selected.includes('FastAPI') || 
      techStack.selected.includes('Flask') || projectType === 'API') {
    // Only suggest API documentation if it doesn't exist
    if (!hasApiDocs) {
      documentationNeeds.additional.push('API_DOCUMENTATION');
    }
  }
  
  if (techStack.selected.includes('Firebase') || techStack.selected.includes('MongoDB') || 
      techStack.selected.includes('PostgreSQL') || techStack.selected.includes('MySQL')) {
    documentationNeeds.additional.push('DATA_MODEL');
  }
  
  // Allow user to select documentation types
  const selectedDocs = await selectDocumentationTypesForExistingProject(
    documentationNeeds,
    existingDocs
  );
  
  console.log('\nSelected documentation artifacts:');
  if (selectedDocs.prd) console.log('- Product Requirements Document (PRD)');
  if (selectedDocs.srs) console.log('- Software Requirements Specification (SRS)');
  if (selectedDocs.sad) console.log('- System Architecture Document (SAD)');
  if (selectedDocs.sdd) console.log('- Software Design Document (SDD)');
  if (selectedDocs.stp) console.log('- Software Test Plan (STP)');
  
  if (selectedDocs.additional && selectedDocs.additional.length > 0) {
    console.log('Additional selected documentation:');
    selectedDocs.additional.forEach(doc => {
      console.log(`- ${doc.replace(/_/g, ' ').toLowerCase()}`);
    });
  }
  
  return selectedDocs;
}

/**
 * Let the user select documentation types for an existing project
 */
async function selectDocumentationTypesForExistingProject(
  recommendations: DocumentationNeeds,
  existingDocs: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }>
): Promise<DocumentationNeeds> {
  // Create choices from recommendations with existing doc info
  const existingDocTypes = existingDocs.map(doc => doc.type.toUpperCase());
  
  const coreDocChoices = [
    { 
      name: `Product Requirements Document (PRD)${existingDocTypes.includes('PRD') ? ' - EXISTS' : ''}`, 
      value: 'prd', 
      checked: recommendations.prd && !existingDocTypes.includes('PRD')
    },
    { 
      name: `Software Requirements Specification (SRS)${existingDocTypes.includes('SRS') ? ' - EXISTS' : ''}`, 
      value: 'srs', 
      checked: recommendations.srs && !existingDocTypes.includes('SRS')
    },
    { 
      name: `System Architecture Document (SAD)${existingDocTypes.includes('SAD') ? ' - EXISTS' : ''}`, 
      value: 'sad', 
      checked: recommendations.sad && !existingDocTypes.includes('SAD')
    },
    { 
      name: `Software Design Document (SDD)${existingDocTypes.includes('SDD') ? ' - EXISTS' : ''}`, 
      value: 'sdd', 
      checked: recommendations.sdd && !existingDocTypes.includes('SDD')
    },
    { 
      name: `Software Test Plan (STP)${existingDocTypes.includes('STP') ? ' - EXISTS' : ''}`, 
      value: 'stp', 
      checked: recommendations.stp && !existingDocTypes.includes('STP')
    }
  ];
  
  // Additional doc choices
  const additionalDocChoices = recommendations.additional.map(doc => {
    const exists = existingDocTypes.includes(doc);
    return {
      name: `${doc.replace(/_/g, ' ').toLowerCase()}${exists ? ' - EXISTS' : ''}`,
      value: doc,
      checked: !exists
    };
  });
  
  try {
    // First select core documents
    const coreDocsAnswer = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'coreDocs',
        message: 'Select core documentation types to generate:',
        choices: coreDocChoices,
        validate: (input: string[]) => true // Allow empty selection for existing projects
      }
    ]);
    
    // Then select additional documents if there are any
    let additionalDocsAnswer = { additionalDocs: [] };
    if (additionalDocChoices.length > 0) {
      additionalDocsAnswer = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'additionalDocs',
          message: 'Select additional documentation types to generate:',
          choices: additionalDocChoices
        }
      ]);
    }
    
    // Convert from array of values to object structure
    return {
      prd: coreDocsAnswer.coreDocs.includes('prd'),
      srs: coreDocsAnswer.coreDocs.includes('srs'),
      sad: coreDocsAnswer.coreDocs.includes('sad'),
      sdd: coreDocsAnswer.coreDocs.includes('sdd'),
      stp: coreDocsAnswer.coreDocs.includes('stp'),
      additional: additionalDocsAnswer.additionalDocs
    };
  } catch (error) {
    logger.error('Error selecting documentation types for existing project', { error });
    return recommendations; // Return the recommendations if there's an error
  }
}

/**
 * Generate documentation for an existing project
 */
async function generateDocumentationForExistingProject(
  projectInfo: ProjectInfo,
  techStack: TechStack,
  documentationNeeds: DocumentationNeeds,
  existingProject: {
    path: string;
    analysis: ProjectAnalysisResult;
    options: ExistingProjectOptions;
  },
  interviewAnswers: InterviewAnswers
): Promise<void> {
  // Create output directory if it doesn't exist
  const outputDir = config.getExistingProjectOutputDir(
    existingProject.path,
    existingProject.options.outputDirectory
  );
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Documentation will be generated in: ${outputDir}`);
  
  // Generate each document type
  const generationPromises = [];
  
  // Generate core documents
  if (documentationNeeds.prd) {
    generationPromises.push(
      generateDocumentForExistingProject('prd', projectInfo, techStack, interviewAnswers, outputDir)
    );
  }
  
  if (documentationNeeds.srs) {
    generationPromises.push(
      generateDocumentForExistingProject('srs', projectInfo, techStack, interviewAnswers, outputDir)
    );
  }
  
  if (documentationNeeds.sad) {
    generationPromises.push(
      generateDocumentForExistingProject('sad', projectInfo, techStack, interviewAnswers, outputDir)
    );
  }
  
  if (documentationNeeds.sdd) {
    generationPromises.push(
      generateDocumentForExistingProject('sdd', projectInfo, techStack, interviewAnswers, outputDir)
    );
  }
  
  if (documentationNeeds.stp) {
    generationPromises.push(
      generateDocumentForExistingProject('stp', projectInfo, techStack, interviewAnswers, outputDir)
    );
  }
  
  // Generate Swift-specific documentation if Swift is selected
  if (techStack.selected.includes('Swift')) {
    generationPromises.push(
      generateDocumentForExistingProject('swift-sdd', projectInfo, techStack, interviewAnswers, outputDir)
    );
    console.log('📱 Detected Swift project, generating Swift-specific documentation...');
  }
  
  // Generate integration guide if requested
  if (existingProject.options.generateIntegrationGuide) {
    generationPromises.push(generateIntegrationGuide(
      projectInfo,
      existingProject,
      documentationNeeds,
      outputDir
    ));
  }
  
  // Generate all documents in parallel
  await Promise.all(generationPromises);
}

/**
 * Generate integration guide for combining new and existing documentation
 */
async function generateIntegrationGuide(
  projectInfo: ProjectInfo,
  existingProject: {
    path: string;
    analysis: ProjectAnalysisResult;
    options: ExistingProjectOptions;
  },
  documentationNeeds: DocumentationNeeds,
  outputDir: string
): Promise<void> {
  console.log('Generating integration guide...');
  
  try {
    // Check if we have a Handlebars template
    const hbsTemplatePath = path.join(process.cwd(), `docs/_templates/integration-guide.hbs`);
    const outputPath = path.join(outputDir, `integration-guide.md`);
    
    if (!fs.existsSync(hbsTemplatePath)) {
      console.log('❌ Integration guide template not found. Skipping guide generation.');
      return;
    }
    
    // Import handlebars dynamically
    const HandlebarsModule = await import('handlebars');
    const Handlebars = HandlebarsModule.default;
    
    // Read the template
    const templateSource = fs.readFileSync(hbsTemplatePath, 'utf8');
    const template = Handlebars.compile(templateSource);
    
    // Build a list of generated documents
    const generatedDocs = [];
    
    if (documentationNeeds.prd) {
      generatedDocs.push({
        title: 'Product Requirements Document',
        path: `${outputDir}/prd.md`,
        purpose: 'Defines the product features and requirements',
        format: 'Markdown with YAML frontmatter',
        sections: [
          { heading: 'Introduction', description: 'Project overview and purpose' },
          { heading: 'Features', description: 'Detailed product features' },
          { heading: 'User Stories', description: 'Usage scenarios and user journeys' },
          { heading: 'Requirements', description: 'Functional and non-functional requirements' }
        ]
      });
    }
    
    if (documentationNeeds.srs) {
      generatedDocs.push({
        title: 'Software Requirements Specification',
        path: `${outputDir}/srs.md`,
        purpose: 'Detailed technical requirements for implementation',
        format: 'Markdown with YAML frontmatter',
        sections: [
          { heading: 'Introduction', description: 'Document purpose and scope' },
          { heading: 'Functional Requirements', description: 'Specific system behaviors' },
          { heading: 'Non-functional Requirements', description: 'Performance, security, and other quality attributes' },
          { heading: 'System Interfaces', description: 'Interfaces with external systems' }
        ]
      });
    }
    
    if (documentationNeeds.sad) {
      generatedDocs.push({
        title: 'System Architecture Document',
        path: `${outputDir}/sad.md`,
        purpose: 'High-level system architecture and components',
        format: 'Markdown with YAML frontmatter',
        sections: [
          { heading: 'Architecture Overview', description: 'Architectural approach and patterns' },
          { heading: 'System Components', description: 'Major system components and their interactions' },
          { heading: 'Data Architecture', description: 'Data models and storage strategies' },
          { heading: 'Integration Points', description: 'External system integrations' }
        ]
      });
    }
    
    if (documentationNeeds.sdd) {
      generatedDocs.push({
        title: 'Software Design Document',
        path: `${outputDir}/sdd.md`,
        purpose: 'Detailed design including classes, interfaces, and algorithms',
        format: 'Markdown with YAML frontmatter',
        sections: [
          { heading: 'Design Overview', description: 'Design approach and patterns' },
          { heading: 'Component Design', description: 'Detailed component specifications' },
          { heading: 'Interface Design', description: 'API and user interface designs' },
          { heading: 'Data Design', description: 'Database schemas and data structures' }
        ]
      });
    }
    
    if (documentationNeeds.stp) {
      generatedDocs.push({
        title: 'Software Test Plan',
        path: `${outputDir}/stp.md`,
        purpose: 'Test strategy, cases, and validation approach',
        format: 'Markdown with YAML frontmatter',
        sections: [
          { heading: 'Test Strategy', description: 'Overall testing approach' },
          { heading: 'Test Cases', description: 'Specific test scenarios' },
          { heading: 'Test Environment', description: 'Testing infrastructure and tools' },
          { heading: 'Test Schedule', description: 'Timeline for testing activities' }
        ]
      });
    }
    
    // Prepare template data
    const templateData = {
      projectName: projectInfo.name,
      outputDirectory: path.relative(existingProject.path, outputDir),
      lastUpdated: new Date().toISOString(),
      documents: generatedDocs
    };
    
    // Apply the template
    const content = template(templateData);
    
    // Write to output file
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Created integration guide at ${outputPath}`);
  } catch (error) {
    logger.error('Error generating integration guide', { error });
    console.error(`❌ Error generating integration guide: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a specific document for an existing project
 */
async function generateDocumentForExistingProject(
  type: string,
  projectInfo: ProjectInfo,
  techStack: TechStack,
  interviewAnswers: InterviewAnswers,
  outputDir: string
): Promise<void> {
  console.log(`Generating ${type.toUpperCase()} document...`);
  
  try {
    // First check if we have a Handlebars template
    const projectDefaults = loadProjectDefaults();
    const hbsTemplatePath = path.join(process.cwd(), `docs/_templates/${type}.hbs`);
    const fallbackTemplatePath = path.join(process.cwd(), `docs/_templates/fallback/${type}.md`);
    const outputPath = path.join(outputDir, `${projectInfo.name.toLowerCase().replace(/\s+/g, '-')}-${type}.md`);
    
    // Determine which template to use
    let content;
    
    if (fs.existsSync(hbsTemplatePath)) {
      // Use the Handlebars template
      try {
        // Import handlebars dynamically
        const HandlebarsModule = await import('handlebars');
        const Handlebars = HandlebarsModule.default;
        
        // Register some helper functions
        Handlebars.registerHelper('padZero', function(num: number, digits: number) {
          let result = String(num + 1);
          while (result.length < digits) {
            result = '0' + result;
          }
          return result;
        });
        
        // Read the template
        const templateSource = fs.readFileSync(hbsTemplatePath, 'utf8');
        const template = Handlebars.compile(templateSource);
        
        // Use the same template data as the original function
        // This can be enhanced later to include project-specific data from analysis
        
        // Create main features array from interview answers
        const mainFeatures: string[] = [];
        for (const [question, answer] of Object.entries(interviewAnswers)) {
          if (question.toLowerCase().includes('feature') || question.toLowerCase().includes('functionality')) {
            mainFeatures.push(answer);
          }
        }
        
        // Create target audience array from interview answers
        const targetUsers: string[] = [];
        for (const [question, answer] of Object.entries(interviewAnswers)) {
          if (question.toLowerCase().includes('user') || question.toLowerCase().includes('audience')) {
            targetUsers.push(answer);
          }
        }
        
        // Prepare template data with more information from the interview
        const templateData = {
          documentVersion: projectDefaults.document_versions[type] || '1.0.0',
          lastUpdated: new Date().toISOString(),
          status: projectDefaults.document_statuses[0] || 'DRAFT',
          projectId: projectInfo.id,
          projectName: projectInfo.name,
          projectDescription: projectInfo.description,
          authorId: 'AUTH001',
          visionStatement: `Create a ${projectInfo.name} system that meets the needs of its users.`,
          targetAudience: targetUsers.length > 0 ? targetUsers : ['DEVELOPERS', 'USERS', 'STAKEHOLDERS'],
          systemScope: {
            includes: ['CORE_FUNCTIONALITY', 'ESSENTIAL_FEATURES'],
            excludes: ['FUTURE_ENHANCEMENTS', 'NICE_TO_HAVE_FEATURES']
          },
          definitions: [
            { id: 'TERM001', term: 'SRS', definition: 'Software Requirements Specification', context: 'DOCUMENT_TYPE' },
            { id: 'TERM002', term: 'API', definition: 'Application Programming Interface', context: 'TECHNOLOGY' }
          ],
          references: [
            { id: 'REF001', title: 'Industry Best Practices', source: 'Standards Body', version: '2023', url: 'https://example.com/standards' }
          ],
          objectives: [
            {
              description: 'Implement core functionality',
              target: 'Complete implementation',
              measurement: 'FEATURE_COMPLETION'
            },
            {
              description: 'Ensure system quality',
              target: '95% test coverage',
              measurement: 'TEST_COVERAGE'
            }
          ],
          challenges: [
            {
              description: 'Technical complexity',
              impact: 'HIGH',
              stakeholders: ['DEVELOPERS', 'ARCHITECTS']
            },
            {
              description: 'User adoption',
              impact: 'MEDIUM',
              stakeholders: ['USERS', 'PRODUCT_MANAGERS']
            }
          ],
          components: [
            {
              name: 'Core Engine',
              purpose: 'Provides main application logic',
              features: mainFeatures.length > 0 ? mainFeatures : ['Feature 1', 'Feature 2', 'Feature 3'],
              responsibilities: ['Data processing', 'Business logic'],
              dependencies: ['Database', 'Authentication service'],
              requirementsImplemented: ['FR-1.1', 'FR-1.2'],
              classes: [
                {
                  name: 'CoreService',
                  purpose: 'Main service for core functionality',
                  properties: [
                    { name: 'config', type: 'Configuration' },
                    { name: 'logger', type: 'Logger' }
                  ],
                  methods: [
                    { name: 'initialize' },
                    { name: 'process' }
                  ]
                }
              ],
              interfaces: [
                {
                  name: 'ICoreService',
                  methods: [
                    { 
                      returnType: 'void',
                      name: 'initialize',
                      parameters: []
                    },
                    {
                      returnType: 'Result',
                      name: 'process',
                      parameters: [
                        { type: 'Input', name: 'data' }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              name: 'User Interface',
              purpose: 'Provides user-facing interactions',
              features: ['UI Feature 1', 'UI Feature 2'],
              responsibilities: ['User interaction', 'Data display'],
              dependencies: ['Core Engine'],
              requirementsImplemented: ['FR-2.1', 'FR-2.2']
            }
          ],
          technologies: techStack.selected.map((tech, index) => ({
            name: tech,
            category: index === 0 ? 'FRONTEND' : (index === 1 ? 'BACKEND' : 'DATABASE'),
            purpose: `Core ${index === 0 ? 'frontend' : (index === 1 ? 'backend' : 'data storage')} technology`
          }))
        };
        
        // Apply the template
        content = template(templateData);
        logger.info('Used Handlebars template for existing project', { type });
      } catch (error) {
        logger.error('Error using Handlebars template for existing project', { error, type });
        // Check for fallback template
        if (fs.existsSync(fallbackTemplatePath)) {
          content = fs.readFileSync(fallbackTemplatePath, 'utf8');
          logger.info('Falling back to simple template for existing project', { type });
        } else {
          // Create a basic template if fallback doesn't exist
          content = createBasicTemplate(type, projectInfo);
          logger.info('Creating basic template for existing project', { type });
        }
      }
    } else if (fs.existsSync(fallbackTemplatePath)) {
      // Use the fallback template
      content = fs.readFileSync(fallbackTemplatePath, 'utf8');
      logger.info('Using fallback template for existing project', { type });
    } else {
      // Create a basic template if no templates exist
      content = createBasicTemplate(type, projectInfo);
      logger.info('Creating basic template for existing project', { type });
    }
    
    // Simple template variable replacement for non-Handlebars templates
    if (content) {
      content = content.replace(/PROJ-001/g, projectInfo.id);
      content = content.replace(/Documentation Template System/g, projectInfo.name);
      content = content.replace(/2025-03-05/g, projectInfo.created.split('T')[0]);
    }
    
    // Enhance documentation with LLM if available
    if (llm.isLLMApiAvailable() && config.isAIEnhancementEnabled()) {
      console.log(`🧠 Enhancing ${type.toUpperCase()} document with AI...`);
      try {
        content = await llm.enhanceDocumentation(content, projectInfo, type, {
          improveFormatting: true,
          expandExplanations: true,
          checkConsistency: true
        });
      } catch (error) {
        logger.error('Error enhancing documentation with AI for existing project', { error, type });
        // Continue with the non-enhanced version
      }
    }
    
    // Write to output file
    fs.writeFileSync(outputPath, content);
    logger.info('Created document for existing project', { type, outputPath });
    console.log(`✅ Created ${type.toUpperCase()} at ${outputPath}`);
  } catch (error) {
    logger.error('Error generating document for existing project', { error, type });
    console.error(`❌ Error generating ${type.toUpperCase()} document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate a specific document based on template and project info
 */
async function generateDocument(
  type: string,
  projectInfo: ProjectInfo,
  techStack: TechStack,
  interviewAnswers: InterviewAnswers
): Promise<void> {
  console.log(`Generating ${type.toUpperCase()} document...`);
  
  try {
    // First check if we have a Handlebars template
    const projectDefaults = loadProjectDefaults();
    const hbsTemplatePath = path.join(process.cwd(), `docs/_templates/${type}.hbs`);
    const fallbackTemplatePath = path.join(process.cwd(), `docs/_templates/fallback/${type}.md`);
    const outputPath = path.join(config.getOutputDir(), `${projectInfo.name.toLowerCase().replace(/\s+/g, '-')}-${type}.md`);
    
    // Determine which template to use
    let content;
    
    if (fs.existsSync(hbsTemplatePath)) {
      // Use the Handlebars template
      try {
        // Import handlebars dynamically
        const HandlebarsModule = await import('handlebars');
        const Handlebars = HandlebarsModule.default;
        
        // Register some helper functions
        Handlebars.registerHelper('padZero', function(num: number, digits: number) {
          let result = String(num + 1);
          while (result.length < digits) {
            result = '0' + result;
          }
          return result;
        });
        
        // Read the template
        const templateSource = fs.readFileSync(hbsTemplatePath, 'utf8');
        const template = Handlebars.compile(templateSource);
        
        // Create main features array from interview answers
        const mainFeatures: string[] = [];
        for (const [question, answer] of Object.entries(interviewAnswers)) {
          if (question.toLowerCase().includes('feature') || question.toLowerCase().includes('functionality')) {
            mainFeatures.push(answer);
          }
        }
        
        // Create target audience array from interview answers
        const targetUsers: string[] = [];
        for (const [question, answer] of Object.entries(interviewAnswers)) {
          if (question.toLowerCase().includes('user') || question.toLowerCase().includes('audience')) {
            targetUsers.push(answer);
          }
        }
        
        // Prepare template data with more information from the interview
        const templateData = {
          documentVersion: projectDefaults.document_versions[type] || '1.0.0',
          lastUpdated: new Date().toISOString(),
          status: projectDefaults.document_statuses[0] || 'DRAFT',
          projectId: projectInfo.id,
          projectName: projectInfo.name,
          projectDescription: projectInfo.description,
          authorId: 'AUTH001',
          visionStatement: `Create a ${projectInfo.name} system that meets the needs of its users.`,
          targetAudience: targetUsers.length > 0 ? targetUsers : ['DEVELOPERS', 'USERS', 'STAKEHOLDERS'],
          systemScope: {
            includes: ['CORE_FUNCTIONALITY', 'ESSENTIAL_FEATURES'],
            excludes: ['FUTURE_ENHANCEMENTS', 'NICE_TO_HAVE_FEATURES']
          },
          definitions: [
            { id: 'TERM001', term: 'SRS', definition: 'Software Requirements Specification', context: 'DOCUMENT_TYPE' },
            { id: 'TERM002', term: 'API', definition: 'Application Programming Interface', context: 'TECHNOLOGY' }
          ],
          references: [
            { id: 'REF001', title: 'Industry Best Practices', source: 'Standards Body', version: '2023', url: 'https://example.com/standards' }
          ],
          objectives: [
            {
              description: 'Implement core functionality',
              target: 'Complete implementation',
              measurement: 'FEATURE_COMPLETION'
            },
            {
              description: 'Ensure system quality',
              target: '95% test coverage',
              measurement: 'TEST_COVERAGE'
            }
          ],
          challenges: [
            {
              description: 'Technical complexity',
              impact: 'HIGH',
              stakeholders: ['DEVELOPERS', 'ARCHITECTS']
            },
            {
              description: 'User adoption',
              impact: 'MEDIUM',
              stakeholders: ['USERS', 'PRODUCT_MANAGERS']
            }
          ],
          components: [
            {
              name: 'Core Engine',
              purpose: 'Provides main application logic',
              features: mainFeatures.length > 0 ? mainFeatures : ['Feature 1', 'Feature 2', 'Feature 3'],
              responsibilities: ['Data processing', 'Business logic'],
              dependencies: ['Database', 'Authentication service'],
              requirementsImplemented: ['FR-1.1', 'FR-1.2'],
              classes: [
                {
                  name: 'CoreService',
                  purpose: 'Main service for core functionality',
                  properties: [
                    { name: 'config', type: 'Configuration' },
                    { name: 'logger', type: 'Logger' }
                  ],
                  methods: [
                    { name: 'initialize' },
                    { name: 'process' }
                  ]
                }
              ],
              interfaces: [
                {
                  name: 'ICoreService',
                  methods: [
                    { 
                      returnType: 'void',
                      name: 'initialize',
                      parameters: []
                    },
                    {
                      returnType: 'Result',
                      name: 'process',
                      parameters: [
                        { type: 'Input', name: 'data' }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              name: 'User Interface',
              purpose: 'Provides user-facing interactions',
              features: ['UI Feature 1', 'UI Feature 2'],
              responsibilities: ['User interaction', 'Data display'],
              dependencies: ['Core Engine'],
              requirementsImplemented: ['FR-2.1', 'FR-2.2']
            }
          ],
          // Swift-specific data
          swiftVersion: '5.8',
          xcodeVersion: '15.0',
          deploymentTargets: [
            { platform: 'iOS', minimumVersion: '15.0', targetVersion: '16.0' },
            { platform: 'macOS', minimumVersion: '12.0', targetVersion: '13.0' }
          ],
          buildSystem: 'Swift Package Manager',
          dependencyManager: 'Swift Package Manager',
          architecturePattern: 'MVVM',
          directoryStructure: [
            { path: 'Sources/Models', purpose: 'Data model definitions' },
            { path: 'Sources/Views', purpose: 'SwiftUI view components' },
            { path: 'Sources/ViewModels', purpose: 'MVVM view models' },
            { path: 'Sources/Services', purpose: 'API and business services' },
            { path: 'Sources/Utilities', purpose: 'Helper functions and extensions' }
          ],
          buildConfiguration: {
            debugSettings: ['ENABLE_TESTABILITY', 'DEBUG_INFORMATION_FORMAT'],
            releaseSettings: ['SWIFT_OPTIMIZATION_LEVEL', 'SWIFT_COMPILATION_MODE']
          },
          coreComponents: [
            {
              name: 'ContentView',
              purpose: 'Main view controller for the application',
              responsibilities: ['Display main interface', 'Coordinate navigation'],
              dependencies: ['DataService'],
              requirementsImplemented: ['FR-UI-001'],
              swiftTypes: [
                {
                  isStruct: true,
                  name: 'ContentView',
                  conforms: 'View',
                  properties: [
                    { isPrivate: true, isStatic: false, isLet: false, name: 'viewModel', type: 'ContentViewModel' }
                  ],
                  methods: [
                    { isPrivate: false, isStatic: false, name: 'body', returnType: 'some View', parameters: [] }
                  ]
                }
              ],
              swiftUI: {
                name: 'ContentView',
                stateProperties: [
                  { property: 'State', name: 'isLoading', type: 'Bool', defaultValue: 'false' },
                  { property: 'ObservedObject', name: 'viewModel', type: 'ContentViewModel' }
                ],
                helperMethods: [
                  { isPrivate: true, name: 'loadData', parameters: [], returnType: 'Void' }
                ]
              }
            }
          ],
          dataModels: [
            {
              name: 'User',
              type: 'Struct',
              conformsTo: ['Identifiable', 'Codable'],
              properties: [
                { name: 'id', type: 'UUID', description: 'Unique identifier', validation: 'Required' },
                { name: 'name', type: 'String', description: 'User name', validation: 'Required' }
              ],
              persistenceStrategy: 'CoreData'
            }
          ],
          networkingApproach: 'URLSession with Combine',
          apiEndpoints: [
            {
              name: 'fetchUsers',
              method: 'GET',
              path: '/api/users',
              requestModel: 'None',
              responseModel: '[User]',
              errorHandling: 'Custom NetworkError enum'
            }
          ],
          authentication: {
            method: 'OAuth2',
            tokenStorage: 'Keychain',
            refreshStrategy: 'Background refresh before expiration'
          },
          concurrencyModel: 'Swift Concurrency (async/await)',
          threadingApproach: [
            {
              context: 'UI Updates',
              strategy: 'MainActor',
              patterns: ['DispatchQueue.main.async fallback for iOS 14']
            },
            {
              context: 'Background Processing',
              strategy: 'Task and TaskGroup',
              patterns: ['Structured concurrency', 'Custom DispatchQueue for iOS 14']
            }
          ],
          asyncAwaitUsage: {
            implementationScope: 'All network calls and long-running operations',
            migrationStrategy: 'Gradual migration with backwards compatibility'
          },
          uiFramework: 'SwiftUI with UIKit integration where needed',
          designSystem: {
            components: [
              { name: 'PrimaryButton', reusability: 'Global', customization: 'Through ViewModifiers' },
              { name: 'CardView', reusability: 'Global', customization: 'Through style parameters' }
            ],
            theming: {
              approach: 'Environment values and preference keys',
              colorScheme: 'Dynamic with dark mode support',
              typography: 'Custom font extension with scaling'
            }
          },
          accessibility: {
            voiceOverSupport: 'Full support with custom accessibility labels',
            dynamicType: 'Supports all size categories',
            contrastRequirements: 'WCAG AA compliant'
          },
          packageManager: 'Swift Package Manager',
          dependencies: [
            { name: 'Alamofire', version: '5.6.0', purpose: 'Networking', source: 'GitHub' },
            { name: 'SwiftyJSON', version: '5.0.0', purpose: 'JSON Parsing', source: 'GitHub' }
          ],
          dependencyManagementStrategy: 'Exact versions with regular updates',
          testingFrameworks: [
            { name: 'XCTest', purpose: 'Unit and UI testing' },
            { name: 'Quick/Nimble', purpose: 'BDD-style testing' }
          ],
          testCoverageTargets: {
            unit: '90%',
            integration: '80%',
            ui: '70%'
          },
          testingPatterns: [
            'Given-When-Then pattern',
            'Protocol-based mocking',
            'Dependency injection for testability'
          ],
          memoryManagement: {
            arcStrategy: 'Value types preferred, reference types with weak/unowned references',
            memoryLeakPrevention: [
              'Capture lists in closures',
              'Lifecycle management in ViewModels',
              'Memory graph debugging'
            ]
          },
          performanceTargets: [
            { aspect: 'App Launch', target: '< 2 seconds', measurement: 'Time to interactive' },
            { aspect: 'Scrolling', target: '60 FPS', measurement: 'Frame timing' }
          ],
          optimizationTechniques: [
            'View recycling',
            'Lazy loading of resources',
            'Background processing for heavy operations'
          ],
          platformSpecificFeatures: [
            {
              platform: 'iOS',
              features: [
                { name: 'Push Notifications', implementation: 'UNUserNotificationCenter', fallback: 'None' },
                { name: 'Background Processing', implementation: 'BGTaskScheduler', fallback: 'Traditional background modes' }
              ]
            },
            {
              platform: 'macOS',
              features: [
                { name: 'Menu Bar', implementation: 'NSMenuBar', fallback: 'Custom UI' },
                { name: 'Window Management', implementation: 'NSWindow', fallback: 'None' }
              ]
            }
          ],
          appExtensions: [
            { type: 'Share Extension', purpose: 'Share content to other apps', dataSharing: 'App Group' },
            { type: 'Widget Extension', purpose: 'Home screen widgets', dataSharing: 'App Group' }
          ],
          appStoreDeployment: {
            targetStores: ['App Store', 'Mac App Store'],
            reviewGuidelinesCompliance: [
              'Privacy policy',
              'Content moderation',
              'In-app purchase guidelines'
            ]
          },
          ciCdPipeline: {
            building: 'GitHub Actions',
            testing: 'XCTest on CI',
            signing: 'Fastlane Match',
            distribution: 'TestFlight and App Store Connect API'
          },
          metrics: [
            {
              name: 'User Satisfaction',
              type: 'QUALITY',
              target: '>4.5/5 rating',
              measurement: 'USER_SURVEY',
              baseline: '3.5/5',
              targetValue: '4.5/5'
            },
            {
              name: 'Performance',
              type: 'EFFICIENCY',
              target: '<200ms response time',
              measurement: 'LOAD_TEST',
              baseline: '500ms',
              targetValue: '200ms'
            }
          ],
          technologies: techStack.selected.map((tech, index) => ({
            name: tech,
            category: index === 0 ? 'FRONTEND' : (index === 1 ? 'BACKEND' : 'DATABASE'),
            purpose: `Core ${index === 0 ? 'frontend' : (index === 1 ? 'backend' : 'data storage')} technology`
          })),
          algorithms: [
            { name: 'Data Processing Algorithm', description: 'Processes input data efficiently' },
            { name: 'Smart Recommendation Engine', description: 'Provides intelligent recommendations' }
          ],
          integrations: [
            {
              name: 'GitHub',
              purpose: 'Version control and CI/CD'
            }
          ],
          phases: [
            {
              name: 'Planning',
              duration: '2 weeks',
              deliverables: ['Requirements document', 'Project plan'],
              dependencies: []
            },
            {
              name: 'Implementation',
              duration: '8 weeks',
              deliverables: ['Working software', 'Documentation'],
              dependencies: ['PHASE000']
            }
          ],
          fileStructure: [
            '├── src/                           # Source code',
            '│   ├── components/               # UI components',
            '│   ├── services/                 # Business logic',
            '│   └── utils/                    # Utility functions',
            '├── docs/                         # Documentation',
            '├── tests/                        # Test files',
            '└── README.md                     # Project overview'
          ],
          developmentApproach: `We will use an iterative approach to develop ${projectInfo.name}, focusing on delivering value early and often. The team will follow Agile methodologies with two-week sprints and regular stakeholder reviews.`,
          designApproach: {
            methodology: 'Component-Based Design',
            patterns: [
              { name: 'MVC', purpose: 'Separation of concerns' },
              { name: 'Repository Pattern', purpose: 'Data access abstraction' }
            ],
            guidelines: [
              'Follow SOLID principles',
              'Ensure loose coupling between components'
            ]
          },
          assumptions: [
            { description: 'Users have basic technical knowledge', impact: 'UI complexity level' }
          ],
          constraints: [
            { description: 'Must work on modern browsers', type: 'TECHNICAL', impact: 'Frontend technology choices' }
          ],
          entityModels: [
            {
              name: 'User',
              type: 'ENTITY',
              description: 'Represents a system user',
              attributes: [
                { name: 'id', type: 'string', description: 'Unique identifier', constraints: 'PRIMARY_KEY' },
                { name: 'name', type: 'string', description: 'User name', constraints: 'NOT_NULL' }
              ]
            }
          ],
          dataStorage: [
            { type: 'RELATIONAL_DATABASE', purpose: 'Primary data storage', details: 'Stores user and application data' }
          ],
          userInterfaces: [
            {
              name: 'Dashboard',
              type: 'WEB_UI',
              purpose: 'Main user interaction point',
              interactions: [
                'View system status',
                'Access main features'
              ]
            }
          ],
          apis: [
            {
              name: 'Core API',
              type: 'REST',
              purpose: 'Main application interface',
              endpoints: [
                { path: '/api/v1/users', method: 'GET', description: 'Get all users' },
                { path: '/api/v1/users/{id}', method: 'GET', description: 'Get user by ID' }
              ]
            }
          ],
          developmentTools: [
            { name: 'VS Code', version: 'latest', purpose: 'Code editing' },
            { name: 'Git', version: 'latest', purpose: 'Version control' }
          ],
          frameworksLibraries: [
            { name: 'React', version: '18.x', purpose: 'UI library' },
            { name: 'Express', version: '4.x', purpose: 'Backend framework' }
          ],
          implementationPhases: [
            { name: 'Core Infrastructure', focus: 'Foundation setup', duration: '2 weeks', deliverables: ['Project setup', 'CI/CD pipeline'] },
            { name: 'Feature Development', focus: 'Core features', duration: '4 weeks', deliverables: ['Main application features'] }
          ],
          codingStandards: [
            'Use descriptive variable names',
            'Write unit tests for all components',
            'Follow framework best practices'
          ],
          functionalRequirementCategories: [
            {
              name: 'USER MANAGEMENT',
              requirements: [
                {
                  name: 'USER_REGISTRATION',
                  priority: 'HIGH',
                  description: 'The system shall allow users to register with email and password',
                  validationMethod: 'TEST',
                  dependencies: [],
                  rationale: 'Required for user identification and access control',
                  acceptanceCriteria: [
                    'User can register with valid email and password',
                    'System validates email format',
                    'System enforces password complexity'
                  ]
                }
              ]
            }
          ],
          nonFunctionalRequirementCategories: [
            {
              name: 'PERFORMANCE REQUIREMENTS',
              requirements: [
                {
                  name: 'RESPONSE_TIME',
                  category: 'PERFORMANCE',
                  priority: 'HIGH',
                  description: 'The system shall respond to user requests within 500ms',
                  validationMethod: 'TEST',
                  dependencies: [],
                  rationale: 'Ensure good user experience',
                  acceptanceCriteria: [
                    'API endpoints respond within 500ms under normal load',
                    'UI interactions complete within 500ms'
                  ],
                  metrics: {
                    response_time: { target: '<500ms', maximum: '<1000ms' }
                  }
                }
              ]
            }
          ],
          traceabilityStakeholder: [
            { reqId: 'FR-1.1', needId: 'NEED001', relationshipType: 'SATISFIES', satisfactionCriteria: 'Allows user registration as required' }
          ],
          traceabilityComponents: [
            { reqId: 'FR-1.1', componentId: 'COMP001', relationshipType: 'IMPLEMENTED_BY', implementationApproach: 'User registration form and API endpoint' }
          ],
          functionalRequirementsMapping: [
            { reqId: 'FR-1.1', componentId: 'COMP001', coverage: 'FULL', verificationMethod: 'UNIT_TEST' }
          ],
          nonFunctionalRequirementsMapping: [
            { reqId: 'NFR-1.1', designElement: 'API_ARCHITECTURE', implementationApproach: 'Use caching and optimized queries', verificationMethod: 'PERFORMANCE_TEST' }
          ],
          testObjectives: [
            { description: 'Verify all functional requirements are met', priority: 'HIGH', successCriteria: 'All test cases pass' },
            { description: 'Ensure performance meets specifications', priority: 'MEDIUM', successCriteria: 'Response times within limits' }
          ],
          testScope: {
            description: 'Comprehensive testing of all system components',
            inScope: ['Functional testing', 'Performance testing', 'Security testing'],
            outOfScope: ['Load testing', 'Stress testing']
          },
          testTypes: [
            { 
              name: 'Unit Testing', 
              description: 'Testing individual components in isolation', 
              focusAreas: ['Core functions', 'Business logic components']
            },
            {
              name: 'Integration Testing',
              description: 'Testing component interactions',
              focusAreas: ['API endpoints', 'Service interactions']
            }
          ],
          hardwareRequirements: [
            { name: 'Development Workstation', specification: '16GB RAM, 4-core CPU', purpose: 'Development environment' }
          ],
          softwareRequirements: [
            { name: 'Node.js', version: '16.x or higher', purpose: 'Runtime environment' },
            { name: 'Docker', version: 'latest', purpose: 'Containerization' }
          ],
          testDataRequirements: [
            { description: 'Sample user accounts', format: 'JSON', source: 'Generated', volume: '100 records' }
          ],
          testCaseCategories: [
            {
              name: 'Authentication Tests',
              testCases: [
                {
                  name: 'User Login Validation',
                  description: 'Verify user login with valid credentials',
                  priority: 'HIGH',
                  testType: 'FUNCTIONAL',
                  requirementsVerified: ['FR-1.1', 'FR-1.2'],
                  preconditions: ['User exists in system'],
                  steps: [
                    { action: 'Enter valid username', expectedResult: 'Username accepted' },
                    { action: 'Enter valid password', expectedResult: 'Password accepted' },
                    { action: 'Click login button', expectedResult: 'User logged in successfully' }
                  ],
                  postconditions: ['User session created']
                }
              ]
            }
          ],
          testMilestones: [
            { name: 'Unit Test Completion', description: 'All unit tests implemented and passing', targetDate: '2023-06-15', deliverables: ['Unit test code', 'Test coverage report'] }
          ],
          testDependencies: [
            { description: 'Test environment setup', impact: 'Required for all testing', mitigation: 'Early setup of environments' }
          ],
          testMetrics: [
            { name: 'Test Coverage', description: 'Percentage of code covered by tests', calculation: 'Lines tested / Total lines * 100', target: '>90%' }
          ],
          defectSeverityLevels: [
            { level: 'CRITICAL', description: 'System unusable, no workaround', resolutionTimeframe: 'Immediate (within 24 hours)' },
            { level: 'HIGH', description: 'Major feature broken, workaround exists', resolutionTimeframe: 'Within 3 days' }
          ],
          defectLifecycle: [
            { status: 'NEW', description: 'Defect newly reported', nextStatuses: ['ASSIGNED', 'REJECTED'] },
            { status: 'ASSIGNED', description: 'Defect assigned to developer', nextStatuses: ['IN_PROGRESS', 'REJECTED'] }
          ],
          requirementsTraceability: [
            { reqId: 'FR-1.1', testCaseIds: 'TC-1.0', coverageStatus: 'COVERED' }
          ],
          testManagerName: 'John Doe',
          projectManagerName: 'Jane Smith',
          qaLeadName: 'Alex Johnson'
        };
        
        // Apply the template
        content = template(templateData);
        logger.info('Used Handlebars template', { type });
      } catch (error) {
        logger.error('Error using Handlebars template', { error, type });
        // Check for fallback template
        if (fs.existsSync(fallbackTemplatePath)) {
          content = fs.readFileSync(fallbackTemplatePath, 'utf8');
          logger.info('Falling back to simple template', { type });
        } else {
          // Create a basic template if fallback doesn't exist
          content = createBasicTemplate(type, projectInfo);
          logger.info('Creating basic template', { type });
        }
      }
    } else if (fs.existsSync(fallbackTemplatePath)) {
      // Use the fallback template
      content = fs.readFileSync(fallbackTemplatePath, 'utf8');
      logger.info('Using fallback template', { type });
    } else {
      // Create a basic template if no templates exist
      content = createBasicTemplate(type, projectInfo);
      logger.info('Creating basic template', { type });
    }
    
    // Simple template variable replacement for non-Handlebars templates
    if (content) {
      content = content.replace(/PROJ-001/g, projectInfo.id);
      content = content.replace(/Documentation Template System/g, projectInfo.name);
      content = content.replace(/2025-03-05/g, projectInfo.created.split('T')[0]);
    }
    
    // Enhance documentation with LLM if available
    if (llm.isLLMApiAvailable() && config.isAIEnhancementEnabled()) {
      console.log(`🧠 Enhancing ${type.toUpperCase()} document with AI...`);
      try {
        content = await llm.enhanceDocumentation(content, projectInfo, type, {
          improveFormatting: true,
          expandExplanations: true,
          checkConsistency: true
        });
      } catch (error) {
        logger.error('Error enhancing documentation with AI', { error, type });
        // Continue with the non-enhanced version
      }
    }
    
    // Write to output file
    fs.writeFileSync(outputPath, content);
    logger.info('Created document', { type, outputPath });
    console.log(`✅ Created ${type.toUpperCase()} at ${outputPath}`);
  } catch (error) {
    logger.error('Error generating document', { error, type });
    console.error(`❌ Error generating ${type.toUpperCase()} document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Display validation result for a single file
 */
function displayValidationResult(filePath: string, result: any): void {
  console.log(`\nValidation results for ${filePath}:`);
  
  if (result.isValid) {
    console.log('✅ Document is valid');
  } else {
    console.log('❌ Document has errors');
  }
  
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach((error: any) => {
      console.log(`- ${error.message} (${error.code})`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.log('\nWarnings:');
    result.warnings.forEach((warning: any) => {
      console.log(`- ${warning.message} (${warning.code})`);
    });
  }
}

/**
 * Display validation results for all files
 */
function displayAllValidationResults(results: Record<string, any>): void {
  console.log('\nValidation results for all documents:');
  
  const validCount = Object.values(results).filter(result => result.isValid).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`${validCount}/${totalCount} documents are valid`);
  
  for (const [filePath, result] of Object.entries(results)) {
    console.log(`\n${path.basename(filePath)}:`);
    
    if (result.isValid) {
      console.log('✅ Valid');
    } else {
      console.log('❌ Invalid');
      
      if (result.errors.length > 0) {
        console.log('  Errors:');
        result.errors.forEach((error: any) => {
          console.log(`  - ${error.message}`);
        });
      }
    }
    
    if (result.warnings.length > 0) {
      console.log('  Warnings:');
      result.warnings.forEach((warning: any) => {
        console.log(`  - ${warning.message}`);
      });
    }
  }
}

/**
 * Create a basic template for a document type when no template exists
 */
function createBasicTemplate(type: string, projectInfo: ProjectInfo): string {
  const today = new Date().toISOString().split('T')[0];
  const docTypeMap: Record<string, string> = {
    'prd': 'Product Requirements Document',
    'srs': 'Software Requirements Specification',
    'sad': 'System Architecture Document',
    'sdd': 'Software Design Document',
    'stp': 'Software Test Plan',
    'swift-sdd': 'Swift Software Design Document'
  };
  
  const docTitle = docTypeMap[type] || `${type.toUpperCase()} Document`;
  
  return `---
documentType: "${type.toUpperCase()}"
schemaVersion: "1.0.0"
documentVersion: "1.0.0"
lastUpdated: "${today}"
status: "DRAFT"
id: "DOC-${type.toUpperCase()}-001"
project:
  id: "${projectInfo.id}"
  name: "${projectInfo.name}"
---

# ${projectInfo.name} ${docTitle}

## 1. DOCUMENT CONTROL

### 1.1. REVISION HISTORY

| VERSION | DATE | DESCRIPTION | AUTHOR |
|---------|------|-------------|--------|
| 1.0.0   | ${today} | Initial draft | DocGen |

## 2. INTRODUCTION

### 2.1. PURPOSE

This document describes the ${docTitle.toLowerCase()} for ${projectInfo.name}.

### 2.2. SCOPE

${projectInfo.description}

## 3. OVERVIEW

*This is a basic template created automatically by DocGen. Please customize it according to your project's needs.*

`;
}