/**
 * Simple test to verify extraction module coverage
 */
import * as fs from 'fs';
import * as path from 'path';
import * as extraction from '../src/paper_architect/extraction';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('Mock file content'),
  createReadStream: jest.fn().mockReturnValue({ pipe: jest.fn() })
}));

jest.mock('http', () => ({
  request: jest.fn().mockImplementation((url, options, callback) => {
    const mockResponse = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event, handler) => {
        if (event === 'data') {
          handler('<TEI><teiHeader><fileDesc><titleStmt><title>Test Paper</title></titleStmt></fileDesc></teiHeader></TEI>');
        }
        if (event === 'end') {
          handler();
        }
        return mockResponse;
      })
    };
    if (callback) callback(mockResponse);
    return {
      on: jest.fn(),
      pipe: jest.fn(),
      end: jest.fn()
    };
  })
}));

describe('Extraction Module Test', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  console.log('VERIFICATION: Starting extraction test file');

  test('should extract paper content', async () => {
    console.log('VERIFICATION: Running extractPaperContent test');
    const result = await extraction.extractPaperContent('/path/to/test.pdf');
    console.log('VERIFICATION: Test completed, result:', !!result);
    expect(result).toBeDefined();
    expect(result.paperInfo).toBeDefined();
  });
});