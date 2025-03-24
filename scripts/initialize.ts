#!/usr/bin/env node

/**
 * DocGen - Smart Interview System
 * 
 * This script implements the LLM-powered interview system that guides users
 * through a structured interview process to gather project information.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as inquirer from 'inquirer';
import { exec } from 'child_process';
import * as yaml from 'js-yaml';
import { Command } from 'commander';

// Import LLM and session utilities
import * as llmUtil from '../utils/llm';
import * as sessionUtil from '../utils/session';

// Type definitions
interface ProjectDefaults {
  schema_versions: Record<string, string>;
  document_versions: Record<string, string>;
  document_statuses: string[];
  project_types: Record<string, {
    recommended_docs: string[];
  }>;
}

interface ProjectInfo {
  name: string;
  description: string;
  type: string;
  id: string;
  created: string;
}

interface TechStack {
  recommended: string[];
  selected: string[];
}

interface DocumentationNeeds {
  prd: boolean;
  srs: boolean;
  sad: boolean;
  sdd: boolean;
  stp: boolean;
  additional: string[];
}

interface SessionData {
  projectInfo?: ProjectInfo;
  techStack?: TechStack;
  documentationNeeds?: DocumentationNeeds;
  interviewAnswers: Record<string, string>;
  _lastUpdated?: number;
}

interface CommandLineArgs {
  resume?: string;
  list?: boolean;
  type?: string;
  name?: string;
}

// Configuration paths
const CONFIG_DIR = path.join(__dirname, '../config');
const TEMPLATES_DIR = path.join(__dirname, '../docs/_templates');
const OUTPUT_DIR = path.join(__dirname, '../docs/generated');

// Load configuration
const projectDefaults = loadProjectDefaults();

// Set up command line arguments
const argv: CommandLineArgs = new Command()
  .option('-r, --resume <sessionId>', 'Resume an existing interview session')
  .option('-l, --list', 'List available interview sessions')
  .option('-t, --type <projectType>', 'Specify the project type (WEB, MOBILE, API, DESKTOP, OTHER)')
  .option('-n, --name <projectName>', 'Specify the project name')
  .parse(process.argv)
  .opts();

/**
 * Load project defaults from configuration
 */
function loadProjectDefaults(): ProjectDefaults {
  try {
    const configPath = path.join(CONFIG_DIR, 'project-defaults.yaml');
    if (fs.existsSync(configPath)) {
      return yaml.load(fs.readFileSync(configPath, 'utf8')) as ProjectDefaults;
    }
  } catch (error) {
    console.error(`Error loading project defaults: ${(error as Error).message}`);
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
      OTHER: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] }
    }
  };
}

/**
 * Main interview function
 */
