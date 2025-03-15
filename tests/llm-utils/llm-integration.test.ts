/**
 * Tests for enhanced LLM integration with fallback and retry capabilities
 */
import * as llm from '../../src/utils/llm';
import * as config from '../../src/utils/config';
import * as logger from '../../src/utils/logger';

// Mock the logger to prevent console output during tests
jest.mock('../../src/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock the config and LLM client functions
jest.mock('../../src/utils/config', () => ({
  getLLMConfig: jest.fn(),
  getLLMProviderConfigs: jest.fn(),
  isLLMAvailable: jest.fn(),
  isProviderAvailable: jest.fn(),
  getLLMApiKey: jest.fn(),
  getConfig: jest.fn()
}));

// Mock the Anthropic client
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn()
      }
    }))
  };
});

describe('LLM Integration with enhanced capabilities', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default config setup
    (config.getLLMConfig as jest.Mock).mockReturnValue({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      maxTokens: 4000,
      temperature: 0.7,
      fallbackProviders: ['openai', 'cohere'],
      timeout: 30000
    });
    
    (config.getLLMProviderConfigs as jest.Mock).mockReturnValue({
      anthropic: {
        apiKey: 'dummy-anthropic-key',
        model: 'claude-3-5-sonnet-20240620',
        maxTokens: 4000,
        temperature: 0.7
      },
      openai: {
        apiKey: 'dummy-openai-key',
        model: 'gpt-4o',
        maxTokens: 4000,
        temperature: 0.7
      },
      cohere: {
        apiKey: 'dummy-cohere-key',
        model: 'command-r',
        maxTokens: 4000,
        temperature: 0.7
      }
    });
    
    (config.isLLMAvailable as jest.Mock).mockReturnValue(true);
    (config.isProviderAvailable as jest.Mock).mockReturnValue(true);
    (config.getLLMApiKey as jest.Mock).mockReturnValue('dummy-key');
  });
  
  test('estimateTokenCount provides reasonable estimates', () => {
    // Test with different text lengths
    expect(llm.estimateTokenCount('This is a short text')).toBe(5); // ~18 chars
    expect(llm.estimateTokenCount('A' + 'B'.repeat(100))).toBe(26); // 101 chars
    expect(llm.estimateTokenCount('')).toBe(0); // Empty string
  });
  
  test('adaptiveMaxTokens adjusts based on input length', () => {
    // Short input should allow for more output tokens
    const shortResult = llm.adaptiveMaxTokens('Short prompt', 16000);
    // Long input should reserve fewer tokens for output
    const longInput = 'Long prompt '.repeat(1000); // ~12000 chars, ~3000 tokens
    const longResult = llm.adaptiveMaxTokens(longInput, 16000);
    
    // Short input should have more available output tokens than long input
    expect(shortResult).toBeGreaterThan(longResult);
    // Long input should still have some minimum tokens
    expect(longResult).toBeGreaterThanOrEqual(100);
  });
  
  // More comprehensive tests would involve testing the retry logic,
  // fallback provider mechanisms, and timeout handling
});
