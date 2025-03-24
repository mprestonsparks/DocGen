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
import * as logger from '../../../utils/logger';
import * as llm from '../../../utils/llm';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
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

// Re-export types
export * from './types';

// Export core functionality
export {
  extractPaperContent,
  processWithGrobid,
  fallbackExtraction,
  extractTextFromPDF,
  extractStructureFromMarkdown,
  extractStructureFromLaTeX
} from './core';

// Export enhancement functionality
export {
  enhanceExtractionWithLLM,
  enhanceSectionsWithLLM,
  enhanceAlgorithmsWithLLM,
  enhanceEquationsWithLLM,
  enhanceFiguresWithLLM,
  enhanceTablesWithLLM,
  enhanceCitationsWithLLM
} from './enhance';
