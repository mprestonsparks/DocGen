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
    prd: path.join(__dirname, '../docs/_templates/prd.hbs'),
    srs: path.join(__dirname, '../docs/_templates/srs.hbs'),
    sad: path.join(__dirname, '../docs/_templates/sad.hbs'),
    sdd: path.join(__dirname, '../docs/_templates/sdd.hbs'),
    stp: path.join(__dirname, '../docs/_templates/stp.hbs'),
  };

  // Test that all template files exist
  test('Template files exist', () => {
    Object.values(templatePaths).forEach(templatePath => {
      expect(fs.existsSync(templatePath)).toBe(true);
    });
  });

  // Test template format (Handlebars templates will have different validation)
  test('Handlebars templates have basic structure', () => {
    Object.entries(templatePaths).forEach(([type, templatePath]) => {
      const content = fs.readFileSync(templatePath, 'utf8');
      
      // Check for YAML frontmatter section
      expect(content).toMatch(/^---[\s\S]*?---/);
      // Check for documentType
      expect(content).toMatch(/documentType:/);
      // Check for schemaVersion
      expect(content).toMatch(/schemaVersion:/);
      // Check for document ID section
      expect(content).toMatch(/id:/);
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