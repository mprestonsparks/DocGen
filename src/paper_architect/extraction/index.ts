/**
 * Paper extraction module
 * 
 * This module handles the extraction of structured content from academic papers
 * using GROBID for PDF processing and custom parsing for content structuring.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as logger from '../../utils/logger';
import * as llm from '../../utils/llm';
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
  // Get file name and extension
  const fileName = path.basename(paperFilePath);
  const fileExt = path.extname(paperFilePath).toLowerCase();
  
  // For PDF files, we can't extract much without GROBID
  if (fileExt === '.pdf') {
    // Create a minimal XML structure with whatever we can determine from the filename
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
    const content = fs.readFileSync(paperFilePath, 'utf8');
    
    // Create a simple XML structure
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
}

/**
 * Extract paper information from GROBID XML
 * @param grobidXml GROBID XML response
 * @returns Extracted paper information
 */
function extractPaperInfo(grobidXml: string): PaperInfo {
  try {
    // This is a simple extraction that needs to be expanded with proper XML parsing
    // For now, we'll use regex for demo purposes
    
    // Extract title
    const titleMatch = grobidXml.match(/<title[^>]*>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';
    
    // Extract authors
    const authorMatches = [...grobidXml.matchAll(/<author[^>]*>(.*?)<\/author>/g)];
    const authors = authorMatches.length > 0 
      ? authorMatches.map(match => match[1].trim())
      : ['Unknown Author'];
    
    // Extract abstract
    const abstractMatch = grobidXml.match(/<abstract>(.*?)<\/abstract>/s);
    const abstract = abstractMatch 
      ? abstractMatch[1].replace(/<[^>]*>/g, ' ').trim()
      : 'Abstract not available';
    
    // Extract year
    const yearMatch = grobidXml.match(/<date[^>]*>(.*?)<\/date>/);
    const yearString = yearMatch ? yearMatch[1].trim() : 'Unknown';
    const year = /\d{4}/.test(yearString) ? parseInt(yearString.match(/\d{4}/)![0]) : new Date().getFullYear();
    
    // Extract DOI if available
    const doiMatch = grobidXml.match(/<idno[^>]*type="DOI"[^>]*>(.*?)<\/idno>/);
    const doi = doiMatch ? doiMatch[1].trim() : undefined;
    
    return {
      title,
      authors,
      abstract,
      year,
      doi,
      keywords: [], // We'll extract these later
      venue: 'Unknown Venue' // We'll extract this later
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
    // This is a simple extraction that needs to be expanded with proper XML parsing
    // For now, we'll return a minimal structure
    
    // Extract all div elements with head elements
    const sectionMatches = [...grobidXml.matchAll(/<div[^>]*>\s*<head[^>]*>(.*?)<\/head>(.*?)(?=<div[^>]*>|<\/body>)/gs)];
    
    if (sectionMatches.length === 0) {
      return [{
        id: 'sec-1',
        level: 1,
        title: 'Main Content',
        content: grobidXml.replace(/<[^>]*>/g, ' ').trim().slice(0, 1000),
        subsections: []
      }];
    }
    
    // Convert matches to PaperSection objects
    return sectionMatches.map((match, index) => {
      const title = match[1].replace(/<[^>]*>/g, ' ').trim();
      const content = match[2].replace(/<[^>]*>/g, ' ').trim();
      
      return {
        id: `sec-${index + 1}`,
        level: 1, // Assume level 1 for all sections initially
        title,
        content,
        subsections: []
      };
    });
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
    const algorithms: PaperAlgorithm[] = [];
    
    // Look for algorithm blocks (this is simplistic and needs improvement)
    const algorithmMatches = [...grobidXml.matchAll(/<figure[^>]*>.*?<head[^>]*>(?:Algorithm|ALGORITHM)[^<]*<\/head>(.*?)<\/figure>/gs)];
    
    algorithmMatches.forEach((match, index) => {
      const algorithmContent = match[1].replace(/<[^>]*>/g, ' ').trim();
      
      // Determine which section this algorithm belongs to
      // This is a simplistic approach and needs improvement
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
    const equations: PaperEquation[] = [];
    
    // Look for equation blocks (this is simplistic and needs improvement)
    const equationMatches = [...grobidXml.matchAll(/<formula[^>]*>(.*?)<\/formula>/gs)];
    
    equationMatches.forEach((match, index) => {
      const equationContent = match[1].replace(/<[^>]*>/g, ' ').trim();
      
      // Determine which section this equation belongs to
      // This is a simplistic approach and needs improvement
      let sectionId = 'sec-1';
      
      equations.push({
        id: `eq-${index + 1}`,
        content: equationContent,
        sectionId
      });
    });
    
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
    const figures: PaperFigure[] = [];
    
    // Look for figure blocks
    const figureMatches = [...grobidXml.matchAll(/<figure[^>]*>(?:(?!<figure).)*?<figDesc[^>]*>(.*?)<\/figDesc>.*?<\/figure>/gs)];
    
    figureMatches.forEach((match, index) => {
      const caption = match[1].replace(/<[^>]*>/g, ' ').trim();
      
      // Determine which section this figure belongs to
      // This is a simplistic approach and needs improvement
      let sectionId = 'sec-1';
      
      figures.push({
        id: `fig-${index + 1}`,
        caption,
        sectionId
      });
    });
    
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
    const tables: PaperTable[] = [];
    
    // Look for table blocks
    const tableMatches = [...grobidXml.matchAll(/<figure[^>]*type="table".*?<figDesc[^>]*>(.*?)<\/figDesc>.*?<\/figure>/gs)];
    
    tableMatches.forEach((match, index) => {
      const caption = match[1].replace(/<[^>]*>/g, ' ').trim();
      
      // Determine which section this table belongs to
      // This is a simplistic approach and needs improvement
      let sectionId = 'sec-1';
      
      tables.push({
        id: `table-${index + 1}`,
        caption,
        rows: [['No data extracted']], // We'll need to improve table content extraction
        sectionId
      });
    });
    
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
    const citations: PaperCitation[] = [];
    
    // Look for bibliographical entries
    const citationMatches = [...grobidXml.matchAll(/<biblStruct[^>]*>.*?<title[^>]*>(.*?)<\/title>.*?<\/biblStruct>/gs)];
    
    citationMatches.forEach((match, index) => {
      const title = match[1].replace(/<[^>]*>/g, ' ').trim();
      
      citations.push({
        id: `cite-${index + 1}`,
        text: title
      });
    });
    
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
    
    // Return enhanced content
    return {
      ...paperContent,
      sections: enhancedSections,
      algorithms: enhancedAlgorithms
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