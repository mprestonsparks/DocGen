/**
 * Test fixture loader utility for extraction tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load a test fixture file from the fixtures directory
 * 
 * @param filename The name of the fixture file to load
 * @returns The contents of the fixture file as a string
 */
export function loadFixture(filename: string): string {
  const fixturePath = path.join(__dirname, filename);
  return fs.readFileSync(fixturePath, 'utf8');
}

/**
 * Load a sample TEI XML fixture
 * 
 * @returns The contents of the sample TEI XML fixture
 */
export function loadSampleTeiXml(): string {
  return loadFixture('sample-tei.xml');
}

/**
 * Generate a paper content object based on the sample TEI XML
 * This is useful for tests that need a fully-populated paper content object
 */
export function getSamplePaperContent() {
  return {
    paperInfo: {
      title: 'Advanced Machine Learning Approaches for Document Understanding',
      authors: ['Jane Smith', 'Robert Johnson'],
      abstract: 'This paper presents advanced machine learning approaches for document understanding, focusing on the extraction and analysis of structured information from scientific papers.',
      year: 2022,
      doi: '10.1234/jair.2022.14.221',
      venue: 'Journal of AI Research'
    },
    sections: [
      { 
        id: 'sec1', 
        title: '1. Introduction', 
        content: 'Document understanding represents a critical challenge in artificial intelligence research...', 
        level: 1,
        subsections: []
      },
      {
        id: 'sec2',
        title: '2. Related Work',
        content: 'Previous research in document understanding can be categorized into several approaches...',
        level: 1,
        subsections: []
      },
      {
        id: 'sec3',
        title: '3. Methodology',
        content: 'Our approach integrates multiple specialized components into a unified framework:',
        level: 1,
        subsections: [
          {
            id: 'sec3.1',
            title: '3.1 Document Structure Analysis',
            content: 'We employ a hierarchical attention network to identify the logical structure of documents...',
            level: 2,
            subsections: []
          },
          {
            id: 'sec3.2',
            title: '3.2 Multi-modal Feature Extraction',
            content: 'Our feature extraction module processes different document elements with specialized components:',
            level: 2,
            subsections: []
          }
        ]
      },
      {
        id: 'sec4',
        title: '4. Results',
        content: 'We evaluated our framework on three benchmark datasets:',
        level: 1,
        subsections: []
      },
      {
        id: 'sec5',
        title: '5. Conclusion',
        content: 'Our research demonstrates the effectiveness of a multi-modal approach to document understanding...',
        level: 1,
        subsections: []
      }
    ],
    algorithms: [
      {
        id: 'algo1',
        title: 'Algorithm 1: Multi-modal Feature Extraction',
        code: 'function ExtractFeatures(document):\n    features = {}\n    features[\'text\'] = TextEncoder(document.text)\n    features[\'figures\'] = VisualEncoder(document.figures)\n    features[\'tables\'] = TableEncoder(document.tables)\n    features[\'equations\'] = EquationEncoder(document.equations)\n    return features',
        sectionId: 'sec3.2'
      }
    ],
    equations: [
      {
        id: 'eq1',
        content: 'H(d) = Attention(BiLSTM(E(d)))',
        sectionId: 'sec3.1'
      }
    ],
    figures: [
      {
        id: 'fig1',
        title: 'Figure 1: Performance by Element Type',
        caption: 'Bar chart showing F1-scores for different document elements.',
        path: 'images/performance_chart.png',
        sectionId: 'sec4'
      }
    ],
    tables: [
      {
        id: 'tab1',
        title: 'Table 1: Performance Comparison',
        caption: 'Comparison of F1-scores between our approach and baseline methods.',
        rows: [
          ['Method', 'PubLayNet', 'S2-ORC', 'DocBank'],
          ['Baseline 1', '0.76', '0.72', '0.68'],
          ['Baseline 2', '0.79', '0.75', '0.71'],
          ['Our Approach', '0.87', '0.84', '0.82']
        ],
        sectionId: 'sec4'
      }
    ],
    citations: [
      {
        id: 'cit1',
        title: 'Deep Learning Approaches to Document Analysis',
        authors: ['Michael Chen', 'Sarah Wilson'],
        year: 2020,
        venue: 'Computational Linguistics'
      },
      {
        id: 'cit2',
        title: 'Visual Layout Analysis for Scientific Documents',
        authors: ['David Brown'],
        year: 2021,
        venue: 'Proceedings of the Conference on Document Analysis'
      },
      {
        id: 'cit3',
        title: 'Neural Models for Scientific Text Processing',
        authors: ['Emily Zhang'],
        year: 2021,
        venue: 'AI Review',
        doi: '10.5678/ai.2021.35.4'
      }
    ]
  };
}