/**
 * Todo Validator Module
 * Analyzes code to identify missing TODO items that should be present based on code structure.
 * This module provides functionality to:
 * 1. Discover existing TODO items in code
 * 2. Analyze code structure to identify where TODOs should be present
 * 3. Perform semantic analysis to identify implementation gaps
 * 4. Generate reports of missing TODOs
 * 5. Suggest content for missing TODOs
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { getLogger } from './logger';
import { 
  analyzeProject, 
  detectLanguages, 
  extractComponents, 
  findExistingDocumentation 
} from './project-analyzer';
// Import the AST analyzer (will create this file if it doesn't exist)
import { analyzeCodeAST, convertASTResultsToTodos, ASTAnalysisResult } from './ast-analyzer';

const logger = getLogger('todo-validator');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Interfaces for Todo validation
export interface TodoValidationOptions {
  depth: 'basic' | 'standard' | 'deep';
  reportMissing: boolean;
  suggestTodos: boolean;
  includeDotFiles?: boolean;
  maxFileSize?: number;
  includeNodeModules?: boolean;
  // Enhanced validation options
  analyzeSemantics?: boolean;
  analyzeComments?: boolean;
  analyzeTestQuality?: boolean;
  semanticAnalysisDepth?: 'basic' | 'standard' | 'deep';
}

export interface TodoItem {
  description: string;
  file: string;
  line?: number;
  issueRef?: string;
  severity: 'low' | 'medium' | 'high';
  suggestedContent?: string;
}

export interface TodoValidationResult {
  existingTodos: TodoItem[];
  missingTodos: TodoItem[];
  suggestions: TodoItem[];
  // Enhanced validation results
  semanticIssues?: ASTAnalysisResult;
}

/**
 * Validates TODOs in a project by comparing expected TODOs against actual TODOs
 * with optional semantic analysis for enhanced validation.
 * @param projectPath Path to the project directory
 * @param options Validation options
 * @returns Validation result with existing, missing, and suggested TODOs
 */
