/**
 * Paper extraction module
 * 
 * This module handles the extraction of structured content from academic papers
 * using GROBID for PDF processing and custom parsing for content structuring.
 * 
 * Features:
 * - Extracts structured content from academic papers in PDF format
 * - Identifies sections, algorithms, equations, figures, tables, and citations
 * - Uses GROBID for PDF text extraction with fallback mechanisms
 * - Enhances extraction with LLM assistance when available
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as logger from '../../utils/logger';
import * as llm from '../../utils/llm';
// Import fast-xml-parser for XML parsing
import { XMLParser, XMLValidator } from 'fast-xml-parser';
// Import form-data with type fixing
// @ts-ignore
import FormData from 'form-data';

import {
  PaperInfo,
  PaperContent,
  PaperSection,
  PaperAlgorithm,
  PaperEquation,
  PaperFigure,
  PaperTable,
  PaperCitation,
  GrobidExtractionOptions,
  LLMResponse
} from '../../types';

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
 * @param paperFilePath Path to the academic paper (PDF)
 * @param options GROBID extraction options
 * @returns Structured paper content
 */
export async function extractPaperContent(
  paperFilePath: string,
  options?: GrobidExtractionOptions
): Promise<PaperContent> {
  try {
    logger.info('Extracting paper content', { paperFilePath });
    
    // Set default options
    const defaultOptions: GrobidExtractionOptions = {
      includeCitations: true,
      includeRawText: true,
      includeStructuredText: true,
      includeFigures: true,
      includeFormulas: true,
      endpointUrl: DEFAULT_GROBID_ENDPOINT
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Process the PDF with GROBID
    logger.info('Processing PDF with GROBID', { paperFilePath, options: mergedOptions });
    const grobidXml = await processWithGrobid(paperFilePath, mergedOptions);
    
    // Extract paper information from GROBID XML
    logger.info('Extracting paper metadata', { paperFilePath });
    const paperInfo = extractPaperInfo(grobidXml);
    
    // Extract sections
    logger.info('Extracting paper sections', { paperFilePath });
    const sections = extractSections(grobidXml);
    
    // Extract algorithms
    logger.info('Extracting paper algorithms', { paperFilePath });
    const algorithms = extractAlgorithms(grobidXml, sections);
    
    // Extract equations
    logger.info('Extracting paper equations', { paperFilePath });
    const equations = extractEquations(grobidXml, sections);
    
    // Extract figures and tables
    logger.info('Extracting paper figures and tables', { paperFilePath });
    const figures = extractFigures(grobidXml, sections);
    const tables = extractTables(grobidXml, sections);
    
    // Extract citations
    logger.info('Extracting paper citations', { paperFilePath });
    const citations = extractCitations(grobidXml);
    
    // Assemble the complete paper content
    const paperContent: PaperContent = {
      paperInfo,
      sections,
      algorithms,
      equations,
      figures,
      tables,
      citations
    };
    
    // Enhance extraction with LLM if available
    if (llm.isLLMApiAvailable()) {
      logger.info('Enhancing extraction with LLM', { paperFilePath });
      return await enhanceExtractionWithLLM(paperContent);
    }
    
    return paperContent;
  } catch (error) {
    logger.error('Error extracting paper content', { 
      error: error instanceof Error ? error.message : String(error), 
      paperFilePath 
    });
    throw error;
  }
}

/**
 * Process PDF with GROBID
 * @param paperFilePath Path to the academic paper (PDF)
 * @param options GROBID extraction options
 * @returns GROBID XML response
 */
async function processWithGrobid(
  paperFilePath: string,
  options: GrobidExtractionOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Check if file exists
      if (!fs.existsSync(paperFilePath)) {
        throw new Error(`Paper file not found: ${paperFilePath}`);
      }
      
      // Create form data
      const form = new FormData();
      form.append('input', fs.createReadStream(paperFilePath));
      
      // Set up GROBID API URL
      const grobidUrl = `${options.endpointUrl || DEFAULT_GROBID_ENDPOINT}/api/processFulltextDocument`;
      
      // Determine if http or https should be used
      const httpModule = grobidUrl.startsWith('https') ? https : http;
      
      // Set up request options
      const requestOptions = {
        method: 'POST',
        headers: form.getHeaders()
      };
      
      // Make request
      const req = httpModule.request(grobidUrl, requestOptions, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`GROBID API returned status code ${res.statusCode}`));
          return;
        }
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
      });
      
      req.on('error', (error) => {
        logger.error('Error processing with GROBID', { 
          error: error.message, 
          paperFilePath,
          grobidUrl 
        });
        
        // If GROBID is not available, provide a fallback with simpler extraction
        logger.info('Using fallback extraction as GROBID is not available');
        resolve(fallbackExtraction(paperFilePath));
      });
      
      // Send the form data
      form.pipe(req);
    } catch (error) {
      logger.error('Error in GROBID processing', { 
        error: error instanceof Error ? error.message : String(error), 
        paperFilePath 
      });
      reject(error);
    }
  });
}

/**
 * Fallback extraction when GROBID is not available
 * @param paperFilePath Path to the academic paper
 * @returns Simple XML-like representation of paper content
 */
function fallbackExtraction(paperFilePath: string): string {
  try {
    // Get file name and extension
    const fileName = path.basename(paperFilePath);
    const fileExt = path.extname(paperFilePath).toLowerCase();
    
    // For PDF files, try to use internal PDF extraction
    if (fileExt === '.pdf') {
      try {
        // First try to extract text content using the enhanced PDF extraction
        const extractedContent = extractTextFromPDF(paperFilePath);
        
        if (extractedContent && extractedContent.text && extractedContent.text.length > 0) {
          // Use the extracted text to build a better TEI structure
          return buildTEIFromExtractedText(extractedContent, fileName);
        }
      } catch (pdfError) {
        logger.warn('Enhanced PDF extraction failed, using minimal fallback', { 
          error: pdfError instanceof Error ? pdfError.message : String(pdfError),
          paperFilePath 
        });
      }
      
      // If enhanced extraction fails, create a minimal XML structure
      return `
        <TEI>
          <teiHeader>
            <fileDesc>
              <titleStmt>
                <title>${fileName.replace(fileExt, '')}</title>
              </titleStmt>
              <sourceDesc>
                <biblStruct>
                  <analytic>
                    <title>${fileName.replace(fileExt, '')}</title>
                    <author>Unknown</author>
                  </analytic>
                  <monogr>
                    <title>Unknown</title>
                    <imprint>
                      <date>Unknown</date>
                    </imprint>
                  </monogr>
                </biblStruct>
              </sourceDesc>
            </fileDesc>
          </teiHeader>
          <text>
            <body>
              <div>
                <head>Paper Content Unavailable</head>
                <p>GROBID extraction failed, and content cannot be automatically extracted from PDF without it.</p>
                <p>Please ensure GROBID is running or provide the paper in a more accessible format.</p>
              </div>
            </body>
          </text>
        </TEI>
      `;
    }
    
    // For text-based files, we can try to read them directly
    if (['.txt', '.md', '.tex'].includes(fileExt)) {
      try {
        const content = fs.readFileSync(paperFilePath, 'utf8');
        
        // Try to parse markdown structure if it's a markdown file
        if (fileExt === '.md') {
          return extractStructureFromMarkdown(content, fileName);
        }
        
        // Try to parse LaTeX structure if it's a tex file
        if (fileExt === '.tex') {
          return extractStructureFromLaTeX(content, fileName);
        }
        
        // For plain text, create a simple XML structure
        return `
          <TEI>
            <teiHeader>
              <fileDesc>
                <titleStmt>
                  <title>${fileName.replace(fileExt, '')}</title>
                </titleStmt>
                <sourceDesc>
                  <biblStruct>
                    <analytic>
                      <title>${fileName.replace(fileExt, '')}</title>
                      <author>Unknown</author>
                    </analytic>
                    <monogr>
                      <title>Unknown</title>
                      <imprint>
                        <date>Unknown</date>
                      </imprint>
                    </monogr>
                  </biblStruct>
                </sourceDesc>
              </fileDesc>
            </teiHeader>
            <text>
              <body>
                <div>
                  <head>${fileName.replace(fileExt, '')}</head>
                  <p>${content.slice(0, 500)}...</p>
                </div>
              </body>
            </text>
          </TEI>
        `;
      } catch (readError) {
        logger.error('Error reading text file', { 
          error: readError instanceof Error ? readError.message : String(readError),
          paperFilePath 
        });
      }
    }
    
    // For other file types, return a minimal structure
    return `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>${fileName.replace(fileExt, '')}</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <div>
              <head>Unsupported File Format</head>
              <p>File format ${fileExt} is not supported for direct extraction.</p>
            </div>
          </body>
        </text>
      </TEI>
    `;
  } catch (error) {
    logger.error('Error in fallback extraction', { 
      error: error instanceof Error ? error.message : String(error),
      paperFilePath 
    });
    
    return `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>Extraction Error</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <div>
              <head>Extraction Error</head>
              <p>An error occurred during content extraction.</p>
            </div>
          </body>
        </text>
      </TEI>
    `;
  }
}

/**
 * Extract text content from PDF files using a specialized approach
 * @param pdfPath Path to the PDF file
 * @returns Extracted text content with structure information
 */
