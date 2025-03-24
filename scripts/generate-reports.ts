#!/usr/bin/env node

/**
 * DocGen - Documentation Status Report Generator
 * 
 * This script generates reports about the documentation status,
 * including completeness, coverage, and cross-reference analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';

// Type definitions
interface Document {
  path: string;
  filename: string;
  metadata: {
    id?: string;
    documentType?: string;
    documentVersion?: string;
    status?: string;
    related?: Array<{
      id: string;
      type?: string;
    }>;
  };
  requirements: string[];
  references: string[];
  sections: string[];
}

// Configuration paths
const DOCS_DIR = path.join(__dirname, '../docs/generated');
const REPORTS_DIR = path.join(__dirname, '../docs/reports');

/**
 * Main report generation function
 */
async function generateReports(): Promise<void> {
  console.log('Generating DocGen Documentation Reports');
  console.log('---------------------------------------');
  
  // Get all markdown files in the generated docs directory
  const docFiles = getDocumentFiles();
  
  if (docFiles.length === 0) {
    console.log('⚠️ No documentation files found. Please run the interview system first.');
    process.exit(1);
  }
  
  console.log(`Found ${docFiles.length} documentation files to analyze.\n`);
  
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  // Parse documents
  const documents = await parseDocuments(docFiles);
  
  // Generate reports
  await generateCompletionReport(documents);
  await generateTraceabilityReport(documents);
  await generateCrossReferenceReport(documents);
  
  console.log('\n✅ Reports generated successfully in the docs/reports directory.');
}

/**
 * Get all markdown files in the generated docs directory
 */
function getDocumentFiles(): string[] {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      return [];
    }
    
    return fs.readdirSync(DOCS_DIR)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(DOCS_DIR, file));
  } catch (error) {
    console.error('Error finding document files:', (error as Error).message);
    return [];
  }
}

/**
 * Parse all documents to extract metadata and content
 */
async function parseDocuments(filePaths: string[]): Promise<Document[]> {
  const documents: Document[] = [];
  
  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const document = parseDocument(content, filePath);
      documents.push(document);
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, (error as Error).message);
    }
  }
  
  return documents;
}

/**
 * Parse a single document to extract YAML front matter and content
 */
