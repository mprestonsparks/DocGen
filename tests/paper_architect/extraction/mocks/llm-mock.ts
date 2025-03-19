/**
 * LLM service mock implementation for extraction tests
 */

import { jest } from '@jest/globals';

export interface LlmResponse {
  status: 'success' | 'error';
  result?: any;
  error?: string;
}

export interface LlmClientMock {
  isLLMApiAvailable: jest.Mock;
  query: jest.Mock;
  enhanceWithLLM: jest.Mock;
}

/**
 * Creates a mock LLM client with configurable response behavior
 */
export function createLlmMock(isAvailable = true, defaultResponse?: LlmResponse): LlmClientMock {
  const defaultResult: LlmResponse = defaultResponse || {
    status: 'success',
    result: {
      paperInfo: {
        title: 'Enhanced Paper Title',
        authors: ['Enhanced Author'],
        abstract: 'Enhanced abstract with more details',
        year: 2023
      },
      sections: [
        { id: 'sec1', title: 'Introduction', content: 'Enhanced introduction content', level: 1 }
      ],
      algorithms: [
        { id: 'algo1', title: 'Enhanced Algorithm', code: 'function enhancedAlgo() {}', sectionId: 'sec1' }
      ],
      equations: [
        { id: 'eq1', content: 'E = mc^2', sectionId: 'sec1' }
      ],
      figures: [
        { id: 'fig1', title: 'Enhanced Figure', path: '/path/to/figure.png', caption: 'Enhanced caption', sectionId: 'sec1' }
      ],
      tables: [
        { id: 'tab1', title: 'Enhanced Table', rows: [['A', 'B'], ['1', '2']], caption: 'Enhanced caption', sectionId: 'sec1' }
      ],
      citations: [
        { id: 'cit1', title: 'Enhanced Citation', authors: ['Author A'], year: 2023, venue: 'Enhanced Journal' }
      ]
    }
  };
  
  return {
    isLLMApiAvailable: jest.fn().mockReturnValue(isAvailable),
    query: jest.fn().mockResolvedValue(defaultResult),
    enhanceWithLLM: jest.fn().mockImplementation(async (prompt, options) => {
      if (!isAvailable) {
        throw new Error('LLM API not available');
      }
      
      return {
        enhanced: true,
        result: defaultResult.result,
        originalContent: prompt
      };
    })
  };
}

/**
 * Sets up common LLM scenarios for testing
 */
export function setupLlmScenario(
  llmMock: LlmClientMock, 
  scenario: 'success' | 'unavailable' | 'timeout' | 'invalid-response' | 'error'
): LlmClientMock {
  // Reset mocks
  Object.values(llmMock).forEach(mock => 
    typeof mock.mockReset === 'function' && mock.mockReset()
  );
  
  switch (scenario) {
    case 'unavailable':
      llmMock.isLLMApiAvailable.mockReturnValue(false);
      llmMock.query.mockRejectedValue(new Error('LLM API not available'));
      llmMock.enhanceWithLLM.mockRejectedValue(new Error('LLM API not available'));
      break;
      
    case 'timeout':
      llmMock.isLLMApiAvailable.mockReturnValue(true);
      llmMock.query.mockRejectedValue(new Error('LLM API request timed out'));
      llmMock.enhanceWithLLM.mockRejectedValue(new Error('LLM API request timed out'));
      break;
      
    case 'invalid-response':
      llmMock.isLLMApiAvailable.mockReturnValue(true);
      llmMock.query.mockResolvedValue({
        status: 'success',
        result: 'This is not a valid JSON response for paper content'
      });
      llmMock.enhanceWithLLM.mockResolvedValue({
        enhanced: false,
        error: 'Invalid response format',
        originalContent: 'Original content'
      });
      break;
      
    case 'error':
      llmMock.isLLMApiAvailable.mockReturnValue(true);
      llmMock.query.mockResolvedValue({
        status: 'error',
        error: 'LLM processing error'
      });
      llmMock.enhanceWithLLM.mockResolvedValue({
        enhanced: false,
        error: 'LLM processing error',
        originalContent: 'Original content'
      });
      break;
      
    case 'success':
    default:
      llmMock.isLLMApiAvailable.mockReturnValue(true);
      llmMock.query.mockResolvedValue({
        status: 'success',
        result: {
          paperInfo: {
            title: 'Enhanced Paper Title',
            authors: ['Enhanced Author'],
            abstract: 'Enhanced abstract with more details',
            year: 2023
          },
          sections: [
            { id: 'sec1', title: 'Introduction', content: 'Enhanced introduction content', level: 1 }
          ],
          algorithms: [
            { id: 'algo1', title: 'Enhanced Algorithm', code: 'function enhancedAlgo() {}', sectionId: 'sec1' }
          ]
        }
      });
      llmMock.enhanceWithLLM.mockResolvedValue({
        enhanced: true,
        result: 'Enhanced content',
        originalContent: 'Original content'
      });
      break;
  }
  
  return llmMock;
}