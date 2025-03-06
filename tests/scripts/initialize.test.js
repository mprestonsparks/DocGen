/**
 * Tests for initialize.js script
 */
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const yaml = require('js-yaml');
const { exec } = require('child_process');

// Mock modules
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn(path => path.split('/').pop())
}));
jest.mock('inquirer');
jest.mock('js-yaml');
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => callback(null, 'mocked exec output'))
}));

// Mock LLM and session utilities
jest.mock('../../utils/llm', () => ({
  isLLMApiAvailable: jest.fn().mockReturnValue(true),
  recommendTechnologies: jest.fn().mockResolvedValue({
    frontend: ['React'],
    backend: ['Node.js'],
    database: ['MongoDB'],
    devops: ['GitHub Actions']
  }),
  generateFollowUpQuestions: jest.fn().mockResolvedValue([
    'What is the target audience?',
    'What is the timeline?'
  ]),
  enhanceDocumentation: jest.fn().mockImplementation(content => Promise.resolve(`Enhanced: ${content}`))
}));

jest.mock('../../utils/session', () => ({
  generateSessionId: jest.fn().mockReturnValue('test-session-123'),
  saveSession: jest.fn(),
  loadSession: jest.fn().mockReturnValue({
    projectInfo: {
      id: 'PROJ-001',
      name: 'Test Project',
      description: 'A test project description',
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
    interviewAnswers: {}
  }),
  listSessions: jest.fn().mockReturnValue([
    { sessionId: 'test-session-123', projectName: 'Test Project', lastUpdated: '2023-01-01T00:00:00Z' }
  ])
}));

// Mock commander
jest.mock('commander', () => {
  const mockProgram = {
    option: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnValue({
      resume: undefined,
      list: undefined,
      type: undefined,
      name: undefined
    })
  };
  return mockProgram;
});

// Import the script after mocking
const initializeScriptPath = require.resolve('../../scripts/initialize');
let initialize;

describe('initialize.js', () => {
  // Mocks for console.log and process.exit
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  let consoleOutput = [];
  let exitCode;

  beforeAll(() => {
    // Mock console methods
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
    
    // Mock process.exit
    process.exit = jest.fn(code => {
      exitCode = code;
      throw new Error(`Process exited with code ${code}`);
    });
    
    // Reset module cache to allow reloading the module
    jest.resetModules();
  });
  
  afterAll(() => {
    // Restore original methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    consoleOutput = [];
    exitCode = undefined;
    
    // Set up common mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.mkdirSync = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.readFileSync = jest.fn().mockReturnValue('{}');
    
    // Mock yaml.load to return default project config
    yaml.load = jest.fn().mockReturnValue({
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
    });
    
    // Mock inquirer prompts
    inquirer.prompt = jest.fn()
      // First prompt - for project info
      .mockResolvedValueOnce({
        name: 'Test Project',
        description: 'A test project description',
        type: 'WEB'
      })
      // Technology selection prompt
      .mockResolvedValueOnce({
        selectedTech: ['React', 'Node.js']
      })
      // Documentation type selection
      .mockResolvedValueOnce({
        coreDocs: ['prd', 'srs'],
        additionalDocs: []
      })
      // Follow-up question 1
      .mockResolvedValueOnce({
        response: 'General users'
      })
      // Follow-up question 2
      .mockResolvedValueOnce({
        response: '3 months'
      });
    
    // Since process.exit might be called, reload the module for each test
    jest.resetModules();
    initialize = require(initializeScriptPath);
  });
  
  it('should load project defaults', () => {
    // Execute
    const defaults = initialize.loadProjectDefaults();
    
    // Verify
    expect(yaml.load).toHaveBeenCalled();
    expect(defaults).toHaveProperty('schema_versions');
    expect(defaults).toHaveProperty('project_types');
  });
  
  it('should handle missing config file for project defaults', () => {
    // Setup
    fs.existsSync = jest.fn().mockReturnValue(false);
    
    // Execute
    const defaults = initialize.loadProjectDefaults();
    
    // Verify
    expect(defaults).toHaveProperty('schema_versions');
    expect(defaults).toHaveProperty('project_types');
  });
  
  it('should create project structure with required directories', () => {
    // Setup
    const projectConfig = {
      name: 'Test Project',
      description: 'A test project description',
      type: 'WEB'
    };
    
    // Execute
    initialize.createProjectStructure(projectConfig);
    
    // Verify directories were created
    expect(fs.mkdirSync).toHaveBeenCalled();
    
    // Verify that a README was created
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.writeFileSync.mock.calls[0][1]).toContain('Test Project');
  });
  
  it('should set up config files appropriately', () => {
    // Setup
    const projectConfig = {
      name: 'Test Project',
      description: 'A test project description',
      type: 'WEB'
    };
    
    // Execute
    initialize.setupConfigFiles(projectConfig);
    
    // Verify config files were created
    expect(fs.writeFileSync).toHaveBeenCalled();
    
    // At least one call should create a yaml file
    const yamlFileCall = fs.writeFileSync.mock.calls.find(
      call => typeof call[0] === 'string' && call[0].endsWith('.yaml')
    );
    expect(yamlFileCall).toBeDefined();
  });
  
  it('should initialize a project through the interview process', async () => {
    // Execute
    await initialize.initializeProject();
    
    // Verify
    expect(inquirer.prompt).toHaveBeenCalled();
    
    // Verify project structure was created
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
  
  it('should resume an existing interview session', async () => {
    // Setup - mock commander return value
    const mockCommander = require('commander');
    mockCommander.parse.mockReturnValue({
      resume: 'test-session-123',
      list: undefined,
      type: undefined,
      name: undefined
    });
    
    // Execute
    try {
      await initialize.main();
    } catch (e) {
      // Ignore any process.exit errors
    }
    
    // Verify
    const sessionUtil = require('../../utils/session');
    expect(sessionUtil.loadSession).toHaveBeenCalledWith('test-session-123');
    expect(consoleOutput.join('\n')).toContain('Resumed session');
  });
  
  it('should list available interview sessions', async () => {
    // Setup - mock commander return value
    const mockCommander = require('commander');
    mockCommander.parse.mockReturnValue({
      resume: undefined,
      list: true,
      type: undefined,
      name: undefined
    });
    
    // Execute
    try {
      await initialize.main();
    } catch (e) {
      // Ignore any process.exit errors
    }
    
    // Verify
    const sessionUtil = require('../../utils/session');
    expect(sessionUtil.listSessions).toHaveBeenCalled();
    expect(consoleOutput.join('\n')).toContain('Available sessions');
  });
  
  it('should handle tech stack recommendations', async () => {
    // Execute
    const projectInfo = {
      id: 'PROJ-001',
      name: 'Test Project',
      description: 'A test project description',
      type: 'WEB',
      created: '2023-01-01T00:00:00Z'
    };
    
    const techStack = await initialize.recommendTechnologyStack(projectInfo);
    
    // Verify
    const llmUtil = require('../../utils/llm');
    expect(llmUtil.recommendTechnologies).toHaveBeenCalled();
    expect(techStack).toHaveProperty('recommended');
    expect(techStack).toHaveProperty('selected');
  });
  
  it('should assess documentation needs based on project info', async () => {
    // Execute
    const projectInfo = {
      id: 'PROJ-001',
      name: 'Test Project',
      description: 'A test project description',
      type: 'WEB',
      created: '2023-01-01T00:00:00Z'
    };
    
    const techStack = {
      recommended: ['React', 'Node.js'],
      selected: ['React', 'Node.js']
    };
    
    const documentationNeeds = await initialize.assessDocumentationNeeds(projectInfo, techStack);
    
    // Verify
    expect(inquirer.prompt).toHaveBeenCalled();
    expect(documentationNeeds).toHaveProperty('prd');
    expect(documentationNeeds).toHaveProperty('srs');
    expect(documentationNeeds).toHaveProperty('additional');
  });
  
  it('should handle follow-up questions', async () => {
    // Setup
    const questions = [
      'What is the target audience?',
      'What is the timeline?'
    ];
    
    const interviewAnswers = {};
    
    // Execute
    await initialize.askFollowUpQuestions(questions, interviewAnswers);
    
    // Verify
    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    expect(interviewAnswers).toHaveProperty('What is the target audience?');
    expect(interviewAnswers).toHaveProperty('What is the timeline?');
  });
  
  it('should generate documentation based on project info', async () => {
    // Setup
    const projectInfo = {
      id: 'PROJ-001',
      name: 'Test Project',
      description: 'A test project description',
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
    
    // Execute
    await initialize.generateDocumentation(projectInfo, techStack, documentationNeeds, interviewAnswers);
    
    // Verify
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});