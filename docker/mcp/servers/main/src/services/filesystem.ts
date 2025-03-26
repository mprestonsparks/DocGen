/**
 * Filesystem service for Main MCP Server
 * Provides secure file system access capabilities
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger, logError } from '../utils/logger';

// Base workspace directory (mounted from Docker)
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || '/workspace';

// Type definitions for filesystem operations
export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  created?: string;
}

export interface FileSystemError {
  code: string;
  message: string;
}

export interface ReadFileResponse {
  id: string;
  content: string;
  encoding: string;
  path: string;
}

export interface WriteFileResponse {
  id: string;
  path: string;
  size: number;
  success: boolean;
}

export interface ListFilesResponse {
  id: string;
  path: string;
  files: FileInfo[];
}

/**
 * Validate and normalize a file path to ensure it's within the workspace
 * @param filePath Path to validate
 * @returns Normalized absolute path
 * @throws Error if path is outside workspace
 */
export const validatePath = (filePath: string): string => {
  // Normalize the path to resolve any '..' or '.' segments
  const normalizedPath = path.normalize(filePath);
  
  // Convert to absolute path if relative
  const absolutePath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.join(WORKSPACE_DIR, normalizedPath);
  
  // Check if the path is within the workspace
  if (!absolutePath.startsWith(WORKSPACE_DIR)) {
    throw new Error('Access denied: Path is outside the allowed workspace');
  }
  
  return absolutePath;
};

/**
 * Read a file from the filesystem
 * @param filePath Path to the file
 * @param encoding File encoding (default: 'utf8')
 * @returns File content
 */
export const readFile = async (
  filePath: string,
  encoding: BufferEncoding = 'utf8'
): Promise<ReadFileResponse> => {
  try {
    const absolutePath = validatePath(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if it's a file
    const stats = fs.statSync(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }
    
    // Read file content
    const content = fs.readFileSync(absolutePath, encoding);
    
    return {
      id: uuidv4(),
      content,
      encoding,
      path: filePath
    };
  } catch (error) {
    logError(`Failed to read file: ${filePath}`, error as Error);
    throw error;
  }
};

/**
 * Write content to a file
 * @param filePath Path to the file
 * @param content Content to write
 * @param encoding File encoding (default: 'utf8')
 * @returns Write operation result
 */
export const writeFile = async (
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf8'
): Promise<WriteFileResponse> => {
  try {
    const absolutePath = validatePath(filePath);
    
    // Create directory if it doesn't exist
    const directory = path.dirname(absolutePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Write file content
    fs.writeFileSync(absolutePath, content, { encoding });
    
    // Get file stats
    const stats = fs.statSync(absolutePath);
    
    return {
      id: uuidv4(),
      path: filePath,
      size: stats.size,
      success: true
    };
  } catch (error) {
    logError(`Failed to write file: ${filePath}`, error as Error);
    throw error;
  }
};

/**
 * List files in a directory
 * @param dirPath Path to the directory
 * @param recursive Whether to list files recursively
 * @returns List of files
 */
export const listFiles = async (
  dirPath: string,
  recursive: boolean = false
): Promise<ListFilesResponse> => {
  try {
    const absolutePath = validatePath(dirPath);
    
    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    
    // Check if it's a directory
    const stats = fs.statSync(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Not a directory: ${dirPath}`);
    }
    
    // Get files in directory
    const files = await getFilesInDirectory(absolutePath, recursive);
    
    // Convert absolute paths to relative paths
    const relativeFiles = files.map(file => ({
      ...file,
      path: path.relative(WORKSPACE_DIR, file.path)
    }));
    
    return {
      id: uuidv4(),
      path: dirPath,
      files: relativeFiles
    };
  } catch (error) {
    logError(`Failed to list files: ${dirPath}`, error as Error);
    throw error;
  }
};

/**
 * Get files in a directory
 * @param dirPath Path to the directory
 * @param recursive Whether to list files recursively
 * @returns List of files
 */
const getFilesInDirectory = async (
  dirPath: string,
  recursive: boolean
): Promise<FileInfo[]> => {
  const files: FileInfo[] = [];
  
  // Read directory contents
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Add directory to results
      files.push({
        name: entry.name,
        path: entryPath,
        type: 'directory',
        modified: fs.statSync(entryPath).mtime.toISOString(),
        created: fs.statSync(entryPath).birthtime.toISOString()
      });
      
      // Recursively get files in subdirectory if recursive is true
      if (recursive) {
        const subFiles = await getFilesInDirectory(entryPath, recursive);
        files.push(...subFiles);
      }
    } else if (entry.isFile()) {
      // Add file to results
      const stats = fs.statSync(entryPath);
      files.push({
        name: entry.name,
        path: entryPath,
        type: 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString()
      });
    }
  }
  
  return files;
};

/**
 * Delete a file or directory
 * @param filePath Path to the file or directory
 * @param recursive Whether to delete directories recursively
 * @returns Delete operation result
 */
export const deleteFile = async (
  filePath: string,
  recursive: boolean = false
): Promise<{ success: boolean, path: string }> => {
  try {
    const absolutePath = validatePath(filePath);
    
    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Check if it's a directory
    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      if (recursive) {
        fs.rmSync(absolutePath, { recursive: true, force: true });
      } else {
        // Check if directory is empty
        const entries = fs.readdirSync(absolutePath);
        if (entries.length > 0) {
          throw new Error(`Directory not empty: ${filePath}`);
        }
        fs.rmdirSync(absolutePath);
      }
    } else {
      fs.unlinkSync(absolutePath);
    }
    
    return {
      success: true,
      path: filePath
    };
  } catch (error) {
    logError(`Failed to delete file: ${filePath}`, error as Error);
    throw error;
  }
};
