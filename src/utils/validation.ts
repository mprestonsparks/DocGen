/**
 * Validation utility for DocGen
 */
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ValidationResult, ValidationError, ValidationWarning, CrossReference } from '../types';
import { getOutputDir, isAdvancedValidationEnabled } from './config';
import * as logger from './logger';

/**
 * Validate a document
 * @param filePath The file path
 * @returns The validation result
 */
export const validateDocument = (filePath: string): ValidationResult => {
  try {
    // Read the file
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        errors: [
          {
            code: 'DOC_NOT_FOUND',
            message: `Document not found: ${filePath}`,
            location: filePath,
            severity: 'error'
          }
        ],
        warnings: []
      };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file has YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {
        isValid: false,
        errors: [
          {
            code: 'NO_FRONTMATTER',
            message: 'Document does not have YAML frontmatter',
            location: filePath,
            severity: 'error'
          }
        ],
        warnings: []
      };
    }
    
    // Parse the frontmatter
    const frontmatter = frontmatterMatch[1];
    let metadata;
    
    try {
      metadata = yaml.load(frontmatter) as Record<string, unknown>;
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            code: 'INVALID_FRONTMATTER',
            message: `Invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
            location: filePath,
            severity: 'error'
          }
        ],
        warnings: []
      };
    }
    
    // Validate the metadata
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check for required fields
    const requiredFields = ['documentType', 'schemaVersion', 'documentVersion', 'lastUpdated', 'status', 'id'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field in frontmatter: ${field}`,
          location: `${filePath}:frontmatter`,
          severity: 'error'
        });
      }
    }
    
    // Check for project information
    if (!metadata.project || typeof metadata.project !== 'object') {
      errors.push({
        code: 'MISSING_PROJECT_INFO',
        message: 'Missing project information in frontmatter',
        location: `${filePath}:frontmatter`,
        severity: 'error'
      });
    } else {
      const project = metadata.project as Record<string, unknown>;
      if (!project.id) {
        errors.push({
          code: 'MISSING_PROJECT_ID',
          message: 'Missing project ID in frontmatter',
          location: `${filePath}:frontmatter:project`,
          severity: 'error'
        });
      }
      if (!project.name) {
        errors.push({
          code: 'MISSING_PROJECT_NAME',
          message: 'Missing project name in frontmatter',
          location: `${filePath}:frontmatter:project`,
          severity: 'error'
        });
      }
    }
    
    // Check for cross-references
    if (metadata.related && Array.isArray(metadata.related)) {
      const related = metadata.related as CrossReference[];
      for (const reference of related) {
        if (!reference.id) {
          errors.push({
            code: 'MISSING_REFERENCE_ID',
            message: 'Missing reference ID in related document',
            location: `${filePath}:frontmatter:related`,
            severity: 'error'
          });
        }
        if (!reference.type) {
          errors.push({
            code: 'MISSING_REFERENCE_TYPE',
            message: 'Missing reference type in related document',
            location: `${filePath}:frontmatter:related`,
            severity: 'error'
          });
        }
        if (!reference.description) {
          warnings.push({
            code: 'MISSING_REFERENCE_DESCRIPTION',
            message: 'Missing reference description in related document',
            location: `${filePath}:frontmatter:related`,
            severity: 'warning'
          });
        }
      }
    }
    
    // Check for JSON blocks
    const jsonBlocks = content.match(/```json\n([\s\S]*?)\n```/g);
    if (jsonBlocks) {
      for (const block of jsonBlocks) {
        const jsonContent = block.replace(/```json\n/, '').replace(/\n```/, '');
        try {
          JSON.parse(jsonContent);
        } catch (error) {
          errors.push({
            code: 'INVALID_JSON_BLOCK',
            message: `Invalid JSON block: ${error instanceof Error ? error.message : String(error)}`,
            location: `${filePath}:content`,
            severity: 'error'
          });
        }
      }
    }
    
    // Perform advanced validation if enabled
    if (isAdvancedValidationEnabled()) {
      performAdvancedValidation(filePath, content, metadata, errors, warnings);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    logger.error('Error validating document', { error, filePath });
    return {
      isValid: false,
      errors: [
        {
          code: 'VALIDATION_ERROR',
          message: `Error validating document: ${error instanceof Error ? error.message : String(error)}`,
          location: filePath,
          severity: 'error'
        }
      ],
      warnings: []
    };
  }
};

/**
 * Perform advanced validation on a document
 * @param filePath The file path
 * @param content The document content
 * @param metadata The document metadata
 * @param errors The validation errors
 * @param warnings The validation warnings
 */
