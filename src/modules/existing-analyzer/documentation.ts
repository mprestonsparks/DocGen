/**
 * Documentation analysis for existing projects
 * Finds and analyzes documentation in existing projects
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as yaml from 'js-yaml';

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

/**
 * Finds existing documentation files in the project
 */
export async function findExistingDocumentation(
  projectPath: string,
  options: {
    includeReadme: boolean;
    includeApiDocs: boolean;
    includeInlineComments: boolean;
  }
): Promise<Array<{
  path: string;
  type: string;
  lastModified: string;
  schemaCompliant: boolean;
}>> {
  const result: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }> = [];
  
  // Look for README files
  if (options.includeReadme) {
    const readmeFiles = await findFilesByPattern(projectPath, /readme\.md/i);
    for (const file of readmeFiles) {
      try {
        const stats = await statAsync(file);
        const content = await readFileAsync(file, 'utf8');
        result.push({
          path: file,
          type: 'Readme',
          lastModified: stats.mtime.toISOString(),
          schemaCompliant: hasYamlFrontmatter(content)
        });
      } catch (error) {
        console.warn(`Error reading file ${file}: ${error}`);
      }
    }
  }
  
  // Look for API documentation
  if (options.includeApiDocs) {
    const apiDocFiles = await findFilesByPattern(projectPath, /api.*\.(md|yaml|json)$/i);
    for (const file of apiDocFiles) {
      try {
        const stats = await statAsync(file);
        const content = await readFileAsync(file, 'utf8');
        const ext = path.extname(file).toLowerCase();
        
        let isCompliant = false;
        if (ext === '.md') {
          isCompliant = hasYamlFrontmatter(content);
        } else if (ext === '.yaml' || ext === '.json') {
          isCompliant = true; // Assume structured files are compliant
        }
        
        result.push({
          path: file,
          type: 'API Documentation',
          lastModified: stats.mtime.toISOString(),
          schemaCompliant: isCompliant
        });
      } catch (error) {
        console.warn(`Error reading file ${file}: ${error}`);
      }
    }
    
    // Look for OpenAPI/Swagger files
    const swaggerFiles = await findFilesByPattern(projectPath, /(swagger|openapi).*\.(yaml|json)$/i);
    for (const file of swaggerFiles) {
      if (!result.some(doc => doc.path === file)) { // Avoid duplicates
        try {
          const stats = await statAsync(file);
          result.push({
            path: file,
            type: 'OpenAPI/Swagger',
            lastModified: stats.mtime.toISOString(),
            schemaCompliant: true // Assume OpenAPI files are compliant
          });
        } catch (error) {
          console.warn(`Error reading file ${file}: ${error}`);
        }
      }
    }
  }
  
  // Look for documentation directories
  const docDirs = await findDirsByPattern(projectPath, /(docs|documentation)/i);
  for (const dir of docDirs) {
    const docFiles = await findFilesByPattern(dir, /\.(md|txt)$/i);
    for (const file of docFiles) {
      if (!result.some(doc => doc.path === file)) { // Avoid duplicates
        try {
          const stats = await statAsync(file);
          const content = await readFileAsync(file, 'utf8');
          result.push({
            path: file,
            type: 'Documentation',
            lastModified: stats.mtime.toISOString(),
            schemaCompliant: hasYamlFrontmatter(content)
          });
        } catch (error) {
          console.warn(`Error reading file ${file}: ${error}`);
        }
      }
    }
  }
  
  return result;
}

/**
 * Checks if a file has YAML frontmatter
 */
