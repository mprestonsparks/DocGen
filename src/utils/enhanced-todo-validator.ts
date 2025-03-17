/**
 * Enhanced Todo Validator Module
 * 
 * This module extends the basic TodoValidator with semantic analysis capabilities
 * to identify implementation gaps that should be marked with TODOs but aren't.
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { getLogger } from './logger';
import { analyzeCodeAST, convertASTResultsToTodos, ASTAnalysisResult } from './ast-analyzer';
import { 
  TodoValidationOptions, 
  TodoItem, 
  TodoValidationResult,
  validateTodos,
  findExistingTodos,
  generateTodoReport
} from './todo-validator';

const logger = getLogger('enhanced-todo-validator');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

/**
 * Options for enhanced todo validation
 */
export interface EnhancedTodoValidationOptions extends TodoValidationOptions {
  analyzeSemantics?: boolean;
  analyzeComments?: boolean;
  analyzeTestQuality?: boolean;
  semanticAnalysisDepth?: 'basic' | 'standard' | 'deep';
}

/**
 * Result of enhanced todo validation
 */
export interface EnhancedTodoValidationResult extends TodoValidationResult {
  semanticIssues: ASTAnalysisResult;
}

/**
 * Enhanced todo validation that includes semantic code analysis
 * @param projectPath Path to the project
 * @param options Validation options
 * @returns Enhanced validation result
 */
export async function validateTodosEnhanced(
  projectPath: string,
  options: EnhancedTodoValidationOptions
): Promise<EnhancedTodoValidationResult> {
  logger.info(`Running enhanced TODO validation on ${projectPath} with depth ${options.depth}`);
  
  // Set default options
  const enhancedOptions: EnhancedTodoValidationOptions = {
    depth: options.depth || 'standard',
    reportMissing: options.reportMissing !== undefined ? options.reportMissing : true,
    suggestTodos: options.suggestTodos !== undefined ? options.suggestTodos : true,
    analyzeSemantics: options.analyzeSemantics !== undefined ? options.analyzeSemantics : true,
    analyzeComments: options.analyzeComments || false,  // Not yet implemented
    analyzeTestQuality: options.analyzeTestQuality || false,  // Not yet implemented
    semanticAnalysisDepth: options.semanticAnalysisDepth || options.depth || 'standard'
  };
  
  // First run the basic TODO validation
  const basicResult = await validateTodos(projectPath, enhancedOptions);
  
  // Initialize the enhanced result 
  const enhancedResult: EnhancedTodoValidationResult = {
    ...basicResult,
    semanticIssues: {
      nullReturns: [],
      emptyBlocks: [],
      incompleteErrorHandling: [],
      incompleteSwitchStatements: [],
      suspiciousImplementations: []
    }
  };
  
  // Get all source files
  const files = await getAllProjectFiles(projectPath, {
    includeDotFiles: options.includeDotFiles ?? false,
    maxFileSize: options.maxFileSize ?? 10485760,
    includeNodeModules: options.includeNodeModules ?? false
  });
  
  // Perform semantic analysis if enabled
  if (enhancedOptions.analyzeSemantics) {
    logger.info(`Performing semantic code analysis with depth ${enhancedOptions.semanticAnalysisDepth}`);
    
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
      
      enhancedResult.semanticIssues = semanticIssues;
      
      // Convert semantic issues to TODOs
      const semanticTodos = convertASTResultsToTodos(semanticIssues);
      
      // Filter out TODOs that already exist in the codebase
      const filteredSemanticTodos = filterExistingTodos(semanticTodos, basicResult.existingTodos);
      
      // Add semantic TODOs to missing TODOs
      enhancedResult.missingTodos = [...enhancedResult.missingTodos, ...filteredSemanticTodos];
      
      // Add semantic TODOs to suggestions if enabled
      if (enhancedOptions.suggestTodos) {
        enhancedResult.suggestions = [...enhancedResult.suggestions, ...filteredSemanticTodos];
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
  
  return enhancedResult;
}

/**
 * Helper to get all files in a project directory
 * (Duplicated from todo-validator for independent use)
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
          result.push(fullPath);
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
  
  return sharedPhrases >= 2 || (sharedPhrases / Math.min(phrases1.length, phrases2.length) >= 0.3);
}

/**
 * Generate an enhanced todo report with semantic insights
 */
export async function generateEnhancedTodoReport(
  result: EnhancedTodoValidationResult,
  outputPath: string
): Promise<void> {
  // Group todos by severity
  const highSeverityTodos = result.missingTodos.filter(todo => todo.severity === 'high');
  const mediumSeverityTodos = result.missingTodos.filter(todo => todo.severity === 'medium');
  const lowSeverityTodos = result.missingTodos.filter(todo => todo.severity === 'low');
  
  const reportContent = `# Enhanced TODO Validation Report
  
## Summary

- **Existing TODOs**: ${result.existingTodos.length}
- **Missing TODOs**: ${result.missingTodos.length}
- **Semantic Issues**: ${
    result.semanticIssues.nullReturns.length +
    result.semanticIssues.emptyBlocks.length +
    result.semanticIssues.incompleteErrorHandling.length +
    result.semanticIssues.incompleteSwitchStatements.length +
    result.semanticIssues.suspiciousImplementations.length
  }

## Severity Breakdown

- **High Severity**: ${highSeverityTodos.length}
- **Medium Severity**: ${mediumSeverityTodos.length}
- **Low Severity**: ${lowSeverityTodos.length}

## Semantic Analysis Summary

- **Null/Undefined Returns**: ${result.semanticIssues.nullReturns.length}
- **Empty Code Blocks**: ${result.semanticIssues.emptyBlocks.length}
- **Incomplete Error Handling**: ${result.semanticIssues.incompleteErrorHandling.length}
- **Incomplete Switch Statements**: ${result.semanticIssues.incompleteSwitchStatements.length}
- **Suspicious Implementations**: ${result.semanticIssues.suspiciousImplementations.length}

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

${result.existingTodos.map(todo => `
- **${todo.file}${todo.line ? ` (line ${todo.line})` : ''}**: ${todo.description}${todo.issueRef ? ` (${todo.issueRef})` : ''}
`).join('\n')}

## Semantic Analysis Details

### Null/Undefined Returns

${result.semanticIssues.nullReturns.map(issue => `
- **${issue.file} (line ${issue.line})**: Function \`${issue.function}\` returns null/undefined when \`${issue.expectedType}\` is expected
`).join('\n')}

### Empty Code Blocks

${result.semanticIssues.emptyBlocks.map(issue => `
- **${issue.file} (line ${issue.line})**: Empty ${issue.construct} in \`${issue.context}\`
`).join('\n')}

### Incomplete Error Handling

${result.semanticIssues.incompleteErrorHandling.map(issue => `
- **${issue.file} (line ${issue.line})**: ${issue.missingHandling} for exception type \`${issue.exceptionType}\`
`).join('\n')}

### Incomplete Switch Statements

${result.semanticIssues.incompleteSwitchStatements.map(issue => `
- **${issue.file} (line ${issue.line})**: Switch on \`${issue.switchVariable}\` missing cases: ${issue.missingCases.join(', ')}
`).join('\n')}

### Suspicious Implementations

${result.semanticIssues.suspiciousImplementations.map(issue => `
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