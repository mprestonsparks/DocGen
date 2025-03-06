/**
 * Tests for update-versions.js script
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const semver = require('semver');

// Mock modules
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  basename: jest.fn(path => path.split('/').pop())
}));
jest.mock('js-yaml');
jest.mock('semver');

// Import the script after mocking
const updateVersionsPath = require.resolve('../../scripts/update-versions');
let updateVersions;

describe('update-versions.js', () => {
  // Mocks for console.log and process.exit
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  let consoleOutput = [];
  let exitCode;
  
  // Save original argv and restore later
  const originalArgv = process.argv;

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
schemaVersion: "1.0.0"
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
          schemaVersion: "1.0.0",
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
    
    // Since process.exit might be called, reload the module for each test
    jest.resetModules();
    updateVersions = require(updateVersionsPath);
  });
  
  it('should display usage if no bump type is provided', () => {
    // Setup
    process.argv = ['node', 'update-versions.js'];
    jest.resetModules();
    updateVersions = require(updateVersionsPath);
    
    // Execute & Verify
    expect(() => {
      updateVersions.updateVersions();
    }).not.toThrow();
    
    expect(consoleOutput.join('\n')).toContain('Usage: update-versions.js');
  });
  
  it('should display usage if invalid bump type is provided', () => {
    // Setup
    process.argv = ['node', 'update-versions.js', 'invalid'];
    jest.resetModules();
    updateVersions = require(updateVersionsPath);
    
    // Execute & Verify
    expect(() => {
      updateVersions.updateVersions();
    }).not.toThrow();
    
    expect(consoleOutput.join('\n')).toContain('Usage: update-versions.js');
  });
  
  it('should exit if no doc files found', () => {
    // Setup
    fs.readdirSync = jest.fn().mockReturnValue([]);
    
    // Execute & Verify
    expect(() => {
      updateVersions.updateVersions();
    }).toThrow('Process exited with code 1');
    
    expect(exitCode).toBe(1);
    expect(consoleOutput.join('\n')).toContain('No documentation files found');
  });
  
  it('should find document files correctly', () => {
    // Setup
    fs.readdirSync = jest.fn().mockReturnValue(['doc1.md', 'doc2.md', 'not-a-doc.txt', 'subdir']);
    fs.statSync = jest.fn().mockImplementation((path) => ({
      isFile: () => !path.includes('subdir')
    }));
    
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
schemaVersion: "1.0.0"
documentVersion: "2.3.4"
status: "REVIEW"
---

# Document Title`;
    
    // Execute
    const versionInfo = updateVersions.parseVersionInfo(content);
    
    // Verify
    expect(versionInfo.currentVersion).toBe('2.3.4');
    expect(versionInfo.type).toBe('PRD');
  });
  
  it('should handle files without valid version info', () => {
    // Setup
    const invalidContent = `# Just a markdown file
Without YAML front matter`;
    yaml.load.mockImplementation(() => {
      throw new Error('YAML parse error');
    });
    
    // Execute
    const versionInfo = updateVersions.parseVersionInfo(invalidContent);
    
    // Verify
    expect(versionInfo.currentVersion).toBe('0.0.0');
    expect(versionInfo.type).toBe('UNKNOWN');
  });
  
  it('should update versions in document files', () => {
    // Execute
    updateVersions.updateVersions();
    
    // Verify
    expect(fs.writeFileSync).toHaveBeenCalled();
    
    // Check one of the calls to writeFileSync
    const writeCall = fs.writeFileSync.mock.calls[0];
    expect(writeCall[1]).toContain('documentVersion: "1.2.4"');
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
      jest.resetModules();
      updateVersions = require(updateVersionsPath);
      jest.clearAllMocks();
      
      // Execute
      updateVersions.updateVersions();
      
      // Verify
      expect(semver.inc).toHaveBeenCalledWith('1.2.3', test.type);
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Check that the version was updated correctly
      const writeCall = fs.writeFileSync.mock.calls[0];
      expect(writeCall[1]).toContain(`documentVersion: "${test.expected}"`);
    }
  });
  
  it('should handle YAML parsing errors gracefully', () => {
    // Setup
    yaml.load = jest.fn().mockImplementation(() => {
      throw new Error('YAML parse error');
    });
    
    // Execute
    updateVersions.updateVersions();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Error parsing');
  });
  
  it('should report summary of updated files', () => {
    // Setup
    fs.readdirSync = jest.fn().mockReturnValue(['doc1.md', 'doc2.md', 'doc3.md']);
    
    // Execute
    updateVersions.updateVersions();
    
    // Verify
    expect(consoleOutput.join('\n')).toContain('Updated 3 document');
  });
});