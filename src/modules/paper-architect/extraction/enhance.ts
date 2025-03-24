/**
 * LLM-based enhancement functionality
 */

import * as logger from '../../../utils/logger';
import * as llm from '../../../utils/llm';
import {
  PaperContent,
  PaperSection,
  PaperAlgorithm,
  PaperEquation,
  PaperFigure,
  PaperTable,
  PaperCitation
} from './types';

/**
 * Enhance extraction with LLM for better identification of components
 */
export async function enhanceExtractionWithLLM(paperContent: PaperContent): Promise<PaperContent> {
  try {
    logger.info('Enhancing extraction with LLM');

    const [
      enhancedSections,
      enhancedAlgorithms,
      enhancedEquations,
      enhancedFigures,
      enhancedTables,
      enhancedCitations
    ] = await Promise.all([
      enhanceSectionsWithLLM(paperContent.sections),
      enhanceAlgorithmsWithLLM(paperContent.algorithms, paperContent.sections),
      enhanceEquationsWithLLM(paperContent.equations),
      enhanceFiguresWithLLM(paperContent.figures),
      enhanceTablesWithLLM(paperContent.tables),
      enhanceCitationsWithLLM(paperContent.citations)
    ]);

    return {
      ...paperContent,
      sections: enhancedSections,
      algorithms: enhancedAlgorithms,
      equations: enhancedEquations,
      figures: enhancedFigures,
      tables: enhancedTables,
      citations: enhancedCitations
    };
  } catch (error: unknown) {
    logger.error('Failed to enhance extraction with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return paperContent;
  }
}

/**
 * Enhance sections with LLM assistance
 */
export async function enhanceSectionsWithLLM(sections: PaperSection[]): Promise<PaperSection[]> {
  try {
    const enhancedSections = await Promise.all(
      sections.map(async section => {
        const prompt = `Enhance the following paper section:
Title: ${section.title}
Content: ${section.content}

Please provide:
1. A more descriptive title if needed
2. Improved content organization
3. Key concepts and findings`;

        const response = await llm.callLLM(prompt);
        const enhanced = JSON.parse(response.toString());

        return {
          ...section,
          title: enhanced.title || section.title,
          content: enhanced.content || section.content
        };
      })
    );

    return enhancedSections;
  } catch (error: unknown) {
    logger.error('Failed to enhance sections with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return sections;
  }
}

/**
 * Enhance algorithms with LLM assistance
 */
export async function enhanceAlgorithmsWithLLM(
  algorithms: PaperAlgorithm[],
  sections: PaperSection[]
): Promise<PaperAlgorithm[]> {
  try {
    const enhancedAlgorithms = await Promise.all(
      algorithms.map(async algorithm => {
        const section = sections.find(s => s.id === algorithm.sectionId);
        const prompt = `Enhance the following algorithm:
Name: ${algorithm.name}
Description: ${algorithm.description}
Code: ${algorithm.pseudocode || 'N/A'}
Context: ${section?.content || 'N/A'}

Please provide:
1. Improved algorithm name if needed
2. More detailed description
3. Complexity analysis if possible
4. Improved pseudocode if available`;

        const response = await llm.callLLM(prompt);
        const enhanced = JSON.parse(response.toString());

        return {
          ...algorithm,
          name: enhanced.name || algorithm.name,
          description: enhanced.description || algorithm.description,
          pseudocode: enhanced.pseudocode || algorithm.pseudocode,
          complexity: enhanced.complexity || algorithm.complexity
        };
      })
    );

    return enhancedAlgorithms;
  } catch (error: unknown) {
    logger.error('Failed to enhance algorithms with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return algorithms;
  }
}

/**
 * Enhance equations with LLM for better interpretation
 */
export async function enhanceEquationsWithLLM(equations: PaperEquation[]): Promise<PaperEquation[]> {
  try {
    const enhancedEquations = await Promise.all(
      equations.map(async equation => {
        const prompt = `Enhance the following equation:
Formula: ${equation.formula}
Description: ${equation.description}

Please provide:
1. Improved LaTeX formatting if needed
2. More detailed description
3. Variable explanations
4. Context and significance`;

        const response = await llm.callLLM(prompt);
        const enhanced = JSON.parse(response.toString());

        return {
          ...equation,
          formula: enhanced.formula || equation.formula,
          description: enhanced.description || equation.description,
          latex: enhanced.latex || equation.latex
        };
      })
    );

    return enhancedEquations;
  } catch (error: unknown) {
    logger.error('Failed to enhance equations with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return equations;
  }
}

/**
 * Enhance figures with LLM for better captions and relationships
 */
export async function enhanceFiguresWithLLM(figures: PaperFigure[]): Promise<PaperFigure[]> {
  try {
    const enhancedFigures = await Promise.all(
      figures.map(async figure => {
        const prompt = `Enhance the following figure caption:
Caption: ${figure.caption}
Description: ${figure.description}

Please provide:
1. More descriptive caption
2. Detailed description of what the figure shows
3. Key insights and relationships
4. Connection to paper's findings`;

        const response = await llm.callLLM(prompt);
        const enhanced = JSON.parse(response.toString());

        return {
          ...figure,
          caption: enhanced.caption || figure.caption,
          description: enhanced.description || figure.description
        };
      })
    );

    return enhancedFigures;
  } catch (error: unknown) {
    logger.error('Failed to enhance figures with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return figures;
  }
}

/**
 * Enhance tables with LLM for better understanding
 */
export async function enhanceTablesWithLLM(tables: PaperTable[]): Promise<PaperTable[]> {
  try {
    const enhancedTables = await Promise.all(
      tables.map(async table => {
        const prompt = `Enhance the following table:
Caption: ${table.caption}
Description: ${table.description}
Data: ${JSON.stringify(table.data)}

Please provide:
1. More descriptive caption
2. Detailed description of the data
3. Key trends and patterns
4. Significance of findings`;

        const response = await llm.callLLM(prompt);
        const enhanced = JSON.parse(response.toString());

        return {
          ...table,
          caption: enhanced.caption || table.caption,
          description: enhanced.description || table.description,
          data: enhanced.data || table.data
        };
      })
    );

    return enhancedTables;
  } catch (error: unknown) {
    logger.error('Failed to enhance tables with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return tables;
  }
}

/**
 * Enhance citations with LLM for better formatting and metadata extraction
 */
export async function enhanceCitationsWithLLM(citations: PaperCitation[]): Promise<PaperCitation[]> {
  try {
    const enhancedCitations = await Promise.all(
      citations.map(async citation => {
        const prompt = `Enhance the following citation:
Title: ${citation.title}
Authors: ${citation.authors.join(', ')}
Year: ${citation.year}
Journal: ${citation.journal || 'N/A'}
DOI: ${citation.doi || 'N/A'}

Please provide:
1. Standardized formatting
2. Complete metadata if possible
3. Additional identifiers (DOI, URL)
4. Journal details if available`;

        const response = await llm.callLLM(prompt);
        const enhanced = JSON.parse(response.toString());

        return {
          ...citation,
          title: enhanced.title || citation.title,
          authors: enhanced.authors || citation.authors,
          year: enhanced.year || citation.year,
          journal: enhanced.journal || citation.journal,
          doi: enhanced.doi || citation.doi,
          url: enhanced.url || citation.url
        };
      })
    );

    return enhancedCitations;
  } catch (error: unknown) {
    logger.error('Failed to enhance citations with LLM', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return citations;
  }
}
