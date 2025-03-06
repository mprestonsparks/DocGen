/**
 * DocGen - Document Generator Utility (TypeScript)
 * 
 * This module provides utilities for generating documentation based on templates.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { ProjectInfo, TechStack, TemplateData, DocumentGenerationOptions } from '../types';
import * as llmUtil from './llm';

// File paths
const TEMPLATES_DIR = path.join(__dirname, '../../docs/_templates');
const FALLBACK_TEMPLATES_DIR = path.join(__dirname, '../../docs/_templates/fallback');
const OUTPUT_DIR = path.join(__dirname, '../../docs/generated');

/**
 * Generate a document from a template
 */
export async function generateDocument(
  type: string,
  projectInfo: ProjectInfo,
  techStack: TechStack,
  interviewAnswers: Record<string, string>,
  options: DocumentGenerationOptions = {}
): Promise<string> {
  console.log(`Generating ${type.toUpperCase()} document...`);
  
  try {
    // Determine paths
    const hbsTemplatePath = options.templatePath || path.join(TEMPLATES_DIR, `${type}.hbs`);
    const fallbackTemplatePath = path.join(FALLBACK_TEMPLATES_DIR, `${type}.md`);
    const outputPath = options.outputPath || path.join(OUTPUT_DIR, `${projectInfo.name.toLowerCase().replace(/\s+/g, '-')}-${type}.md`);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Determine which template to use
    let content: string;
    
    if (fs.existsSync(hbsTemplatePath)) {
      // Use the Handlebars template
      try {
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
        
        // Extract data from interview answers
        const mainFeatures: string[] = [];
        const targetUsers: string[] = [];
        
        for (const [question, answer] of Object.entries(interviewAnswers)) {
          if (question.toLowerCase().includes('feature') || question.toLowerCase().includes('functionality')) {
            mainFeatures.push(answer);
          }
          if (question.toLowerCase().includes('user') || question.toLowerCase().includes('audience')) {
            targetUsers.push(answer);
          }
        }
        
        // Create template data
        const templateData: TemplateData = createTemplateData(type, projectInfo, techStack, {
          mainFeatures,
          targetUsers,
          interviewAnswers
        });
        
        // Apply the template
        content = template(templateData);
        console.log(`✅ Using Handlebars template for ${type.toUpperCase()}`);
      } catch (error) {
        console.error(`Error using Handlebars template for ${type.toUpperCase()}:`, error instanceof Error ? error.message : String(error));
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
    
    // Enhance documentation with LLM if available and requested
    if ((options.enhanceWithLLM !== false) && llmUtil.isLLMApiAvailable()) {
      console.log(`🧠 Enhancing ${type.toUpperCase()} document with AI...`);
      try {
        content = await llmUtil.enhanceDocumentation(content, projectInfo, type);
      } catch (error) {
        console.error(`Error enhancing ${type.toUpperCase()} with AI: ${error instanceof Error ? error.message : String(error)}`);
        // Continue with the non-enhanced version
      }
    }
    
    // Write to output file
    fs.writeFileSync(outputPath, content);
    console.log(`✅ Created ${type.toUpperCase()} at ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error(`Error generating ${type.toUpperCase()} document:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Generate all documents based on documentation needs
 */
export async function generateAllDocuments(
  projectInfo: ProjectInfo,
  techStack: TechStack,
  documentationNeeds: Record<string, boolean | string[]>,
  interviewAnswers: Record<string, string>
): Promise<string[]> {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Generate each document type
  const generationPromises: Promise<string>[] = [];
  const documentTypes = ['prd', 'srs', 'sad', 'sdd', 'stp'];
  
  for (const type of documentTypes) {
    if (documentationNeeds[type]) {
      generationPromises.push(
        generateDocument(type, projectInfo, techStack, interviewAnswers)
      );
    }
  }
  
  // Generate additional document types if needed
  if (Array.isArray(documentationNeeds.additional)) {
    for (const additionalType of documentationNeeds.additional) {
      // Handle additional document types here
      console.log(`Note: Additional document type ${additionalType} will be implemented in a future version`);
    }
  }
  
  // Generate all documents in parallel and return the paths
  return Promise.all(generationPromises);
}

/**
 * Create template data for a document
 */
function createTemplateData(
  type: string,
  projectInfo: ProjectInfo,
  techStack: TechStack,
  data: {
    mainFeatures: string[],
    targetUsers: string[],
    interviewAnswers: Record<string, string>
  }
): TemplateData {
  // Base template data that all document types use
  const baseData: TemplateData = {
    documentVersion: '1.0.0',
    lastUpdated: new Date().toISOString(),
    status: 'DRAFT',
    projectId: projectInfo.id,
    projectName: projectInfo.name,
    projectDescription: projectInfo.description,
    authorId: 'AUTH001',
    visionStatement: `Create a ${projectInfo.name} system that meets the needs of its users.`,
    targetAudience: data.targetUsers.length > 0 ? data.targetUsers : ['DEVELOPERS', 'USERS', 'STAKEHOLDERS'],
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
        features: data.mainFeatures.length > 0 ? data.mainFeatures : ['Feature 1', 'Feature 2', 'Feature 3'],
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
        ]
      }
    ],
    technologies: techStack.selected.map((tech, index) => ({
      name: tech,
      category: index === 0 ? 'FRONTEND' : (index === 1 ? 'BACKEND' : 'DATABASE'),
      purpose: `Core ${index === 0 ? 'frontend' : (index === 1 ? 'backend' : 'data storage')} technology`
    }))
  };
  
  // Add document-specific data based on the type
  switch (type) {
    case 'prd':
      return {
        ...baseData,
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
        developmentApproach: `We will use an iterative approach to develop ${projectInfo.name}, focusing on delivering value early and often. The team will follow Agile methodologies with two-week sprints and regular stakeholder reviews.`
      };
    
    case 'srs':
      return {
        ...baseData,
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
        ]
      };
    
    case 'sad':
      return {
        ...baseData,
        directoryStructure: [
          '├── src/                           # Source code',
          '│   ├── components/               # UI components',
          '│   ├── services/                 # Business logic',
          '│   └── utils/                    # Utility functions',
          '├── docs/                         # Documentation',
          '├── tests/                        # Test files',
          '└── README.md                     # Project overview'
        ],
        algorithms: [
          { name: 'Data Processing Algorithm', description: 'Processes input data efficiently' },
          { name: 'Smart Recommendation Engine', description: 'Provides intelligent recommendations' }
        ],
        workflows: [
          {
            name: 'User Onboarding',
            steps: [
              'User signs up',
              'System validates user information',
              'User receives confirmation email',
              'User completes profile'
            ]
          }
        ]
      };
    
    case 'sdd':
      return {
        ...baseData,
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
        functionalRequirementsMapping: [
          { reqId: 'FR-1.1', componentId: 'COMP001', coverage: 'FULL', verificationMethod: 'UNIT_TEST' }
        ]
      };
    
    case 'stp':
      return {
        ...baseData,
        testObjectives: [
          { description: 'Verify all functional requirements are met', priority: 'HIGH', successCriteria: 'All test cases pass' },
          { description: 'Ensure performance meets specifications', priority: 'MEDIUM', successCriteria: 'Response times within limits' }
        ],
        testScope: {
          description: 'Comprehensive testing of all system components',
          inScope: ['Functional testing', 'Performance testing', 'Security testing'],
          outOfScope: ['Load testing', 'Stress testing']
        },
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
        requirementsTraceability: [
          { reqId: 'FR-1.1', testCaseIds: 'TC-1.0', coverageStatus: 'COVERED' }
        ]
      };
      
    default:
      return baseData;
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