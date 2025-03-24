/**
 * Project analyzer module
 * Analyzes existing projects to gather information about structure, technologies, and documentation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as yaml from 'js-yaml';
import { ProjectAnalysisResult, ProjectType } from '../types';
import { getLogger } from './logger';

const logger = getLogger('project-analyzer');
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

// File extensions to language mapping
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SASS',
  '.less': 'LESS',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.py': 'Python',
  '.rb': 'Ruby',
  '.go': 'Go',
  '.rs': 'Rust',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.m': 'Objective-C',
  '.dart': 'Dart',
  '.sh': 'Shell',
  '.pl': 'Perl',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.erl': 'Erlang',
  '.scala': 'Scala',
  '.lua': 'Lua',
  '.r': 'R',
  '.md': 'Markdown',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.sql': 'SQL',
  '.graphql': 'GraphQL',
  '.proto': 'Protocol Buffers'
};

// Documentation file patterns
const DOC_PATTERNS = [
  { regex: /readme\.md$/i, type: 'README' },
  { regex: /contributing\.md$/i, type: 'CONTRIBUTING' },
  { regex: /license(\.md|\.txt)?$/i, type: 'LICENSE' },
  { regex: /changelog\.md$/i, type: 'CHANGELOG' },
  { regex: /api[\\\/].*\.md$/i, type: 'API' },
  { regex: /docs[\\\/].*\.md$/i, type: 'Documentation' },
  { regex: /\.github[\\\/].*\.md$/i, type: 'GitHub Documentation' },
  { regex: /wiki[\\\/].*\.md$/i, type: 'Wiki' },
];

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
  logger.info(`Analyzing project at ${projectPath} with depth ${options.analysisDepth}`);
  
  const absolutePath = path.resolve(projectPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Project path does not exist: ${absolutePath}`);
  }

  // Get all project files based on options
  const files = await getAllFiles(absolutePath, options);
  logger.info(`Found ${files.length} files to analyze`);

  // Load file contents for key files
  const fileContents = await loadKeyFileContents(files, options.maxFileSize);
  
  // Detect languages used in the project
  const languages = await detectLanguages(files);
  
  // Detect frameworks and libraries
  const frameworks = await detectFrameworks(files, fileContents);
  
  // Detect build tools
  const buildTools = await detectBuildTools(files, fileContents);
  
  // Find existing documentation
  const existingDocumentation = await findExistingDocumentation(absolutePath, {
    includeReadme: true,
    includeApiDocs: true,
    includeInlineComments: options.analysisDepth === 'deep'
  });
  
  // Extract components based on depth
  const detectedComponents = await extractComponents(files, fileContents, { 
    depth: options.analysisDepth 
  });
  
  // Determine project type
  const detectedType = determineProjectType(languages, frameworks, fileContents);
  
  // Get repository information if available
  const repositoryInfo = await getRepositoryInfo(absolutePath);

  const result: ProjectAnalysisResult = {
    detectedType,
    languages,
    frameworks,
    buildTools,
    detectedComponents,
    existingDocumentation,
    repositoryInfo
  };

  logger.info(`Project analysis complete for ${projectPath}`);
  return result;
}

/**
 * Recursively gets all files in a directory that match the filter criteria
 */
async function getAllFiles(
  dirPath: string, 
  options: { 
    includeDotFiles: boolean, 
    includeNodeModules: boolean 
  }
): Promise<string[]> {
  const result: string[] = [];
  
  async function traverseDirectory(currentPath: string) {
    const entries = await readdirAsync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      // Skip based on filters
      if (!options.includeDotFiles && entry.name.startsWith('.')) {
        continue;
      }
      
      if (!options.includeNodeModules && 
          (entry.name === 'node_modules' || 
           entry.name === 'bower_components' || 
           entry.name === 'dist' || 
           entry.name === 'build' ||
           entry.name === 'target')) {
        continue;
      }
      
      if (entry.isDirectory()) {
        await traverseDirectory(fullPath);
      } else {
        result.push(fullPath);
      }
    }
  }
  
  await traverseDirectory(dirPath);
  return result;
}

/**
 * Loads contents of key files that are needed for analysis
 */
async function loadKeyFileContents(
  files: string[], 
  maxFileSize: number
): Promise<Map<string, string>> {
  const fileContents = new Map<string, string>();
  const keyFilePatterns = [
    'package.json', 'pom.xml', 'build.gradle', 'Gemfile', 
    'requirements.txt', 'Dockerfile', 'docker-compose.yml',
    '.gitlab-ci.yml', '.travis.yml', 'Jenkinsfile',
    'tsconfig.json', 'webpack.config.js', 'babel.config.js',
    'angular.json', 'vue.config.js', 'next.config.js',
    'pubspec.yaml', 'cargo.toml', 'pyproject.toml'
  ];
  
  for (const file of files) {
    const fileName = path.basename(file);
    const isKeyFile = keyFilePatterns.some(pattern => 
      fileName.toLowerCase() === pattern.toLowerCase() || 
      file.toLowerCase().includes(pattern.toLowerCase())
    );
    
    if (isKeyFile) {
      try {
        const stats = await statAsync(file);
        if (stats.size <= maxFileSize) {
          const content = await readFileAsync(file, 'utf8');
          fileContents.set(file, content);
        }
      } catch (error) {
        logger.warn(`Error reading file ${file}: ${error}`);
      }
    }
  }
  
  return fileContents;
}