export async function validateTodos(
  projectPath: string,
  options: TodoValidationOptions
): Promise<TodoValidationResult> {
  logger.info(`Validating TODOs in ${projectPath} with depth ${options.depth}`);
  
  const absolutePath = path.resolve(projectPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Project path does not exist: ${absolutePath}`);
  }
  
  // Set default options for enhanced validation
  const enhancedOptions: TodoValidationOptions = {
    ...options,
    analyzeSemantics: options.analyzeSemantics !== undefined ? options.analyzeSemantics : false,
    analyzeComments: options.analyzeComments !== undefined ? options.analyzeComments : false,
    analyzeTestQuality: options.analyzeTestQuality !== undefined ? options.analyzeTestQuality : false,
    semanticAnalysisDepth: options.semanticAnalysisDepth || options.depth || 'standard'
  };
  
  // Find existing TODOs in the codebase
  const existingTodos = await findExistingTodos(absolutePath, {
    includeDotFiles: enhancedOptions.includeDotFiles ?? false,
    maxFileSize: enhancedOptions.maxFileSize ?? 10485760, // 10MB
    includeNodeModules: enhancedOptions.includeNodeModules ?? false
  });
  
  logger.info(`Found ${existingTodos.length} existing TODOs`);
  
  // Analyze code to determine expected TODOs
  const expectedTodos = await analyzeCodeForExpectedTodos(absolutePath, enhancedOptions);
  
  logger.info(`Identified ${expectedTodos.length} expected TODOs`);
  
  // Initialize the result
  const result: TodoValidationResult = {
    existingTodos,
    missingTodos: [],
    suggestions: [],
    semanticIssues: {
      nullReturns: [],
      emptyBlocks: [],
      incompleteErrorHandling: [],
      incompleteSwitchStatements: [],
      suspiciousImplementations: []
    }
  };
  
  // Find missing TODOs by comparing expected against existing
  result.missingTodos = findMissingTodos(expectedTodos, existingTodos);
  
  // Generate suggestions for missing TODOs
  result.suggestions = enhancedOptions.suggestTodos 
    ? generateTodoSuggestions(expectedTodos, existingTodos)
    : [];
  
  logger.info(`Found ${result.missingTodos.length} missing TODOs`);
  
  // Perform semantic analysis if enabled
  if (enhancedOptions.analyzeSemantics) {
    logger.info(`Performing semantic code analysis with depth ${enhancedOptions.semanticAnalysisDepth}`);
    
    // Get all source files
    const files = await getAllProjectFiles(absolutePath, {
      includeDotFiles: enhancedOptions.includeDotFiles ?? false,
      maxFileSize: enhancedOptions.maxFileSize ?? 10485760,
      includeNodeModules: enhancedOptions.includeNodeModules ?? false
    });
    
    // Filter to only analyze TypeScript/JavaScript files
    const tsFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
    });
    
    try {
      // Run AST-based semantic analysis
      const semanticIssues = await analyzeCodeAST(tsFiles, {
        checkNullReturns: true,
        checkEmptyBlocks: true,
        checkErrorHandling: true,
        checkSwitchStatements: true,
        checkSuspiciousPatterns: true,
        includeNodeModules: enhancedOptions.includeNodeModules
      });
      
      result.semanticIssues = semanticIssues;
      
      // Convert semantic issues to TODOs
      const semanticTodos = convertASTResultsToTodos(semanticIssues);
      
      // Filter out TODOs that already exist in the codebase
      const filteredSemanticTodos = filterExistingTodos(semanticTodos, existingTodos);
      
      // Add semantic TODOs to missing TODOs
      result.missingTodos = [...result.missingTodos, ...filteredSemanticTodos];
      
      // Add semantic TODOs to suggestions if enabled
      if (enhancedOptions.suggestTodos) {
        result.suggestions = [...result.suggestions, ...filteredSemanticTodos];
      }
      
      logger.info(`Semantic analysis found ${semanticTodos.length} issues, ${filteredSemanticTodos.length} not already addressed`);
    } catch (error) {
      logger.error(`Error during semantic analysis: ${error}`);
    }
  }
  
  // Perform comment analysis if enabled
  if (enhancedOptions.analyzeComments) {
    // Not yet implemented
    logger.info('Comment analysis not yet implemented');
  }
  
  // Perform test quality analysis if enabled
  if (enhancedOptions.analyzeTestQuality) {
    // Not yet implemented
    logger.info('Test quality analysis not yet implemented');
  }
  
  return result;
}

/**
 * Finds existing TODO comments in the codebase
 * @param projectPath Path to the project
 * @param options Search options
 * @returns Array of found TODO items
 */
export async function findExistingTodos(
  projectPath: string,
  options: {
    includeDotFiles: boolean;
    maxFileSize: number;
    includeNodeModules: boolean;
  }
): Promise<TodoItem[]> {
  const result: TodoItem[] = [];
  const allFiles = await getAllProjectFiles(projectPath, options);
  
  // Regular expressions for finding TODOs
  const todoRegex = /\/\/\s*TODO:?\s*(.*?)($|\n|\r)/g;
  const multilineTodoRegex = /\/\*\s*TODO:?\s*([\s\S]*?)\*\//g;
  const issueRefRegex = /GitHub\s+issue:?\s*(https:\/\/github\.com\/\S+\/issues\/\d+|#\d+)/i;
  
  for (const file of allFiles) {
    try {
      const stats = await fs.promises.stat(file);
      if (stats.size <= options.maxFileSize) {
        const content = await readFileAsync(file, 'utf8');
        
        // Split content into lines for line number tracking
        const lines = content.split('\n');
        
        // Find single-line TODOs
        let match;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          todoRegex.lastIndex = 0;
          
          while ((match = todoRegex.exec(line)) !== null) {
            const description = match[1].trim();
            
            // Look for GitHub issue references
            const issueMatch = description.match(issueRefRegex);
            const issueRef = issueMatch ? issueMatch[1] : undefined;
            
            result.push({
              description,
              file: path.relative(projectPath, file),
              line: i + 1,
              issueRef,
              severity: determineSeverity(description)
            });
          }
        }
        
        // Find multiline TODOs
        multilineTodoRegex.lastIndex = 0;
        while ((match = multilineTodoRegex.exec(content)) !== null) {
          const description = match[1].trim();
          
          // Calculate line number by counting newlines before the match
          const precedingText = content.substring(0, match.index);
          const line = precedingText.split('\n').length;
          
          // Look for GitHub issue references
          const issueMatch = description.match(issueRefRegex);
          const issueRef = issueMatch ? issueMatch[1] : undefined;
          
          result.push({
            description,
            file: path.relative(projectPath, file),
            line,
            issueRef,
            severity: determineSeverity(description)
          });
        }
      }
    } catch (error) {
      logger.warn(`Error processing file ${file}: ${error}`);
    }
  }
  
  return result;
}

/**
 * Determines the severity of a TODO based on its description
 */
function determineSeverity(description: string): 'low' | 'medium' | 'high' {
  const lowPriority = ['enhancement', 'improve', 'polish', 'consider', 'maybe'];
  const highPriority = ['critical', 'fix', 'bug', 'error', 'security', 'vulnerability', 'crash'];
  
  const lowerDesc = description.toLowerCase();
  
  if (highPriority.some(term => lowerDesc.includes(term))) {
    return 'high';
  } else if (lowPriority.some(term => lowerDesc.includes(term))) {
    return 'low';
  } else {
    return 'medium';
  }
}

/**
 * Analyzes code structure to determine where TODOs should be present
 * @param projectPath Path to the project
 * @param options Analysis options
 * @returns Array of expected TODO items
 */
export async function analyzeCodeForExpectedTodos(
  projectPath: string,
  options: TodoValidationOptions
): Promise<TodoItem[]> {
  const expectedTodos: TodoItem[] = [];
  
  // Analyze project structure
  const analysisResult = await analyzeProject(projectPath, {
    analysisDepth: options.depth,
    includeDotFiles: options.includeDotFiles ?? false,
    maxFileSize: options.maxFileSize ?? 10485760,
    includeNodeModules: options.includeNodeModules ?? false
  });
  
  // Get all files
  const allFiles = await getAllProjectFiles(projectPath, {
    includeDotFiles: options.includeDotFiles ?? false,
    maxFileSize: options.maxFileSize ?? 10485760,
    includeNodeModules: options.includeNodeModules ?? false
  });
  
  // Build a map of file contents
  const fileContents = new Map<string, string>();
  for (const file of allFiles) {
    try {
      const stats = await fs.promises.stat(file);
      if (stats.size <= (options.maxFileSize ?? 10485760)) {
        const content = await readFileAsync(file, 'utf8');
        fileContents.set(file, content);
      }
    } catch (error) {
      logger.warn(`Error reading file ${file}: ${error}`);
    }
  }
  
  // 1. Find placeholder implementations - function stubs that need to be filled
  for (const [file, content] of fileContents.entries()) {
    const placeholders = findPlaceholderImplementations(file, content);
    expectedTodos.push(...placeholders);
  }
  
  // 2. Find incomplete implementations - functions that don't match their interfaces
  // For TypeScript files, look for interfaces and their implementations
  const tsFiles = allFiles.filter(file => file.endsWith('.ts') || file.endsWith('.tsx'));
  const interfaces = extractInterfaces(tsFiles, fileContents);
  const incompleteImplementations = findIncompleteImplementations(interfaces, fileContents);
  expectedTodos.push(...incompleteImplementations);
  
  // 3. Find test coverage gaps
  const testFiles = allFiles.filter(file => 
    file.includes('test.') || 
    file.includes('spec.') || 
    file.includes('/__tests__/') ||
    file.includes('/tests/')
  );
  
  const testCoverageGaps = findTestCoverageGaps(testFiles, allFiles, fileContents);
  expectedTodos.push(...testCoverageGaps);
  
  return expectedTodos;
}

/**
 * Find placeholder implementations that need to be completed
 */
function findPlaceholderImplementations(
  file: string,
  content: string
): TodoItem[] {
  const result: TodoItem[] = [];
  
  // Patterns that indicate placeholder code
  const placeholderPatterns = [
    // Functions with empty bodies
    { regex: /function\s+(\w+)\s*\([^)]*\)\s*\{\s*\}/g, type: 'empty function' },
    // Functions that throw "not implemented" errors
    { regex: /function\s+(\w+)\s*\([^)]*\)\s*\{[^{}]*throw\s+new\s+Error\s*\(\s*['"]not\s+implemented['"].*?\)/gi, type: 'unimplemented function' },
    // Arrow functions with empty bodies
    { regex: /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{\s*\}/g, type: 'empty arrow function' },
    // Methods with empty bodies
    { regex: /(\w+)\s*\([^)]*\)\s*\{\s*\}/g, type: 'empty method' },
    // Methods that just return null
    { regex: /(\w+)\s*\([^)]*\)\s*\{\s*return\s+null;\s*\}/g, type: 'null return method' },
    // Methods with TODO comments
    { regex: /\/\/\s*TODO:?\s*(.*?)($|\n|\r)\s*(\w+)\s*\([^)]*\)/g, type: 'method with TODO' },
    // Classes with only constructor
    { regex: /class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{\s*constructor[^{]*\{[^}]*\}\s*\}/g, type: 'empty class' }
  ];
  
  // Check for placeholder patterns
  for (const { regex, type } of placeholderPatterns) {
    let match;
    regex.lastIndex = 0;
    
    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || 'unnamed';
      
      // Get approximate line number
      const precedingText = content.substring(0, match.index);
      const line = precedingText.split('\n').length;
      
      result.push({
        description: `Implement ${type} "${name}"`,
        file: file,
        line,
        severity: 'medium',
        suggestedContent: `// TODO: Implement ${name} ${type} with proper functionality\n// GitHub issue: Create a new issue for this task`
      });
    }
  }
  
  return result;
}

