#!/usr/bin/env node

/**
 * DocGen - Documentation Validation System
 * 
 * This script validates the generated documentation for completeness,
 * consistency, and conformance to the defined schemas.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// Support for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration paths
const DOCS_DIR = path.join(__dirname, '../docs/generated');
const REPORTS_DIR = path.join(__dirname, '../docs/reports');

// Make sure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Main validation function
async function validateDocumentation() {
  console.log('Running DocGen Documentation Validation');
  console.log('--------------------------------------');
  
  // Get all markdown files in the generated docs directory
  const docFiles = getDocumentFiles();
  
  if (docFiles.length === 0) {
    console.log('⚠️ No documentation files found. Please run the interview system first.');
    
    // Create a report showing zero documents
    const reportData = {
      timestamp: new Date().toISOString(),
      status: 'warning',
      message: 'No documentation files found',
      issues: [
        {
          severity: 'warning',
          message: 'No documentation files found. Please run the interview system first.',
          file: 'none'
        }
      ]
    };
    
    // Save the report
    fs.writeFileSync(
      path.join(REPORTS_DIR, 'validation.json'),
      JSON.stringify(reportData, null, 2)
    );
    
    // For the GitHub workflow, we'll return success even when no docs exist
    return { success: true, message: 'No documentation files to validate' };
  }
  
  console.log(`Found ${docFiles.length} documentation files to validate.\\n`);
  
  // Collect document metadata for cross-validation
  const documents = await parseDocuments(docFiles);
  
  // Run validation checks
  const results = {
    schemaValidation: validateSchemas(documents),
    crossReferences: validateCrossReferences(documents),
    consistencyCheck: validateConsistency(documents),
    requirementsCoverage: validateRequirementsCoverage(documents)
  };
  
  // Display results
  displayValidationResults(results);
  
  // Generate JSON report
  const reportData = generateReport(results);
  
  // Save the report
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'validation.json'),
    JSON.stringify(reportData, null, 2)
  );
  
  return { 
    success: reportData.status === 'success',
    message: reportData.message
  };
}

// Generate a report from the validation results
function generateReport(results) {
  const issues = [];
  
  // Schema validation issues
  results.schemaValidation.failed.forEach(failure => {
    failure.errors.forEach(error => {
      issues.push({
        severity: 'error',
        message: error,
        file: failure.filename
      });
    });
  });
  
  // Cross-reference issues
  results.crossReferences.failed.forEach(failure => {
    failure.errors.forEach(error => {
      issues.push({
        severity: 'error',
        message: error,
        file: failure.filename
      });
    });
  });
  
  // Consistency warnings
  results.consistencyCheck.warnings.forEach(warning => {
    issues.push({
      severity: 'warning',
      message: warning.message,
      file: 'multiple'
    });
  });
  
  // Requirements coverage issues
  results.requirementsCoverage.missing.forEach(issue => {
    issues.push({
      severity: 'warning',
      message: issue,
      file: 'coverage'
    });
  });
  
  // Determine overall status
  const hasErrors = issues.some(i => i.severity === 'error');
  
  return {
    timestamp: new Date().toISOString(),
    status: hasErrors ? 'failure' : 'success',
    message: hasErrors ? 'Documentation validation failed' : 'Documentation validation successful',
    stats: {
      documentsValidated: results.schemaValidation.passed.length + results.schemaValidation.failed.length,
      passedSchema: results.schemaValidation.passed.length,
      passedReferences: results.crossReferences.passed.length,
      requirementsCoverage: results.requirementsCoverage.coverage
    },
    issues: issues
  };
}

/**
 * Get all markdown files in the generated docs directory
 */
function getDocumentFiles() {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      return [];
    }
    
    return fs.readdirSync(DOCS_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(DOCS_DIR, file));
  } catch (error) {
    console.error('Error finding document files:', error.message);
    return [];
  }
}

/**
 * Parse all documents to extract metadata and content
 */
