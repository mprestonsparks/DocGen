/**
 * Tests for the presence of key files
 */

// Import key files to ensure they exist
import * as fs from 'fs';
import * as path from 'path';

describe('DocGen file structure', () => {
  it('should have a main index.ts file', () => {
    const indexPath = path.resolve(__dirname, '../src/index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('should have a paper_architect module', () => {
    const paperArchitectPath = path.resolve(__dirname, '../src/paper_architect/index.ts');
    expect(fs.existsSync(paperArchitectPath)).toBe(true);
  });

  it('should have core utility files', () => {
    const configPath = path.resolve(__dirname, '../src/utils/config.ts');
    const loggerPath = path.resolve(__dirname, '../src/utils/logger.ts');
    const llmPath = path.resolve(__dirname, '../src/utils/llm.ts');
    
    expect(fs.existsSync(configPath)).toBe(true);
    expect(fs.existsSync(loggerPath)).toBe(true);
    expect(fs.existsSync(llmPath)).toBe(true);
  });
});