/**
 * Extract interfaces from TypeScript files
 */
function extractInterfaces(
  files: string[],
  fileContents: Map<string, string>
): Map<string, { 
  name: string, 
  methods: Array<{ name: string, params: string, returnType: string }> 
}> {
  const interfaces = new Map<string, { 
    name: string, 
    methods: Array<{ name: string, params: string, returnType: string }> 
  }>();
  
  for (const file of files) {
    const content = fileContents.get(file);
    if (!content) continue;
    
    // Match interface declarations
    const interfaceRegex = /interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*\{([^}]+)\}/g;
    let match;
    
    while ((match = interfaceRegex.exec(content)) !== null) {
      const interfaceName = match[1];
      const interfaceBody = match[2];
      
      // Extract methods from interface
      const methods: Array<{ name: string, params: string, returnType: string }> = [];
      const methodRegex = /(\w+)\s*(\([^)]*\))\s*:\s*([^;]+);/g;
      let methodMatch;
      
      while ((methodMatch = methodRegex.exec(interfaceBody)) !== null) {
        methods.push({
          name: methodMatch[1],
          params: methodMatch[2],
          returnType: methodMatch[3].trim()
        });
      }
      
      interfaces.set(interfaceName, {
        name: interfaceName,
        methods
      });
    }
  }
  
  return interfaces;
}

