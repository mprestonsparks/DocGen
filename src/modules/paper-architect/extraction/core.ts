/**
 * Core extraction functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as logger from '../../../utils/logger';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
// @ts-ignore
import FormData from 'form-data';
import {
  GrobidExtractionOptions,
  PaperContent,
  PaperInfo,
  PaperSection,
  PaperAlgorithm,
  PaperEquation,
  PaperFigure,
  PaperTable,
  PaperCitation
} from './types';
import { enhanceExtractionWithLLM } from './enhance';

// Default GROBID endpoint if not specified
const DEFAULT_GROBID_ENDPOINT = 'http://localhost:8070';

// Configure XML parser options
const XML_PARSER_OPTIONS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  allowBooleanAttributes: true,
  trimValues: true,
  parseTagValue: true,
  isArray: (name: string) => {
    // Elements that should always be treated as arrays
    return ['author', 'biblStruct', 'div', 'figure', 'formula', 'ref'].includes(name);
  }
};

/**
 * Extract structured content from an academic paper
 */
export async function extractPaperContent(
  paperFilePath: string,
  options?: GrobidExtractionOptions
): Promise<PaperContent> {
  try {
    logger.info('Extracting paper content', { paperFilePath });

    // Validate input file
    if (!fs.existsSync(paperFilePath)) {
      throw new Error(`Paper file not found: ${paperFilePath}`);
    }

    // Try GROBID first
    let grobidXml: string;
    try {
      grobidXml = await processWithGrobid(paperFilePath, options || {});
    } catch (error: unknown) {
      logger.warn('GROBID processing failed, falling back to basic extraction', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      grobidXml = fallbackExtraction(paperFilePath);
    }

    // Extract paper components
    const info = extractPaperInfo(grobidXml);
    const sections = extractSections(grobidXml);
    const algorithms = extractAlgorithms(grobidXml, sections);
    const equations = extractEquations(grobidXml, sections);
    const figures = extractFigures(grobidXml, sections);
    const tables = extractTables(grobidXml, sections);
    const citations = extractCitations(grobidXml);

    // Enhance with LLM if requested
    if (options?.enhanceWithLLM) {
      return await enhanceExtractionWithLLM({
        info,
        sections,
        algorithms,
        equations,
        figures,
        tables,
        citations
      });
    }

    return {
      info,
      sections,
      algorithms,
      equations,
      figures,
      tables,
      citations
    };
  } catch (error: unknown) {
    logger.error('Failed to extract paper content', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

/**
 * Process PDF with GROBID
 */
export async function processWithGrobid(
  paperFilePath: string,
  options: GrobidExtractionOptions
): Promise<string> {
  const endpointUrl = options.endpointUrl || DEFAULT_GROBID_ENDPOINT;
  const timeout = options.timeout || 30000;
  const maxRetries = options.maxRetries || 3;

  let retries = 0;
  while (retries < maxRetries) {
    try {
      const form = new FormData();
      form.append('input', fs.createReadStream(paperFilePath));

      const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const req = http.request(
          `${endpointUrl}/api/processFulltextDocument`,
          {
            method: 'POST',
            headers: form.getHeaders(),
            timeout
          },
          resolve
        );

        req.on('error', reject);
        form.pipe(req);
      });

      const chunks: Buffer[] = [];
      for await (const chunk of response) {
        chunks.push(Buffer.from(chunk));
      }

      const xml = Buffer.concat(chunks).toString('utf8');
      if (!XMLValidator.validate(xml)) {
        throw new Error('Invalid XML response from GROBID');
      }

      return xml;
    } catch (error: unknown) {
      retries++;
      if (retries === maxRetries) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }

  throw new Error('Failed to process with GROBID after max retries');
}

/**
 * Fallback extraction when GROBID is not available
 */
export function fallbackExtraction(paperFilePath: string): string {
  const ext = path.extname(paperFilePath).toLowerCase();
  let content: string;

  try {
    content = fs.readFileSync(paperFilePath, 'utf8');
  } catch (error: unknown) {
    throw error instanceof Error ? error : new Error(`Failed to read file: ${String(error)}`);
  }

  switch (ext) {
    case '.md':
      return extractStructureFromMarkdown(content, path.basename(paperFilePath));
    case '.tex':
      return extractStructureFromLaTeX(content, path.basename(paperFilePath));
    case '.pdf':
      const extracted = extractTextFromPDF(paperFilePath);
      return buildTEIFromExtractedText(extracted, path.basename(paperFilePath));
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Extract text from PDF files
 */
export function extractTextFromPDF(pdfPath: string): {
  text: string;
  title?: string;
  abstract?: string;
  sections: Array<{ title: string; content: string }>;
  references?: string[];
} {
  const pdfBuffer = fs.readFileSync(pdfPath);
  const text = extractTextFromPDFBuffer(pdfBuffer);

  return {
    text,
    title: extractTitleFromText(text),
    abstract: extractAbstractFromText(text),
    sections: extractSectionsFromText(text),
    references: extractReferencesFromText(text)
  };
}

/**
 * Extract text from PDF buffer
 */
function extractTextFromPDFBuffer(pdfBuffer: Buffer): string {
  // Implementation would use a PDF parsing library
  // For now, return empty string as placeholder
  return '';
}

/**
 * Extract title from text
 */
function extractTitleFromText(text: string): string {
  // Basic implementation - would need improvement
  const lines = text.split('\n');
  return lines[0] || '';
}

/**
 * Extract abstract from text
 */
function extractAbstractFromText(text: string): string {
  // Basic implementation - would need improvement
  const abstractStart = text.toLowerCase().indexOf('abstract');
  if (abstractStart === -1) return '';
  
  const nextSection = text.toLowerCase().indexOf('\n\n', abstractStart);
  if (nextSection === -1) return text.slice(abstractStart);
  
  return text.slice(abstractStart, nextSection).trim();
}

/**
 * Extract sections from text
 */
function extractSectionsFromText(text: string): Array<{ title: string; content: string }> {
  // Basic implementation - would need improvement
  const sections: Array<{ title: string; content: string }> = [];
  const lines = text.split('\n');
  let currentSection: { title: string; content: string[] } | null = null;

  for (const line of lines) {
    if (line.match(/^[0-9]+\.|^[A-Z][^a-z]+$/)) {
      if (currentSection) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.join('\n')
        });
      }
      currentSection = { title: line.trim(), content: [] };
    } else if (currentSection && line.trim()) {
      currentSection.content.push(line.trim());
    }
  }

  if (currentSection) {
    sections.push({
      title: currentSection.title,
      content: currentSection.content.join('\n')
    });
  }

  return sections;
}

/**
 * Extract references from text
 */
function extractReferencesFromText(text: string): string[] {
  // Basic implementation - would need improvement
  const references: string[] = [];
  const refSection = text.match(/references([\s\S]*)/i);
  
  if (refSection) {
    const refText = refSection[1];
    const refLines = refText.split('\n').filter(line => line.trim());
    references.push(...refLines);
  }

  return references;
}

/**
 * Extract structure from markdown
 */
export function extractStructureFromMarkdown(content: string, fileName: string): string {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract structure from LaTeX
 */
export function extractStructureFromLaTeX(content: string, fileName: string): string {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Build TEI structure from extracted text
 */
function buildTEIFromExtractedText(
  extractedContent: {
    text: string;
    title?: string;
    abstract?: string;
    sections: Array<{ title: string; content: string }>;
    references?: string[];
  },
  fileName: string
): string {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract paper information from GROBID XML
 */
function extractPaperInfo(grobidXml: string): PaperInfo {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract sections from GROBID XML
 */
function extractSections(grobidXml: string): PaperSection[] {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract algorithms from GROBID XML
 */
function extractAlgorithms(grobidXml: string, sections: PaperSection[]): PaperAlgorithm[] {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract equations from GROBID XML
 */
function extractEquations(grobidXml: string, sections: PaperSection[]): PaperEquation[] {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract figures from GROBID XML
 */
function extractFigures(grobidXml: string, sections: PaperSection[]): PaperFigure[] {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract tables from GROBID XML
 */
function extractTables(grobidXml: string, sections: PaperSection[]): PaperTable[] {
  // Implementation
  throw new Error('Not implemented');
}

/**
 * Extract citations from GROBID XML
 */
function extractCitations(grobidXml: string): PaperCitation[] {
  // Implementation
  throw new Error('Not implemented');
}