function parseDocument(content: string, filePath: string): Document {
  const result: Document = {
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
      result.metadata = yaml.load(yamlMatch[1]) as Document['metadata'];
    } catch (error) {
      console.error(`Error parsing YAML in ${filePath}:`, (error as Error).message);
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
 * Generate completion report for all documents
 */
async function generateCompletionReport(documents: Document[]): Promise<string> {
  console.log('Generating documentation completion report...');
  
  const reportPath = path.join(REPORTS_DIR, 'completion-report.md');
  
  let report = `# Documentation Completion Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += `## Overall Statistics\n\n`;
  report += `- Total Documents: ${documents.length}\n`;
  
  // Document types breakdown
  const documentTypes = new Map<string, number>();
  for (const doc of documents) {
    const type = doc.metadata.documentType || 'UNKNOWN';
    documentTypes.set(type, (documentTypes.get(type) || 0) + 1);
  }
  
  report += `- Document Types:\n`;
  for (const [type, count] of documentTypes.entries()) {
    report += `  - ${type}: ${count}\n`;
  }
  
  report += `\n## Document Details\n\n`;
  report += `| Document | Type | Version | Status | Sections | Requirements |\n`;
  report += `|----------|------|---------|--------|----------|-------------|\n`;
  
  for (const doc of documents) {
    const type = doc.metadata.documentType || 'UNKNOWN';
    const version = doc.metadata.documentVersion || 'N/A';
    const status = doc.metadata.status || 'UNKNOWN';
    const sectionCount = doc.sections.length;
    const reqCount = doc.requirements.length;
    
    report += `| ${doc.filename} | ${type} | ${version} | ${status} | ${sectionCount} | ${reqCount} |\n`;
  }
  
  // Write report to file
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Documentation completion report generated at ${reportPath}`);
  
  return reportPath;
}

/**
 * Generate traceability report for requirements
 */
async function generateTraceabilityReport(documents: Document[]): Promise<string> {
  console.log('Generating requirements traceability report...');
  
  const reportPath = path.join(REPORTS_DIR, 'traceability-report.md');
  
  let report = `# Requirements Traceability Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Find SRS document
  const srsDoc = documents.find(doc => doc.metadata.documentType === 'SRS');
  if (!srsDoc) {
    report += `⚠️ No SRS document found. Cannot generate traceability report.\n`;
    fs.writeFileSync(reportPath, report);
    console.log(`⚠️ Requirements traceability report generated with warnings at ${reportPath}`);
    return reportPath;
  }
  
  // Extract requirements from SRS
  const requirements = srsDoc.requirements;
  
  report += `## Requirements Overview\n\n`;
  report += `- Total Requirements: ${requirements.length}\n`;
  report += `- Source: ${srsDoc.filename}\n\n`;
  
  report += `## Traceability Matrix\n\n`;
  report += `| Requirement ID | SRS | SDD | STP | Implementation | Test |\n`;
  report += `|----------------|-----|-----|-----|----------------|------|\n`;
  
  // Find SDD and STP documents
  const sddDoc = documents.find(doc => doc.metadata.documentType === 'SDD');
  const stpDoc = documents.find(doc => doc.metadata.documentType === 'STP');
  
  for (const reqId of requirements) {
    let srsStatus = '✅'; // Always in SRS since we extracted from there
    
    // Check if requirement is referenced in SDD
    let sddStatus = '❌';
    if (sddDoc) {
      const sddContent = fs.readFileSync(sddDoc.path, 'utf8');
      if (sddContent.includes(reqId)) {
        sddStatus = '✅';
      }
    }
    
    // Check if requirement is referenced in STP
    let stpStatus = '❌';
    if (stpDoc) {
      const stpContent = fs.readFileSync(stpDoc.path, 'utf8');
      if (stpContent.includes(reqId)) {
        stpStatus = '✅';
      }
    }
    
    // Implementation and test status (placeholder for now)
    const implStatus = 'N/A';
    const testStatus = 'N/A';
    
    report += `| ${reqId} | ${srsStatus} | ${sddStatus} | ${stpStatus} | ${implStatus} | ${testStatus} |\n`;
  }
  
  // Write report to file
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Requirements traceability report generated at ${reportPath}`);
  
  return reportPath;
}

/**
 * Generate cross-reference report
 */
async function generateCrossReferenceReport(documents: Document[]): Promise<string> {
  console.log('Generating cross-reference report...');
  
  const reportPath = path.join(REPORTS_DIR, 'cross-reference-report.md');
  
  let report = `# Document Cross-Reference Report\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  // Build document ID map
  const docIdMap = new Map<string, string>();
  for (const doc of documents) {
    if (doc.metadata.id) {
      docIdMap.set(doc.metadata.id, doc.filename);
    }
  }
  
  report += `## Document IDs\n\n`;
  report += `| Document ID | Filename |\n`;
  report += `|-------------|----------|\n`;
  
  for (const [id, filename] of docIdMap.entries()) {
    report += `| ${id} | ${filename} |\n`;
  }
  
  report += `\n## Cross-References\n\n`;
  report += `| Source Document | References |\n`;
  report += `|----------------|------------|\n`;
  
  for (const doc of documents) {
    let referencesText = '';
    
    // Add explicit references from metadata
    if (doc.metadata.related) {
      for (const related of doc.metadata.related) {
        const targetDoc = docIdMap.get(related.id) || 'Unknown';
        referencesText += `${related.id} (${related.type || 'Relation'}) -> ${targetDoc}<br>`;
      }
    }
    
    // Add inline references
    const uniqueRefs = new Set(doc.references);
    for (const ref of uniqueRefs) {
      if (ref !== doc.metadata.id) { // Skip self-references
        const targetDoc = docIdMap.get(ref) || 'Unknown';
        referencesText += `${ref} (Inline) -> ${targetDoc}<br>`;
      }
    }
    
    if (referencesText === '') {
      referencesText = 'None';
    }
    
    report += `| ${doc.filename} | ${referencesText} |\n`;
  }
  
  // Write report to file
  fs.writeFileSync(reportPath, report);
  console.log(`✅ Cross-reference report generated at ${reportPath}`);
  
  return reportPath;
}

// Export functions for testing
export {
  generateReports,
  getDocumentFiles,
  parseDocuments,
  parseDocument,
  generateCompletionReport,
  generateTraceabilityReport,
  generateCrossReferenceReport
};

// Run the report generation if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  generateReports().catch(error => {
    console.error('Error in report generation process:', error);
    process.exit(1);
  });
}