/**
 * Find implementations that don't fully match their interfaces
 */
function findIncompleteImplementations(
  interfaces: Map<string, { 
    name: string, 
    methods: Array<{ name: string, params: string, returnType: string }> 
  }>,
  fileContents: Map<string, string>
): TodoItem[] {
  const result: TodoItem[] = [];
  
  // For each interface, try to find its implementations
  for (const [interfaceName, interfaceData] of interfaces.entries()) {
    // Look for classes that implement this interface
    for (const [file, content] of fileContents.entries()) {
      // Check for class declarations that implement the interface
      const implementsRegex = new RegExp(`class\\s+(\\w+)(?:\\s+extends\\s+\\w+)?\\s+implements\\s+([\\w\\s,]+)\\s*\\{`, 'g');
      let match;
      
      while ((match = implementsRegex.exec(content)) !== null) {
        const className = match[1];
        const implementsList = match[2];
        
        // Check if this class implements our interface
        if (implementsList.split(',').some(i => i.trim() === interfaceName)) {
          // This class implements our interface, check if all methods are implemented
          const classDef = extractClassDefinition(content, match.index);
          
          // For each interface method, check if it's implemented
          for (const method of interfaceData.methods) {
            const methodImplemented = isMethodImplemented(classDef, method.name);
            
            if (!methodImplemented) {
              // Get line number for class declaration
              const precedingText = content.substring(0, match.index);
              const line = precedingText.split('\n').length;
              
              result.push({
                description: `Implement interface method "${method.name}" in class "${className}"`,
                file,
                line,
                severity: 'high',
                suggestedContent: `// TODO: Implement ${method.name} method required by ${interfaceName} interface\n// GitHub issue: Create a new issue for this task`
              });
            }
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Extract the full class definition from a file
 */
function extractClassDefinition(content: string, startIndex: number): string {
  // Find the opening brace of the class
  const openBraceIndex = content.indexOf('{', startIndex);
  if (openBraceIndex === -1) return '';
  
  // Now find the matching closing brace
  let braceCount = 1;
  let currentIndex = openBraceIndex + 1;
  
  while (braceCount > 0 && currentIndex < content.length) {
    if (content[currentIndex] === '{') {
      braceCount++;
    } else if (content[currentIndex] === '}') {
      braceCount--;
    }
    
    currentIndex++;
  }
  
  if (braceCount === 0) {
    // We found the full class definition
    return content.substring(startIndex, currentIndex);
  }
  
  return '';
}

/**
 * Check if a method is implemented in a class definition
 */
function isMethodImplemented(classDef: string, methodName: string): boolean {
  // Simple regex to check for method implementation
  const methodRegex = new RegExp(`\\b${methodName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  return methodRegex.test(classDef);
}

/**
 * Find gaps in test coverage
 */
function findTestCoverageGaps(
  testFiles: string[],
  sourceFiles: string[],
  fileContents: Map<string, string>
): TodoItem[] {
  const result: TodoItem[] = [];
  
  // Build a map of source files to their corresponding test files
  const sourceToTestMap = new Map<string, string[]>();
  
  for (const sourceFile of sourceFiles) {
    // Skip test files and non-code files
    if (sourceFile.includes('test.') || 
        sourceFile.includes('spec.') || 
        !sourceFile.match(/\.(js|jsx|ts|tsx)$/)) {
      continue;
    }
    
    const basename = path.basename(sourceFile, path.extname(sourceFile));
    const matchingTests = testFiles.filter(testFile => {
      const testBasename = path.basename(testFile, path.extname(testFile));
      return testBasename.includes(basename) || testBasename.replace('.test', '') === basename;
    });
    
    sourceToTestMap.set(sourceFile, matchingTests);
  }
  
  // For each source file, check if it has tests
  for (const [sourceFile, tests] of sourceToTestMap.entries()) {
    if (tests.length === 0) {
      // No tests found for this source file
      result.push({
        description: `Create tests for ${path.basename(sourceFile)}`,
        file: sourceFile,
        severity: 'medium',
        suggestedContent: `// TODO: Add test coverage for this file\n// GitHub issue: Create a new issue for adding tests`
      });
      continue;
    }
    
    // If tests exist, check if they cover all exported functions/classes
    const sourceContent = fileContents.get(sourceFile);
    if (!sourceContent) continue;
    
    // Extract exported functions and classes
    const exports = extractExports(sourceContent);
    
    // Check if all exports have test coverage
    for (const exportedItem of exports) {
      let hasTestCoverage = false;
      
      for (const testFile of tests) {
        const testContent = fileContents.get(testFile);
        if (!testContent) continue;
        
        // Check if the test mentions this export
        if (testContent.includes(exportedItem)) {
          hasTestCoverage = true;
          break;
        }
      }
      
      if (!hasTestCoverage) {
        result.push({
          description: `Add test coverage for ${exportedItem}`,
          file: sourceFile,
          severity: 'medium',
          suggestedContent: `// TODO: Add test coverage for ${exportedItem}\n// GitHub issue: Create a new issue for test coverage`
        });
      }
    }
  }
  
  return result;
}

/**
 * Extract exported functions, classes, and variables from source code
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];
  
  // Match export patterns
  const exportPatterns = [
    /export\s+(?:default\s+)?function\s+(\w+)/g,
    /export\s+(?:default\s+)?class\s+(\w+)/g,
    /export\s+(?:default\s+)?const\s+(\w+)/g,
    /export\s+(?:default\s+)?let\s+(\w+)/g,
    /export\s+(?:default\s+)?var\s+(\w+)/g,
    /export\s+(?:default\s+)?interface\s+(\w+)/g,
    /export\s+(?:default\s+)?enum\s+(\w+)/g,
    /export\s+(?:default\s+)?type\s+(\w+)/g,
    /exports\.(\w+)\s*=/g
  ];
  
  for (const pattern of exportPatterns) {
    let match;
    
    while ((match = pattern.exec(content)) !== null) {
      exports.push(match[1]);
    }
  }
  
  // Also check for named exports in a single statement
  const namedExportRegex = /export\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = namedExportRegex.exec(content)) !== null) {
    const exportList = match[1];
    const namedExports = exportList.split(',')
      .map(e => {
        // Handle 'as' alias exports
        const asMatch = e.match(/\s*(\w+)(?:\s+as\s+\w+)?\s*/);
        return asMatch ? asMatch[1] : e.trim();
      })
      .filter(Boolean);
    
    exports.push(...namedExports);
  }
  
  return exports;
}

