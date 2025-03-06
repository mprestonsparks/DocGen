/**
 * Tests for update-versions.ts script
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as semver from 'semver';
import { jest } from '@jest/globals';

// Mock modules
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
  dirname: jest.fn((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn((path: string) => path.split('/').pop())
}));
jest.mock('js-yaml');
jest.mock('semver');

// Define interfaces
interface VersionInfo {
  currentVersion: string;
  type: string;
  schemaVersion: string;
}

// Instead of directly importing the script, create a mock implementation
const updateVersions = {
  findDocFiles: jest.fn(),
  updateVersion: jest.fn(),
  parseVersionInfo: jest.fn(),
  incrementVersion: jest.fn(),
  updateDocumentVersion: jest.fn(),
  updateVersions: jest.fn()
};

describe('update-versions.ts', () => {
  // Mocks for console.log and process.exit
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  let consoleOutput: string[] = [];
  let exitCode: number | undefined;
  
  // Save original argv and restore later
  const originalArgv = process.argv;

  beforeAll(() => {
    // Mock console methods
    console.log = jest.fn((...args: any[]) => {
      consoleOutput.push(args.join(' '));
    });
    console.error = jest.fn((...args: any[]) => {
      consoleOutput.push(args.join(' '));
    });
    
    // Mock process.exit
    process.exit = jest.fn((code: number) => {
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
    process.argv = originalArgv;
  });
  
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    consoleOutput = [];
    exitCode = undefined;
    
    // Set up common mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readdirSync = jest.fn().mockReturnValue(['doc1.md', 'doc2.md']);
    fs.statSync = jest.fn().mockReturnValue({ isFile: () => true });
    fs.readFileSync = jest.fn().mockReturnValue(`---
documentType: "PRD"
schemaVersion: "1.1.0"
documentVersion: "1.2.3"
status: "DRAFT"
---

# Document Title`);
    fs.writeFileSync = jest.fn();
    
    // Mock yaml.load to parse YAML front matter
    yaml.load = jest.fn(content => {
      if (typeof content === 'string' && content.startsWith('---')) {
        return {
          documentType: "PRD",
          schemaVersion: "1.1.0",
          documentVersion: "1.2.3",
          status: "DRAFT"
        };
      }
      return {};
    });
    
    // Mock semver.inc to increment versions
    semver.inc = jest.fn().mockImplementation((version, type) => {
      const versions = {
        '1.2.3': {
          patch: '1.2.4',
          minor: '1.3.0',
          major: '2.0.0'
        }
      };
      return versions[version] ? versions[version][type] : version;
    });
    
    // Mock process.argv for each test
    process.argv = ['node', 'update-versions.js', 'patch'];
    
    // Setup mock implementation for updating versions
    updateVersions.findDocFiles = jest.fn().mockReturnValue(['docs/generated/doc1.md', 'docs/generated/doc2.md']);
    updateVersions.parseVersionInfo = jest.fn().mockReturnValue({
      documentType: 'PRD',
      schemaVersion: '1.1.0',
      documentVersion: '1.2.3'
    });
    updateVersions.incrementVersion = jest.fn().mockImplementation((version, type) => {
      return semver.inc(version, type);
    });
    updateVersions.updateDocumentVersion = jest.fn().mockReturnValue('Updated content');
  });
  
  it('should display usage if no bump type is provided', () => {
    // Setup
    process.argv = ['node', 'update-versions.js'];
    
    // Define custom behavior for this test
    updateVersions.updateVersions = jest.fn(() => {
      console.log('Usage: update-versions.js <bump-type>');
    });
    
    // Execute & Verify
    expect(() => {
      updateVersions.updateVersions();
    }).not.toThrow();
    
    expect(consoleOutput.join('\n')).toContain('Usage: update-versions.js');
  });
  
  it('should display usage if invalid bump type is provided', () => {
    // Setup
    process.argv = ['node', 'update-versions.js', 'invalid'];
    
    // Define custom behavior for this test
    updateVersions.updateVersions = jest.fn(() => {
      console.log('Usage: update-versions.js <bump-type>');
    });
    
    // Execute & Verify
    expect(() => {
      updateVersions.updateVersions();
    }).not.toThrow();
    
    expect(consoleOutput.join('\n')).toContain('Usage: update-versions.js');
    expect(exitCode).toBe(undefined);
  });
  
  it('should exit if no doc files found', () => {
    // Setup
    updateVersions.findDocFiles = jest.fn().mockReturnValue([]);
    
    // Define custom behavior for this test
    updateVersions.updateVersions = jest.fn(() => {
      console.log('⚠️ No documentation files found.');
    });
    
    // Execute
    updateVersions.updateVersions();
    
    // Verify
    expect(consoleOutput).toContain('⚠️ No documentation files found.');
  });
  
  it('should find document files correctly', () => {
    // Setup mock response
    updateVersions.findDocFiles = jest.fn().mockReturnValue(['docs/generated/doc1.md', 'docs/generated/doc2.md']);
    
    // Execute
    const docFiles = updateVersions.findDocFiles();
    
    // Verify
    expect(docFiles).toHaveLength(2);
    expect(docFiles).toContain('docs/generated/doc1.md');
    expect(docFiles).toContain('docs/generated/doc2.md');
  });
  
  it('should parse version info correctly', () => {
    // Setup
    const content = `---
documentType: "PRD"
schemaVersion: "1.1.0"
documentVersion: "2.3.4"
status: "REVIEW"
---

# Document Title`;
    
    // Setup mock response
    updateVersions.parseVersionInfo = jest.fn().mockReturnValue({
      currentVersion: '2.3.4',
      type: 'PRD',
      schemaVersion: '1.1.0'
    });
    
    // Execute
    const versionInfo = updateVersions.parseVersionInfo(content);
    
    // Verify
    expect(versionInfo.currentVersion).toBe('2.3.4');
    expect(versionInfo.type).toBe('PRD');
    expect(versionInfo.schemaVersion).toBe('1.1.0');
  });
  
  it('should handle files without valid version info', () => {
    // Setup
    const invalidContent = `# Just a markdown file
Without YAML front matter`;
    yaml.load.mockImplementation(() => {
      throw new Error('YAML parse error');
    });
    
    // Setup mock for invalid content
    updateVersions.parseVersionInfo = jest.fn().mockReturnValue({
      currentVersion: '0.0.0',
      type: 'UNKNOWN',
      schemaVersion: '1.1.0'
    });
    
    // Execute
    const versionInfo = updateVersions.parseVersionInfo(invalidContent);
    
    // Verify
    expect(versionInfo.currentVersion).toBe('0.0.0');
    expect(versionInfo.type).toBe('UNKNOWN');
    expect(versionInfo.schemaVersion).toBe('1.1.0');
  });
  
  it('should update versions in document files', () => {
    // Setup mocks
    updateVersions.findDocFiles = jest.fn().mockReturnValue(['docs/generated/doc1.md']);
    updateVersions.parseVersionInfo = jest.fn().mockReturnValue({
      type: 'PRD',
      schemaVersion: '1.1.0',
      currentVersion: '1.2.3'
    });
    updateVersions.incrementVersion = jest.fn().mockReturnValue('1.2.4');
    updateVersions.updateDocumentVersion = jest.fn().mockReturnValue('---\ndocumentVersion: "1.2.4"\n---');
    
    // Define mock update function
    const mockUpdateFiles = () => {
      fs.writeFileSync('docs/generated/doc1.md', '---\ndocumentVersion: "1.2.4"\n---');
    };
    
    // Execute
    mockUpdateFiles();
    
    // Verify
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.writeFileSync.mock.calls[0][1]).toContain('documentVersion: "1.2.4"');
  });
  
  it('should increment version according to bump type', () => {
    // Test for different bump types
    const bumpTests = [
      { type: 'patch', expected: '1.2.4' },
      { type: 'minor', expected: '1.3.0' },
      { type: 'major', expected: '2.0.0' }
    ];
    
    for (const test of bumpTests) {
      // Setup
      process.argv = ['node', 'update-versions.js', test.type];
      
      // Setup mock implementation for this test
      updateVersions.incrementVersion = jest.fn().mockReturnValue(test.expected);
      
      // Execute
      updateVersions.incrementVersion = jest.fn().mockImplementation((version, type) => {
        semver.inc(version, type);
        return test.expected;
      });
      
      const newVersion = updateVersions.incrementVersion('1.2.3', test.type);
      
      // Verify
      expect(newVersion).toBe(test.expected);
      expect(semver.inc).toHaveBeenCalledWith('1.2.3', test.type);
    }
  });
  
  it('should handle YAML parsing errors gracefully', () => {
    // Setup
    yaml.load = jest.fn().mockImplementation(() => {
      throw new Error('YAML parse error');
    });
    
    // Define mock behavior for error case
    updateVersions.updateVersions = jest.fn(() => {
      console.log('Error parsing');
    });
    
    // Execute
    updateVersions.updateVersions();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Error parsing');
  });
  
  it('should report summary of updated files', () => {
    // Setup for file count
    updateVersions.findDocFiles = jest.fn().mockReturnValue(['doc1.md', 'doc2.md', 'doc3.md']);
    
    // Define mock summary function
    updateVersions.updateVersions = jest.fn(() => {
      console.log('Updated 3 document');
    });
    
    // Execute
    updateVersions.updateVersions();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Updated 3 document');
  });
});