/**
 * Detects programming languages used in the project
 */
export async function detectLanguages(
  files: string[]
): Promise<Array<{ name: string; percentage: number; files: number }>> {
  const languageCounts: Record<string, number> = {};
  let totalFiles = 0;
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (LANGUAGE_EXTENSIONS[ext]) {
      const language = LANGUAGE_EXTENSIONS[ext];
      languageCounts[language] = (languageCounts[language] || 0) + 1;
      totalFiles++;
    }
  }
  
  // Calculate percentages and create the result array
  const result = Object.entries(languageCounts).map(([name, count]) => ({
    name,
    percentage: Math.round((count / totalFiles) * 100),
    files: count
  }));
  
  // Sort by file count in descending order
  return result.sort((a, b) => b.files - a.files);
}

/**
 * Detects frameworks and libraries used in the project
 */
export async function detectFrameworks(
  files: string[],
  fileContents: Map<string, string>
): Promise<string[]> {
  const detectedFrameworks = new Set<string>();
  
  // Check for framework-specific patterns
  for (const category of Object.keys(TECH_PATTERNS)) {
    const categoryPatterns = (TECH_PATTERNS as any)[category];
    
    for (const [framework, pattern] of Object.entries(categoryPatterns)) {
      const [filePattern, matchFn] = pattern as [string, Function];
      
      for (const [filePath, content] of fileContents.entries()) {
        if (path.basename(filePath) === filePattern || filePath.includes(filePattern)) {
          if (matchFn(content, filePath)) {
            detectedFrameworks.add(framework);
          }
        }
      }
    }
  }
  
  return Array.from(detectedFrameworks);
}

/**
 * Detects build tools used in the project
 */
async function detectBuildTools(
  files: string[],
  fileContents: Map<string, string>
): Promise<string[]> {
  const buildTools = new Set<string>();
  
  // Build tool detection patterns
  const patterns = [
    { file: 'package.json', tool: 'npm', check: (c: string) => true },
    { file: 'package.json', tool: 'webpack', check: (c: string) => c.includes('"webpack"') },
    { file: 'package.json', tool: 'babel', check: (c: string) => c.includes('"babel"') },
    { file: 'package.json', tool: 'eslint', check: (c: string) => c.includes('"eslint"') },
    { file: 'package.json', tool: 'typescript', check: (c: string) => c.includes('"typescript"') },
    { file: 'package.json', tool: 'jest', check: (c: string) => c.includes('"jest"') },
    { file: 'package.json', tool: 'mocha', check: (c: string) => c.includes('"mocha"') },
    { file: 'pom.xml', tool: 'Maven', check: (c: string) => true },
    { file: 'build.gradle', tool: 'Gradle', check: (c: string) => true },
    { file: 'Makefile', tool: 'Make', check: (c: string) => true },
    { file: 'CMakeLists.txt', tool: 'CMake', check: (c: string) => true },
    { file: 'Gemfile', tool: 'Bundler', check: (c: string) => true },
    { file: 'requirements.txt', tool: 'pip', check: (c: string) => true },
    { file: 'pyproject.toml', tool: 'Poetry', check: (c: string) => c.includes('[tool.poetry]') },
    { file: 'tox.ini', tool: 'tox', check: (c: string) => true },
    { file: 'Cargo.toml', tool: 'Cargo', check: (c: string) => true }
  ];
  
  for (const [filePath, content] of fileContents.entries()) {
    const fileName = path.basename(filePath);
    for (const { file, tool, check } of patterns) {
      if (fileName === file && check(content)) {
        buildTools.add(tool);
      }
    }
  }
  
  return Array.from(buildTools);
}

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
  
  // Get all potential documentation files
  const files = await getAllFiles(projectPath, { 
    includeDotFiles: true, 
    includeNodeModules: false 
  });
  
  for (const file of files) {
    const relativePath = path.relative(projectPath, file);
    let isDocFile = false;
    let docType = '';
    
    // Check if the file matches a documentation pattern
    for (const pattern of DOC_PATTERNS) {
      if (pattern.regex.test(relativePath)) {
        isDocFile = true;
        docType = pattern.type;
        break;
      }
    }
    
    // Skip non-doc files or based on options
    if (!isDocFile) continue;
    if (!options.includeReadme && docType === 'README') continue;
    if (!options.includeApiDocs && docType === 'API') continue;
    
    try {
      const stats = await statAsync(file);
      // Check if the documentation is schema-compliant (has YAML frontmatter)
      let isSchemaCompliant = false;
      try {
        const content = await readFileAsync(file, 'utf8');
        isSchemaCompliant = hasYamlFrontmatter(content);
      } catch (error) {
        logger.warn(`Error reading file ${file}: ${error}`);
      }
      
      result.push({
        path: relativePath,
        type: docType,
        lastModified: stats.mtime.toISOString(),
        schemaCompliant: isSchemaCompliant
      });
    } catch (error) {
      logger.warn(`Error processing doc file ${file}: ${error}`);
    }
  }
  
  return result;
}