/**
 * Find missing TODOs by comparing expected against existing
 */
function findMissingTodos(
  expectedTodos: TodoItem[],
  existingTodos: TodoItem[]
): TodoItem[] {
  // Create a map of existing TODOs by file
  const existingTodoMap = new Map<string, TodoItem[]>();
  
  for (const todo of existingTodos) {
    if (!existingTodoMap.has(todo.file)) {
      existingTodoMap.set(todo.file, []);
    }
    existingTodoMap.get(todo.file)!.push(todo);
  }
  
  // Filter expected TODOs that don't have matching existing TODOs
  return expectedTodos.filter(expected => {
    const fileExistingTodos = existingTodoMap.get(expected.file) || [];
    
    // Check if any existing TODOs address the expected TODO
    return !fileExistingTodos.some(existing => 
      existing.description.toLowerCase().includes(expected.description.toLowerCase().split(' ').slice(-2).join(' ')) ||
      expected.description.toLowerCase().includes(existing.description.toLowerCase().split(' ').slice(-2).join(' '))
    );
  });
}

/**
 * Generate TODO suggestions based on missing TODOs
 */
function generateTodoSuggestions(
  expectedTodos: TodoItem[],
  existingTodos: TodoItem[]
): TodoItem[] {
  const missingTodos = findMissingTodos(expectedTodos, existingTodos);
  
  // For each missing TODO, create a suggestion with enhanced content
  return missingTodos.map(todo => ({
    ...todo,
    suggestedContent: formatTodoSuggestion(todo)
  }));
}

