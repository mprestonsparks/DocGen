/**
 * Comprehensive tests for src/index.ts
 */
import path from 'path';
import fs from 'fs';
import inquirer from 'inquirer';
import yaml from 'js-yaml';

// Need to mock all the imports in index.ts
jest.mock('commander', () => {
  // Create a commander mock with all the needed functions
  interface CommanderMock {
    version: jest.Mock;
    description: jest.Mock;
    command: jest.Mock;
    option: jest.Mock;
    action: jest.Mock;
    parse: jest.Mock;
    outputHelp: jest.Mock;
    commandResult: any;
  }
  
  // Each command needs its own set of methods (option, action, etc.)
  interface CommandMock {
    option: jest.Mock;
    action: jest.Mock;
    description: jest.Mock;
  }
  
  const createCommandMock = (): CommandMock => ({
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis()
  });
  
  // Store the action callbacks for later use in tests
  const actionCallbacks: Record<string, Function> = {};
  
  // Command mock
  const commandMock = createCommandMock();
  
  // Program mock
  const programMock: CommanderMock = {
    version: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    command: jest.fn((name) => {
      return {
        ...commandMock,
        action: jest.fn((cb) => {
          actionCallbacks[name] = cb;
          return commandMock;
        })
      };
    }),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
    outputHelp: jest.fn(),
    commandResult: {}
  };
  
  return {
    program: programMock,
    _actionCallbacks: actionCallbacks
  };
});

// Mock path
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn(path => `/resolved/${path}`)
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('mock file content'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// Mock inquirer
jest.mock('inquirer', () => ({
  prompt: jest.fn().mockResolvedValue({
    name: 'Test Project',
    description: 'A test project',
    type: 'WEB'
  })
}));

// Mock js-yaml
jest.mock('js-yaml', () => ({
  load: jest.fn().mockReturnValue({
    schema_versions: { prd: '1.0.0', srs: '1.0.0' },
    document_versions: { prd: '1.0.0', srs: '1.0.0' },
    document_statuses: ['DRAFT', 'REVIEW', 'APPROVED'],
    project_types: {
      WEB: { recommended_docs: ['prd', 'srs'] },
      MOBILE: { recommended_docs: ['prd', 'srs'] },
      API: { recommended_docs: ['prd', 'srs'] },
      DESKTOP: { recommended_docs: ['prd', 'srs'] },
      OTHER: { recommended_docs: ['prd', 'srs'] }
    }
  })
}));

// Mock utilities
jest.mock('../src/utils/config', () => ({
  getOutputDir: jest.fn().mockReturnValue('/mock/output'),
  getTemplateDir: jest.fn().mockReturnValue('/mock/templates'),
  ensureDirectoriesExist: jest.fn(),
  isAIEnhancementEnabled: jest.fn().mockReturnValue(true),
  getLogFilePath: jest.fn().mockReturnValue('/mock/logs/docgen.log'),
  getLogLevel: jest.fn().mockReturnValue('info')
}));

jest.mock('../src/utils/llm', () => ({
  isLLMApiAvailable: jest.fn().mockReturnValue(true),
  callLLM: jest.fn().mockResolvedValue({ content: 'LLM response', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } }),
  recommendTechnologies: jest.fn().mockResolvedValue({
    frontend: ['React'],
    backend: ['Node.js'],
    database: ['MongoDB'],
    devops: ['GitHub Actions']
  }),
  generateFollowUpQuestions: jest.fn().mockResolvedValue([
    'What are the key technical requirements?',
    'Who are the target users?'
  ]),
  enhanceDocumentation: jest.fn().mockImplementation((content) => Promise.resolve(`Enhanced: ${content}`))
}));

jest.mock('../src/utils/session', () => ({
  generateSessionId: jest.fn().mockReturnValue('test-session-12345678'),
  saveSession: jest.fn(),
  loadSession: jest.fn().mockReturnValue({
    projectInfo: {
      id: 'PROJ-001',
      name: 'Test Project',
      description: 'A test project',
      type: 'WEB',
      created: '2023-01-01T00:00:00Z'
    },
    techStack: {
      recommended: ['React', 'Node.js'],
      selected: ['React', 'Node.js']
    },
    documentationNeeds: {
      prd: true,
      srs: true,
      sad: false,
      sdd: false,
      stp: false,
      additional: []
    },
    interviewAnswers: {},
    _lastUpdated: '2023-01-01T00:00:00Z'
  }),
  listSessions: jest.fn().mockReturnValue([
    { sessionId: 'test-session-12345678', projectName: 'Test Project', lastUpdated: '2023-01-01T00:00:00Z' }
  ]),
  deleteSession: jest.fn()
}));