function extractTextFromPDF(pdfPath: string): { 
  text: string; 
  title?: string;
  abstract?: string;
  sections: Array<{ title: string; content: string; }>;
  references?: string[];
} {
  // We'll use child_process to invoke an external PDF extraction tool if available
  // This is a placeholder for enhanced PDF extraction capability
  try {
    // First, check if we can find any specialized PDF extraction tools
    // Options: pdf.js-extract, pdf-parse, pdfjs, etc.
    let pdfText = '';
    let extractedTitle = '';
    let extractedAbstract = '';
    let extractedSections: Array<{ title: string; content: string; }> = [];
    let extractedReferences: string[] = [];

    // PDF extraction approaches can be tried in order of preference
    // 1. Try child_process execution of external tools if available
    try {
      // This is a simplified approach - real implementation would use a robust PDF extraction library
      // For now, we'll read the file as binary and try to extract text manually
      const pdfBuffer = fs.readFileSync(pdfPath);
      
      // Simple pattern matching to try to extract text from PDF
      // This is a very basic approach and won't work well for most PDFs
      pdfText = extractTextFromPDFBuffer(pdfBuffer);
      
      // Try to extract title, abstract and sections using regex patterns
      extractedTitle = extractTitleFromText(pdfText);
      extractedAbstract = extractAbstractFromText(pdfText);
      extractedSections = extractSectionsFromText(pdfText);
      extractedReferences = extractReferencesFromText(pdfText);
    } catch (err) {
      logger.warn('Failed to extract text from PDF using direct method', { 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
    
    // Return whatever content we could extract
    return {
      text: pdfText,
      title: extractedTitle,
      abstract: extractedAbstract,
      sections: extractedSections,
      references: extractedReferences
    };
  } catch (error) {
    logger.error('Error in PDF text extraction', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    return {
      text: '',
      sections: []
    };
  }
}

/**
 * Extract text from PDF buffer (simplified method)
 * This is a minimal implementation - a real solution would use a proper PDF parsing library
 * @param pdfBuffer The PDF file content as a buffer
 * @returns Extracted text
 */
function extractTextFromPDFBuffer(pdfBuffer: Buffer): string {
  // This is a very simplified implementation that won't work well for most PDFs
  // A real implementation would use pdf.js, pdf-parse, or another PDF extraction library
  
  // Convert buffer to string and look for text patterns
  const bufferStr = pdfBuffer.toString('utf8', 0, Math.min(pdfBuffer.length, 100000));
  
  // Try to extract text portions from PDF
  // This is very naive and only works with some PDFs that have plaintext sections
  let extractedText = '';
  
  // Look for text objects in the PDF
  const textMatches = bufferStr.match(/\(([^)]+)\)\s*Tj/g);
  if (textMatches) {
    extractedText = textMatches
      .map(match => {
        // Extract the text between parentheses
        const textMatch = match.match(/\(([^)]+)\)/);
        return textMatch ? textMatch[1] : '';
      })
      .join(' ');
  }
  
  // If we couldn't extract text using Tj operators, try a simpler approach
  if (extractedText.length < 100) {
    // Look for any text between parentheses that might be content
    const allTextMatches = bufferStr.match(/\(([A-Za-z0-9\\s.,?!:;'"()-]{3,})\)/g);
    if (allTextMatches) {
      extractedText = allTextMatches
        .map(match => {
          // Extract the text between parentheses
          const textMatch = match.match(/\(([^)]+)\)/);
          return textMatch ? textMatch[1] : '';
        })
        .join(' ');
    }
  }
  
  return extractedText;
}

/**
 * Extract title from text content
 * @param text The extracted PDF text
 * @returns Extracted title
 */
function extractTitleFromText(text: string): string {
  // Try to find title patterns
  // Academic papers often have title as the first line or prominently at the top
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  // If first few lines have a short, prominent text that's not "Abstract" or common headers,
  // it's likely the title
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.length > 10 && line.length < 200 && 
        !/^(abstract|introduction|contents|table of contents|keywords)$/i.test(line)) {
      return line;
    }
  }
  
  return '';
}

/**
 * Extract abstract from text content
 * @param text The extracted PDF text
 * @returns Extracted abstract
 */
function extractAbstractFromText(text: string): string {
  // Look for abstract section
  const abstractMatch = text.match(/abstract([\s\S]*?)(?:introduction|keywords|1[\.\s]introduction|2[\.\s]|related work)/i);
  
  if (abstractMatch && abstractMatch[1]) {
    return abstractMatch[1].trim();
  }
  
  return '';
}

/**
 * Extract sections from text content
 * @param text The extracted PDF text
 * @returns Extracted sections with titles and content
 */
function extractSectionsFromText(text: string): Array<{ title: string; content: string; }> {
  const sections: Array<{ title: string; content: string; }> = [];
  
  // Look for common section patterns in academic papers
  // 1. Numbered sections (1. Introduction, 2. Related Work, etc.)
  const numberedSectionMatches = text.matchAll(/(\d+[\.\s]+[A-Z][^\n]+)([\s\S]*?)(?=\d+[\.\s]+[A-Z]|$)/g);
  
  for (const match of numberedSectionMatches) {
    if (match[1] && match[2]) {
      sections.push({
        title: match[1].trim(),
        content: match[2].trim()
      });
    }
  }
  
  // If we found numbered sections, return them
  if (sections.length > 0) {
    return sections;
  }
  
  // 2. Try to find uppercase section titles (INTRODUCTION, RELATED WORK, etc.)
  const uppercaseSectionMatches = text.matchAll(/([A-Z][A-Z\s]{3,}[A-Z])([\s\S]*?)(?=[A-Z][A-Z\s]{3,}[A-Z]|$)/g);
  
  for (const match of uppercaseSectionMatches) {
    if (match[1] && match[2]) {
      sections.push({
        title: match[1].trim(),
        content: match[2].trim()
      });
    }
  }
  
  return sections;
}

/**
 * Extract references from text content
 * @param text The extracted PDF text
 * @returns Extracted references
 */
function extractReferencesFromText(text: string): string[] {
  const references: string[] = [];
  
  // Look for references section
  const referencesMatch = text.match(/references([\s\S]*?)(?:appendix|acknowledgements|$)/i);
  
  if (referencesMatch && referencesMatch[1]) {
    const referencesText = referencesMatch[1].trim();
    
    // Try to split references by common patterns
    // 1. Numbered references ([1], [2], etc.)
    const numberedRefMatches = referencesText.matchAll(/\[\d+\](.*?)(?=\[\d+\]|$)/gs);
    
    for (const match of numberedRefMatches) {
      if (match[1]) {
        references.push(match[1].trim());
      }
    }
    
    // If we found numbered references, return them
    if (references.length > 0) {
      return references;
    }
    
    // 2. Try to find references by author patterns (Smith et al., 2020)
    const authorRefMatches = referencesText.matchAll(/([A-Z][a-z]+(?:,?\s+(?:et al\.?|and))?,\s+\d{4}\.)(.*?)(?=[A-Z][a-z]+(?:,?\s+(?:et al\.?|and))?,\s+\d{4}\.|$)/gs);
    
    for (const match of authorRefMatches) {
      if (match[0]) {
        references.push(match[0].trim());
      }
    }
  }
  
  return references;
}

/**
 * Extract structure from markdown content
 * @param content Markdown content
 * @param fileName File name for fallback title
 * @returns TEI-like XML representation
 */
function extractStructureFromMarkdown(content: string, fileName: string): string {
  try {
    // Parse markdown structure
    const lines = content.split('\n');
    let title = fileName;
    let abstract = '';
    const sections: Array<{ level: number; title: string; content: string; }> = [];
    
    // Extract title (first # heading)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('# ')) {
        title = line.substring(2).trim();
        break;
      }
    }
    
    // Extract sections based on markdown headings
    let currentSection: { level: number; title: string; content: string; } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for headings
      const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({ ...currentSection });
        }
        
        // Start new section
        currentSection = {
          level: headingMatch[1].length,
          title: headingMatch[2].trim(),
          content: ''
        };
      } else if (currentSection) {
        // Add to current section content
        currentSection.content += line + '\n';
      } else if (line.toLowerCase().startsWith('abstract')) {
        // Extract abstract if it exists
        let abstractContent = '';
        let j = i + 1;
        while (j < lines.length && !lines[j].match(/^#{1,6}\s+/)) {
          abstractContent += lines[j] + '\n';
          j++;
        }
        abstract = abstractContent.trim();
      }
    }
    
    // Add the last section if exists
    if (currentSection) {
      sections.push({ ...currentSection });
    }
    
    // Build TEI XML
    let teiXml = `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>${title}</title>
            </titleStmt>
            <sourceDesc>
              <biblStruct>
                <analytic>
                  <title>${title}</title>
                  <author>Unknown</author>
                </analytic>
                <monogr>
                  <title>Unknown</title>
                  <imprint>
                    <date>Unknown</date>
                  </imprint>
                </monogr>
              </biblStruct>
            </sourceDesc>
          </fileDesc>
        </teiHeader>
    `;
    
    // Add abstract if available
    if (abstract) {
      teiXml += `
        <profileDesc>
          <abstract>
            <p>${abstract}</p>
          </abstract>
        </profileDesc>
      `;
    }
    
    // Add body with sections
    teiXml += `
        <text>
          <body>
    `;
    
    // Add sections
    sections.forEach((section, index) => {
      teiXml += `
            <div>
              <head>${section.title}</head>
              <p>${section.content}</p>
            </div>
      `;
    });
    
    // Close tags
    teiXml += `
          </body>
        </text>
      </TEI>
    `;
    
    return teiXml;
  } catch (error) {
    logger.error('Error extracting structure from markdown', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return a minimal structure on error
    return `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>${fileName}</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <div>
              <head>${fileName}</head>
              <p>${content.slice(0, 500)}...</p>
            </div>
          </body>
        </text>
      </TEI>
    `;
  }
}

/**
 * Extract structure from LaTeX content
 * @param content LaTeX content
 * @param fileName File name for fallback title
 * @returns TEI-like XML representation
 */
function extractStructureFromLaTeX(content: string, fileName: string): string {
  try {
    // Parse LaTeX structure
    let title = fileName;
    let abstract = '';
    const authors: string[] = [];
    const sections: Array<{ level: number; title: string; content: string; }> = [];
    
    // Extract title
    const titleMatch = content.match(/\\title\{([^}]+)\}/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    // Extract authors
    const authorMatches = content.matchAll(/\\author\{([^}]+)\}/g);
    for (const match of authorMatches) {
      if (match[1]) {
        authors.push(match[1].trim());
      }
    }
    
    // Extract abstract
    const abstractMatch = content.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
    if (abstractMatch) {
      abstract = abstractMatch[1].trim();
    }
    
    // Extract sections
    const sectionMatches = content.matchAll(/\\(section|subsection|subsubsection)\{([^}]+)\}([\s\S]*?)(?=\\(?:section|subsection|subsubsection)\{|\\end\{document\}|$)/g);
    
    for (const match of sectionMatches) {
      const sectionLevel = match[1] === 'section' ? 1 : (match[1] === 'subsection' ? 2 : 3);
      const sectionTitle = match[2].trim();
      const sectionContent = match[3].trim();
      
      sections.push({
        level: sectionLevel,
        title: sectionTitle,
        content: sectionContent
      });
    }
    
    // Build TEI XML
    let teiXml = `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>${title}</title>
            </titleStmt>
            <sourceDesc>
              <biblStruct>
                <analytic>
                  <title>${title}</title>
                  ${authors.map(author => `<author>${author}</author>`).join('\n')}
                </analytic>
                <monogr>
                  <title>Unknown</title>
                  <imprint>
                    <date>Unknown</date>
                  </imprint>
                </monogr>
              </biblStruct>
            </sourceDesc>
          </fileDesc>
        </teiHeader>
    `;
    
    // Add abstract if available
    if (abstract) {
      teiXml += `
        <profileDesc>
          <abstract>
            <p>${abstract}</p>
          </abstract>
        </profileDesc>
      `;
    }
    
    // Add body with sections
    teiXml += `
        <text>
          <body>
    `;
    
    // Add sections
    sections.forEach((section, index) => {
      teiXml += `
            <div>
              <head>${section.title}</head>
              <p>${section.content}</p>
            </div>
      `;
    });
    
    // Close tags
    teiXml += `
          </body>
        </text>
      </TEI>
    `;
    
    return teiXml;
  } catch (error) {
    logger.error('Error extracting structure from LaTeX', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return a minimal structure on error
    return `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>${fileName}</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <div>
              <head>${fileName}</head>
              <p>${content.slice(0, 500)}...</p>
            </div>
          </body>
        </text>
      </TEI>
    `;
  }
}