/**
 * Format a TODO suggestion with standardized structure
 */
function formatTodoSuggestion(todo: TodoItem): string {
  let suggestion = `// TODO: ${todo.description}\n`;
  
  // Add specific guidance based on the type of TODO
  if (todo.description.includes('Implement')) {
    suggestion += '// 1. Review the interface requirements\n';
    suggestion += '// 2. Implement the required functionality\n';
    suggestion += '// 3. Add proper error handling\n';
    suggestion += '// 4. Add tests to verify implementation\n';
  } else if (todo.description.includes('test')) {
    suggestion += '// 1. Create test file if it doesn\'t exist\n';
    suggestion += '// 2. Write tests for all exported functions\n';
    suggestion += '// 3. Include edge cases and error conditions\n';
    suggestion += '// 4. Ensure adequate coverage\n';
  }
  
  // Add issue reference placeholder
  suggestion += '// GitHub issue: Create a new issue for this task';
  
  return suggestion;
}

/**
 * Helper to get all files in a project directory
 */
async function getAllProjectFiles(
  dirPath: string,
  options: {
    includeDotFiles: boolean;
    includeNodeModules: boolean;
    maxFileSize: number;
  }
): Promise<string[]> {
  const result: string[] = [];
  
  async function traverseDirectory(currentPath: string) {
    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      
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
          // Filter by file extension: only include source code files
          const ext = path.extname(fullPath).toLowerCase();
          if (['.js', '.jsx', '.ts', '.tsx', '.java', '.py', '.rb', '.php', '.c', '.cpp', '.h', '.hpp', '.cs', '.go'].includes(ext)) {
            result.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.warn(`Error traversing directory ${currentPath}: ${error}`);
    }
  }
  
  await traverseDirectory(dirPath);
  return result;
}

/**
 * Filter out TODOs that already exist in the codebase
 */