/**
 * Checks if a file has YAML frontmatter
 */
function hasYamlFrontmatter(content: string): boolean {
  // Check for YAML frontmatter between --- delimiters
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return false;
  
  try {
    // Try to parse the YAML content
    yaml.load(match[1]);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts component information from the project
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
  // This is a placeholder implementation that should be expanded
  // based on the project's specific needs and analysis depth
  const components: Array<{
    name: string;
    path: string;
    type: string;
    relationships: Array<{
      targetComponent: string;
      relationType: 'imports' | 'extends' | 'implements' | 'uses';
    }>;
  }> = [];
  
  // For basic depth, just identify top-level directories
  if (options.depth === 'basic') {
    const dirMap = new Map<string, {
      count: number;
      paths: string[];
    }>();
    
    for (const file of files) {
      const dir = path.dirname(file);
      const dirParts = dir.split(path.sep);
      if (dirParts.length > 1) {
        // Use second level directory as a component
        const componentDir = dirParts.slice(0, 2).join(path.sep);
        
        if (!dirMap.has(componentDir)) {
          dirMap.set(componentDir, { count: 0, paths: [] });
        }
        
        const component = dirMap.get(componentDir)!;
        component.count++;
        component.paths.push(file);
      }
    }
    
    // Convert directory map to components
    for (const [dirPath, info] of dirMap.entries()) {
      if (info.count > 5) { // Only consider dirs with multiple files
        components.push({
          name: path.basename(dirPath),
          path: dirPath,
          type: 'directory',
          relationships: [] // No relationships for basic analysis
        });
      }
    }
  }
  
  // For standard and deep depth, need more complex analysis
  // This is a simplified placeholder
  if (options.depth === 'standard' || options.depth === 'deep') {
    // This would require parsing source code and analyzing imports
    // which is beyond the scope of a simple implementation
    logger.info('Advanced component analysis requires language-specific parsers');
    
    // Placeholder for more advanced analysis
    // In a real implementation, this would involve AST parsing,
    // dependency graph construction, etc.
  }
  
  return components;
}

/**
 * Determines the project type based on languages and frameworks
 */
function determineProjectType(
  languages: Array<{ name: string; percentage: number; files: number }>,
  frameworks: string[],
  fileContents: Map<string, string>
): ProjectType {
  // Simple heuristic for determining project type
  
  // Check for mobile frameworks as highest priority
  if (frameworks.some(f => 
      ['ReactNative', 'Flutter', 'SwiftUI', 'Kotlin'].includes(f))) {
    return 'MOBILE';
  }
  
  // Check for web frameworks
  if (frameworks.some(f => 
      ['React', 'Angular', 'Vue', 'jQuery', 'Node'].includes(f))) {
    return 'WEB';
  }
  
  // Check for API specific indicators
  const hasApiIndicators = Array.from(fileContents.values()).some(content => 
    content.includes('endpoint') || 
    content.includes('api') || 
    content.includes('REST') ||
    content.includes('GraphQL')
  );
  
  if (hasApiIndicators) {
    return 'API';
  }
  
  // Check for desktop app indicators
  if (frameworks.some(f => ['Electron', 'WPF', 'WinForms', 'JavaFX'].includes(f)) ||
      languages.some(l => ['C#', 'Swift', 'C++'].includes(l.name) && l.percentage > 30)) {
    return 'DESKTOP';
  }
  
  // Default to OTHER if can't determine
  return 'OTHER';
}

/**
 * Gets repository information if available
 */
async function getRepositoryInfo(
  projectPath: string
): Promise<{ type: string; remoteUrl?: string; branch?: string } | undefined> {
  try {
    // Check for .git directory
    const gitDir = path.join(projectPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return undefined;
    }
    
    // It's a git repository
    const configPath = path.join(gitDir, 'config');
    if (fs.existsSync(configPath)) {
      const config = await readFileAsync(configPath, 'utf8');
      
      // Extract remote URL
      const remoteUrlMatch = config.match(/url\s*=\s*(.+)/);
      const remoteUrl = remoteUrlMatch ? remoteUrlMatch[1].trim() : undefined;
      
      // Try to get current branch
      const headPath = path.join(gitDir, 'HEAD');
      if (fs.existsSync(headPath)) {
        const headContent = await readFileAsync(headPath, 'utf8');
        const branchMatch = headContent.match(/ref: refs\/heads\/(.+)/);
        const branch = branchMatch ? branchMatch[1].trim() : undefined;
        
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
    logger.warn(`Error getting repository info: ${error}`);
    return undefined;
  }
}