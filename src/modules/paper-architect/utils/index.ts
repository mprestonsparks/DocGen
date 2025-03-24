/**
 * Utility functions for the paper-architect module
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as logger from '@utils/logger';

/**
 * Convert a string to a slug format
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
 */
export function generateUniqueId(prefix: string, name: string): string {
  const hash = crypto.createHash('md5').update(name).digest('hex').substring(0, 6);
  return `${prefix}-${hash}`;
}

/**
 * Format content as JSON with proper indentation
 */
export function formatJson(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

/**
 * Check if a file exists and create a backup if it does
 */
export function backupFileIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    logger.info(`Created backup: ${backupPath}`);
  }
}

/**
 * Get the parent section ID for a given section
 */
export function getParentSectionId(
  sectionId: string,
  sections: { id: string; level: number }[]
): string | undefined {
  const currentSection = sections.find(s => s.id === sectionId);
  if (!currentSection) return undefined;

  // Find the closest section with a lower level
  const parentSection = [...sections]
    .reverse()
    .find(s => s.level < currentSection.level);

  return parentSection?.id;
}

/**
 * Create a tree structure from flat sections list
 */
export function createSectionTree(
  sections: { id: string; level: number; title: string; content: string }[]
): any[] {
  const root: any[] = [];
  const stack: any[] = [];

  sections.forEach(section => {
    const node = {
      ...section,
      children: []
    };

    // Find the parent node for this section
    while (
      stack.length > 0 &&
      stack[stack.length - 1].level >= section.level
    ) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return root;
}

/**
 * Extract code blocks from markdown
 */
export function extractCodeBlocks(
  markdown: string
): Array<{ language: string; code: string }> {
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string }> = [];
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }

  return blocks;
}

/**
 * Clean text for better readability in documents
 */
export function cleanText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[\r\n]+/g, '\n') // Replace multiple newlines with single newline
    .replace(/\t/g, '  '); // Replace tabs with two spaces
}

/**
 * Format timestamp as ISO string without milliseconds
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Safely parse JSON with error handling
 */
export function safeParseJson<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.warn('Failed to parse JSON', {
      error: error instanceof Error ? error.message : String(error),
      jsonString: jsonString.substring(0, 100) + '...'
    });
    return defaultValue;
  }
}