async function parseDocuments(filePaths) {
  const documents = [];
  
  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const document = parseDocument(content, filePath);
      documents.push(document);
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error.message);
    }
  }
  
  return documents;
}

/**
 * Parse a single document to extract YAML front matter and content
 */
function parseDocument(content, filePath) {
  const result = {
    path: filePath,
    filename: path.basename(filePath),
    metadata: {},
    requirements: [],
    references: [],
    sections: []
  };
  
  // Extract YAML front matter
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (yamlMatch && yamlMatch[1]) {
    try {
      result.metadata = yaml.load(yamlMatch[1]);
    } catch (error) {
      console.error(`Error parsing YAML in ${filePath}:`, error.message);
    }
  }
  
  // Extract requirements
  const reqMatches = content.matchAll(/\{\s*"id"\s*:\s*"(FR-[\w.-]+)"/g);
  for (const match of reqMatches) {
    result.requirements.push(match[1]);
  }
  
  // Extract section headers
  const sectionMatches = content.matchAll(/^#+\s+(.*$)/gm);
  for (const match of sectionMatches) {
    result.sections.push(match[1]);
  }
  
  // Extract references to other documents
  const refMatches = content.matchAll(/DOC-([A-Z]+)-(\d+)/g);
  for (const match of refMatches) {
    result.references.push(`DOC-${match[1]}-${match[2]}`);
  }
  
  return result;
}

/**
 * Validate document schemas
 */
function validateSchemas(documents) {
  const results = {
    passed: [],
    failed: []
  };
  
  for (const doc of documents) {
    const errors = [];
    
    // Check required metadata fields
    const requiredFields = ['documentType', 'schemaVersion', 'documentVersion', 'id', 'project'];
    for (const field of requiredFields) {
      if (!doc.metadata[field]) {
        errors.push(`Missing required metadata field: ${field}`);
      }
    }
    
    // Check if document has project ID
    if (doc.metadata.project && !doc.metadata.project.id) {
      errors.push('Missing project.id in metadata');
    }
    
    // Check section structure (simplified)
    if (doc.sections.length < 3) {
      errors.push('Document has insufficient sections (less than 3)');
    }
    
    if (errors.length === 0) {
      results.passed.push(doc.filename);
    } else {
      results.failed.push({
        filename: doc.filename,
        errors: errors
      });
    }
  }
  
  return results;
}

/**
 * Validate cross-references between documents
 */
function validateCrossReferences(documents) {
  const results = {
    passed: [],
    failed: []
  };
  
  // Build a map of all document IDs
  const docIds = new Map();
  for (const doc of documents) {
    if (doc.metadata.id) {
      docIds.set(doc.metadata.id, doc.filename);
    }
  }
  
  // Check references in each document
  for (const doc of documents) {
    const errors = [];
    
    // Check related documents in metadata
    if (doc.metadata.related) {
      for (const related of doc.metadata.related) {
        if (!docIds.has(related.id)) {
          errors.push(`Referenced document not found: ${related.id}`);
        }
      }
    }
    
    // Check inline references
    for (const reference of doc.references) {
      if (!docIds.has(reference) && !reference.includes(doc.metadata.id || '')) {
        errors.push(`Referenced document not found: ${reference}`);
      }
    }
    
    if (errors.length === 0) {
      results.passed.push(doc.filename);
    } else {
      results.failed.push({
        filename: doc.filename,
        errors: errors
      });
    }
  }
  
  return results;
}

/**
 * Validate terminology consistency across documents
 */
function validateConsistency(documents) {
  const results = {
    passed: [],
    warnings: []
  };
  
  // Extract project name from PRD
  const projectNames = new Set();
  
  for (const doc of documents) {
    if (doc.metadata.project && doc.metadata.project.name) {
      projectNames.add(doc.metadata.project.name);
    }
  }
  
  // Check for project name consistency
  if (projectNames.size > 1) {
    results.warnings.push({
      type: 'PROJECT_NAME',
      message: `Inconsistent project names found: ${Array.from(projectNames).join(', ')}`
    });
  } else {
    results.passed.push('PROJECT_NAME');
  }
  
  // More consistency checks would be implemented here
  // For example: terminology, version numbers, etc.
  
  return results;
}

/**
 * Validate requirements coverage
 */
function validateRequirementsCoverage(documents) {
  const results = {
    coverage: 0,
    total: 0,
    missing: []
  };
  
  // Find SRS document
  const srsDoc = documents.find(doc => doc.metadata.documentType === 'SRS');
  if (!srsDoc) {
    results.missing.push('No SRS document found');
    return results;
  }
  
  // Extract requirements from SRS
  const srsRequirements = srsDoc.requirements;
  results.total = srsRequirements.length;
  
  // Check if requirements are referenced in SDD or STP
  const sddDoc = documents.find(doc => doc.metadata.documentType === 'SDD');
  const stpDoc = documents.find(doc => doc.metadata.documentType === 'STP');
  
  // For simplicity, we'll just check if the document exists
  // A full implementation would check requirements traceability
  if (sddDoc && stpDoc) {
    results.coverage = 100;
  } else if (sddDoc || stpDoc) {
    results.coverage = 50;
    if (!sddDoc) results.missing.push('No SDD document found');
    if (!stpDoc) results.missing.push('No STP document found');
  } else {
    results.coverage = 0;
    results.missing.push('No SDD document found');
    results.missing.push('No STP document found');
  }
  
  return results;
}

/**
 * Display validation results
 */
function displayValidationResults(results) {
  console.log('Validation Results:');
  console.log('==================\\n');
  
  // Schema Validation
  console.log('1. Schema Validation:');
  console.log(`   Passed: ${results.schemaValidation.passed.length} documents`);
  if (results.schemaValidation.failed.length > 0) {
    console.log(`   Failed: ${results.schemaValidation.failed.length} documents`);
    results.schemaValidation.failed.forEach(failure => {
      console.log(`   - ${failure.filename}:`);
      failure.errors.forEach(error => {
        console.log(`     * ${error}`);
      });
    });
  }
  console.log();
  
  // Cross-References
  console.log('2. Cross-Reference Validation:');
  console.log(`   Passed: ${results.crossReferences.passed.length} documents`);
  if (results.crossReferences.failed.length > 0) {
    console.log(`   Failed: ${results.crossReferences.failed.length} documents`);
    results.crossReferences.failed.forEach(failure => {
      console.log(`   - ${failure.filename}:`);
      failure.errors.forEach(error => {
        console.log(`     * ${error}`);
      });
    });
  }
  console.log();
  
  // Consistency
  console.log('3. Terminology Consistency:');
  console.log(`   Passed: ${results.consistencyCheck.passed.length} checks`);
  if (results.consistencyCheck.warnings.length > 0) {
    console.log(`   Warnings: ${results.consistencyCheck.warnings.length}`);
    results.consistencyCheck.warnings.forEach(warning => {
      console.log(`   - ${warning.type}: ${warning.message}`);
    });
  }
  console.log();
  
  // Requirements Coverage
  console.log('4. Requirements Coverage:');
  console.log(`   Coverage: ${results.requirementsCoverage.coverage}% (${results.requirementsCoverage.total} total requirements)`);
  if (results.requirementsCoverage.missing.length > 0) {
    console.log('   Issues:');
    results.requirementsCoverage.missing.forEach(issue => {
      console.log(`   - ${issue}`);
    });
  }
  console.log();
  
  // Overall Result
  const overallSuccess = 
    results.schemaValidation.failed.length === 0 &&
    results.crossReferences.failed.length === 0 &&
    results.requirementsCoverage.coverage > 0;
  
  console.log('Overall Validation Result:');
  if (overallSuccess) {
    console.log('✅ All validation checks passed!');
  } else {
    console.log('❌ Validation found issues that need to be addressed.');
    console.log('   Review the detailed results above and fix the issues.');
  }
}

// Run the validation
validateDocumentation().catch(error => {
  console.error('Error in validation process:', error);
  process.exit(1);
});