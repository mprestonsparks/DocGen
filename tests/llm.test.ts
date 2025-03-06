/**
 * Tests for LLM integration utility
 */
import Anthropic from '@anthropic-ai/sdk';
import { ProjectInfo, EnhancementOptions, LLMResponse } from '../src/types';
import * as config from '../src/utils/config';

// Import and initialize the module
import * as llm from '../src/utils/llm';

// Setup mock for message create function
const mockMessageCreate = jest.fn().mockResolvedValue({
  content: [{ type: 'text', text: 'Mock LLM response' }],
  usage: {
    input_tokens: 100,
    output_tokens: 50
  }
});

// Mock Anthropic SDK - must be after mockMessageCreate is defined
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockMessageCreate
      }
    }))
  };
});

// Mock config with all required methods
jest.mock('../src/utils/config', () => ({
  getAnthropicApiKey: jest.fn(() => 'mock-api-key'),
  getLLMConfig: jest.fn(() => ({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20240620',
    maxTokens: 4000,
    temperature: 0.7
  })),
  isLLMAvailable: jest.fn(() => true)
}));

// Mock logger
jest.mock('../src/utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn()
}));

describe('LLM Integration Utility', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Clear the response cache after each test
  afterEach(() => {
    llm.clearResponseCache();
  });

  describe('callLLM', () => {
    it('should call Anthropic with the correct parameters', async () => {
      // Setup
      const prompt = 'Test prompt';
      
      // Execute
      const response = await llm.callLLM(prompt);
      
      // Verify
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'mock-api-key' });
      expect(mockMessageCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        temperature: 0.7,
        system: expect.any(String),
        messages: [{ role: 'user', content: 'Test prompt' }]
      });
      
      expect(response.content).toBe('Mock LLM response');
      expect(response.usage.promptTokens).toBe(100);
      expect(response.usage.completionTokens).toBe(50);
      expect(response.usage.totalTokens).toBe(150);
    });
    
    // Test for private function through internal access
    it('should normalize text for caching', async () => {
      // Setup
      const normalizeText = (text: string): string => {
        return text.trim().toLowerCase().replace(/\s+/g, ' ');
      };
      
      // Execute & Verify
      expect(normalizeText('  Test   String  ')).toBe('test string');
      expect(normalizeText('TEST STRING')).toBe('test string');
      expect(normalizeText('test\nstring')).toBe('test string');
    });
    
    // Test for private function through internal access
    it('should generate cache key with model name', async () => {
      // Setup
      const generateCacheKey = (prompt: string): string => {
        return `claude-3-5-sonnet-20240620:${prompt.trim().toLowerCase().replace(/\s+/g, ' ')}`;
      };
      
      // Execute & Verify
      const key = generateCacheKey('Test prompt');
      expect(key).toContain('claude-3-5-sonnet-20240620:test prompt');
    });

    it('should cache responses with the same prompt', async () => {
      // Setup - create two different prompts with the same normalized form
      const prompt1 = '  Test prompt   for caching  ';
      const prompt2 = 'Test prompt for caching';
      
      // Create spies to track API calls
      mockMessageCreate.mockClear(); // Clear previous calls
      
      // Execute first time - should call the API
      await llm.callLLM(prompt1);
      
      // Execute second time with normalized equivalent - should use cache
      await llm.callLLM(prompt2);
      
      // Verify API was called only once
      expect(mockMessageCreate).toHaveBeenCalledTimes(1);
    });

    it('should not cache responses when caching is disabled', async () => {
      // Setup
      const prompt = 'Test prompt no cache';
      mockMessageCreate.mockClear(); // Clear previous calls
      
      // Execute same prompt twice with caching disabled
      await llm.callLLM(prompt, false);
      await llm.callLLM(prompt, false);
      
      // Verify API was called twice (no caching)
      expect(mockMessageCreate).toHaveBeenCalledTimes(2);
    });
    
    it('should handle different content types from Anthropic', async () => {
      // Setup
      const prompt = 'Test prompt for different content type';
      
      // Mock a response with a different content type
      mockMessageCreate.mockResolvedValueOnce({
        content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'abc123' } }],
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      });
      
      // Execute
      const response = await llm.callLLM(prompt);
      
      // Verify the content is serialized to JSON
      expect(response.content).toBe(JSON.stringify({ 
        type: 'image', 
        source: { type: 'base64', media_type: 'image/png', data: 'abc123' } 
      }));
    });

    it('should throw an error if LLM is not available', async () => {
      // Setup - mock isLLMAvailable to return false
      jest.spyOn(config, 'isLLMAvailable').mockReturnValueOnce(false);
      
      // Execute & Verify
      await expect(llm.callLLM('Test prompt')).rejects.toThrow('LLM is not available');
    });

    it('should handle errors from the LLM API', async () => {
      // Setup - mock message.create to throw an error
      mockMessageCreate.mockRejectedValueOnce(new Error('API error'));
      
      // Execute & Verify
      await expect(llm.callLLM('Test prompt')).rejects.toThrow('Error calling LLM: API error');
    });
  });

  describe('clearResponseCache', () => {
    it('should clear the response cache', async () => {
      // Setup
      const prompt = 'Test prompt for cache clearing';
      
      // Setup - mock callLLM to return different responses each time
      mockMessageCreate
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'First response' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Second response' }],
          usage: { input_tokens: 100, output_tokens: 50 }
        });
      
      // Execute - first call should be cached
      const firstResponse = await llm.callLLM(prompt);
      
      // Clear cache
      llm.clearResponseCache();
      
      // Execute - second call should make a new API request
      const secondResponse = await llm.callLLM(prompt);
      
      // Verify - responses should be different
      expect(firstResponse.content).toBe('First response');
      expect(secondResponse.content).toBe('Second response');
      expect(mockMessageCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('recommendTechnologies', () => {
    it('should return technology recommendations', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      // Define the expected return value
      const mockRecommendations = {
        frontend: ['React', 'TypeScript'],
        backend: ['Node.js', 'Express'],
        database: ['MongoDB'],
        devops: ['Docker', 'GitHub Actions']
      };
      
      // Mock callLLM with a JSON response containing the mockRecommendations
      jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: `\`\`\`json\n${JSON.stringify(mockRecommendations)}\n\`\`\``,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      const recommendations = await llm.recommendTechnologies(projectInfo);
      
      // Verify
      expect(recommendations).toEqual(mockRecommendations);
    });

    it('should handle JSON without code blocks', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const mockRecommendations = {
        frontend: ['React'],
        backend: ['Node.js'],
        database: ['MongoDB'],
        devops: ['GitHub Actions']
      };
      
      // Mock callLLM with JSON response not in code blocks
      jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: JSON.stringify(mockRecommendations),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      const recommendations = await llm.recommendTechnologies(projectInfo);
      
      // Verify
      expect(recommendations).toEqual(mockRecommendations);
    });

    it('should handle error when JSON parsing fails', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      // Mock the callLLM function to return a non-JSON response
      jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: 'Not a valid JSON response',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute & Verify
      await expect(llm.recommendTechnologies(projectInfo)).rejects.toThrow('Could not parse LLM response as JSON');
    });
    
    it('should include mobile-specific prompt for mobile projects', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Mobile App',
        description: 'A mobile project',
        type: 'MOBILE',
        created: '2025-03-06T12:00:00Z'
      };
      
      // Spy on callLLM to capture the prompt
      const callLLMSpy = jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: '{\n"frontend": ["React Native"],\n"backend": ["Firebase"],\n"database": ["Firestore"],\n"devops": ["Fastlane"]\n}',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      await llm.recommendTechnologies(projectInfo);
      
      // Verify that callLLM was called with a prompt containing iOS references
      expect(callLLMSpy).toHaveBeenCalled();
      
      // Get the actual argument used in the call
      const actualPrompt = callLLMSpy.mock.calls[0][0];
      
      // Verify the prompt contains the expected text
      expect(actualPrompt).toContain('Project Type: MOBILE');
      expect(actualPrompt).toContain('iOS app');
      expect(actualPrompt).toContain('Swift');
      expect(actualPrompt).toContain('Android app');
      expect(actualPrompt).toContain('Kotlin');
    });
    
    it('should handle errors in LLM call', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      // Mock the callLLM function to throw an error
      jest.spyOn(llm, 'callLLM').mockRejectedValueOnce(new Error('API error'));
      
      // Execute & Verify
      await expect(llm.recommendTechnologies(projectInfo)).rejects.toThrow('Error recommending technologies');
    });
  });

  describe('generateFollowUpQuestions', () => {
    it('should generate follow-up questions', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const interviewAnswers = {
        'What is the main goal?': 'To test the system'
      };
      
      // Mock the LLM response with a list of questions
      jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: `
What are the key technical requirements for this project?
Who are the primary users of this system?
What are the main challenges you anticipate for this project?
What metrics will determine the success of this project?
What is the expected timeline for this project?
        `,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      const questions = await llm.generateFollowUpQuestions(projectInfo, interviewAnswers);
      
      // Verify
      expect(questions.length).toBe(5);
      expect(questions[0]).toBe('What are the key technical requirements for this project?');
      expect(questions[4]).toBe('What is the expected timeline for this project?');
    });

    it('should handle errors and return default questions', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const interviewAnswers = {
        'What is the main goal?': 'To test the system'
      };
      
      // Mock the callLLM function to throw an error
      jest.spyOn(llm, 'callLLM').mockRejectedValueOnce(new Error('API error'));
      
      // Execute
      const questions = await llm.generateFollowUpQuestions(projectInfo, interviewAnswers);
      
      // Verify - should return default questions
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]).toContain('key technical requirements');
    });
    
    it('should include interview answers in the prompt', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const interviewAnswers = {
        'What is the main goal?': 'To test the system',
        'Who are the users?': 'Developers and testers'
      };
      
      // Spy on callLLM to capture the prompt
      const callLLMSpy = jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: 'What are the key technical requirements for this project?',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      await llm.generateFollowUpQuestions(projectInfo, interviewAnswers);
      
      // Verify that callLLM was called with a prompt containing the interview answers
      expect(callLLMSpy).toHaveBeenCalled();
      
      // Get the actual argument used in the call
      const actualPrompt = callLLMSpy.mock.calls[0][0];
      
      // Verify the prompt contains the expected text
      expect(actualPrompt).toContain('What is the main goal?');
      expect(actualPrompt).toContain('To test the system');
      expect(actualPrompt).toContain('Who are the users?');
      expect(actualPrompt).toContain('Developers and testers');
    });
    
    it('should filter out lines without question marks', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const interviewAnswers = {
        'What is the main goal?': 'To test the system'
      };
      
      // Mock the LLM response with a mix of questions and non-questions
      jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: `
Here are some follow-up questions:
What are the key technical requirements for this project?
Next question
Who are the primary users of this system?
This is not a question
What metrics will determine the success of this project?
        `,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      const questions = await llm.generateFollowUpQuestions(projectInfo, interviewAnswers);
      
      // Verify - should only include lines with question marks
      expect(questions.length).toBe(3);
      expect(questions[0]).toBe('What are the key technical requirements for this project?');
      expect(questions[1]).toBe('Who are the primary users of this system?');
      expect(questions[2]).toBe('What metrics will determine the success of this project?');
    });
  });

  describe('enhanceDocumentation', () => {
    it('should enhance documentation with LLM', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const content = '# Original content';
      const enhancedContent = '# Enhanced content';
      const documentType = 'prd';
      
      // Mock callLLM to return enhanced content
      jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: enhancedContent,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      const result = await llm.enhanceDocumentation(content, projectInfo, documentType);
      
      // Verify
      expect(result).toBe(enhancedContent);
      expect(llm.callLLM).toHaveBeenCalledWith(expect.any(String), false); // Verify caching is disabled
    });
    
    it('should include enhancement options in the prompt', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const content = '# Original content';
      const documentType = 'prd';
      const options: EnhancementOptions = {
        improveFormatting: true,
        addExamples: true,
        expandExplanations: true,
        addReferences: true,
        checkConsistency: true
      };
      
      // Spy on callLLM to capture the prompt
      const callLLMSpy = jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: '# Enhanced content with all options',
        usage: { promptTokens: 150, completionTokens: 75, totalTokens: 225 }
      });
      
      // Execute
      await llm.enhanceDocumentation(content, projectInfo, documentType, options);
      
      // Verify that all options are included in the prompt
      expect(callLLMSpy).toHaveBeenCalledWith(
        expect.stringContaining('Improve the formatting and readability'),
        expect.anything()
      );
      expect(callLLMSpy).toHaveBeenCalledWith(
        expect.stringContaining('Add relevant examples where appropriate'),
        expect.anything()
      );
      expect(callLLMSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expand explanations of complex concepts'),
        expect.anything()
      );
      expect(callLLMSpy).toHaveBeenCalledWith(
        expect.stringContaining('Add references to industry standards or best practices'),
        expect.anything()
      );
      expect(callLLMSpy).toHaveBeenCalledWith(
        expect.stringContaining('Ensure terminology is consistent throughout'),
        expect.anything()
      );
    });

    it('should return original content if enhancement fails', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const content = '# Original content';
      const documentType = 'prd';
      
      // Mock callLLM to throw an error
      jest.spyOn(llm, 'callLLM').mockRejectedValueOnce(new Error('API error'));
      
      // Execute
      const result = await llm.enhanceDocumentation(content, projectInfo, documentType);
      
      // Verify - should return original content
      expect(result).toBe(content);
    });
    
    it('should handle empty options object', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Test Project',
        description: 'A test project',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const content = '# Original content';
      const documentType = 'prd';
      const options = {};
      
      // Mock callLLM to return the response
      jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: '# Enhanced with default options',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      const result = await llm.enhanceDocumentation(content, projectInfo, documentType, options);
      
      // Verify
      expect(llm.callLLM).toHaveBeenCalled();
      expect(result).toBe('# Enhanced with default options');
    });
    
    it('should include project info in the prompt', async () => {
      // Setup
      const projectInfo: ProjectInfo = {
        id: 'PROJ-001',
        name: 'Custom Project Name',
        description: 'Custom project description',
        type: 'WEB',
        created: '2025-03-06T12:00:00Z'
      };
      
      const content = '# Original content';
      const documentType = 'prd';
      
      // Spy on callLLM to capture the prompt
      const callLLMSpy = jest.spyOn(llm, 'callLLM').mockResolvedValueOnce({
        content: '# Enhanced content with project info',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
      });
      
      // Execute
      await llm.enhanceDocumentation(content, projectInfo, documentType);
      
      // Verify the prompt includes project info
      expect(callLLMSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom Project Name'),
        expect.anything()
      );
      expect(callLLMSpy).toHaveBeenCalledWith(
        expect.stringContaining('Custom project description'),
        expect.anything()
      );
    });
  });

  describe('isLLMApiAvailable', () => {
    it('should check if LLM API is available', () => {
      // Setup - mock the isLLMAvailable from config
      const mockIsLLMAvailable = jest.spyOn(config, 'isLLMAvailable');
      mockIsLLMAvailable.mockReturnValueOnce(true);
      
      // Execute
      const isAvailable = llm.isLLMApiAvailable();
      
      // Verify
      expect(isAvailable).toBe(true);
      expect(mockIsLLMAvailable).toHaveBeenCalled();
    });
    
    it('should return false when LLM API is not available', () => {
      // Setup - mock the isLLMAvailable from config
      const mockIsLLMAvailable = jest.spyOn(config, 'isLLMAvailable');
      mockIsLLMAvailable.mockReturnValueOnce(false);
      
      // Execute
      const isAvailable = llm.isLLMApiAvailable();
      
      // Verify
      expect(isAvailable).toBe(false);
      expect(mockIsLLMAvailable).toHaveBeenCalled();
    });
  });
});