jest.mock('../src/utils/validation', () => ({
  validateDocument: jest.fn().mockReturnValue({
    isValid: true,
    errors: [],
    warnings: []
  }),
  validateAllDocuments: jest.fn().mockReturnValue({
    '/mock/output/test-project-prd.md': {
      isValid: true,
      errors: [],
      warnings: []
    }
  })
}));

jest.mock('../src/utils/generator', () => ({
  generateDocument: jest.fn().mockResolvedValue('/mock/output/test-project-prd.md'),
  generateAllDocuments: jest.fn().mockResolvedValue(['/mock/output/test-project-prd.md', '/mock/output/test-project-srs.md'])
}));

jest.mock('../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
}));

// Import the module after mocking
const indexModulePath = '../src/index';

// Helper type for Action Callbacks
type ActionCallbacks = Record<string, Function>;

describe('Main CLI Module', () => {
  let commander: any;
  let actionCallbacks: ActionCallbacks;
  
  // Save original process.argv and process.exit
  const originalArgv = process.argv;
  const originalExit = process.exit;
  let exitCode: number | undefined;

  beforeAll(() => {
    // Mock process.exit
    process.exit = jest.fn((code?: number) => {
      exitCode = code;
      throw new Error(`Process exited with code ${code}`);
    }) as any;
    
    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Load the module
    require(indexModulePath);
    
    // Get the mocked commander module and action callbacks
    commander = require('commander');
    actionCallbacks = commander._actionCallbacks;
  });
  
  afterAll(() => {
    // Restore original process.argv and process.exit
    process.argv = originalArgv;
    process.exit = originalExit;
    
    // Restore console.log
    jest.restoreAllMocks();
  });
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    exitCode = undefined;
  });
  
  describe('CLI Setup', () => {
    it('should initialize the CLI program', () => {
      // Verify program setup
      expect(commander.program.version).toHaveBeenCalledWith('1.0.0');
      expect(commander.program.description).toHaveBeenCalledWith('DocGen - AI-optimized documentation template system');
      expect(commander.program.parse).toHaveBeenCalled();
    });
    
    it('should set up the interview command', () => {
      // Verify the interview command was set up
      expect(commander.program.command).toHaveBeenCalledWith('interview');
      expect(actionCallbacks.interview).toBeDefined();
    });
    
    it('should set up the validate command', () => {
      // Verify the validate command was set up
      expect(commander.program.command).toHaveBeenCalledWith('validate');
      expect(actionCallbacks.validate).toBeDefined();
    });
  });
  
  describe('Command Handlers', () => {
    it('should handle interview command', async () => {
      // Call the interview command handler
      await actionCallbacks.interview({});
      
      // Verify that inquirer was called for project info
      expect(inquirer.prompt).toHaveBeenCalled();
      
      // Verify session was saved
      const sessionUtil = require('../src/utils/session');
      expect(sessionUtil.saveSession).toHaveBeenCalled();
    });
    
    it('should handle interview command with resume option', async () => {
      // Call the interview command handler with resume option
      await actionCallbacks.interview({ resume: 'test-session-12345678' });
      
      // Verify session was loaded
      const sessionUtil = require('../src/utils/session');
      expect(sessionUtil.loadSession).toHaveBeenCalledWith('test-session-12345678');
    });
    
    it('should handle interview command with list option', async () => {
      // Call the interview command handler with list option
      await actionCallbacks.interview({ list: true });
      
      // Verify sessions were listed
      const sessionUtil = require('../src/utils/session');
      expect(sessionUtil.listSessions).toHaveBeenCalled();
    });
    
    it('should handle validate command with file option', async () => {
      // Call the validate command handler with file option
      await actionCallbacks.validate({ file: '/path/to/doc.md' });
      
      // Verify document was validated
      const validationUtil = require('../src/utils/validation');
      expect(validationUtil.validateDocument).toHaveBeenCalledWith('/resolved//path/to/doc.md');
    });
    
    it('should handle validate command with all option', async () => {
      // Call the validate command handler with all option
      await actionCallbacks.validate({ all: true });
      
      // Verify all documents were validated
      const validationUtil = require('../src/utils/validation');
      expect(validationUtil.validateAllDocuments).toHaveBeenCalled();
    });
  });
  
  describe('Helper Functions', () => {
    const index = require(indexModulePath);
    
    it('should load project defaults', () => {
      // Execute
      const defaults = index.loadProjectDefaults();
      
      // Verify
      expect(yaml.load).toHaveBeenCalled();
      expect(defaults).toHaveProperty('schema_versions');
      expect(defaults).toHaveProperty('project_types');
    });
    
    it('should handle missing config file for project defaults', () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      
      // Execute
      const defaults = index.loadProjectDefaults();
      
      // Verify that we get default values
      expect(defaults).toHaveProperty('schema_versions');
      expect(defaults).toHaveProperty('project_types');
    });
    
    it('should gather basic project info', async () => {
      // Setup
      (inquirer.prompt as jest.Mock).mockResolvedValueOnce({
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB'
      });
      
      // Execute
      const projectInfo = await index.gatherBasicProjectInfo({});
      
      // Verify
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(projectInfo).toHaveProperty('name', 'Test Project');
      expect(projectInfo).toHaveProperty('description', 'A test project');
      expect(projectInfo).toHaveProperty('type', 'WEB');
      expect(projectInfo).toHaveProperty('id');
      expect(projectInfo).toHaveProperty('created');
    });
    
    it('should use command line arguments when provided', async () => {
      // Execute
      const projectInfo = await index.gatherBasicProjectInfo({
        name: 'CLI Project',
        type: 'API'
      });
      
      // Verify
      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(projectInfo).toHaveProperty('name', 'CLI Project');
      expect(projectInfo).toHaveProperty('type', 'API');
    });
    
    it('should recommend technology stack', async () => {
      // Setup
      const projectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2023-01-01T00:00:00Z'
      };
      
      const llmUtil = require('../src/utils/llm');
      
      // Execute
      const techStack = await index.recommendTechnologyStack(projectInfo);
      
      // Verify
      expect(llmUtil.recommendTechnologies).toHaveBeenCalledWith(projectInfo);
      expect(techStack).toHaveProperty('recommended');
      expect(techStack).toHaveProperty('selected');
    });
    
    it('should handle fallback technology recommendations when LLM is not available', async () => {
      // Setup
      const projectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2023-01-01T00:00:00Z'
      };
      
      const llmUtil = require('../src/utils/llm');
      llmUtil.isLLMApiAvailable.mockReturnValueOnce(false);
      
      // Execute
      const techStack = await index.recommendTechnologyStack(projectInfo);
      
      // Verify
      expect(llmUtil.recommendTechnologies).not.toHaveBeenCalled();
      expect(techStack).toHaveProperty('recommended');
      expect(techStack).toHaveProperty('selected');
    });
    
    it('should handle fallback for mobile-specific tech stack', async () => {
      // Setup
      const projectInfo = {
        id: 'PROJ-001',
        name: 'Mobile App',
        description: 'A mobile app',
        type: 'MOBILE',
        created: '2023-01-01T00:00:00Z'
      };
      
      const llmUtil = require('../src/utils/llm');
      llmUtil.isLLMApiAvailable.mockReturnValueOnce(false);
      
      // Setup inquiry response for mobile type
      (inquirer.prompt as jest.Mock).mockResolvedValueOnce({
        mobileType: 'iOS (Swift)'
      });
      
      // Execute
      const techStack = await index.recommendTechnologyStack(projectInfo);
      
      // Verify we asked about mobile type
      expect(inquirer.prompt).toHaveBeenCalled();
      
      // Verify Swift was included for iOS
      expect(techStack.recommended).toContain('Swift');
    });
    
    it('should assess documentation needs', async () => {
      // Setup
      const projectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2023-01-01T00:00:00Z'
      };
      
      const techStack = {
        recommended: ['React', 'Node.js'],
        selected: ['React', 'Node.js']
      };
      
      // Mock inquirer for documentation selection
      (inquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({
          coreDocs: ['prd', 'srs'],
          additionalDocs: []
        });
      
      // Execute
      const docNeeds = await index.assessDocumentationNeeds(projectInfo, techStack);
      
      // Verify
      expect(inquirer.prompt).toHaveBeenCalled();
      expect(docNeeds).toHaveProperty('prd', true);
      expect(docNeeds).toHaveProperty('srs', true);
      expect(docNeeds).toHaveProperty('additional');
    });
    
    it('should handle tech-specific documentation needs', async () => {
      // Setup
      const projectInfo = {
        id: 'PROJ-001',
        name: 'React App',
        description: 'A React app',
        type: 'WEB',
        created: '2023-01-01T00:00:00Z'
      };
      
      const techStack = {
        recommended: ['React', 'Express'],
        selected: ['React', 'Express']
      };
      
      // Mock inquirer for documentation selection
      (inquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({
          coreDocs: ['prd', 'srs'],
          additionalDocs: ['COMPONENT_LIBRARY', 'API_DOCUMENTATION']
        });
      
      // Execute
      const docNeeds = await index.assessDocumentationNeeds(projectInfo, techStack);
      
      // Verify
      expect(docNeeds.additional).toContain('COMPONENT_LIBRARY');
      expect(docNeeds.additional).toContain('API_DOCUMENTATION');
    });
    
    it('should ask follow-up questions', async () => {
      // Setup
      const questions = [
        'What is the target audience?',
        'What is the timeline?'
      ];
      
      const interviewAnswers = {};
      
      // Mock inquirer for answers
      (inquirer.prompt as jest.Mock)
        .mockResolvedValueOnce({ response: 'General users' })
        .mockResolvedValueOnce({ response: '3 months' });
      
      // Execute
      await index.askFollowUpQuestions(questions, interviewAnswers);
      
      // Verify
      expect(inquirer.prompt).toHaveBeenCalledTimes(2);
      expect(interviewAnswers).toEqual({
        'What is the target audience?': 'General users',
        'What is the timeline?': '3 months'
      });
    });
    
    it('should handle empty question list', async () => {
      // Setup
      const questions: string[] = [];
      const interviewAnswers = {};
      
      // Execute
      await index.askFollowUpQuestions(questions, interviewAnswers);
      
      // Verify
      expect(inquirer.prompt).not.toHaveBeenCalled();
      expect(interviewAnswers).toEqual({});
    });
    
    it('should generate documentation', async () => {
      // Setup
      const projectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2023-01-01T00:00:00Z'
      };
      
      const techStack = {
        recommended: ['React', 'Node.js'],
        selected: ['React', 'Node.js']
      };
      
      const documentationNeeds = {
        prd: true,
        srs: true,
        sad: false,
        sdd: false,
        stp: false,
        additional: []
      };
      
      const interviewAnswers = {
        'What is the target audience?': 'General users',
        'What is the timeline?': '3 months'
      };
      
      const generatorUtil = require('../src/utils/generator');
      
      // Execute
      await index.generateDocumentation(projectInfo, techStack, documentationNeeds, interviewAnswers);
      
      // Verify
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(generatorUtil.generateDocument).toHaveBeenCalledTimes(2); // prd and srs
    });
    
    it('should include Swift-specific documentation for Swift projects', async () => {
      // Setup
      const projectInfo = {
        id: 'PROJ-001',
        name: 'iOS App',
        description: 'An iOS app',
        type: 'MOBILE',
        created: '2023-01-01T00:00:00Z'
      };
      
      const techStack = {
        recommended: ['Swift', 'Core Data'],
        selected: ['Swift', 'Core Data']
      };
      
      const documentationNeeds = {
        prd: true,
        srs: false,
        sad: false,
        sdd: false,
        stp: false,
        additional: []
      };
      
      const interviewAnswers = {};
      
      const generatorUtil = require('../src/utils/generator');
      
      // Execute
      await index.generateDocumentation(projectInfo, techStack, documentationNeeds, interviewAnswers);
      
      // Verify Swift-specific doc was generated
      expect(generatorUtil.generateDocument).toHaveBeenCalledWith('swift-sdd', projectInfo, techStack, interviewAnswers);
    });
    
    it('should display validation result', () => {
      // Setup
      const filePath = '/path/to/doc.md';
      const result = {
        isValid: false,
        errors: [{ message: 'Error 1', code: 'E001' }],
        warnings: [{ message: 'Warning 1', code: 'W001' }]
      };
      
      // Log output capturing
      const consoleLogSpy = jest.spyOn(console, 'log');
      
      // Execute
      index.displayValidationResult(filePath, result);
      
      // Verify
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error 1'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning 1'));
    });
    
    it('should display all validation results', () => {
      // Setup
      const results = {
        '/path/to/doc1.md': {
          isValid: true,
          errors: [],
          warnings: []
        },
        '/path/to/doc2.md': {
          isValid: false,
          errors: [{ message: 'Error 1', code: 'E001' }],
          warnings: [{ message: 'Warning 1', code: 'W001' }]
        }
      };
      
      // Log output capturing
      const consoleLogSpy = jest.spyOn(console, 'log');
      
      // Execute
      index.displayAllValidationResults(results);
      
      // Verify
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1/2 documents are valid'));
    });
    
    it('should create basic template', () => {
      // Setup
      const type = 'custom-doc';
      const projectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2023-01-01T00:00:00Z'
      };
      
      // Execute
      const template = index.createBasicTemplate(type, projectInfo);
      
      // Verify
      expect(template).toContain('# Test Project CUSTOM-DOC Document');
      expect(template).toContain('id: "DOC-CUSTOM-DOC-001"');
      expect(template).toContain('project:');
      expect(template).toContain(`id: "${projectInfo.id}"`);
    });
    
    it('should use predefined document titles when available', () => {
      // Setup
      const type = 'prd';
      const projectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2023-01-01T00:00:00Z'
      };
      
      // Execute
      const template = index.createBasicTemplate(type, projectInfo);
      
      // Verify
      expect(template).toContain('# Test Project Product Requirements Document');
    });
  });
});