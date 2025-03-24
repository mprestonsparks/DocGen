/**
 * Type definitions for paper extraction functionality
 */

/**
 * Options for GROBID extraction
 */
export interface GrobidExtractionOptions {
  /** GROBID endpoint URL */
  endpointUrl?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Whether to enhance extraction with LLM */
  enhanceWithLLM?: boolean;
}

/**
 * Extracted paper content
 */
export interface PaperContent {
  /** Basic paper information */
  info: PaperInfo;
  /** Paper sections */
  sections: PaperSection[];
  /** Algorithms found in the paper */
  algorithms: PaperAlgorithm[];
  /** Equations found in the paper */
  equations: PaperEquation[];
  /** Figures found in the paper */
  figures: PaperFigure[];
  /** Tables found in the paper */
  tables: PaperTable[];
  /** Citations in the paper */
  citations: PaperCitation[];
}

/**
 * Basic paper information
 */
export interface PaperInfo {
  /** Paper title */
  title: string;
  /** Paper authors */
  authors: string[];
  /** Publication year */
  year: number;
  /** Abstract text */
  abstract: string;
  /** Keywords */
  keywords: string[];
  /** DOI if available */
  doi?: string;
  /** Journal or conference */
  venue?: string;
  /** Volume number */
  volume?: string;
  /** Issue number */
  issue?: string;
  /** Page range */
  pages?: string;
  /** Publisher */
  publisher?: string;
}

/**
 * Paper section
 */
export interface PaperSection {
  /** Section ID */
  id: string;
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Parent section ID if nested */
  parentId?: string;
  /** Section level (1 for top-level) */
  level: number;
  /** Section type (e.g., introduction, methods) */
  type?: string;
}

/**
 * Algorithm found in paper
 */
export interface PaperAlgorithm {
  /** Algorithm ID */
  id: string;
  /** Algorithm name */
  name: string;
  /** Algorithm description */
  description: string;
  /** Section ID where algorithm appears */
  sectionId: string;
  /** Pseudocode if available */
  pseudocode?: string;
  /** Complexity analysis */
  complexity?: {
    time?: string;
    space?: string;
  };
  /** Implementation details */
  implementation?: {
    language?: string;
    code?: string;
  };
}

/**
 * Equation found in paper
 */
export interface PaperEquation {
  /** Equation ID */
  id: string;
  /** Original formula text */
  formula: string;
  /** Equation description */
  description: string;
  /** Section ID where equation appears */
  sectionId: string;
  /** LaTeX representation */
  latex?: string;
  /** Variables used in equation */
  variables?: Array<{
    symbol: string;
    description: string;
    unit?: string;
  }>;
}

/**
 * Figure found in paper
 */
export interface PaperFigure {
  /** Figure ID */
  id: string;
  /** Figure caption */
  caption: string;
  /** Figure description */
  description: string;
  /** Section ID where figure appears */
  sectionId: string;
  /** Path to figure image file */
  imagePath?: string;
  /** Figure type (e.g., graph, diagram) */
  type?: string;
  /** Related figures */
  relatedFigures?: string[];
}

/**
 * Table found in paper
 */
export interface PaperTable {
  /** Table ID */
  id: string;
  /** Table caption */
  caption: string;
  /** Table description */
  description: string;
  /** Section ID where table appears */
  sectionId: string;
  /** Table data */
  data: {
    headers: string[];
    rows: Array<Record<string, string | number>>;
  };
  /** Table notes */
  notes?: string[];
}

/**
 * Citation in paper
 */
export interface PaperCitation {
  /** Citation ID */
  id: string;
  /** Paper title */
  title: string;
  /** Authors */
  authors: string[];
  /** Publication year */
  year: number;
  /** Journal or conference */
  journal?: string;
  /** DOI if available */
  doi?: string;
  /** URL if available */
  url?: string;
  /** Citation context */
  context?: string;
  /** Citation count */
  citationCount?: number;
}
