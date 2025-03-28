/**
 * TODO scanning service for MCP Server
 * Handles discovery and analysis of TODO comments in the codebase
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger, logError } from '../utils/logger';

const execAsync = promisify(exec);

// Base workspace directory
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/workspace';

/**
 * TODO item interface
 */
export interface TODOItem {
  id: string;
  file: string;
  line: number;
  text: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  assignee?: string;
}

/**
 * Scan codebase for TODO comments
 */
export const scanTODOs = async (
  directory: string = '',
  includePatterns: string[] = ['*.ts', '*.js', '*.tsx', '*.jsx', '*.md'],
  excludePatterns: string[] = ['node_modules', 'dist', 'build', 'coverage']
): Promise<TODOItem[]> => {
  try {
    const searchDir = path.join(WORKSPACE_DIR, directory);
    
    // Check if directory exists
    if (!fs.existsSync(searchDir)) {
      throw new Error(`Directory not found: ${searchDir}`);
    }
    
    // Build grep command
    const includeArgs = includePatterns.map(pattern => `--include="${pattern}"`).join(' ');
    const excludeArgs = excludePatterns.map(pattern => `--exclude-dir="${pattern}"`).join(' ');
    
    // Use grep to find TODO comments
    const grepCommand = `grep -n -r ${includeArgs} ${excludeArgs} -E "TODO|FIXME|XXX" ${searchDir}`;
    const { stdout } = await execAsync(grepCommand);
    
    // Parse grep output
    const todoLines = stdout.trim().split('\n').filter(Boolean);
    const todos: TODOItem[] = [];
    
    for (let i = 0; i < todoLines.length; i++) {
      const line = todoLines[i];
      
      // Parse line in format: file:line:content
      const match = line.match(/^(.+?):(\d+):(.*)/);
      
      if (match) {
        const [, filePath, lineNumber, content] = match;
        const relativeFilePath = path.relative(WORKSPACE_DIR, filePath);
        
        // Extract TODO text
        const todoMatch = content.match(/(TODO|FIXME|XXX)[\s:]+(.+)/i);
        
        if (todoMatch) {
          const [, todoType, todoText] = todoMatch;
          
          // Generate a unique ID
          const id = `todo-${i + 1}`;
          
          // Extract priority if specified
          let priority: 'low' | 'medium' | 'high' | undefined;
          let category: string | undefined;
          let assignee: string | undefined;
          
          // Check for priority markers (P1/P2/P3 or HIGH/MEDIUM/LOW)
          if (todoText.includes('P1') || todoText.toLowerCase().includes('high')) {
            priority = 'high';
          } else if (todoText.includes('P2') || todoText.toLowerCase().includes('medium')) {
            priority = 'medium';
          } else if (todoText.includes('P3') || todoText.toLowerCase().includes('low')) {
            priority = 'low';
          }
          
          // Check for category markers ([CATEGORY])
          const categoryMatch = todoText.match(/\[([^\]]+)\]/);
          if (categoryMatch) {
            category = categoryMatch[1].toLowerCase();
          }
          
          // Check for assignee markers (@username)
          const assigneeMatch = todoText.match(/@([a-zA-Z0-9_-]+)/);
          if (assigneeMatch) {
            assignee = assigneeMatch[1];
          }
          
          todos.push({
            id,
            file: relativeFilePath,
            line: parseInt(lineNumber, 10),
            text: todoText.trim(),
            priority,
            category,
            assignee
          });
        }
      }
    }
    
    return todos;
  } catch (error) {
    logError('Failed to scan for TODOs', error as Error);
    throw error;
  }
};

/**
 * Categorize TODOs by type
 */