function filterExistingTodos(
  newTodos: TodoItem[],
  existingTodos: TodoItem[]
): TodoItem[] {
  // Create a map of existing TODOs by file
  const existingTodoMap = new Map<string, TodoItem[]>();
  
  for (const todo of existingTodos) {
    if (!existingTodoMap.has(todo.file)) {
      existingTodoMap.set(todo.file, []);
    }
    existingTodoMap.get(todo.file)!.push(todo);
  }
  
  // Filter out TODOs that already exist
  return newTodos.filter(newTodo => {
    const fileExistingTodos = existingTodoMap.get(newTodo.file) || [];
    
    // Check if any existing TODO addresses the same issue
    return !fileExistingTodos.some(existingTodo => {
      // Check if either description contains the other
      const newDesc = newTodo.description.toLowerCase();
      const existingDesc = existingTodo.description.toLowerCase();
      
      return existingDesc.includes(newDesc) || 
             newDesc.includes(existingDesc) ||
             // Check for similar descriptions (using key phrases)
             hasSimilarKeyPhrases(existingDesc, newDesc);
    });
  });
}

/**
 * Check if two descriptions share similar key phrases
 */
function hasSimilarKeyPhrases(desc1: string, desc2: string): boolean {
  // Extract key phrases (words longer than 4 characters)
  const getKeyPhrases = (desc: string) => {
    return desc
      .split(/\W+/)
      .filter(word => word.length > 4)
      .map(word => word.toLowerCase());
  };
  
  const phrases1 = getKeyPhrases(desc1);
  const phrases2 = getKeyPhrases(desc2);
  
  // Check if they share enough key phrases (at least 2 or 30%)
  let sharedPhrases = 0;
  for (const phrase of phrases1) {
    if (phrases2.includes(phrase)) {
      sharedPhrases++;
    }
  }
  
  return sharedPhrases >= 2 || (phrases1.length > 0 && phrases2.length > 0 && 
    (sharedPhrases / Math.min(phrases1.length, phrases2.length) >= 0.3));
}

/**
 * Generate a report of missing TODOs
 */
export async function generateTodoReport(
  projectPath: string,
  validationResult: TodoValidationResult,
  outputPath: string,
  enhanced: boolean = false
): Promise<void> {
  // Decide on report format based on whether it's enhanced or basic
  if (!enhanced) {
    const reportContent = `# TODO Validation Report
  
## Summary

- **Existing TODOs**: ${validationResult.existingTodos.length}
- **Missing TODOs**: ${validationResult.missingTodos.length}
- **Suggested TODOs**: ${validationResult.suggestions.length}

## Missing TODOs

${validationResult.missingTodos.map(todo => `
### ${todo.file}${todo.line ? ` (line ${todo.line})` : ''}

- **Description**: ${todo.description}
- **Severity**: ${todo.severity}
${todo.suggestedContent ? `- **Suggested content**:\n\`\`\`\n${todo.suggestedContent}\n\`\`\`\n` : ''}
`).join('\n')}

## Existing TODOs

${validationResult.existingTodos.map(todo => `
- **${todo.file}${todo.line ? ` (line ${todo.line})` : ''}**: ${todo.description}${todo.issueRef ? ` (${todo.issueRef})` : ''}
`).join('\n')}

## Methodology

This report was generated by analyzing:
- Source code structure and patterns
- Interface implementations
- Test coverage
- Placeholder implementations
`;

    await writeFileAsync(outputPath, reportContent);
    logger.info(`TODO validation report generated at ${outputPath}`);
  } else {
    // Enhanced report with semantic analysis
    // Group todos by severity
    const highSeverityTodos = validationResult.missingTodos.filter(todo => todo.severity === 'high');
    const mediumSeverityTodos = validationResult.missingTodos.filter(todo => todo.severity === 'medium');
    const lowSeverityTodos = validationResult.missingTodos.filter(todo => todo.severity === 'low');
    
    // Only include semantic analysis section if it was performed
    const semanticIssues = validationResult.semanticIssues || {
      nullReturns: [],
      emptyBlocks: [],
      incompleteErrorHandling: [],
      incompleteSwitchStatements: [],
      suspiciousImplementations: []
    };
    
    const semanticIssuesTotal = 
      semanticIssues.nullReturns.length +
      semanticIssues.emptyBlocks.length +
      semanticIssues.incompleteErrorHandling.length +
      semanticIssues.incompleteSwitchStatements.length +
      semanticIssues.suspiciousImplementations.length;
    
    const reportContent = `# Enhanced TODO Validation Report

## Summary

- **Existing TODOs**: ${validationResult.existingTodos.length}
- **Missing TODOs**: ${validationResult.missingTodos.length}
- **Semantic Issues**: ${semanticIssuesTotal}

## Severity Breakdown

- **High Severity**: ${highSeverityTodos.length}
- **Medium Severity**: ${mediumSeverityTodos.length}
- **Low Severity**: ${lowSeverityTodos.length}

## Semantic Analysis Summary

- **Null/Undefined Returns**: ${semanticIssues.nullReturns.length}
- **Empty Code Blocks**: ${semanticIssues.emptyBlocks.length}
- **Incomplete Error Handling**: ${semanticIssues.incompleteErrorHandling.length}
- **Incomplete Switch Statements**: ${semanticIssues.incompleteSwitchStatements.length}
- **Suspicious Implementations**: ${semanticIssues.suspiciousImplementations.length}

## High Severity Missing TODOs

${highSeverityTodos.map(todo => `
### ${todo.file}${todo.line ? ` (line ${todo.line})` : ''}

- **Description**: ${todo.description}
- **Suggested content**:
\`\`\`
${todo.suggestedContent}
\`\`\`
`).join('\n')}

