/**
 * Project analyzer implementation
 * Core functionality for analyzing existing projects
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as yaml from 'js-yaml';
import { ProjectAnalysisResult } from '../../core/types';

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Define common file patterns to identify technologies and frameworks
const TECH_PATTERNS = {
  FRONTEND: {
    React: ['package.json', (content: string) => content.includes('"react"') || content.includes('"next"')],
    Angular: ['package.json', (content: string) => content.includes('"@angular/core"')],
    Vue: ['package.json', (content: string) => content.includes('"vue"')],
    jQuery: ['package.json', (content: string) => content.includes('"jquery"')]
  },
  BACKEND: {
    Node: ['package.json', (content: string) => content.includes('"express"') || content.includes('"koa"') || content.includes('"fastify"')],
    Spring: ['pom.xml', (content: string) => content.includes('spring-boot') || content.includes('spring-framework')],
    Rails: ['Gemfile', (content: string) => content.includes('rails')],
    Django: ['requirements.txt', (content: string) => content.includes('django')]
  },
  DATABASE: {
    MongoDB: ['package.json', (content: string) => content.includes('"mongoose"') || content.includes('"mongodb"')],
    MySQL: ['package.json', (content: string) => content.includes('"mysql"')],
    PostgreSQL: ['package.json', (content: string) => content.includes('"pg"')],
    SQLite: ['package.json', (content: string) => content.includes('"sqlite"')]
  },
  MOBILE: {
    ReactNative: ['package.json', (content: string) => content.includes('"react-native"')],
    Flutter: ['pubspec.yaml', (content: string) => content.includes('flutter:')],
    SwiftUI: ['.xcodeproj', () => true],
    Kotlin: ['build.gradle', (content: string) => content.includes('kotlin') || content.includes('android')]
  },
  DEVOPS: {
    Docker: ['Dockerfile', () => true],
    Kubernetes: ['kubernetes', (filepath: string) => filepath.includes('k8s') || filepath.endsWith('.yaml')],
    Jenkins: ['Jenkinsfile', () => true],
    GitHub: ['.github/workflows', () => true]
  }
};

/**
 * Analyzes a project directory to extract information about the codebase
 * @param projectPath Path to the project root directory
 * @param options Analysis options
 * @returns Analysis result object
 */