/**
 * Build TEI structure from extracted text
 * @param extractedContent The extracted content from PDF
 * @param fileName Filename for fallback title
 * @returns TEI-like XML representation
 */
function buildTEIFromExtractedText(
  extractedContent: { 
    text: string; 
    title?: string;
    abstract?: string;
    sections: Array<{ title: string; content: string; }>;
    references?: string[];
  },
  fileName: string
): string {
  try {
    const title = extractedContent.title || fileName;
    const sections = extractedContent.sections || [];
    
    // Build TEI XML
    let teiXml = `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>${title}</title>
            </titleStmt>
            <sourceDesc>
              <biblStruct>
                <analytic>
                  <title>${title}</title>
                  <author>Unknown</author>
                </analytic>
                <monogr>
                  <title>Unknown</title>
                  <imprint>
                    <date>Unknown</date>
                  </imprint>
                </monogr>
              </biblStruct>
            </sourceDesc>
          </fileDesc>
        </teiHeader>
    `;
    
    // Add abstract if available
    if (extractedContent.abstract) {
      teiXml += `
        <profileDesc>
          <abstract>
            <p>${extractedContent.abstract}</p>
          </abstract>
        </profileDesc>
      `;
    }
    
    // Add body with sections
    teiXml += `
        <text>
          <body>
    `;
    
    // Add sections if available
    if (sections.length > 0) {
      sections.forEach((section, index) => {
        teiXml += `
            <div>
              <head>${section.title}</head>
              <p>${section.content}</p>
            </div>
        `;
      });
    } else {
      // If no sections were extracted, use the full text
      teiXml += `
            <div>
              <head>${title}</head>
              <p>${extractedContent.text}</p>
            </div>
      `;
    }
    
    // Add references if available
    if (extractedContent.references && extractedContent.references.length > 0) {
      teiXml += `
            <div>
              <head>References</head>
              <listBibl>
      `;
      
      extractedContent.references.forEach((reference, index) => {
        teiXml += `
                <biblStruct>
                  <analytic>
                    <title>${reference}</title>
                  </analytic>
                </biblStruct>
        `;
      });
      
      teiXml += `
              </listBibl>
            </div>
      `;
    }
    
    // Close tags
    teiXml += `
          </body>
        </text>
      </TEI>
    `;
    
    return teiXml;
  } catch (error) {
    logger.error('Error building TEI from extracted text', { 
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Return a minimal structure on error
    return `
      <TEI>
        <teiHeader>
          <fileDesc>
            <titleStmt>
              <title>${fileName}</title>
            </titleStmt>
          </fileDesc>
        </teiHeader>
        <text>
          <body>
            <div>
              <head>${fileName}</head>
              <p>${extractedContent.text.slice(0, 500)}...</p>
            </div>
          </body>
        </text>
      </TEI>
    `;
  }
}

/**
 * Extract paper information from GROBID XML
 * @param grobidXml GROBID XML response
 * @returns Extracted paper information
 */
function extractPaperInfo(grobidXml: string): PaperInfo {
  try {
    // Validate XML
    const validationResult = XMLValidator.validate(grobidXml);
    if (validationResult !== true) {
      logger.error('Invalid XML format', { error: validationResult.err });
      throw new Error(`Invalid XML: ${validationResult.err}`);
    }
    
    // Parse XML
    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedXml = parser.parse(grobidXml);
    
    if (!parsedXml.TEI) {
      throw new Error('Invalid GROBID XML format: Missing TEI root');
    }
    
    // Extract title - from various possible locations
    let title = 'Unknown Title';
    try {
      if (parsedXml.TEI.teiHeader?.fileDesc?.titleStmt?.title) {
        title = parsedXml.TEI.teiHeader.fileDesc.titleStmt.title;
      } else if (parsedXml.TEI.teiHeader?.fileDesc?.sourceDesc?.biblStruct?.analytic?.title) {
        title = parsedXml.TEI.teiHeader.fileDesc.sourceDesc.biblStruct.analytic.title;
      }
      // If title is an array, take the first one
      if (Array.isArray(title)) {
        title = title[0];
      }
      // If title has a #text property, use that
      if (typeof title === 'object' && title['#text']) {
        title = title['#text'];
      }
    } catch (error) {
      logger.warn('Error extracting title', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Extract authors
    let authors: string[] = ['Unknown Author'];
    try {
      const authorPath = parsedXml.TEI.teiHeader?.fileDesc?.sourceDesc?.biblStruct?.analytic?.author;
      if (authorPath) {
        if (Array.isArray(authorPath)) {
          authors = authorPath.map(author => {
            // Try to extract author name from different possible structures
            if (author.persName?.forename && author.persName?.surname) {
              // Handle multiple forenames
              let forename = '';
              if (Array.isArray(author.persName.forename)) {
                forename = author.persName.forename.map((f: any) => f['#text'] || f).join(' ');
              } else {
                forename = author.persName.forename['#text'] || author.persName.forename;
              }
              return `${forename} ${author.persName.surname['#text'] || author.persName.surname}`;
            }
            // If there's a string representation
            if (author['#text']) {
              return author['#text'];
            }
            // Fallback
            return 'Unknown Author';
          });
        } else if (authorPath.persName) {
          // Single author case
          const forename = authorPath.persName.forename?.['#text'] || authorPath.persName.forename || '';
          const surname = authorPath.persName.surname?.['#text'] || authorPath.persName.surname || '';
          authors = [`${forename} ${surname}`.trim() || 'Unknown Author'];
        }
      }
      // Filter out any empty author names
      authors = authors.filter(author => author && author.trim() !== '');
      if (authors.length === 0) {
        authors = ['Unknown Author'];
      }
    } catch (error) {
      logger.warn('Error extracting authors', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Extract abstract
    let abstract = 'Abstract not available';
    try {
      const profileDesc = parsedXml.TEI.teiHeader?.profileDesc;
      if (profileDesc?.abstract) {
        if (typeof profileDesc.abstract === 'string') {
          abstract = profileDesc.abstract;
        } else if (profileDesc.abstract.p) {
          // Handle multiple paragraphs
          if (Array.isArray(profileDesc.abstract.p)) {
            abstract = profileDesc.abstract.p.map((p: any) => p['#text'] || p).join('\n\n');
          } else {
            abstract = profileDesc.abstract.p['#text'] || profileDesc.abstract.p;
          }
        }
      }
    } catch (error) {
      logger.warn('Error extracting abstract', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Extract year
    let year = new Date().getFullYear();
    try {
      const datePath = parsedXml.TEI.teiHeader?.fileDesc?.sourceDesc?.biblStruct?.monogr?.imprint?.date;
      if (datePath) {
        const yearStr = datePath['@_when'] || datePath['#text'] || String(datePath);
        // Extract year with regex from the string
        const yearMatch = yearStr.match(/\d{4}/);
        if (yearMatch) {
          year = parseInt(yearMatch[0]);
        }
      }
    } catch (error) {
      logger.warn('Error extracting year', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Extract DOI
    let doi: string | undefined;
    try {
      const idnoPath = parsedXml.TEI.teiHeader?.fileDesc?.sourceDesc?.biblStruct?.idno;
      if (idnoPath) {
        if (Array.isArray(idnoPath)) {
          // Find the DOI in the array of identifiers
          const doiItem = idnoPath.find(idno => idno['@_type'] === 'DOI');
          if (doiItem) {
            doi = doiItem['#text'] || String(doiItem);
          }
        } else if (idnoPath['@_type'] === 'DOI') {
          doi = idnoPath['#text'] || String(idnoPath);
        }
      }
    } catch (error) {
      logger.warn('Error extracting DOI', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Extract keywords
    let keywords: string[] = [];
    try {
      const keywordsPath = parsedXml.TEI.teiHeader?.profileDesc?.textClass?.keywords?.term;
      if (keywordsPath) {
        if (Array.isArray(keywordsPath)) {
          keywords = keywordsPath.map(term => term['#text'] || String(term));
        } else {
          keywords = [keywordsPath['#text'] || String(keywordsPath)];
        }
      }
    } catch (error) {
      logger.warn('Error extracting keywords', { error: error instanceof Error ? error.message : String(error) });
    }
    
    // Extract venue
    let venue = 'Unknown Venue';
    try {
      const titlePath = parsedXml.TEI.teiHeader?.fileDesc?.sourceDesc?.biblStruct?.monogr?.title;
      if (titlePath) {
        venue = titlePath['#text'] || String(titlePath);
      }
    } catch (error) {
      logger.warn('Error extracting venue', { error: error instanceof Error ? error.message : String(error) });
    }
    
    return {
      title,
      authors,
      abstract,
      year,
      doi,
      keywords,
      venue
    };
  } catch (error) {
    logger.error('Error extracting paper info', { error: error instanceof Error ? error.message : String(error) });
    
    // Return a minimal default structure
    return {
      title: 'Extraction Failed',
      authors: ['Unknown'],
      abstract: 'Paper information extraction failed. Please check if GROBID is running properly.',
      year: new Date().getFullYear()
    };
  }
}

/**
 * Extract sections from GROBID XML
 * @param grobidXml GROBID XML response
 * @returns Extracted paper sections
 */
function extractSections(grobidXml: string): PaperSection[] {
  try {
    // Validate and parse XML
    const validationResult = XMLValidator.validate(grobidXml);
    if (validationResult !== true) {
      throw new Error(`Invalid XML: ${validationResult.err}`);
    }
    
    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedXml = parser.parse(grobidXml);
    
    if (!parsedXml.TEI || !parsedXml.TEI.text || !parsedXml.TEI.text.body) {
      throw new Error('Invalid GROBID XML format: Missing TEI text body');
    }
    
    // Extract sections from the body
    const body = parsedXml.TEI.text.body;
    
    // Handle case when no div elements are present
    if (!body.div) {
      // Try to extract some content from the body
      let content = '';
      if (typeof body === 'string') {
        content = body;
      } else if (body.p) {
        if (Array.isArray(body.p)) {
          content = body.p.map((p: any) => p['#text'] || String(p)).join('\n\n');
        } else {
          content = body.p['#text'] || String(body.p);
        }
      } else {
        content = JSON.stringify(body).slice(0, 1000);
      }
      
      return [{
        id: 'sec-1',
        level: 1,
        title: 'Main Content',
        content: content,
        subsections: []
      }];
    }
    
    // Process div elements for sections
    const sections: PaperSection[] = [];
    
    // Function to process divs recursively and build section hierarchy
    function processDivs(divs: any[], parentId: string = '', level: number = 1): PaperSection[] {
      const result: PaperSection[] = [];
      
      divs.forEach((div: any, index: number) => {
        // Generate section ID
        const sectionId = parentId 
          ? `${parentId}.${index + 1}` 
          : `sec-${index + 1}`;
        
        // Extract title from head element
        let title = 'Untitled Section';
        if (div.head) {
          title = div.head['#text'] || String(div.head);
        }
        
        // Extract content (combine all paragraphs)
        let content = '';
        if (div.p) {
          if (Array.isArray(div.p)) {
            content = div.p.map((p: any) => p['#text'] || String(p)).join('\n\n');
          } else {
            content = div.p['#text'] || String(div.p);
          }
        }
        
        // Process subsections (nested divs)
        const subsections: PaperSection[] = [];
        if (div.div) {
          const nestedDivs = Array.isArray(div.div) ? div.div : [div.div];
          subsections.push(...processDivs(nestedDivs, sectionId, level + 1));
        }
        
        // Create the section object
        result.push({
          id: sectionId,
          level,
          title,
          content,
          subsections
        });
      });
      
      return result;
    }
    
    // Handle both array and single div cases
    if (Array.isArray(body.div)) {
      sections.push(...processDivs(body.div));
    } else {
      sections.push(...processDivs([body.div]));
    }
    
    // If no sections were extracted, return a default section
    if (sections.length === 0) {
      return [{
        id: 'sec-1',
        level: 1,
        title: 'Main Content',
        content: 'No sections found in document.',
        subsections: []
      }];
    }
    
    return sections;
  } catch (error) {
    logger.error('Error extracting sections', { error: error instanceof Error ? error.message : String(error) });
    
    // Return a minimal default structure
    return [{
      id: 'sec-error',
      level: 1,
      title: 'Extraction Error',
      content: 'Section extraction failed. Please check if GROBID is running properly.',
      subsections: []
    }];
  }
}

/**
 * Extract algorithms from GROBID XML and sections
 * @param grobidXml GROBID XML response
 * @param sections Extracted paper sections
 * @returns Extracted algorithms
 */
function extractAlgorithms(grobidXml: string, sections: PaperSection[]): PaperAlgorithm[] {
  try {
    // Parse XML
    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedXml = parser.parse(grobidXml);
    
    if (!parsedXml.TEI || !parsedXml.TEI.text) {
      throw new Error('Invalid GROBID XML format: Missing TEI text');
    }
    
    const algorithms: PaperAlgorithm[] = [];
    
    // Function to extract algorithm information from a figure
    function extractAlgorithmFromFigure(figure: any, index: number, sectionId: string = 'sec-1'): PaperAlgorithm | null {
      try {
        // Check if this figure contains an algorithm
        // First, check if the head element contains "algorithm"
        let isAlgorithm = false;
        let algorithmName = `Algorithm ${index + 1}`;
        
        if (figure.head) {
          const headText = figure.head['#text'] || String(figure.head);
          if (/algorithm/i.test(headText)) {
            isAlgorithm = true;
            algorithmName = headText.trim();
          }
        }
        
        // If this is not an algorithm, return null
        if (!isAlgorithm) {
          return null;
        }
        
        // Extract pseudocode content
        let pseudocode = '';
        
        // Try to extract from figDesc
        if (figure.figDesc) {
          pseudocode = figure.figDesc['#text'] || String(figure.figDesc);
        }
        
        // If there's a table in the figure, it might be the algorithm
        if (figure.table) {
          const tableContent: string[] = [];
          
          if (figure.table.row) {
            const rows = Array.isArray(figure.table.row) ? figure.table.row : [figure.table.row];
            rows.forEach((row: any) => {
              if (row.cell) {
                const cells = Array.isArray(row.cell) ? row.cell : [row.cell];
                const rowText = cells.map((cell: any) => cell['#text'] || String(cell)).join(' | ');
                tableContent.push(rowText);
              }
            });
          }
          
          if (tableContent.length > 0) {
            pseudocode = tableContent.join('\n');
          }
        }
        
        // If we found any content, create an algorithm object
        if (pseudocode) {
          // Try to identify inputs and outputs based on common patterns
          const inputs: string[] = [];
          const outputs: string[] = [];
          
          // Look for "Input:" and "Output:" in the pseudocode
          const inputMatch = pseudocode.match(/Input\s*:(.+?)(?:Output|$)/is);
          if (inputMatch && inputMatch[1]) {
            // Split by commas or newlines
            const inputText = inputMatch[1].trim();
            inputs.push(...inputText.split(/[,\n]+/).map(i => i.trim()).filter(i => i));
          }
          
          const outputMatch = pseudocode.match(/Output\s*:(.+?)(?:\n\n|$)/is);
          if (outputMatch && outputMatch[1]) {
            const outputText = outputMatch[1].trim();
            outputs.push(...outputText.split(/[,\n]+/).map(o => o.trim()).filter(o => o));
          }
          
          return {
            id: `algo-${index + 1}`,
            name: algorithmName,
            description: `Extracted algorithm from section ${sectionId}`,
            pseudocode,
            inputs,
            outputs,
            sectionId
          };
        }
      } catch (error) {
        logger.warn(`Error processing algorithm figure ${index}`, { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      return null;
    }
    
    // Function to recursively search for figures in the body
    function processFiguresInBody(body: any, sectionId: string = 'sec-1'): void {
      if (!body) return;
      
      // Process figures at this level
      if (body.figure) {
        const figures = Array.isArray(body.figure) ? body.figure : [body.figure];
        
        figures.forEach((figure: any, index: number) => {
          const algorithm = extractAlgorithmFromFigure(figure, algorithms.length + 1, sectionId);
          if (algorithm) {
            algorithms.push(algorithm);
          }
        });
      }
      
      // Process divs for figures
      if (body.div) {
        const divs = Array.isArray(body.div) ? body.div : [body.div];
        
        divs.forEach((div: any, index: number) => {
          const currentSectionId = `${sectionId === 'sec-1' ? 'sec-' : sectionId + '.'}${index + 1}`;
          
          // Process figures in this div
          if (div.figure) {
            const figures = Array.isArray(div.figure) ? div.figure : [div.figure];
            
            figures.forEach((figure: any, figIndex: number) => {
              const algorithm = extractAlgorithmFromFigure(figure, algorithms.length + 1, currentSectionId);
              if (algorithm) {
                algorithms.push(algorithm);
              }
            });
          }
          
          // Recursively process nested divs
          if (div.div) {
            processFiguresInBody(div, currentSectionId);
          }
        });
      }
    }
    
    // Start processing from the body
    if (parsedXml.TEI.text.body) {
      processFiguresInBody(parsedXml.TEI.text.body);
    }
    
    // Fallback: Search directly for figures with algorithm in the head
    // This is useful if the structure doesn't follow the expected hierarchy
    if (algorithms.length === 0 && parsedXml.TEI.text) {
      const allFiguresStr = JSON.stringify(parsedXml.TEI.text);
      const figureMatches = [...allFiguresStr.matchAll(/"figure":\s*\{[^}]*"head":\s*"[^"]*[Aa]lgorithm[^"]*"/g)];
      
      if (figureMatches.length > 0) {
        logger.info(`Found ${figureMatches.length} potential algorithm figures using fallback method`);
        
        // Try to find these figures in the parsed XML and process them
        if (parsedXml.TEI.text.figure) {
          const figures = Array.isArray(parsedXml.TEI.text.figure) 
            ? parsedXml.TEI.text.figure 
            : [parsedXml.TEI.text.figure];
          
          figures.forEach((figure: any, index: number) => {
            const algorithm = extractAlgorithmFromFigure(figure, index + 1);
            if (algorithm) {
              algorithms.push(algorithm);
            }
          });
        }
      }
    }
    
    // If we still have no algorithms, try the regex approach as a last resort
    if (algorithms.length === 0) {
      logger.info('Using regex fallback for algorithm extraction');
      
      const algorithmMatches = [...grobidXml.matchAll(/<figure[^>]*>.*?<head[^>]*>(?:Algorithm|ALGORITHM)[^<]*<\/head>(.*?)<\/figure>/gs)];
      
      algorithmMatches.forEach((match, index) => {
        const algorithmContent = match[1].replace(/<[^>]*>/g, ' ').trim();
        
        // Determine section ID
        let sectionId = 'sec-1';
        let algorithmName = `Algorithm ${index + 1}`;
        
        // Try to find a name for the algorithm
        const nameMatch = algorithmContent.match(/Algorithm\s+\d+(?:\.\d+)*\s*:?\s*([^:]+)/i);
        if (nameMatch) {
          algorithmName = nameMatch[1].trim();
        }
        
        algorithms.push({
          id: `algo-${index + 1}`,
          name: algorithmName,
          description: `Extracted algorithm ${index + 1}`,
          pseudocode: algorithmContent,
          inputs: [],
          outputs: [],
          sectionId
        });
      });
    }
    
    return algorithms;
  } catch (error) {
    logger.error('Error extracting algorithms', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Extract equations from GROBID XML and sections
 * @param grobidXml GROBID XML response
 * @param sections Extracted paper sections
 * @returns Extracted equations
 */
function extractEquations(grobidXml: string, sections: PaperSection[]): PaperEquation[] {
  try {
    // Parse XML
    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedXml = parser.parse(grobidXml);
    
    if (!parsedXml.TEI || !parsedXml.TEI.text) {
      throw new Error('Invalid GROBID XML format: Missing TEI text');
    }
    
    const equations: PaperEquation[] = [];
    
    // Function to extract formula content
    function extractFormulaContent(formula: any): string {
      // Handle different formula content structures
      if (typeof formula === 'string') {
        return formula.trim();
      }
      
      if (formula['#text']) {
        return formula['#text'].trim();
      }
      
      if (formula.math) {
        if (typeof formula.math === 'string') {
          return formula.math.trim();
        }
        if (formula.math['#text']) {
          return formula.math['#text'].trim();
        }
        // For MathML content
        if (formula.math.mrow) {
          return JSON.stringify(formula.math);
        }
      }
      
      // If no specific extraction was possible, stringify the object
      const content = JSON.stringify(formula);
      return content.length > 500 ? content.substring(0, 500) + '...' : content;
    }
    
    // Function to determine which section an equation belongs to
    function findSectionForFormula(formula: any, allSections: PaperSection[]): string {
      // If formula has a direct parent that's a div, that div might be our section
      if (formula.parentNode && formula.parentNode.nodeName === 'div') {
        // Find section with matching ID or similar content
        for (const section of allSections) {
          if (section.content && section.content.includes(extractFormulaContent(formula).substring(0, 20))) {
            return section.id;
          }
        }
      }
      
      // Default to the first section
      return allSections.length > 0 ? allSections[0].id : 'sec-1';
    }
    
    // Function to recursively collect formulas from the document
    function collectFormulas(node: any, currentSectionId: string = 'sec-1'): void {
      // If node is null or undefined, return
      if (!node) return;
      
      // If this node has formulas, collect them
      if (node.formula) {
        const formulas = Array.isArray(node.formula) ? node.formula : [node.formula];
        
        formulas.forEach((formula: any, index: number) => {
          try {
            const content = extractFormulaContent(formula);
            
            if (content && content.trim() !== '') {
              // Try to determine a formula type based on attributes or content
              let formulaType = 'inline';
              if (formula['@_type']) {
                formulaType = formula['@_type'];
              } else if (content.length > 50 || content.includes('\n')) {
                formulaType = 'display';
              }
              
              // Create equation object
              equations.push({
                id: `eq-${equations.length + 1}`,
                content,
                sectionId: currentSectionId,
                type: formulaType
              });
            }
          } catch (formulaError) {
            logger.warn(`Error processing formula ${index}`, { 
              error: formulaError instanceof Error ? formulaError.message : String(formulaError)
            });
          }
        });
      }
      
      // Process div elements which might be sections
      if (node.div) {
        const divs = Array.isArray(node.div) ? node.div : [node.div];
        
        divs.forEach((div: any, divIndex: number) => {
          // Determine section ID for this div
          let sectionId = currentSectionId;
          if (currentSectionId === 'sec-1') {
            sectionId = `sec-${divIndex + 1}`;
          } else {
            sectionId = `${currentSectionId}.${divIndex + 1}`;
          }
          
          // Process formulas in this div
          if (div.formula) {
            const formulas = Array.isArray(div.formula) ? div.formula : [div.formula];
            
            formulas.forEach((formula: any, index: number) => {
              try {
                const content = extractFormulaContent(formula);
                
                if (content && content.trim() !== '') {
                  // Determine formula type
                  let formulaType = 'inline';
                  if (formula['@_type']) {
                    formulaType = formula['@_type'];
                  } else if (content.length > 50 || content.includes('\n')) {
                    formulaType = 'display';
                  }
                  
                  // Create equation object
                  equations.push({
                    id: `eq-${equations.length + 1}`,
                    content,
                    sectionId,
                    type: formulaType
                  });
                }
              } catch (formulaError) {
                logger.warn(`Error processing formula ${index} in section ${sectionId}`, { 
                  error: formulaError instanceof Error ? formulaError.message : String(formulaError)
                });
              }
            });
          }
          
          // Recursively process nested divs
          collectFormulas(div, sectionId);
        });
      }
      
      // Process paragraphs which might contain formulas
      if (node.p) {
        const paragraphs = Array.isArray(node.p) ? node.p : [node.p];
        
        paragraphs.forEach((p: any) => {
          if (p.formula) {
            const formulas = Array.isArray(p.formula) ? p.formula : [p.formula];
            
            formulas.forEach((formula: any, index: number) => {
              try {
                const content = extractFormulaContent(formula);
                
                if (content && content.trim() !== '') {
                  // Inline formulas are more likely in paragraphs
                  const formulaType = formula['@_type'] || 'inline';
                  
                  // Create equation object
                  equations.push({
                    id: `eq-${equations.length + 1}`,
                    content,
                    sectionId: currentSectionId,
                    type: formulaType
                  });
                }
              } catch (formulaError) {
                logger.warn(`Error processing formula ${index} in paragraph`, { 
                  error: formulaError instanceof Error ? formulaError.message : String(formulaError)
                });
              }
            });
          }
        });
      }
    }
    
    // Start collecting formulas from the document body
    if (parsedXml.TEI.text.body) {
      collectFormulas(parsedXml.TEI.text.body);
    }
    
    // If no equations were found using XML parsing, try regex as fallback
    if (equations.length === 0) {
      logger.info('Using regex fallback for equation extraction');
      
      const equationMatches = [...grobidXml.matchAll(/<formula[^>]*>(.*?)<\/formula>/gs)];
      
      equationMatches.forEach((match, index) => {
        const equationContent = match[1].replace(/<[^>]*>/g, ' ').trim();
        
        if (equationContent && equationContent.trim() !== '') {
          equations.push({
            id: `eq-${index + 1}`,
            content: equationContent,
            sectionId: 'sec-1',
            type: 'unknown'
          });
        }
      });
    }
    
    return equations;
  } catch (error) {
    logger.error('Error extracting equations', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Extract figures from GROBID XML and sections
 * @param grobidXml GROBID XML response
 * @param sections Extracted paper sections
 * @returns Extracted figures
 */
function extractFigures(grobidXml: string, sections: PaperSection[]): PaperFigure[] {
  try {
    // Parse XML
    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedXml = parser.parse(grobidXml);
    
    if (!parsedXml.TEI || !parsedXml.TEI.text) {
      throw new Error('Invalid GROBID XML format: Missing TEI text');
    }
    
    const figures: PaperFigure[] = [];
    
    // Function to extract figure caption and other details
    function extractFigureDetails(figure: any): { caption: string, label: string, url?: string } {
      let caption = 'No caption available';
      let label = '';
      let url: string | undefined;
      
      // Extract caption from figDesc
      if (figure.figDesc) {
        if (typeof figure.figDesc === 'string') {
          caption = figure.figDesc.trim();
        } else if (figure.figDesc['#text']) {
          caption = figure.figDesc['#text'].trim();
        } else if (figure.figDesc.p) {
          // Handle paragraph-wrapped caption
          if (Array.isArray(figure.figDesc.p)) {
            caption = figure.figDesc.p.map((p: any) => p['#text'] || String(p)).join('\n\n');
          } else {
            caption = figure.figDesc.p['#text'] || String(figure.figDesc.p);
          }
        }
      }
      
      // Extract figure label from head
      if (figure.head) {
        if (typeof figure.head === 'string') {
          label = figure.head.trim();
        } else if (figure.head['#text']) {
          label = figure.head['#text'].trim();
        }
      }
      
      // Extract URL from graphic element if present
      if (figure.graphic && figure.graphic['@_url']) {
        url = figure.graphic['@_url'];
      }
      
      return { caption, label, url };
    }
    
    // Function to recursively collect figures from the document
    function collectFigures(node: any, currentSectionId: string = 'sec-1'): void {
      // If node is null or undefined, return
      if (!node) return;
      
      // Only process figure nodes that aren't tables (tables have type="table")
      if (node.figure) {
        const nodesFigures = Array.isArray(node.figure) ? node.figure : [node.figure];
        
        // Filter out figures that are actually tables
        const actualFigures = nodesFigures.filter((fig: any) => {
          return !fig['@_type'] || fig['@_type'] !== 'table';
        });
        
        actualFigures.forEach((figure: any, index: number) => {
          try {
            // Skip algorithm figures - they're handled by extractAlgorithms
            if (figure.head) {
              const headText = typeof figure.head === 'string' 
                ? figure.head 
                : figure.head['#text'] || '';
                
              if (/algorithm/i.test(headText)) {
                return;
              }
            }
            
            const { caption, label, url } = extractFigureDetails(figure);
            
            if (caption || label) {
              // Build a more descriptive ID if possible
              let figId = `fig-${figures.length + 1}`;
              
              // If the label contains a number, use it
              const numMatch = label.match(/(?:figure|fig\.?)\s*(\d+(?:\.\d+)*)/i);
              if (numMatch && numMatch[1]) {
                figId = `fig-${numMatch[1]}`;
              }
              
              // Create figure object with all available information
              figures.push({
                id: figId,
                caption,
                sectionId: currentSectionId,
                label: label || undefined,
                url: url || undefined
              });
            }
          } catch (figureError) {
            logger.warn(`Error processing figure ${index}`, { 
              error: figureError instanceof Error ? figureError.message : String(figureError)
            });
          }
        });
      }
      
      // Process div elements which might be sections
      if (node.div) {
        const divs = Array.isArray(node.div) ? node.div : [node.div];
        
        divs.forEach((div: any, divIndex: number) => {
          // Determine section ID for this div
          let sectionId = currentSectionId;
          if (currentSectionId === 'sec-1') {
            sectionId = `sec-${divIndex + 1}`;
          } else {
            sectionId = `${currentSectionId}.${divIndex + 1}`;
          }
          
          // Recursively process this div
          collectFigures(div, sectionId);
        });
      }
    }
    
    // Start collecting figures from the document body
    if (parsedXml.TEI.text.body) {
      collectFigures(parsedXml.TEI.text.body);
    }
    
    // If no figures were found using XML parsing, try regex as fallback
    if (figures.length === 0) {
      logger.info('Using regex fallback for figure extraction');
      
      const figureMatches = [...grobidXml.matchAll(/<figure[^>]*>(?:(?!<figure).)*?<figDesc[^>]*>(.*?)<\/figDesc>.*?<\/figure>/gs)];
      
      figureMatches.forEach((match, index) => {
        const caption = match[1].replace(/<[^>]*>/g, ' ').trim();
        
        if (caption) {
          figures.push({
            id: `fig-${index + 1}`,
            caption,
            sectionId: 'sec-1'
          });
        }
      });
    }
    
    return figures;
  } catch (error) {
    logger.error('Error extracting figures', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Extract tables from GROBID XML and sections
 * @param grobidXml GROBID XML response
 * @param sections Extracted paper sections
 * @returns Extracted tables
 */
function extractTables(grobidXml: string, sections: PaperSection[]): PaperTable[] {
  try {
    // Parse XML
    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedXml = parser.parse(grobidXml);
    
    if (!parsedXml.TEI || !parsedXml.TEI.text) {
      throw new Error('Invalid GROBID XML format: Missing TEI text');
    }
    
    const tables: PaperTable[] = [];
    
    // Function to extract table caption and content
    function extractTableDetails(tableElement: any): { caption: string, rows: string[][], label: string } {
      let caption = 'No caption available';
      let label = '';
      let rows: string[][] = [['No data available']];
      
      // Extract caption from figDesc
      if (tableElement.figDesc) {
        if (typeof tableElement.figDesc === 'string') {
          caption = tableElement.figDesc.trim();
        } else if (tableElement.figDesc['#text']) {
          caption = tableElement.figDesc['#text'].trim();
        } else if (tableElement.figDesc.p) {
          // Handle paragraph-wrapped caption
          if (Array.isArray(tableElement.figDesc.p)) {
            caption = tableElement.figDesc.p.map((p: any) => p['#text'] || String(p)).join('\n\n');
          } else {
            caption = tableElement.figDesc.p['#text'] || String(tableElement.figDesc.p);
          }
        }
      }
      
      // Extract table label from head
      if (tableElement.head) {
        if (typeof tableElement.head === 'string') {
          label = tableElement.head.trim();
        } else if (tableElement.head['#text']) {
          label = tableElement.head['#text'].trim();
        }
      }
      
      // Extract table content from table element if present
      if (tableElement.table) {
        // Reset rows to empty array
        rows = [];
        
        const tableObj = tableElement.table;
        
        // Process table rows
        if (tableObj.row) {
          const tableRows = Array.isArray(tableObj.row) ? tableObj.row : [tableObj.row];
          
          tableRows.forEach((row: any) => {
            const rowData: string[] = [];
            
            // Extract cells from this row
            if (row.cell) {
              const cells = Array.isArray(row.cell) ? row.cell : [row.cell];
              
              cells.forEach((cell: any) => {
                let cellContent = '';
                
                if (typeof cell === 'string') {
                  cellContent = cell.trim();
                } else if (cell['#text']) {
                  cellContent = cell['#text'].trim();
                } else if (cell.p) {
                  // Handle paragraph content in cells
                  if (Array.isArray(cell.p)) {
                    cellContent = cell.p.map((p: any) => p['#text'] || String(p)).join(' ');
                  } else {
                    cellContent = cell.p['#text'] || String(cell.p);
                  }
                } else {
                  // If all else fails, stringify
                  cellContent = JSON.stringify(cell);
                }
                
                rowData.push(cellContent);
              });
              
              // Only add non-empty rows
              if (rowData.length > 0 && rowData.some(cell => cell.trim() !== '')) {
                rows.push(rowData);
              }
            }
          });
        }
        
        // If no rows were extracted, set default
        if (rows.length === 0) {
          rows = [['No data extracted']];
        }
      }
      
      return { caption, rows, label };
    }
    
    // Function to recursively collect tables from the document
    function collectTables(node: any, currentSectionId: string = 'sec-1'): void {
      // If node is null or undefined, return
      if (!node) return;
      
      // Process figure elements that are actually tables (type="table")
      if (node.figure) {
        const allFigures = Array.isArray(node.figure) ? node.figure : [node.figure];
        
        // Filter for table figures
        const tableFigures = allFigures.filter((fig: any) => {
          return fig['@_type'] === 'table';
        });
        
        tableFigures.forEach((tableFig: any, index: number) => {
          try {
            const { caption, rows, label } = extractTableDetails(tableFig);
            
            // Build a more descriptive ID if possible
            let tableId = `table-${tables.length + 1}`;
            
            // If the label contains a number, use it
            const numMatch = label.match(/(?:table|tab\.?)\s*(\d+(?:\.\d+)*)/i);
            if (numMatch && numMatch[1]) {
              tableId = `table-${numMatch[1]}`;
            }
            
            tables.push({
              id: tableId,
              caption,
              rows,
              sectionId: currentSectionId,
              label: label || undefined
            });
          } catch (tableError) {
            logger.warn(`Error processing table ${index}`, { 
              error: tableError instanceof Error ? tableError.message : String(tableError)
            });
          }
        });
      }
      
      // Look for standalone table elements
      if (node.table) {
        const standaloneTables = Array.isArray(node.table) ? node.table : [node.table];
        
        standaloneTables.forEach((table: any, index: number) => {
          try {
            const rows: string[][] = [];
            
            // Process table rows
            if (table.row) {
              const tableRows = Array.isArray(table.row) ? table.row : [table.row];
              
              tableRows.forEach((row: any) => {
                const rowData: string[] = [];
                
                // Extract cells from this row
                if (row.cell) {
                  const cells = Array.isArray(row.cell) ? row.cell : [row.cell];
                  
                  cells.forEach((cell: any) => {
                    let cellContent = '';
                    
                    if (typeof cell === 'string') {
                      cellContent = cell.trim();
                    } else if (cell['#text']) {
                      cellContent = cell['#text'].trim();
                    } else if (cell.p) {
                      // Handle paragraph content in cells
                      if (Array.isArray(cell.p)) {
                        cellContent = cell.p.map((p: any) => p['#text'] || String(p)).join(' ');
                      } else {
                        cellContent = cell.p['#text'] || String(cell.p);
                      }
                    } else {
                      // If all else fails, stringify
                      cellContent = JSON.stringify(cell);
                    }
                    
                    rowData.push(cellContent);
                  });
                  
                  // Only add non-empty rows
                  if (rowData.length > 0 && rowData.some(cell => cell.trim() !== '')) {
                    rows.push(rowData);
                  }
                }
              });
            }
            
            // Only add if we found content
            if (rows.length > 0) {
              tables.push({
                id: `table-s${tables.length + 1}`,
                caption: 'Standalone table',
                rows,
                sectionId: currentSectionId
              });
            }
          } catch (tableError) {
            logger.warn(`Error processing standalone table ${index}`, { 
              error: tableError instanceof Error ? tableError.message : String(tableError)
            });
          }
        });
      }
      
      // Process div elements which might be sections
      if (node.div) {
        const divs = Array.isArray(node.div) ? node.div : [node.div];
        
        divs.forEach((div: any, divIndex: number) => {
          // Determine section ID for this div
          let sectionId = currentSectionId;
          if (currentSectionId === 'sec-1') {
            sectionId = `sec-${divIndex + 1}`;
          } else {
            sectionId = `${currentSectionId}.${divIndex + 1}`;
          }
          
          // Recursively process this div
          collectTables(div, sectionId);
        });
      }
    }
    
    // Start collecting tables from the document body
    if (parsedXml.TEI.text.body) {
      collectTables(parsedXml.TEI.text.body);
    }
    
    // If no tables were found using XML parsing, try regex as fallback
    if (tables.length === 0) {
      logger.info('Using regex fallback for table extraction');
      
      const tableMatches = [...grobidXml.matchAll(/<figure[^>]*type="table".*?<figDesc[^>]*>(.*?)<\/figDesc>.*?<\/figure>/gs)];
      
      tableMatches.forEach((match, index) => {
        const caption = match[1].replace(/<[^>]*>/g, ' ').trim();
        
        tables.push({
          id: `table-${index + 1}`,
          caption,
          rows: [['No data extracted']], // Default fallback
          sectionId: 'sec-1'
        });
      });
    }
    
    return tables;
  } catch (error) {
    logger.error('Error extracting tables', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Extract citations from GROBID XML
 * @param grobidXml GROBID XML response
 * @returns Extracted citations
 */
function extractCitations(grobidXml: string): PaperCitation[] {
  try {
    // Parse XML
    const parser = new XMLParser(XML_PARSER_OPTIONS);
    const parsedXml = parser.parse(grobidXml);
    
    if (!parsedXml.TEI) {
      throw new Error('Invalid GROBID XML format: Missing TEI root');
    }
    
    const citations: PaperCitation[] = [];
    
    // First, look for the back section which typically contains the bibliography
    if (parsedXml.TEI.text && parsedXml.TEI.text.back) {
      const back = parsedXml.TEI.text.back;
      
      // The div with type="references" or "bibliography" typically contains the citations
      if (back.div) {
        const divs = Array.isArray(back.div) ? back.div : [back.div];
        
        // Find the references div
        const refDiv = divs.find((div: any) => 
          div['@_type'] === 'references' || 
          div['@_type'] === 'bibliography' ||
          (div.head && /reference|bibliography/i.test(String(div.head)))
        );
        
        if (refDiv && refDiv.listBibl && refDiv.listBibl.biblStruct) {
          const biblStructs = Array.isArray(refDiv.listBibl.biblStruct) 
            ? refDiv.listBibl.biblStruct 
            : [refDiv.listBibl.biblStruct];
          
          biblStructs.forEach((biblStruct: any, index: number) => {
            try {
              // Extract citation elements
              let authors: string[] = [];
              let title = '';
              let year = '';
              let journal = '';
              let volume = '';
              let issue = '';
              let pages = '';
              let doi = '';
              
              // Extract authors
              if (biblStruct.analytic && biblStruct.analytic.author) {
                const authorElements = Array.isArray(biblStruct.analytic.author) 
                  ? biblStruct.analytic.author 
                  : [biblStruct.analytic.author];
                
                authors = authorElements.map((author: any) => {
                  if (author.persName) {
                    // Try to extract forename and surname
                    let forename = '';
                    if (author.persName.forename) {
                      if (Array.isArray(author.persName.forename)) {
                        forename = author.persName.forename.map(
                          (f: any) => f['#text'] || String(f)
                        ).join(' ');
                      } else {
                        forename = author.persName.forename['#text'] || String(author.persName.forename);
                      }
                    }
                    
                    let surname = '';
                    if (author.persName.surname) {
                      surname = author.persName.surname['#text'] || String(author.persName.surname);
                    }
                    
                    return `${forename} ${surname}`.trim();
                  }
                  return 'Unknown Author';
                });
              } else if (biblStruct.monogr && biblStruct.monogr.author) {
                // Handle monograph author case
                const authorElements = Array.isArray(biblStruct.monogr.author) 
                  ? biblStruct.monogr.author 
                  : [biblStruct.monogr.author];
                
                authors = authorElements.map((author: any) => {
                  if (author.persName) {
                    const forename = author.persName.forename 
                      ? (author.persName.forename['#text'] || String(author.persName.forename)) 
                      : '';
                    const surname = author.persName.surname 
                      ? (author.persName.surname['#text'] || String(author.persName.surname)) 
                      : '';
                    return `${forename} ${surname}`.trim();
                  }
                  return 'Unknown Author';
                });
              }
              
              // Extract title
              if (biblStruct.analytic && biblStruct.analytic.title) {
                title = biblStruct.analytic.title['#text'] || String(biblStruct.analytic.title);
              } else if (biblStruct.monogr && biblStruct.monogr.title) {
                title = biblStruct.monogr.title['#text'] || String(biblStruct.monogr.title);
              }
              
              // Extract year
              if (biblStruct.monogr && biblStruct.monogr.imprint && biblStruct.monogr.imprint.date) {
                const dateValue = biblStruct.monogr.imprint.date['@_when'] || 
                                 biblStruct.monogr.imprint.date['#text'] || 
                                 String(biblStruct.monogr.imprint.date);
                const yearMatch = dateValue.match(/\d{4}/);
                if (yearMatch) {
                  year = yearMatch[0];
                }
              }
              
              // Extract journal name
              if (biblStruct.monogr && biblStruct.monogr.title) {
                journal = biblStruct.monogr.title['#text'] || String(biblStruct.monogr.title);
              }
              
              // Extract volume, issue, pages
              if (biblStruct.monogr && biblStruct.monogr.imprint) {
                if (biblStruct.monogr.imprint.biblScope) {
                  const biblScopes = Array.isArray(biblStruct.monogr.imprint.biblScope) 
                    ? biblStruct.monogr.imprint.biblScope 
                    : [biblStruct.monogr.imprint.biblScope];
                  
                  biblScopes.forEach((scope: any) => {
                    const type = scope['@_unit'] || '';
                    const value = scope['#text'] || String(scope);
                    
                    if (type === 'volume') {
                      volume = value;
                    } else if (type === 'issue') {
                      issue = value;
                    } else if (type === 'page') {
                      pages = value;
                    }
                  });
                }
              }
              
              // Extract DOI
              if (biblStruct.idno) {
                const idnos = Array.isArray(biblStruct.idno) ? biblStruct.idno : [biblStruct.idno];
                const doiIdno = idnos.find((idno: any) => idno['@_type'] === 'DOI');
                if (doiIdno) {
                  doi = doiIdno['#text'] || String(doiIdno);
                }
              }
              
              // Create formatted citation text
              let citationText = '';
              
              if (authors.length > 0) {
                if (authors.length === 1) {
                  citationText += authors[0];
                } else if (authors.length === 2) {
                  citationText += `${authors[0]} and ${authors[1]}`;
                } else {
                  citationText += `${authors[0]} et al.`;
                }
                
                if (year) {
                  citationText += ` (${year})`;
                }
                citationText += '. ';
              }
              
              if (title) {
                citationText += `"${title}". `;
              }
              
              if (journal) {
                citationText += `${journal}`;
                
                if (volume) {
                  citationText += `, Vol. ${volume}`;
                }
                
                if (issue) {
                  citationText += `, No. ${issue}`;
                }
                
                if (pages) {
                  citationText += `, pp. ${pages}`;
                }
                
                citationText += '. ';
              }
              
              if (doi) {
                citationText += `DOI: ${doi}`;
              }
              
              // If we couldn't extract any meaningful text, use the title as fallback
              if (citationText.trim() === '' && title) {
                citationText = title;
              }
              
              // Create citation object
              citations.push({
                id: `cite-${index + 1}`,
                text: citationText.trim(),
                authors: authors.length > 0 ? authors : undefined,
                title: title || undefined,
                year: year ? parseInt(year) : undefined,
                journal: journal || undefined,
                doi: doi || undefined
              });
            } catch (citationError) {
              logger.warn(`Error processing citation ${index}`, { 
                error: citationError instanceof Error ? citationError.message : String(citationError)
              });
              
              // Add minimal citation in case of error
              if (biblStruct.analytic && biblStruct.analytic.title) {
                const fallbackTitle = biblStruct.analytic.title['#text'] || String(biblStruct.analytic.title);
                citations.push({
                  id: `cite-${index + 1}`,
                  text: fallbackTitle
                });
              } else {
                citations.push({
                  id: `cite-${index + 1}`,
                  text: `Citation ${index + 1} (extraction error)`
                });
              }
            }
          });
        }
      }
    }
    
    // If no citations were found, try looking directly for biblStruct elements throughout the document
    if (citations.length === 0) {
      // Convert XML to string for search
      const xmlStr = JSON.stringify(parsedXml);
      
      // Find all biblStruct objects in the document
      const biblStructMatches = [...xmlStr.matchAll(/"biblStruct"\s*:/g)];
      
      if (biblStructMatches.length > 0) {
        logger.info(`Found ${biblStructMatches.length} potential biblStruct matches using fallback method`);
        
        // Since we are working with the stringified JSON, we'll use regex as a last resort
        const citationMatches = [...grobidXml.matchAll(/<biblStruct[^>]*>.*?<title[^>]*>(.*?)<\/title>.*?<\/biblStruct>/gs)];
        
        citationMatches.forEach((match, index) => {
          const title = match[1].replace(/<[^>]*>/g, ' ').trim();
          
          if (title) {
            citations.push({
              id: `cite-${index + 1}`,
              text: title
            });
          }
        });
      }
    }
    
    return citations;
  } catch (error) {
    logger.error('Error extracting citations', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Enhance extraction with LLM for better identification of components
 * @param paperContent Initial extracted paper content
 * @returns Enhanced paper content
 */
async function enhanceExtractionWithLLM(paperContent: PaperContent): Promise<PaperContent> {
  try {
    logger.info('Enhancing extraction with LLM');
    
    // Extract sections and algorithms with LLM assistance
    const enhancedSections = await enhanceSectionsWithLLM(paperContent.sections);
    const enhancedAlgorithms = await enhanceAlgorithmsWithLLM(paperContent.algorithms, enhancedSections);
    
    // Enhance equations with LLM
    const enhancedEquations = await enhanceEquationsWithLLM(paperContent.equations);
    
    // Enhance figures and tables with better captions and relationships
    const enhancedFigures = await enhanceFiguresWithLLM(paperContent.figures);
    const enhancedTables = await enhanceTablesWithLLM(paperContent.tables);
    
    // Enhance citations with better formatting and metadata extraction
    const enhancedCitations = await enhanceCitationsWithLLM(paperContent.citations);
    
    // Return enhanced content
    return {
      ...paperContent,
      sections: enhancedSections,
      algorithms: enhancedAlgorithms,
      equations: enhancedEquations,
      figures: enhancedFigures,
      tables: enhancedTables,
      citations: enhancedCitations
    };
  } catch (error) {
    logger.error('Error enhancing extraction with LLM', { error: error instanceof Error ? error.message : String(error) });
    return paperContent;
  }
}

/**
 * Enhance sections with LLM assistance
 * @param sections Initial extracted sections
 * @returns Enhanced sections
 */
async function enhanceSectionsWithLLM(sections: PaperSection[]): Promise<PaperSection[]> {
  try {
    if (!llm.isLLMApiAvailable()) {
      return sections;
    }
    
    logger.info('Enhancing sections with LLM');
    
    // Create a prompt for the LLM
    const prompt = `
      I have extracted sections from an academic paper. Please help me organize them into a proper hierarchy.
      
      Here are the extracted sections:
      ${sections.map(s => `- ${s.title}`).join('\n')}
      
      Please determine the hierarchical structure of these sections and assign the appropriate level to each.
      Return your response as JSON in this format:
      {
        "sections": [
          {
            "id": "section-id",
            "title": "Section Title",
            "level": 1,
            "content": "Keep the original content",
            "subsections": []
          }
        ]
      }
    `;
    
    // Get response from LLM
    const response = await llm.query(prompt);
    
    // Parse the response
    try {
      // Extract JSON from the response (the response might contain markdown formatting)
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                        response.content.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1].trim();
        const result = JSON.parse(jsonString);
        
        if (result.sections && Array.isArray(result.sections)) {
          return result.sections;
        }
      }
    } catch (parseError) {
      logger.error('Error parsing LLM response', { error: parseError instanceof Error ? parseError.message : String(parseError) });
    }
    
    // If parsing fails, return the original sections
    return sections;
  } catch (error) {
    logger.error('Error enhancing sections with LLM', { error: error instanceof Error ? error.message : String(error) });
    return sections;
  }
}

/**
 * Enhance algorithms with LLM assistance
 * @param algorithms Initial extracted algorithms
 * @param sections Enhanced sections
 * @returns Enhanced algorithms
 */
async function enhanceAlgorithmsWithLLM(
  algorithms: PaperAlgorithm[],
  sections: PaperSection[]
): Promise<PaperAlgorithm[]> {
  try {
    if (!llm.isLLMApiAvailable() || algorithms.length === 0) {
      return algorithms;
    }
    
    logger.info('Enhancing algorithms with LLM');
    
    // Process each algorithm
    const enhancedAlgorithms: PaperAlgorithm[] = [];
    
    for (const algorithm of algorithms) {
      // Create a prompt for the LLM
      const prompt = `
        I have extracted an algorithm from an academic paper. Please help me identify its inputs, outputs, and complexity.
        
        Algorithm name: ${algorithm.name}
        Pseudocode/content:
        ${algorithm.pseudocode}
        
        Please analyze this algorithm and:
        1. Identify the inputs and their types
        2. Identify the outputs and their types
        3. Determine the time and space complexity
        
        Return your response as JSON in this format:
        {
          "name": "Algorithm Name",
          "description": "Brief description of what the algorithm does",
          "inputs": ["input1", "input2"],
          "outputs": ["output1", "output2"],
          "complexity": {
            "time": "Time complexity (e.g., O(n^2))",
            "space": "Space complexity (e.g., O(n))"
          }
        }
      `;
      
      // Get response from LLM
      const response = await llm.query(prompt);
      
      // Parse the response
      try {
        // Extract JSON from the response
        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                          response.content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1].trim();
          const result = JSON.parse(jsonString);
          
          // Create enhanced algorithm
          enhancedAlgorithms.push({
            ...algorithm,
            name: result.name || algorithm.name,
            description: result.description || algorithm.description,
            inputs: result.inputs || algorithm.inputs,
            outputs: result.outputs || algorithm.outputs,
            complexity: result.complexity || algorithm.complexity
          });
        } else {
          enhancedAlgorithms.push(algorithm);
        }
      } catch (parseError) {
        logger.error('Error parsing LLM response for algorithm', { 
          error: parseError instanceof Error ? parseError.message : String(parseError),
          algorithm: algorithm.name
        });
        enhancedAlgorithms.push(algorithm);
      }
    }
    
    return enhancedAlgorithms;
  } catch (error) {
    logger.error('Error enhancing algorithms with LLM', { error: error instanceof Error ? error.message : String(error) });
    return algorithms;
  }
}

/**
 * Enhance equations with LLM for better interpretation
 * @param equations Initial extracted equations
 * @returns Enhanced equations with better descriptions and LaTeX formatting
 */
async function enhanceEquationsWithLLM(equations: PaperEquation[]): Promise<PaperEquation[]> {
  try {
    if (!llm.isLLMApiAvailable() || equations.length === 0) {
      return equations;
    }
    
    logger.info('Enhancing equations with LLM');
    
    // Process each equation
    const enhancedEquations: PaperEquation[] = [];
    
    for (const equation of equations) {
      // Create a prompt for the LLM
      const prompt = `
        I have extracted an equation from an academic paper. Please help me understand and format it.
        
        Equation content:
        ${equation.content}
        
        Please analyze this equation and:
        1. Clean up and standardize the LaTeX formatting
        2. Provide a plain-text interpretation of what the equation represents
        3. Identify any variables or symbols and explain them
        4. If possible, identify what field or concept this equation relates to
        
        Return your response as JSON in this format:
        {
          "cleanLatex": "Properly formatted LaTeX equation",
          "interpretation": "Plain text explanation of what this equation means",
          "variables": {
            "variableName1": "explanation of variableName1",
            "variableName2": "explanation of variableName2"
          },
          "field": "The field this equation relates to (e.g., Machine Learning, Statistics, etc.)"
        }
      `;
      
      // Get response from LLM
      const response = await llm.query(prompt);
      
      // Parse the response
      try {
        // Extract JSON from the response
        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                          response.content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1].trim();
          const result = JSON.parse(jsonString);
          
          // Create enhanced equation
          enhancedEquations.push({
            ...equation,
            content: result.cleanLatex || equation.content,
            interpretation: result.interpretation,
            variables: result.variables,
            field: result.field
          });
        } else {
          enhancedEquations.push(equation);
        }
      } catch (parseError) {
        logger.error('Error parsing LLM response for equation', { 
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        enhancedEquations.push(equation);
      }
    }
    
    return enhancedEquations;
  } catch (error) {
    logger.error('Error enhancing equations with LLM', { error: error instanceof Error ? error.message : String(error) });
    return equations;
  }
}

/**
 * Enhance figures with LLM for better captions and relationships
 * @param figures Initial extracted figures
 * @returns Enhanced figures with improved captions and contextual information
 */
async function enhanceFiguresWithLLM(figures: PaperFigure[]): Promise<PaperFigure[]> {
  try {
    if (!llm.isLLMApiAvailable() || figures.length === 0) {
      return figures;
    }
    
    logger.info('Enhancing figures with LLM');
    
    // Process each figure
    const enhancedFigures: PaperFigure[] = [];
    
    for (const figure of figures) {
      // Create a prompt for the LLM
      const prompt = `
        I have extracted a figure from an academic paper. Please help me improve the caption and understand its context.
        
        Figure label: ${figure.label || 'No label available'}
        Caption: ${figure.caption || 'No caption available'}
        
        Please analyze this figure and:
        1. Improve the caption with more details if possible
        2. Identify what type of figure this might be (graph, diagram, flowchart, etc.)
        3. Suggest what key points this figure might be illustrating
        
        Return your response as JSON in this format:
        {
          "enhancedCaption": "Improved figure caption",
          "figureType": "Type of figure (e.g., Bar Chart, Flowchart, Diagram, etc.)",
          "keyPoints": ["Key point 1", "Key point 2"],
          "possibleReferences": ["Possible related figure or section"]
        }
      `;
      
      // Get response from LLM
      const response = await llm.query(prompt);
      
      // Parse the response
      try {
        // Extract JSON from the response
        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                          response.content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1].trim();
          const result = JSON.parse(jsonString);
          
          // Create enhanced figure
          enhancedFigures.push({
            ...figure,
            caption: result.enhancedCaption || figure.caption,
            figureType: result.figureType,
            keyPoints: result.keyPoints,
            relatedElements: result.possibleReferences
          });
        } else {
          enhancedFigures.push(figure);
        }
      } catch (parseError) {
        logger.error('Error parsing LLM response for figure', { 
          error: parseError instanceof Error ? parseError.message : String(parseError) 
        });
        enhancedFigures.push(figure);
      }
    }
    
    return enhancedFigures;
  } catch (error) {
    logger.error('Error enhancing figures with LLM', { error: error instanceof Error ? error.message : String(error) });
    return figures;
  }
}

/**
 * Enhance tables with LLM for better understanding
 * @param tables Initial extracted tables
 * @returns Enhanced tables with improved captions and data interpretation
 */
async function enhanceTablesWithLLM(tables: PaperTable[]): Promise<PaperTable[]> {
  try {
    if (!llm.isLLMApiAvailable() || tables.length === 0) {
      return tables;
    }
    
    logger.info('Enhancing tables with LLM');
    
    // Process each table
    const enhancedTables: PaperTable[] = [];
    
    for (const table of tables) {
      // Convert table rows to readable format
      const tableContent = table.rows.map(row => row.join(' | ')).join('\n');
      
      // Create a prompt for the LLM
      const prompt = `
        I have extracted a table from an academic paper. Please help me understand its content and context.
        
        Table label: ${table.label || 'No label available'}
        Caption: ${table.caption || 'No caption available'}
        
        Table content:
        ${tableContent}
        
        Please analyze this table and:
        1. Identify the column headers and their meaning
        2. Summarize what this table is showing
        3. Extract any key metrics or findings from the data
        
        Return your response as JSON in this format:
        {
          "enhancedCaption": "Improved table caption",
          "columnDescriptions": {
            "column1": "Description of what column 1 represents",
            "column2": "Description of what column 2 represents"
          },
          "tableSummary": "Brief summary of what this table shows",
          "keyFindings": ["Key finding 1", "Key finding 2"]
        }
      `;
      
      // Get response from LLM
      const response = await llm.query(prompt);
      
      // Parse the response
      try {
        // Extract JSON from the response
        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                          response.content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1].trim();
          const result = JSON.parse(jsonString);
          
          // Create enhanced table
          enhancedTables.push({
            ...table,
            caption: result.enhancedCaption || table.caption,
            columnDescriptions: result.columnDescriptions,
            summary: result.tableSummary,
            keyFindings: result.keyFindings
          });
        } else {
          enhancedTables.push(table);
        }
      } catch (parseError) {
        logger.error('Error parsing LLM response for table', { 
          error: parseError instanceof Error ? parseError.message : String(parseError) 
        });
        enhancedTables.push(table);
      }
    }
    
    return enhancedTables;
  } catch (error) {
    logger.error('Error enhancing tables with LLM', { error: error instanceof Error ? error.message : String(error) });
    return tables;
  }
}

/**
 * Enhance citations with LLM for better formatting and metadata extraction
 * @param citations Initial extracted citations
 * @returns Enhanced citations with more complete metadata
 */
async function enhanceCitationsWithLLM(citations: PaperCitation[]): Promise<PaperCitation[]> {
  try {
    if (!llm.isLLMApiAvailable() || citations.length === 0) {
      return citations;
    }
    
    logger.info('Enhancing citations with LLM');
    
    // Process citations in batches to avoid too many API calls
    const batchSize = 5;
    const enhancedCitations: PaperCitation[] = [];
    
    for (let i = 0; i < citations.length; i += batchSize) {
      const batch = citations.slice(i, i + batchSize);
      const batchPrompt = `
        I have extracted ${batch.length} citations from an academic paper. Please help me standardize and enhance them.
        
        ${batch.map((citation, index) => `
        Citation ${index + 1}:
        ${citation.text}
        `).join('\n')}
        
        For each citation, please extract the following information:
        1. Complete author names
        2. Full title
        3. Publication venue (journal or conference)
        4. Year of publication
        5. DOI if available
        6. URL if available
        7. Citation formatted in IEEE style
        
        Return your response as JSON in this format:
        {
          "citations": [
            {
              "authors": ["Author 1", "Author 2"],
              "title": "Complete paper title",
              "venue": "Journal/Conference name",
              "year": 2023,
              "doi": "DOI identifier",
              "url": "URL if available",
              "formattedCitation": "Complete citation in IEEE format"
            },
            ...
          ]
        }
      `;
      
      // Get response from LLM
      const response = await llm.query(batchPrompt);
      
      // Parse the response
      try {
        // Extract JSON from the response
        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                          response.content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1].trim();
          const result = JSON.parse(jsonString);
          
          // Process each citation in the batch
          if (result.citations && Array.isArray(result.citations)) {
            result.citations.forEach((enhancedCitation, index) => {
              if (index < batch.length) {
                const originalCitation = batch[index];
                
                enhancedCitations.push({
                  ...originalCitation,
                  authors: enhancedCitation.authors || originalCitation.authors,
                  title: enhancedCitation.title || originalCitation.title,
                  venue: enhancedCitation.venue || originalCitation.venue,
                  year: enhancedCitation.year || originalCitation.year,
                  doi: enhancedCitation.doi || originalCitation.doi,
                  url: enhancedCitation.url,
                  formattedCitation: enhancedCitation.formattedCitation
                });
              }
            });
          } else {
            // If parsing fails, add original citations
            enhancedCitations.push(...batch);
          }
        } else {
          // If JSON extraction fails, add original citations
          enhancedCitations.push(...batch);
        }
      } catch (parseError) {
        logger.error('Error parsing LLM response for citations batch', { 
          error: parseError instanceof Error ? parseError.message : String(parseError) 
        });
        // Add original citations on error
        enhancedCitations.push(...batch);
      }
    }
    
    return enhancedCitations;
  } catch (error) {
    logger.error('Error enhancing citations with LLM', { error: error instanceof Error ? error.message : String(error) });
    return citations;
  }
}