const performAdvancedValidation = (
  filePath: string,
  content: string,
  metadata: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void => {
  // Check for cross-reference integrity
  if (metadata.related && Array.isArray(metadata.related)) {
    const related = metadata.related as CrossReference[];
    for (const reference of related) {
      if (reference.id) {
        // Check if the referenced document exists
        const documentId = reference.id;
        const matchingFiles = findFilesByDocumentId(documentId);
        
        if (matchingFiles.length === 0) {
          warnings.push({
            code: 'MISSING_REFERENCED_DOCUMENT',
            message: `Referenced document not found: ${documentId}`,
            location: `${filePath}:frontmatter:related`,
            severity: 'warning'
          });
        }
      }
    }
  }
  
  // Check for consistency in terminology
  const terminologyIssues = checkTerminologyConsistency(content);
  warnings.push(...terminologyIssues);
  
  // Check for missing headings
  checkRequiredHeadings(content, metadata, warnings);
};

/**
 * Find files by document ID
 * @param documentId The document ID
 * @returns The matching file paths
 */
const findFilesByDocumentId = (documentId: string): string[] => {
  try {
    const outputDir = getOutputDir();
    if (!fs.existsSync(outputDir)) {
      return [];
    }
    
    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(outputDir, file));
    
    const matchingFiles: string[] = [];
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const metadata = yaml.load(frontmatter) as Record<string, unknown>;
          
          if (metadata.id === documentId) {
            matchingFiles.push(file);
          }
        }
      } catch (error) {
        // Skip files with errors
        logger.warn('Error reading file for cross-reference validation', { error, file });
      }
    }
    
    return matchingFiles;
  } catch (error) {
    logger.error('Error finding files by document ID', { error, documentId });
    return [];
  }
};

/**
 * Check for terminology consistency
 * @param content The document content
 * @returns The validation warnings
 */
const checkTerminologyConsistency = (content: string): ValidationWarning[] => {
  const warnings: ValidationWarning[] = [];
  
  // Check for common inconsistencies
  const inconsistencies = [
    { variations: ['front-end', 'frontend', 'front end'], preferred: 'frontend' },
    { variations: ['back-end', 'backend', 'back end'], preferred: 'backend' },
    { variations: ['full-stack', 'fullstack', 'full stack'], preferred: 'full stack' },
    { variations: ['website', 'web site', 'web-site'], preferred: 'website' },
    { variations: ['e-mail', 'email'], preferred: 'email' },
    { variations: ['database', 'data base', 'data-base'], preferred: 'database' }
  ];
  
  for (const { variations, preferred } of inconsistencies) {
    for (const variation of variations) {
      if (variation !== preferred && content.includes(variation)) {
        warnings.push({
          code: 'TERMINOLOGY_INCONSISTENCY',
          message: `Inconsistent terminology: '${variation}' should be '${preferred}'`,
          location: 'content',
          severity: 'warning'
        });
      }
    }
  }
  
  return warnings;
};

/**
 * Check for required headings based on document type
 * @param content The document content
 * @param metadata The document metadata
 * @param warnings The validation warnings
 */
const checkRequiredHeadings = (
  content: string,
  metadata: Record<string, unknown>,
  warnings: ValidationWarning[]
): void => {
  const documentType = metadata.documentType as string;
  
  // Define required headings by document type
  const requiredHeadings: Record<string, string[]> = {
    'PRD': ['DOCUMENT CONTROL', 'VISION', 'OBJECTIVES', 'TARGET AUDIENCE', 'SUCCESS METRICS'],
    'SRS': ['DOCUMENT CONTROL', 'REQUIREMENTS', 'CONSTRAINTS', 'ASSUMPTIONS'],
    'SAD': ['DOCUMENT CONTROL', 'ARCHITECTURE OVERVIEW', 'COMPONENT DETAILS'],
    'SDD': ['DOCUMENT CONTROL', 'DESIGN OVERVIEW', 'COMPONENT DESIGN', 'DATA DESIGN'],
    'STP': ['DOCUMENT CONTROL', 'TEST OBJECTIVES', 'TEST STRATEGY', 'TEST CASES']
  };
  
  if (documentType && requiredHeadings[documentType]) {
    for (const heading of requiredHeadings[documentType]) {
      const headingPattern = new RegExp(`##?\\s+${heading}`, 'i');
      if (!headingPattern.test(content)) {
        warnings.push({
          code: 'MISSING_REQUIRED_HEADING',
          message: `Missing required heading: ${heading}`,
          location: 'content',
          severity: 'warning'
        });
      }
    }
  }
};

/**
 * Validate all documents in the output directory
 * @returns The validation results by file path
 */
export const validateAllDocuments = (): Record<string, ValidationResult> => {
  try {
    const outputDir = getOutputDir();
    if (!fs.existsSync(outputDir)) {
      return {};
    }
    
    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(outputDir, file));
    
    const results: Record<string, ValidationResult> = {};
    
    for (const file of files) {
      results[file] = validateDocument(file);
    }
    
    return results;
  } catch (error) {
    logger.error('Error validating all documents', { error });
    return {};
  }
};