export function hasYamlFrontmatter(content: string): boolean {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return false;
  }
  
  try {
    const frontmatterContent = match[1];
    yaml.load(frontmatterContent);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Finds files by pattern recursively
 */
async function findFilesByPattern(
  dirPath: string,
  pattern: RegExp
): Promise<string[]> {
  let result: string[] = [];
  
  try {
    const entries = await promisify(fs.readdir)(dirPath);
    
    for (const entry of entries) {
      // Skip dot directories
      if (entry.startsWith('.')) {
        continue;
      }
      
      // Skip node_modules
      if (entry === 'node_modules') {
        continue;
      }
      
      const fullPath = path.join(dirPath, entry);
      const stats = await statAsync(fullPath);
      
      if (stats.isDirectory()) {
        const nestedFiles = await findFilesByPattern(fullPath, pattern);
        result = result.concat(nestedFiles);
      } else if (pattern.test(entry)) {
        result.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`Error searching directory ${dirPath}: ${error}`);
  }
  
  return result;
}

/**
 * Finds directories by pattern
 */
async function findDirsByPattern(
  dirPath: string,
  pattern: RegExp
): Promise<string[]> {
  let result: string[] = [];
  
  try {
    const entries = await promisify(fs.readdir)(dirPath);
    
    for (const entry of entries) {
      // Skip dot directories and node_modules
      if (entry.startsWith('.') || entry === 'node_modules') {
        continue;
      }
      
      const fullPath = path.join(dirPath, entry);
      const stats = await statAsync(fullPath);
      
      if (stats.isDirectory()) {
        if (pattern.test(entry)) {
          result.push(fullPath);
        }
        
        // Recurse one level to find documentation directories
        const entries2 = await promisify(fs.readdir)(fullPath);
        for (const entry2 of entries2) {
          if (entry2.startsWith('.') || entry2 === 'node_modules') {
            continue;
          }
          
          const fullPath2 = path.join(fullPath, entry2);
          const stats2 = await statAsync(fullPath2);
          
          if (stats2.isDirectory() && pattern.test(entry2)) {
            result.push(fullPath2);
          }
        }
      }
    }
  } catch (error) {
    console.warn(`Error searching directory ${dirPath}: ${error}`);
  }
  
  return result;
}

/**
 * Analyzes the quality of documentation
 */
export async function analyzeDocumentationQuality(
  documentationFiles: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }>
): Promise<{
  score: number;
  coverage: 'none' | 'minimal' | 'partial' | 'good' | 'comprehensive';
  recommendations: string[];
}> {
  if (documentationFiles.length === 0) {
    return {
      score: 0,
      coverage: 'none',
      recommendations: ['Create basic project documentation', 'Add a README.md with project overview']
    };
  }
  
  let score = 0;
  const recommendations: string[] = [];
  
  // Check for README
  const hasReadme = documentationFiles.some(doc => doc.type === 'Readme');
  if (hasReadme) {
    score += 20;
  } else {
    recommendations.push('Add a README.md with project overview');
  }
  
  // Check for API docs
  const hasApiDocs = documentationFiles.some(doc => 
    doc.type === 'API Documentation' || doc.type === 'OpenAPI/Swagger'
  );
  if (hasApiDocs) {
    score += 20;
  } else {
    recommendations.push('Add API documentation for endpoints');
  }
  
  // Check for general documentation
  const hasGeneralDocs = documentationFiles.some(doc => doc.type === 'Documentation');
  if (hasGeneralDocs) {
    score += 20;
  } else {
    recommendations.push('Create general documentation explaining project components');
  }
  
  // Check schema compliance
  const compliantDocs = documentationFiles.filter(doc => doc.schemaCompliant);
  const complianceRate = documentationFiles.length > 0 
    ? compliantDocs.length / documentationFiles.length 
    : 0;
    
  if (complianceRate > 0.8) {
    score += 20;
  } else if (complianceRate > 0.5) {
    score += 10;
    recommendations.push('Improve schema compliance in documentation files');
  } else {
    recommendations.push('Add YAML frontmatter to markdown documentation');
  }
  
  // Check documentation freshness
  const now = new Date();
  const recentDocs = documentationFiles.filter(doc => {
    const lastModified = new Date(doc.lastModified);
    const ageInMonths = (now.getTime() - lastModified.getTime()) / (30 * 24 * 60 * 60 * 1000);
    return ageInMonths <= 3; // Consider docs updated in the last 3 months as recent
  });
  
  const freshnessRate = documentationFiles.length > 0 
    ? recentDocs.length / documentationFiles.length 
    : 0;
    
  if (freshnessRate > 0.7) {
    score += 20;
  } else if (freshnessRate > 0.3) {
    score += 10;
    recommendations.push('Update outdated documentation');
  } else {
    recommendations.push('Review and update all documentation files');
  }
  
  // Determine coverage level
  let coverage: 'none' | 'minimal' | 'partial' | 'good' | 'comprehensive';
  if (score === 0) {
    coverage = 'none';
  } else if (score < 30) {
    coverage = 'minimal';
  } else if (score < 60) {
    coverage = 'partial';
  } else if (score < 80) {
    coverage = 'good';
  } else {
    coverage = 'comprehensive';
  }
  
  return {
    score,
    coverage,
    recommendations
  };
}

/**
 * Validates documentation against schema templates
 */
export async function validateDocumentation(
  documentationFiles: Array<{
    path: string;
    type: string;
    lastModified: string;
    schemaCompliant: boolean;
  }>,
  templateDir: string
): Promise<{
  validFiles: number;
  invalidFiles: number;
  issues: Array<{ file: string; issues: string[] }>;
}> {
  let validFiles = 0;
  let invalidFiles = 0;
  const issues: Array<{ file: string; issues: string[] }> = [];
  
  // Check if template directory exists
  if (!fs.existsSync(templateDir)) {
    return { validFiles, invalidFiles, issues };
  }
  
  for (const doc of documentationFiles) {
    if (!doc.schemaCompliant) {
      invalidFiles++;
      issues.push({
        file: doc.path,
        issues: ['Missing or invalid YAML frontmatter']
      });
      continue;
    }
    
    try {
      const content = await readFileAsync(doc.path, 'utf8');
      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
      const match = content.match(frontmatterRegex);
      
      if (!match) {
        invalidFiles++;
        issues.push({
          file: doc.path,
          issues: ['Cannot parse YAML frontmatter']
        });
        continue;
      }
      
      const frontmatterContent = match[1];
      const metadata = yaml.load(frontmatterContent) as any;
      
      // Find appropriate template based on document type
      let templatePath = '';
      if (doc.type === 'Readme') {
        templatePath = path.join(templateDir, 'readme.yaml');
      } else if (doc.type === 'API Documentation') {
        templatePath = path.join(templateDir, 'api.yaml');
      } else {
        templatePath = path.join(templateDir, 'documentation.yaml');
      }
      
      if (!fs.existsSync(templatePath)) {
        // No template to validate against
        validFiles++;
        continue;
      }
      
      const templateContent = await readFileAsync(templatePath, 'utf8');
      const templateSchema = yaml.load(templateContent) as any;
      
      // Validate required fields
      const docIssues: string[] = [];
      if (templateSchema.required) {
        for (const field of templateSchema.required) {
          if (!metadata[field]) {
            docIssues.push(`Missing required field: ${field}`);
          }
        }
      }
      
      if (docIssues.length > 0) {
        invalidFiles++;
        issues.push({
          file: doc.path,
          issues: docIssues
        });
      } else {
        validFiles++;
      }
    } catch (error) {
      invalidFiles++;
      issues.push({
        file: doc.path,
        issues: [`Error validating file: ${error}`]
      });
    }
  }
  
  return {
    validFiles,
    invalidFiles,
    issues
  };
}
