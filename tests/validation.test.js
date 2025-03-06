const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Helper function to parse YAML front matter from a document
function parseYamlFrontMatter(content) {
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (yamlMatch && yamlMatch[1]) {
    try {
      return yaml.load(yamlMatch[1]);
    } catch (error) {
      return null;
    }
  }
  return null;
}

describe('Document Structure Tests', () => {
  // Test template file paths
  const templatePaths = {
    prd: path.join(__dirname, '../@claude-code/ai-prd.md'),
    srs: path.join(__dirname, '../@claude-code/ai-srs.md'),
    sad: path.join(__dirname, '../@claude-code/ai-sad.md'),
    sdd: path.join(__dirname, '../@claude-code/ai-sdd.md'),
    stp: path.join(__dirname, '../@claude-code/ai-stp.md'),
  };

  // Test that all template files exist
  test('Template files exist', () => {
    Object.values(templatePaths).forEach(templatePath => {
      expect(fs.existsSync(templatePath)).toBe(true);
    });
  });

  // Test YAML front matter in templates
  test('Templates have valid YAML front matter', () => {
    Object.entries(templatePaths).forEach(([type, templatePath]) => {
      const content = fs.readFileSync(templatePath, 'utf8');
      const metadata = parseYamlFrontMatter(content);
      
      expect(metadata).not.toBeNull();
      expect(metadata.documentType).toBeDefined();
      expect(metadata.schemaVersion).toBeDefined();
      expect(metadata.documentVersion).toBeDefined();
      expect(metadata.id).toBeDefined();
      expect(metadata.project).toBeDefined();
    });
  });

  // Test template consistency
  test('Templates have consistent ID formats', () => {
    Object.entries(templatePaths).forEach(([type, templatePath]) => {
      const content = fs.readFileSync(templatePath, 'utf8');
      const metadata = parseYamlFrontMatter(content);
      
      // Check document ID format (e.g., DOC-SRS-001)
      expect(metadata.id).toMatch(/^DOC-[A-Z]+-\d+$/);
      
      // Check project ID format (e.g., PROJ-001)
      expect(metadata.project.id).toMatch(/^PROJ-\d+$/);
    });
  });
});

describe('Script Tests', () => {
  // Test script file paths
  const scriptPaths = {
    initialize: path.join(__dirname, '../scripts/initialize.js'),
    validate: path.join(__dirname, '../scripts/validate-docs.js'),
    updateVersions: path.join(__dirname, '../scripts/update-versions.js'),
    generateReports: path.join(__dirname, '../scripts/generate-reports.js'),
  };

  // Test that all script files exist
  test('Script files exist', () => {
    Object.values(scriptPaths).forEach(scriptPath => {
      expect(fs.existsSync(scriptPath)).toBe(true);
    });
  });

  // Test script executability
  test('Scripts are executable', () => {
    Object.values(scriptPaths).forEach(scriptPath => {
      const stats = fs.statSync(scriptPath);
      const isExecutable = (stats.mode & fs.constants.S_IXUSR) !== 0;
      expect(isExecutable).toBe(true);
    });
  });
});