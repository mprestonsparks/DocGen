/**
 * Tests for type definitions
 */
import * as types from '../src/types';

describe('Type Definitions', () => {
  describe('ProjectInfo', () => {
    it('should correctly validate a ProjectInfo object', () => {
      const validProject: types.ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project for DocGen',
        type: 'WEB',
        created: '2023-05-01'
      };
      
      // Type assertion test - if this compiles, the test passes
      expect(validProject).toBeDefined();
      expect(validProject.id).toBe('PROJ-001');
      expect(validProject.type).toBe('WEB');
    });
  });

  describe('ProjectType', () => {
    it('should only allow valid project types', () => {
      const validTypes: types.ProjectType[] = ['WEB', 'MOBILE', 'API', 'DESKTOP', 'OTHER'];
      validTypes.forEach(type => {
        expect(validTypes.includes(type)).toBe(true);
      });
      
      // This is a compile-time check - if it compiles, the test passes
      // @ts-expect-error - testing invalid types
      const invalidType: types.ProjectType = 'INVALID';
    });
  });

  describe('MobilePlatformType', () => {
    it('should only allow valid mobile platform types', () => {
      const validPlatforms: types.MobilePlatformType[] = [
        'Cross-platform',
        'iOS (Swift)',
        'Android (Kotlin/Java)'
      ];
      
      validPlatforms.forEach(platform => {
        expect(validPlatforms.includes(platform)).toBe(true);
      });
      
      // This is a compile-time check - if it compiles, the test passes
      // @ts-expect-error - testing invalid types
      const invalidPlatform: types.MobilePlatformType = 'Windows Phone';
    });
  });

  describe('TechStackRecommendations', () => {
    it('should correctly structure tech stack recommendations', () => {
      const recommendations: types.TechStackRecommendations = {
        frontend: ['React', 'Vue.js'],
        backend: ['Node.js', 'Express'],
        database: ['MongoDB', 'PostgreSQL'],
        mobile: ['React Native', 'Swift'],
        devops: ['GitHub Actions', 'Docker']
      };
      
      expect(recommendations.frontend).toContain('React');
      expect(recommendations.backend).toContain('Node.js');
      expect(recommendations.database).toContain('MongoDB');
      expect(recommendations.mobile).toContain('React Native');
      expect(recommendations.devops).toContain('GitHub Actions');
    });
    
    it('should allow partial recommendations', () => {
      const partialRecommendations: types.TechStackRecommendations = {
        frontend: ['React'],
        backend: ['Node.js']
      };
      
      expect(partialRecommendations.frontend).toBeDefined();
      expect(partialRecommendations.backend).toBeDefined();
      expect(partialRecommendations.database).toBeUndefined();
      expect(partialRecommendations.mobile).toBeUndefined();
      expect(partialRecommendations.devops).toBeUndefined();
    });
  });

  describe('TechStack', () => {
    it('should correctly structure tech stack selection', () => {
      const techStack: types.TechStack = {
        recommended: ['React', 'Vue.js', 'Node.js', 'Express', 'MongoDB'],
        selected: ['React', 'Node.js', 'MongoDB']
      };
      
      expect(techStack.recommended.length).toBeGreaterThanOrEqual(techStack.selected.length);
      expect(techStack.recommended).toContain('React');
      expect(techStack.selected).toContain('React');
    });
  });

  describe('DocumentationNeeds', () => {
    it('should correctly specify documentation needs', () => {
      const docNeeds: types.DocumentationNeeds = {
        prd: true,
        srs: true,
        sad: false,
        sdd: true,
        stp: false,
        additional: ['COMPONENT_LIBRARY', 'API_DOCUMENTATION']
      };
      
      expect(docNeeds.prd).toBe(true);
      expect(docNeeds.sad).toBe(false);
      expect(docNeeds.additional).toContain('COMPONENT_LIBRARY');
    });
  });

  describe('InterviewAnswers', () => {
    it('should store interview answers as key-value pairs', () => {
      const answers: types.InterviewAnswers = {
        'What are your main goals?': 'Improve documentation quality',
        'Who are your target users?': 'Software developers and architects'
      };
      
      expect(answers['What are your main goals?']).toBe('Improve documentation quality');
      expect(Object.keys(answers).length).toBe(2);
      
      // Test adding a new answer
      answers['What is your timeline?'] = 'Three months';
      expect(Object.keys(answers).length).toBe(3);
    });
  });

  describe('SessionData', () => {
    it('should properly structure session data', () => {
      const sessionData: types.SessionData = {
        projectInfo: {
          id: 'PROJ-001',
          name: 'Test Project',
          description: 'A test project for DocGen',
          type: 'WEB',
          created: '2023-05-01'
        },
        techStack: {
          recommended: ['React', 'Node.js'],
          selected: ['React', 'Express']
        },
        documentationNeeds: {
          prd: true,
          srs: true,
          sad: false,
          sdd: true,
          stp: false,
          additional: ['User Guide']
        },
        interviewAnswers: {
          'project-goals': 'Create a documentation generation system',
          'target-audience': 'Software developers'
        },
        _lastUpdated: '2023-05-15T12:00:00Z'
      };

      expect(sessionData).toBeDefined();
      expect(sessionData.projectInfo?.name).toBe('Test Project');
      expect(sessionData.techStack?.selected).toContain('React');
      expect(sessionData.documentationNeeds?.additional).toContain('User Guide');
      expect(sessionData._lastUpdated).toBe('2023-05-15T12:00:00Z');
    });

    it('should allow partial session data', () => {
      const partialSessionData: types.SessionData = {
        projectInfo: {
          id: 'PROJ-001',
          name: 'Test Project',
          description: 'A test project for DocGen',
          type: 'WEB',
          created: '2023-05-01'
        },
        interviewAnswers: {}
      };
      
      expect(partialSessionData.projectInfo).toBeDefined();
      expect(partialSessionData.techStack).toBeUndefined();
      expect(partialSessionData.documentationNeeds).toBeUndefined();
    });
  });

  describe('SessionMetadata', () => {
    it('should correctly structure session metadata', () => {
      const metadata: types.SessionMetadata = {
        sessionId: 'session-123456789',
        projectName: 'Test Project',
        lastUpdated: '2023-05-15T12:00:00Z'
      };
      
      expect(metadata.sessionId).toBe('session-123456789');
      expect(metadata.projectName).toBe('Test Project');
      expect(metadata.lastUpdated).toBe('2023-05-15T12:00:00Z');
    });
  });

  describe('LLMProvider and LLMConfig', () => {
    it('should only allow valid LLM providers', () => {
      const provider: types.LLMProvider = 'anthropic';
      expect(provider).toBe('anthropic');
      
      // This is a compile-time check - if it compiles, the test passes
      // @ts-expect-error - testing invalid provider
      const invalidProvider: types.LLMProvider = 'openai';
    });
    
    it('should correctly structure LLM configuration', () => {
      const config: types.LLMConfig = {
        provider: 'anthropic',
        model: 'claude-2',
        maxTokens: 2000,
        temperature: 0.7
      };
      
      expect(config.provider).toBe('anthropic');
      expect(config.model).toBe('claude-2');
      expect(config.maxTokens).toBe(2000);
      expect(config.temperature).toBe(0.7);
    });
  });

  describe('LLMResponse', () => {
    it('should correctly structure LLM response', () => {
      const response: types.LLMResponse = {
        content: 'Generated content from the LLM',
        usage: {
          promptTokens: 150,
          completionTokens: 250,
          totalTokens: 400
        }
      };
      
      expect(response.content).toBe('Generated content from the LLM');
      expect(response.usage.promptTokens).toBe(150);
      expect(response.usage.completionTokens).toBe(250);
      expect(response.usage.totalTokens).toBe(400);
    });
  });

  describe('EnhancementOptions', () => {
    it('should correctly structure document enhancement options', () => {
      const options: types.EnhancementOptions = {
        improveFormatting: true,
        addExamples: true,
        expandExplanations: false,
        addReferences: true,
        checkConsistency: true
      };
      
      expect(options.improveFormatting).toBe(true);
      expect(options.expandExplanations).toBe(false);
    });
    
    it('should allow partial enhancement options', () => {
      const partialOptions: types.EnhancementOptions = {
        improveFormatting: true,
        addExamples: false
      };
      
      expect(partialOptions.improveFormatting).toBe(true);
      expect(partialOptions.addExamples).toBe(false);
      expect(partialOptions.expandExplanations).toBeUndefined();
    });
  });

  describe('ValidationResult', () => {
    it('should correctly structure validation results', () => {
      const validationResult: types.ValidationResult = {
        isValid: false,
        errors: [
          {
            code: 'MISSING_REQUIRED_FIELD',
            message: 'Missing required field: id',
            location: 'metadata',
            severity: 'error'
          }
        ],
        warnings: [
          {
            code: 'RECOMMENDED_FIELD_MISSING',
            message: 'Recommended field missing: description',
            location: 'metadata',
            severity: 'warning'
          }
        ]
      };

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBe(1);
      expect(validationResult.errors[0].code).toBe('MISSING_REQUIRED_FIELD');
      expect(validationResult.warnings[0].severity).toBe('warning');
    });
    
    it('should handle valid document results', () => {
      const validResult: types.ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors.length).toBe(0);
      expect(validResult.warnings.length).toBe(0);
    });
  });

  describe('ValidationError and ValidationWarning', () => {
    it('should correctly structure validation errors', () => {
      const error: types.ValidationError = {
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Field "id" is required but missing',
        location: 'metadata.header',
        severity: 'error'
      };
      
      expect(error.code).toBe('REQUIRED_FIELD_MISSING');
      expect(error.severity).toBe('error');
    });
    
    it('should correctly structure validation warnings', () => {
      const warning: types.ValidationWarning = {
        code: 'RECOMMENDED_FIELD_MISSING',
        message: 'Field "description" is recommended but missing',
        location: 'metadata.content',
        severity: 'warning'
      };
      
      expect(warning.code).toBe('RECOMMENDED_FIELD_MISSING');
      expect(warning.severity).toBe('warning');
    });
  });

  describe('CrossReference', () => {
    it('should correctly structure cross-references', () => {
      const crossRef: types.CrossReference = {
        id: 'DOC-SRS-001',
        type: 'IMPLEMENTED_BY',
        description: 'Software Requirements Specification'
      };
      
      expect(crossRef.id).toBe('DOC-SRS-001');
      expect(crossRef.type).toBe('IMPLEMENTED_BY');
      expect(crossRef.description).toBe('Software Requirements Specification');
    });
  });

  describe('ProjectDefaults', () => {
    it('should correctly structure project defaults', () => {
      const defaults: types.ProjectDefaults = {
        schema_versions: {
          prd: '1.1.0',
          srs: '1.1.0',
          sad: '1.1.0',
          sdd: '1.1.0',
          stp: '1.1.0'
        },
        document_versions: {
          prd: '1.0.0',
          srs: '1.0.0',
          sad: '1.0.0',
          sdd: '1.0.0',
          stp: '1.0.0'
        },
        document_statuses: ['DRAFT', 'REVIEW', 'APPROVED'],
        project_types: {
          WEB: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] },
          MOBILE: { recommended_docs: ['prd', 'srs', 'sad', 'sdd', 'stp'] }
        }
      };
      
      expect(defaults.schema_versions.prd).toBe('1.1.0');
      expect(defaults.document_statuses).toContain('DRAFT');
      expect(defaults.project_types.WEB.recommended_docs).toContain('prd');
    });
  });

  describe('LogLevel', () => {
    it('should only allow valid log levels', () => {
      const levels: types.LogLevel[] = ['error', 'warn', 'info', 'debug', 'verbose'];
      
      levels.forEach(level => {
        expect(levels.includes(level)).toBe(true);
      });
      
      // This is a compile-time check - if it compiles, the test passes
      // @ts-expect-error - testing invalid log level
      const invalidLevel: types.LogLevel = 'critical';
    });
  });

  describe('TemplateData', () => {
    it('should validate a complete template data object', () => {
      const templateData: types.TemplateData = {
        documentVersion: '1.0.0',
        lastUpdated: '2023-05-15',
        status: 'DRAFT',
        projectId: 'PROJ-001',
        projectName: 'DocGen',
        projectDescription: 'Documentation Generation System',
        authorId: 'AUTH-001',
        visionStatement: 'To simplify software documentation',
        targetAudience: ['Developers', 'Project Managers'],
        systemScope: {
          includes: ['Document Generation', 'Template Management'],
          excludes: ['Version Control']
        },
        definitions: [
          {
            id: 'DEF-001',
            term: 'PRD',
            definition: 'Product Requirements Document',
            context: 'Software Engineering'
          }
        ],
        references: [
          {
            id: 'REF-001',
            title: 'IEEE Software Documentation Standards',
            source: 'IEEE',
            version: '2023',
            url: 'https://example.com/ieee'
          }
        ],
        objectives: [
          {
            description: 'Improve documentation quality',
            target: '95% compliance with standards',
            measurement: 'Automated validation'
          }
        ],
        challenges: [
          {
            description: 'Maintaining consistency across documents',
            impact: 'High',
            stakeholders: ['Developers', 'Users']
          }
        ],
        components: [
          {
            name: 'DocumentGenerator',
            purpose: 'Generate documentation from templates',
            features: ['Template processing', 'Output formatting'],
            responsibilities: ['Parse templates', 'Inject data'],
            dependencies: ['TemplateEngine'],
            requirementsImplemented: ['REQ-001', 'REQ-002'],
            classes: [
              {
                name: 'Generator',
                purpose: 'Core generation logic',
                properties: [
                  {
                    name: 'templatePath',
                    type: 'string'
                  }
                ],
                methods: [
                  {
                    name: 'generate'
                  }
                ]
              }
            ],
            interfaces: [
              {
                name: 'IGenerator',
                methods: [
                  {
                    returnType: 'Promise<string>',
                    name: 'generate',
                    parameters: [
                      {
                        type: 'TemplateData',
                        name: 'data'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        technologies: [
          {
            name: 'TypeScript',
            category: 'Language',
            purpose: 'Development'
          }
        ]
      };

      expect(templateData).toBeDefined();
      expect(templateData.projectName).toBe('DocGen');
      expect(templateData.targetAudience).toContain('Developers');
      expect(templateData.components[0].name).toBe('DocumentGenerator');
      expect(templateData.components[0].classes![0].name).toBe('Generator');
      expect(templateData.components[0].interfaces![0].name).toBe('IGenerator');
    });
    
    it('should allow using the indexer for extended fields', () => {
      const templateData: types.TemplateData = {
        documentVersion: '1.0.0',
        lastUpdated: '2023-05-15',
        status: 'DRAFT',
        projectId: 'PROJ-001',
        projectName: 'DocGen',
        projectDescription: 'Documentation Generation System',
        authorId: 'AUTH-001',
        visionStatement: 'To simplify documentation',
        targetAudience: ['Developers'],
        systemScope: {
          includes: ['Documentation'],
          excludes: []
        },
        definitions: [],
        references: [],
        objectives: [],
        challenges: [],
        components: [],
        technologies: []
      };
      
      // Test adding custom fields using indexer
      templateData['customField1'] = 'Custom value';
      templateData['customArray'] = ['Item 1', 'Item 2'];
      templateData['customObject'] = { key: 'value' };
      
      expect(templateData['customField1']).toBe('Custom value');
      expect(templateData['customArray']).toContain('Item 1');
      expect(templateData['customObject']).toHaveProperty('key', 'value');
    });
  });

  describe('DocumentGenerationOptions', () => {
    it('should properly structure document generation options', () => {
      const options: types.DocumentGenerationOptions = {
        templatePath: '/templates/prd.hbs',
        outputPath: '/output/prd.md',
        enhanceWithLLM: true,
        customOption: 'custom value'
      };
      
      expect(options.templatePath).toBe('/templates/prd.hbs');
      expect(options.outputPath).toBe('/output/prd.md');
      expect(options.enhanceWithLLM).toBe(true);
      expect(options['customOption']).toBe('custom value');
    });
    
    it('should handle minimal options', () => {
      const minOptions: types.DocumentGenerationOptions = {
        enhanceWithLLM: false
      };
      
      expect(minOptions.enhanceWithLLM).toBe(false);
      expect(minOptions.templatePath).toBeUndefined();
      expect(minOptions.outputPath).toBeUndefined();
    });
  });
});