export const categorizeTODOs = async (
  todos: TODOItem[]
): Promise<Record<string, TODOItem[]>> => {
  try {
    const categories: Record<string, TODOItem[]> = {};
    
    // Define common categories and their keywords
    const categoryKeywords: Record<string, string[]> = {
      'bug': ['bug', 'fix', 'issue', 'problem', 'error', 'crash'],
      'feature': ['feature', 'add', 'implement', 'support', 'enhance'],
      'refactor': ['refactor', 'clean', 'improve', 'optimize', 'simplify'],
      'test': ['test', 'spec', 'coverage', 'unit test', 'integration test'],
      'documentation': ['doc', 'comment', 'readme', 'document'],
      'security': ['security', 'auth', 'authentication', 'authorization', 'encrypt'],
      'performance': ['performance', 'speed', 'optimize', 'slow', 'fast']
    };
    
    // Initialize categories
    Object.keys(categoryKeywords).forEach(category => {
      categories[category] = [];
    });
    categories['other'] = [];
    
    // Categorize each TODO
    for (const todo of todos) {
      // If TODO already has a category, use it
      if (todo.category) {
        if (!categories[todo.category]) {
          categories[todo.category] = [];
        }
        categories[todo.category].push(todo);
        continue;
      }
      
      // Otherwise, categorize based on text content
      const text = todo.text.toLowerCase();
      let categorized = false;
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => text.includes(keyword))) {
          categories[category].push(todo);
          categorized = true;
          break;
        }
      }
      
      // If no category matched, put in 'other'
      if (!categorized) {
        categories['other'].push(todo);
      }
    }
    
    // Remove empty categories
    for (const category of Object.keys(categories)) {
      if (categories[category].length === 0) {
        delete categories[category];
      }
    }
    
    return categories;
  } catch (error) {
    logError('Failed to categorize TODOs', error as Error);
    throw error;
  }
};

/**
 * Find related TODOs
 */
export const findRelatedTODOs = async (
  todos: TODOItem[]
): Promise<Record<string, string[]>> => {
  try {
    const relations: Record<string, string[]> = {};
    
    // Initialize relations map
    for (const todo of todos) {
      relations[todo.id] = [];
    }
    
    // Find related TODOs based on text similarity and file proximity
    for (let i = 0; i < todos.length; i++) {
      const todo1 = todos[i];
      
      for (let j = i + 1; j < todos.length; j++) {
        const todo2 = todos[j];
        
        // Check if in the same file or directory
        const sameFile = todo1.file === todo2.file;
        const sameDir = path.dirname(todo1.file) === path.dirname(todo2.file);
        
        // Check for text similarity
        const words1 = new Set(todo1.text.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const words2 = new Set(todo2.text.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        
        // Count common words
        let commonWords = 0;
        for (const word of words1) {
          if (words2.has(word)) {
            commonWords++;
          }
        }
        
        // Calculate similarity score
        const similarityScore = commonWords / Math.max(words1.size, words2.size);
        
        // Determine if related based on combined factors
        const isRelated = 
          (sameFile && similarityScore > 0.2) || 
          (sameDir && similarityScore > 0.4) || 
          similarityScore > 0.6;
        
        if (isRelated) {
          relations[todo1.id].push(todo2.id);
          relations[todo2.id].push(todo1.id);
        }
      }
    }
    
    return relations;
  } catch (error) {
    logError('Failed to find related TODOs', error as Error);
    throw error;
  }
};

/**
 * Update or resolve TODO comments in code
 */
export const updateTODO = async (
  file: string,
  line: number,
  newText?: string
): Promise<boolean> => {
  try {
    const filePath = path.join(WORKSPACE_DIR, file);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Check if line number is valid
    if (line < 1 || line > lines.length) {
      throw new Error(`Invalid line number: ${line}`);
    }
    
    // Get the line with the TODO
    const todoLine = lines[line - 1];
    
    if (!todoLine.includes('TODO') && !todoLine.includes('FIXME') && !todoLine.includes('XXX')) {
      throw new Error(`No TODO found on line ${line}`);
    }
    
    // Update or remove the TODO
    if (newText) {
      // Replace the TODO text
      lines[line - 1] = todoLine.replace(/(TODO|FIXME|XXX)[\s:]+.+/, `$1: ${newText}`);
    } else {
      // Remove the TODO comment
      const commentStart = todoLine.indexOf('//');
      
      if (commentStart >= 0) {
        // For single-line comments
        const beforeComment = todoLine.substring(0, commentStart).trim();
        
        if (beforeComment) {
          // Keep the code, remove only the comment
          lines[line - 1] = beforeComment;
        } else {
          // Remove the entire line
          lines.splice(line - 1, 1);
        }
      } else {
        // For multi-line or JSDoc comments, just remove the TODO part
        lines[line - 1] = todoLine.replace(/(TODO|FIXME|XXX)[\s:]+.+/, '');
      }
    }
    
    // Write back to file
    fs.writeFileSync(filePath, lines.join('\n'));
    
    return true;
  } catch (error) {
    logError(`Failed to update TODO in ${file}:${line}`, error as Error);
    throw error;
  }
};
