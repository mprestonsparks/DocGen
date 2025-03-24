/**
 * Utility functions for the paper_architect module
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as logger from '../../utils/logger';

/**
 * Convert a string to a slug format
 * @param input String to convert to slug
 * @returns Slugified string
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique ID for paper elements
 * @param prefix Prefix for the ID
 * @param name Name or title of the element
 * @returns Unique ID
 */
export function generateUniqueId(prefix: string, name: string): string {
  const hash = crypto.createHash('md5').update(name).digest('hex').substring(0, 6);
  return `${prefix}-${hash}`;
}

/**
 * Format content as JSON with proper indentation
 * @param data Object to format as JSON
 * @returns Formatted JSON string
 */
export function formatJson(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath Path to directory
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

/**
 * Check if a file exists and create a backup if it does
 * @param filePath Path to file
 */
export function backupFileIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    logger.info(`Created backup of existing file: ${backupPath}`);
  }
}

/**
 * Get the parent section ID for a given section
 * @param sectionId ID of the section
 * @param sections Array of all sections
 * @returns Parent section ID or undefined if no parent
 */
export function getParentSectionId(sectionId: string, sections: { id: string, level: number }[]): string | undefined {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return undefined;
  
  // Find the nearest section with a lower level
  const parentCandidates = sections
    .filter(s => s.level < section.level && s.id !== sectionId)
    .sort((a, b) => {
      // Sort by level (descending) to find the closest level
      if (a.level !== b.level) return b.level - a.level;
      
      // If levels are the same, sort by position in the array (ascending)
      return sections.findIndex(s => s.id === a.id) - sections.findIndex(s => s.id === b.id);
    });
  
  return parentCandidates.length > 0 ? parentCandidates[0].id : undefined;
}

/**
 * Create a tree structure from flat sections list
 * @param sections Flat list of sections
 * @returns Tree structure of sections
 */
export function createSectionTree(sections: { id: string; level: number; title: string; content: string }[]): any[] {
  const tree: any[] = [];
  const map: Record<string, any> = {};
  
  // First pass: create map of all sections
  sections.forEach(section => {
    map[section.id] = {
      ...section,
      subsections: []
    };
  });
  
  // Second pass: build the tree
  sections.forEach(section => {
    const node = map[section.id];
    
    // If it's a top-level section, add it to the root
    if (section.level === 1) {
      tree.push(node);
    } else {
      // Find parent
      const parent = sections
        .filter(s => s.level === section.level - 1 && sections.indexOf(s) < sections.indexOf(section))
        .sort((a, b) => sections.indexOf(b) - sections.indexOf(a))[0];
      
      if (parent) {
        map[parent.id].subsections.push(node);
      } else {
        // If no parent found, add to root
        tree.push(node);
      }
    }
  });
  
  return tree;
}

/**
 * Extract code blocks from markdown
 * @param markdown Markdown text
 * @returns Array of code blocks with language
 */
export function extractCodeBlocks(markdown: string): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
  const codeBlocks: Array<{ language: string; code: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    codeBlocks.push({
      language: match[1] || '',
      code: match[2].trim()
    });
  }
  
  return codeBlocks;
}

/**
 * Clean text for better readability in documents
 * @param text Text to clean
 * @returns Cleaned text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim();
}

/**
 * Format timestamp as ISO string without milliseconds
 * @param date Date object
 * @returns Formatted date string
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Safely parse JSON with error handling
 * @param jsonString JSON string to parse
 * @param defaultValue Default value if parsing fails
 * @returns Parsed object or default value
 */
export function safeParseJson<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error('Error parsing JSON', { error: error instanceof Error ? error.message : String(error) });
    return defaultValue;
  }
}