async function conductInterview(): Promise<void> {
  console.log('Starting DocGen Interactive Interview System');
  console.log('------------------------------------------');
  
  // Handle session listing
  if (argv.list) {
    const sessions = sessionUtil.listSessions();
    if (sessions.length === 0) {
      console.log('No saved sessions found.\n');
    } else {
      console.log('Available sessions:');
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. ${session.projectName} (${session.sessionId})`);
        console.log(`   Last updated: ${new Date(session.lastUpdated).toLocaleString()}`);
      });
      console.log('\nTo resume a session, run:');
      console.log(`npm run interview -- --resume <sessionId>`);
    }
    return;
  }
  
  let sessionId: string | null = null;
  let projectInfo: ProjectInfo | null = null;
  let techStack: TechStack | null = null;
  let documentationNeeds: DocumentationNeeds | null = null;
  let interviewAnswers: Record<string, string> = {};
  
  // Check for LLM availability
  const llmAvailable = llmUtil.isLLMAvailable();
  if (!llmAvailable) {
    console.log('⚠️  Warning: ANTHROPIC_API_KEY environment variable not found.');
    console.log('The interview system will use basic templates without LLM enhancement.');
    console.log('For full functionality, set the ANTHROPIC_API_KEY environment variable.\n');
  }
  
  // Handle session resumption
  if (argv.resume) {
    try {
      const sessionData = sessionUtil.loadSession(argv.resume);
      projectInfo = sessionData.projectInfo || null;
      techStack = sessionData.techStack || null;
      documentationNeeds = sessionData.documentationNeeds || null;
      interviewAnswers = sessionData.interviewAnswers || {};
      sessionId = argv.resume;
      
      console.log(`✅ Resumed session for project: ${projectInfo?.name || 'Unnamed Project'}`);
      console.log(`Last updated: ${new Date(sessionData._lastUpdated || 0).toLocaleString()}\n`);
    } catch (error) {
      console.error(`❌ Failed to resume session: ${(error as Error).message}`);
      return;
    }
  }
  
  // Start or continue interview
  if (!projectInfo) {
    projectInfo = await gatherBasicProjectInfo();
    
    // Generate a session ID if not resuming
    if (!sessionId) {
      sessionId = sessionUtil.generateSessionId(projectInfo.name);
    }
    
    // Save session after gathering basic info
    sessionUtil.saveSession(sessionId, {
      projectInfo,
      interviewAnswers
    });
    
    console.log(`✅ Session saved with ID: ${sessionId}`);
    console.log(`You can resume this session later with:\nnpm run interview -- --resume ${sessionId}\n`);
  }
  
  if (!techStack && projectInfo) {
    techStack = await recommendTechnologyStack(projectInfo);
    
    // Save session after tech stack
    sessionUtil.saveSession(sessionId as string, {
      projectInfo,
      techStack,
      interviewAnswers
    });
  }
  
  if (!documentationNeeds && projectInfo && techStack) {
    documentationNeeds = await assessDocumentationNeeds(projectInfo, techStack);
    
    // Save session after documentation needs
    sessionUtil.saveSession(sessionId as string, {
      projectInfo,
      techStack,
      documentationNeeds,
      interviewAnswers
    });
  }
  
  // Ask follow-up questions if LLM is available
  if (llmAvailable && projectInfo) {
    const followUpQuestions = await llmUtil.generateFollowUpQuestions(projectInfo, interviewAnswers);
    await askFollowUpQuestions(followUpQuestions, interviewAnswers);
    
    // Save session after follow-up questions
    sessionUtil.saveSession(sessionId as string, {
      projectInfo,
      techStack,
      documentationNeeds,
      interviewAnswers
    });
  }
  
  if (projectInfo && techStack && documentationNeeds) {
    console.log('\nGenerating documentation templates based on your responses...');
    await generateDocumentation(projectInfo, techStack, documentationNeeds, interviewAnswers);
    
    console.log('\n✅ Interview complete!');
    console.log('Documentation templates have been generated in /docs/generated/');
    console.log('Next steps:');
    console.log('1. Review the generated templates');
    console.log('2. Run "npm run validate" to check for completeness');
    console.log('3. Customize the templates as needed for your project');
  }
}

interface ProjectInfoAnswers {
  name: string;
  description: string;
  type: string;
}

/**
 * Gather basic project information through user prompts
 */
async function gatherBasicProjectInfo(): Promise<ProjectInfo> {
  // Use command line arguments if provided
  if (argv.name && argv.type) {
    return {
      name: argv.name,
      description: 'Project created with command line arguments',
      type: argv.type.toUpperCase(),
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
    const answers = await inquirer.prompt<ProjectInfoAnswers>(questions);
    
    return {
      name: answers.name,
      description: answers.description,
      type: answers.type,
      id: `PROJ-${Math.floor(1000 + Math.random() * 9000)}`,
      created: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error gathering project information:', (error as Error).message);
    process.exit(1);
  }
}

/**
 * Ask follow-up questions based on LLM recommendations
 */
async function askFollowUpQuestions(questions: string[], interviewAnswers: Record<string, string>): Promise<void> {
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
      console.error('Error asking follow-up question:', (error as Error).message);
    }
  }
}

interface TechRecommendations {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  devops?: string[];
}

interface MobileTypeAnswers {
  mobileType: string;
}

interface SelectedTechAnswers {
  selectedTech: string[];
}

/**
 * Recommend technology stack based on project info
 */
async function recommendTechnologyStack(projectInfo: ProjectInfo): Promise<TechStack> {
  console.log('\nAnalyzing project requirements and recommending technology stack...');
  
  let recommendations: TechRecommendations | null = null;
  
  // Use LLM for smart recommendations if available
  if (llmUtil.isLLMAvailable()) {
    try {
      // Get LLM recommendations
      recommendations = await llmUtil.recommendTechnologies(projectInfo);
      
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
      console.error(`Error getting AI recommendations: ${(error as Error).message}`);
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
    if (projectInfo.type.toUpperCase() === 'MOBILE') {
      const mobileTypeQuestion = await inquirer.prompt<MobileTypeAnswers>([
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
    
    const recommendedStack = techStackMap[projectInfo.type.toUpperCase()] || techStackMap.OTHER;
    
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
async function selectTechnologies(recommendations: TechRecommendations): Promise<string[]> {
  const allTechnologies = [
    ...(recommendations.frontend || []),
    ...(recommendations.backend || []),
    ...(recommendations.database || []),
    ...(recommendations.devops || [])
  ];
  
  // If there are no recommendations, provide default options
  if (allTechnologies.length === 0) {
    allTechnologies.push('Node.js', 'React', 'MongoDB', 'GitHub Actions');
  }
  
  try {
    const answers = await inquirer.prompt<SelectedTechAnswers>([
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
    console.error('Error selecting technologies:', (error as Error).message);
    return allTechnologies; // Return all as selected if there's an error
  }
}

/**
 * Assess documentation needs based on project info and tech stack
 */
async function assessDocumentationNeeds(projectInfo, techStack) {
  console.log('\nAssessing documentation needs for your project...');
  
  // Get recommended docs from project defaults
  const projectType = projectInfo.type.toUpperCase();
  const defaultDocs = projectDefaults.project_types[projectType]?.recommended_docs || 
                    projectDefaults.project_types.OTHER.recommended_docs;
  
  // Basic documentation needs
  const documentationNeeds = {
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
      console.log(`- ${doc.replace('_', ' ').toLowerCase()}`);
    });
  }
  
  return selectedDocs;
}

/**
 * Let the user select documentation types
 */
async function selectDocumentationTypes(recommendations) {
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
    name: doc.replace('_', ' ').toLowerCase(),
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
        validate: input => input.length > 0 ? true : 'Please select at least one document type'
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
    console.error('Error selecting documentation types:', error.message);
    return recommendations; // Return the recommendations if there's an error
  }
}

/**
 * Generate documentation based on collected information
 */
async function generateDocumentation(projectInfo, techStack, documentationNeeds, interviewAnswers) {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
 * Generate a specific document based on template and project info
 */
async function generateDocument(type, projectInfo, techStack, interviewAnswers) {
  console.log(`Generating ${type.toUpperCase()} document...`);
  
  try {
    // First check if we have a Handlebars template
    const hbsTemplatePath = path.join(__dirname, `../docs/_templates/${type}.hbs`);
    const fallbackTemplatePath = path.join(__dirname, `../docs/_templates/fallback/${type}.md`);
    const outputPath = path.join(OUTPUT_DIR, `${projectInfo.name.toLowerCase().replace(/\s+/g, '-')}-${type}.md`);
    
    // Determine which template to use
    let content;
    
    if (fs.existsSync(hbsTemplatePath)) {
      // Use the Handlebars template
      try {
        // Dynamically require handlebars only when needed
        const Handlebars = require('handlebars');
        
        // Register some helper functions
        Handlebars.registerHelper('padZero', function(num, digits) {
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
        const mainFeatures = [];
        for (const [question, answer] of Object.entries(interviewAnswers)) {
          if (question.toLowerCase().includes('feature') || question.toLowerCase().includes('functionality')) {
            mainFeatures.push(answer);
          }
        }
        
        // Create target audience array from interview answers
        const targetUsers = [];
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
          directoryStructure: [
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
          dataModels: [
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
        console.log(`✅ Using Handlebars template for ${type.toUpperCase()}`);
      } catch (error) {
        console.error(`Error using Handlebars template for ${type.toUpperCase()}:`, error.message);
        // Check for fallback template
        if (fs.existsSync(fallbackTemplatePath)) {
          content = fs.readFileSync(fallbackTemplatePath, 'utf8');
          console.log(`⚠️ Falling back to simple template for ${type.toUpperCase()}`);
        } else {
          // Create a basic template if fallback doesn't exist
          content = createBasicTemplate(type, projectInfo);
          console.log(`⚠️ Creating basic template for ${type.toUpperCase()}`);
        }
      }
    } else if (fs.existsSync(fallbackTemplatePath)) {
      // Use the fallback template
      content = fs.readFileSync(fallbackTemplatePath, 'utf8');
      console.log(`✅ Using fallback template for ${type.toUpperCase()}`);
    } else {
      // Create a basic template if no templates exist
      content = createBasicTemplate(type, projectInfo);
      console.log(`⚠️ Creating basic template for ${type.toUpperCase()}`);
    }
    
    // Simple template variable replacement for non-Handlebars templates
    if (content) {
      content = content.replace(/PROJ-001/g, projectInfo.id);
      content = content.replace(/Documentation Template System/g, projectInfo.name);
      content = content.replace(/2025-03-05/g, projectInfo.created.split('T')[0]);
    }
    
    // Enhance documentation with LLM if available
    if (llmUtil.isLLMAvailable()) {
      console.log(`🧠 Enhancing ${type.toUpperCase()} document with AI...`);
      try {
        content = await llmUtil.enhanceDocumentation(content, projectInfo, type);
      } catch (error) {
        console.error(`Error enhancing ${type.toUpperCase()} with AI: ${error.message}`);
        // Continue with the non-enhanced version
      }
    }
    
    // Write to output file
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Created ${type.toUpperCase()} at ${outputPath}`);
  } catch (error) {
    console.error(`Error generating ${type.toUpperCase()} document:`, error.message);
  }
}

/**
 * Create a basic template for a document type when no template exists
 */
function createBasicTemplate(type, projectInfo) {
  const today = new Date().toISOString().split('T')[0];
  const docTypeMap = {
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

// Run the interview
conductInterview().catch(error => {
  console.error('Error in interview process:', error);
  process.exit(1);
});