export async function analyzeProject(
  projectPath: string,
  options: {
    analysisDepth: 'basic' | 'standard' | 'deep';
    includeDotFiles: boolean;
    maxFileSize: number;
    includeNodeModules: boolean;
  }
): Promise<ProjectAnalysisResult> {
  console.log(`Analyzing project at ${projectPath}...`);
  
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project path does not exist: ${projectPath}`);
  }
  
  // Get all files in the project directory
  const files = await getAllFiles(projectPath, {
    includeDotFiles: options.includeDotFiles,
    includeNodeModules: options.includeNodeModules
  });
  
  // Load contents of key files for analysis
  const fileContents = await loadKeyFileContents(files, options.maxFileSize);
  
  // Detect languages, frameworks, build tools
  const languages = await detectLanguages(files);
  const frameworks = await detectFrameworks(files, fileContents);
  const buildTools = await detectBuildTools(files, fileContents);
  
  // Determine project type
  const detectedType = determineProjectType(languages, frameworks, fileContents);
  
  // Extract component information
  const components = await extractComponents(files, fileContents, {
    depth: options.analysisDepth
  });
  
  // Get repository information
  const repositoryInfo = await getRepositoryInfo(projectPath);
  
  // Find existing documentation
  const existingDocumentation = await findExistingDocumentation(projectPath, {
    includeReadme: true,
    includeApiDocs: true,
    includeInlineComments: options.analysisDepth === 'deep'
  });
  
  return {
    detectedType,
    languages,
    frameworks,
    buildTools,
    detectedComponents: components,
    existingDocumentation,
    repositoryInfo
  };
}

/**
 * Recursively gets all files in a directory that match the filter criteria
 */
export async function getAllFiles(
  dirPath: string, 
  options: { 
    includeDotFiles: boolean, 
    includeNodeModules: boolean 
  }
): Promise<string[]> {
  let results: string[] = [];
  const entries = await readdirAsync(dirPath);
  
  for (const entry of entries) {
    // Skip dot files if not included
    if (!options.includeDotFiles && entry.startsWith('.')) {
      continue;
    }
    
    // Skip node_modules if not included
    if (!options.includeNodeModules && entry === 'node_modules') {
      continue;
    }
    
    const fullPath = path.join(dirPath, entry);
    const stats = await statAsync(fullPath);
    
    if (stats.isDirectory()) {
      const nestedFiles = await getAllFiles(fullPath, options);
      results = results.concat(nestedFiles);
    } else {
      results.push(fullPath);
    }
  }
  
  return results;
}

/**
 * Loads contents of key files that are needed for analysis
 */
export async function loadKeyFileContents(
  files: string[], 
  maxFileSize: number
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const keyFilePatterns = [
    'package.json',
    'pom.xml',
    'requirements.txt',
    'Gemfile',
    'build.gradle',
    'pubspec.yaml',
    'Dockerfile',
    'Jenkinsfile',
    '.gitignore',
    'README.md',
    'tsconfig.json',
    'webpack.config.js',
    'angular.json',
    'vue.config.js'
  ];
  
  for (const file of files) {
    const fileName = path.basename(file);
    // Load content for key files or smaller files
    if (keyFilePatterns.includes(fileName) || fileName.endsWith('.md')) {
      try {
        const stats = await statAsync(file);
        if (stats.size <= maxFileSize) {
          const content = await readFileAsync(file, 'utf8');
          result.set(file, content);
        }
      } catch (error) {
        console.warn(`Error reading file ${file}: ${error}`);
      }
    }
  }
  
  return result;
}

/**
 * Detects programming languages used in the project
 */
export async function detectLanguages(
  files: string[]
): Promise<Array<{ name: string; percentage: number; files: number }>> {
  const extensions: { [key: string]: string } = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.jsx': 'JavaScript (React)',
    '.tsx': 'TypeScript (React)',
    '.py': 'Python',
    '.java': 'Java',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.go': 'Go',
    '.cs': 'C#',
    '.cpp': 'C++',
    '.c': 'C',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.rs': 'Rust',
    '.dart': 'Dart'
  };
  
  const languageCounts: { [key: string]: number } = {};
  
  for (const file of files) {
    const ext = path.extname(file);
    if (extensions[ext]) {
      const lang = extensions[ext];
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
  }
  
  const totalFiles = Object.values(languageCounts).reduce((sum, count) => sum + count, 0);
  
  return Object.entries(languageCounts)
    .map(([name, count]) => ({
      name,
      percentage: totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0,
      files: count
    }))
    .sort((a, b) => b.files - a.files);
}

/**
 * Detects frameworks and libraries used in the project
 */
export async function detectFrameworks(
  files: string[],
  fileContents: Map<string, string>
): Promise<string[]> {
  const detectedFrameworks = new Set<string>();
  
  // Check package.json for dependencies
  const packageJsonFiles = files.filter(file => file.endsWith('package.json'));
  for (const file of packageJsonFiles) {
    const content = fileContents.get(file);
    if (content) {
      try {
        const packageJson = JSON.parse(content);
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };
        
        if (dependencies) {
          // Check for common frameworks
          if (dependencies.react) detectedFrameworks.add('React');
          if (dependencies['@angular/core']) detectedFrameworks.add('Angular');
          if (dependencies.vue) detectedFrameworks.add('Vue.js');
          if (dependencies.express) detectedFrameworks.add('Express.js');
          if (dependencies.next) detectedFrameworks.add('Next.js');
          if (dependencies.nestjs) detectedFrameworks.add('NestJS');
          if (dependencies['react-native']) detectedFrameworks.add('React Native');
        }
      } catch (error) {
        console.warn(`Error parsing package.json ${file}: ${error}`);
      }
    }
  }
  
  // Check for other frameworks based on file patterns
  for (const category in TECH_PATTERNS) {
    for (const tech in TECH_PATTERNS[category as keyof typeof TECH_PATTERNS]) {
      const [pattern, check] = TECH_PATTERNS[category as keyof typeof TECH_PATTERNS][tech as any];
      
      // Check if files match the pattern
      const matchingFiles = files.filter(file => file.includes(pattern));
      for (const file of matchingFiles) {
        const content = fileContents.get(file);
        if (content && typeof check === 'function' && check(content)) {
          detectedFrameworks.add(tech);
          break;
        }
      }
    }
  }
  
  return Array.from(detectedFrameworks);
}

/**
 * Determines the project type based on languages and frameworks
 */
export function determineProjectType(
  languages: Array<{ name: string; percentage: number; files: number }>,
  frameworks: string[],
  fileContents: Map<string, string>
): string {
  // Check for academic paper implementation
  const readmeFiles = Array.from(fileContents.keys()).filter(file => 
    path.basename(file).toLowerCase() === 'readme.md'
  );
  
  for (const file of readmeFiles) {
    const content = fileContents.get(file);
    if (content && (
      content.includes('paper implementation') || 
      content.includes('research paper') || 
      content.includes('academic paper') ||
      content.includes('paper reference') ||
      content.includes('implementation of the paper')
    )) {
      return 'ACADEMIC_PAPER';
    }
  }
  
  // Determine based on frameworks and languages
  if (frameworks.includes('React Native') || frameworks.includes('Flutter')) {
    return 'MOBILE';
  }
  
  if (frameworks.includes('React') || frameworks.includes('Angular') || frameworks.includes('Vue.js')) {
    return 'WEB';
  }
  
  if (frameworks.includes('Express.js') || frameworks.includes('NestJS')) {
    return 'API';
  }
  
  // Determine based on dominant language
  if (languages.length > 0) {
    const dominantLanguage = languages[0];
    
    if (['C#', 'Java', 'C++', 'Swift'].includes(dominantLanguage.name)) {
      return 'DESKTOP';
    }
    
    if (['JavaScript', 'TypeScript'].includes(dominantLanguage.name)) {
      return 'WEB';
    }
    
    if (['Python', 'Ruby', 'PHP'].includes(dominantLanguage.name)) {
      return 'API';
    }
  }
  
  return 'OTHER';
}

/**
 * Extract component information from the project
 */
export async function extractComponents(
  files: string[],
  fileContents: Map<string, string>,
  options: {
    depth: 'basic' | 'standard' | 'deep';
    languageOverride?: string;
  }
): Promise<Array<{
  name: string;
  path: string;
  type: string;
  relationships: Array<{
    targetComponent: string;
    relationType: 'imports' | 'extends' | 'implements' | 'uses';
  }>;
}>> {
  const components: Array<{
    name: string;
    path: string;
    type: string;
    relationships: Array<{
      targetComponent: string;
      relationType: 'imports' | 'extends' | 'implements' | 'uses';
    }>;
  }> = [];
  
  // Extract components for JavaScript/TypeScript files
  const jsFiles = files.filter(file => /\.(js|ts|jsx|tsx)$/.test(file));
  
  // For basic analysis, just list the files
  if (options.depth === 'basic') {
    for (const file of jsFiles) {
      const name = path.basename(file, path.extname(file));
      components.push({
        name,
        path: file,
        type: determineComponentType(file),
        relationships: []
      });
    }
    return components;
  }
  
  // For standard and deep analysis, extract more information
  for (const file of jsFiles) {
    const content = fileContents.get(file);
    if (!content) continue;
    
    const name = path.basename(file, path.extname(file));
    const type = determineComponentType(file);
    const relationships: Array<{
      targetComponent: string;
      relationType: 'imports' | 'extends' | 'implements' | 'uses';
    }> = [];
    
    // Extract imports
    const importMatches = content.matchAll(/import\s+(\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of Array.from(importMatches)) {
      if (match[2] && !match[2].startsWith('.')) {
        relationships.push({
          targetComponent: match[2],
          relationType: 'imports'
        });
      } else if (match[2]) {
        // Resolve relative import
        const importPath = path.resolve(path.dirname(file), match[2]);
        relationships.push({
          targetComponent: importPath,
          relationType: 'imports'
        });
      }
    }
    
    // Extract extends/implements (for TS)
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const extendsMatches = content.match(/class\s+\w+\s+extends\s+(\w+)/g);
      if (extendsMatches) {
        for (const match of extendsMatches) {
          const className = match.match(/extends\s+(\w+)/)?.[1];
          if (className) {
            relationships.push({
              targetComponent: className,
              relationType: 'extends'
            });
          }
        }
      }
      
      const implementsMatches = content.match(/class\s+\w+(?:\s+extends\s+\w+)?\s+implements\s+([\w,\s]+)/g);
      if (implementsMatches) {
        for (const match of implementsMatches) {
          const interfaceNames = match.match(/implements\s+([\w,\s]+)/)?.[1].split(',').map(s => s.trim());
          if (interfaceNames) {
            for (const interfaceName of interfaceNames) {
              relationships.push({
                targetComponent: interfaceName,
                relationType: 'implements'
              });
            }
          }
        }
      }
    }
    
    components.push({
      name,
      path: file,
      type,
      relationships
    });
  }
  
  return components;
}

/**
 * Determine the type of a component based on its file path
 */
function determineComponentType(filePath: string): string {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath);
  
  if (fileName.includes('.component.')) return 'Component';
  if (fileName.includes('.service.')) return 'Service';
  if (fileName.includes('.model.')) return 'Model';
  if (fileName.includes('.util.')) return 'Utility';
  if (fileName.includes('.controller.')) return 'Controller';
  if (fileName.includes('.middleware.')) return 'Middleware';
  if (fileName.includes('.test.') || fileName.includes('.spec.')) return 'Test';
  
  if (filePath.includes('/components/')) return 'Component';
  if (filePath.includes('/services/')) return 'Service';
  if (filePath.includes('/models/')) return 'Model';
  if (filePath.includes('/utils/')) return 'Utility';
  if (filePath.includes('/controllers/')) return 'Controller';
  if (filePath.includes('/middleware/')) return 'Middleware';
  if (filePath.includes('/tests/')) return 'Test';
  
  return 'Module';
}

/**
 * Gets repository information if available
 */
export async function getRepositoryInfo(
  projectPath: string
): Promise<{ type: string; remoteUrl?: string; branch?: string } | undefined> {
  const gitDir = path.join(projectPath, '.git');
  if (!fs.existsSync(gitDir)) {
    // Try checking for SVN, Mercurial etc. if git not found
    return undefined;
  }
  
  try {
    // Check if git is a directory (normal git repo)
    const stats = await statAsync(gitDir);
    if (!stats.isDirectory()) {
      return undefined;
    }
    
    // Get remote URL if available
    const configFile = path.join(gitDir, 'config');
    if (fs.existsSync(configFile)) {
      const configContent = await readFileAsync(configFile, 'utf8');
      const urlMatch = configContent.match(/url\s*=\s*(.+)/);
      const remoteUrl = urlMatch ? urlMatch[1].trim() : undefined;
      
      // Get current branch
      const headFile = path.join(gitDir, 'HEAD');
      if (fs.existsSync(headFile)) {
        const headContent = await readFileAsync(headFile, 'utf8');
        const refMatch = headContent.match(/ref: refs\/heads\/(.+)/);
        const branch = refMatch ? refMatch[1].trim() : undefined;
        
        return {
          type: 'git',
          remoteUrl,
          branch
        };
      }
      
      return {
        type: 'git',
        remoteUrl
      };
    }
    
    return {
      type: 'git'
    };
  } catch (error) {
    console.warn(`Error getting repository info: ${error}`);
    return undefined;
  }
}

/**
 * Detects build tools used in the project
 */
export async function detectBuildTools(
  files: string[],
  fileContents: Map<string, string>
): Promise<string[]> {
  const detectedTools = new Set<string>();
  
  // Check for common build tools
  const toolPatterns = [
    { name: 'npm', pattern: 'package.json' },
    { name: 'yarn', pattern: 'yarn.lock' },
    { name: 'pnpm', pattern: 'pnpm-lock.yaml' },
    { name: 'webpack', pattern: 'webpack.config.js' },
    { name: 'gulp', pattern: 'gulpfile.js' },
    { name: 'grunt', pattern: 'Gruntfile.js' },
    { name: 'vite', pattern: 'vite.config.js' },
    { name: 'babel', pattern: '.babelrc' },
    { name: 'eslint', pattern: '.eslintrc' },
    { name: 'prettier', pattern: '.prettierrc' },
    { name: 'jest', pattern: 'jest.config.js' },
    { name: 'maven', pattern: 'pom.xml' },
    { name: 'gradle', pattern: 'build.gradle' },
    { name: 'pip', pattern: 'requirements.txt' },
    { name: 'bundler', pattern: 'Gemfile' }
  ];
  
  for (const file of files) {
    for (const tool of toolPatterns) {
      if (file.includes(tool.pattern)) {
        detectedTools.add(tool.name);
        break;
      }
    }
  }
  
  // Check package.json for dev dependencies
  const packageJsonFiles = files.filter(file => file.endsWith('package.json'));
  for (const file of packageJsonFiles) {
    const content = fileContents.get(file);
    if (content) {
      try {
        const packageJson = JSON.parse(content);
        const devDependencies = packageJson.devDependencies || {};
        
        if (devDependencies.webpack) detectedTools.add('webpack');
        if (devDependencies.gulp) detectedTools.add('gulp');
        if (devDependencies.grunt) detectedTools.add('grunt');
        if (devDependencies.vite) detectedTools.add('vite');
        if (devDependencies['@babel/core']) detectedTools.add('babel');
        if (devDependencies.eslint) detectedTools.add('eslint');
        if (devDependencies.prettier) detectedTools.add('prettier');
        if (devDependencies.jest) detectedTools.add('jest');
      } catch (error) {
        console.warn(`Error parsing package.json ${file}: ${error}`);
      }
    }
  }
  
  return Array.from(detectedTools);
}