## Medium Severity Missing TODOs

${mediumSeverityTodos.map(todo => `
### ${todo.file}${todo.line ? ` (line ${todo.line})` : ''}

- **Description**: ${todo.description}
- **Suggested content**:
\`\`\`
${todo.suggestedContent}
\`\`\`
`).join('\n')}

## Low Severity Missing TODOs

${lowSeverityTodos.map(todo => `
### ${todo.file}${todo.line ? ` (line ${todo.line})` : ''}

- **Description**: ${todo.description}
- **Suggested content**:
\`\`\`
${todo.suggestedContent}
\`\`\`
`).join('\n')}

## Existing TODOs

${validationResult.existingTodos.map(todo => `
- **${todo.file}${todo.line ? ` (line ${todo.line})` : ''}**: ${todo.description}${todo.issueRef ? ` (${todo.issueRef})` : ''}
`).join('\n')}

## Semantic Analysis Details

### Null/Undefined Returns

${semanticIssues.nullReturns.map(issue => `
- **${issue.file} (line ${issue.line})**: Function \`${issue.function}\` returns null/undefined when \`${issue.expectedType}\` is expected
`).join('\n')}

### Empty Code Blocks

${semanticIssues.emptyBlocks.map(issue => `
- **${issue.file} (line ${issue.line})**: Empty ${issue.construct} in \`${issue.context}\`
`).join('\n')}

### Incomplete Error Handling

${semanticIssues.incompleteErrorHandling.map(issue => `
- **${issue.file} (line ${issue.line})**: ${issue.missingHandling} for exception type \`${issue.exceptionType}\`
`).join('\n')}

### Incomplete Switch Statements

${semanticIssues.incompleteSwitchStatements.map(issue => `
- **${issue.file} (line ${issue.line})**: Switch on \`${issue.switchVariable}\` missing cases: ${issue.missingCases.join(', ')}
`).join('\n')}

### Suspicious Implementations

${semanticIssues.suspiciousImplementations.map(issue => `
- **${issue.file} (line ${issue.line})**: \`${issue.function}\` - ${issue.issue} (${issue.details})
`).join('\n')}

## Analysis Methodology

This report combines:
- Basic TODO analysis: Finding existing TODOs and comparing against expected TODOs
- Semantic code analysis: Examining the Abstract Syntax Tree to identify implementation gaps
- Severity-based prioritization: Ranking issues by their impact on code quality

The analysis looks beyond simple pattern matching to understand code structure and behavior,
identifying areas where implementation is incomplete or doesn't match expectations.
`;

    await writeFileAsync(outputPath, reportContent);
    logger.info(`Enhanced TODO validation report generated at ${outputPath}`);
  }
}