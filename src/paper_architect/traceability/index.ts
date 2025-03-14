/**
 * Traceability Module
 * 
 * This module handles the creation and management of traceability matrices
 * that connect paper concepts to code implementations. It enables tracking
 * of implementation completeness and verification of paper fidelity.
 */

import * as logger from '../../utils/logger';
import * as utils from '../utils';

import {
  PaperContent,
  PaperKnowledgeGraph,
  PaperTraceabilityMatrix
} from '../../types';

/**
 * Generate an initial traceability matrix from paper content and knowledge graph
 * @param paperContent Extracted paper content
 * @param knowledgeGraph Knowledge graph of the paper
 * @returns Initial traceability matrix
 */
export function generateInitialTraceabilityMatrix(
  paperContent: PaperContent,
  knowledgeGraph: PaperKnowledgeGraph
): PaperTraceabilityMatrix {
  try {
    logger.info('Generating initial traceability matrix');
    
    // Create paper elements from algorithms, equations, and concepts
    const paperElements = [
      // Add algorithms
      ...paperContent.algorithms.map(algorithm => ({
        id: algorithm.id,
        type: 'algorithm' as const,
        name: algorithm.name,
        description: algorithm.description
      })),
      
      // Add equations
      ...paperContent.equations.map(equation => ({
        id: equation.id,
        type: 'equation' as const,
        name: `Equation ${equation.id}`,
        description: equation.content
      })),
      
      // Add other concepts from knowledge graph
      ...knowledgeGraph.concepts
        .filter(concept => concept.type !== 'algorithm') // Avoid duplicates
        .map(concept => ({
          id: concept.id,
          type: concept.type === 'method' ? 'method' as const : 'concept' as const,
          name: concept.name,
          description: concept.description
        }))
    ];
    
    // Initially, there are no code elements or relationships
    return {
      paperElements,
      codeElements: [],
      relationships: []
    };
  } catch (error) {
    logger.error('Error generating initial traceability matrix', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return an empty matrix
    return {
      paperElements: [],
      codeElements: [],
      relationships: []
    };
  }
}

/**
 * Update traceability matrix with new code elements and relationships
 * @param matrix Existing traceability matrix
 * @param codeMapping New code mappings to add
 * @returns Updated traceability matrix
 */
export function updateTraceabilityMatrix(
  matrix: PaperTraceabilityMatrix,
  codeMapping: {
    paperElementId: string;
    codeElement: {
      id: string;
      type: 'class' | 'function' | 'method' | 'interface';
      name: string;
      filePath: string;
      lineNumbers?: [number, number];
    };
    type: 'implements' | 'partiallyImplements' | 'tests' | 'documents';
    confidence: number;
    notes?: string;
  }[]
): PaperTraceabilityMatrix {
  try {
    logger.info('Updating traceability matrix', { 
      newMappings: codeMapping.length 
    });
    
    // Clone the matrix to avoid modifying the original
    const updatedMatrix: PaperTraceabilityMatrix = {
      paperElements: [...matrix.paperElements],
      codeElements: [...matrix.codeElements],
      relationships: [...matrix.relationships]
    };
    
    // Process each new code mapping
    codeMapping.forEach(mapping => {
      // Check if paper element exists
      if (!updatedMatrix.paperElements.some(el => el.id === mapping.paperElementId)) {
        logger.warn(`Paper element not found: ${mapping.paperElementId}`);
        return;
      }
      
      // Check if code element already exists
      let codeElementExists = false;
      let codeElementId = mapping.codeElement.id;
      
      for (const existingElement of updatedMatrix.codeElements) {
        if (existingElement.id === codeElementId) {
          codeElementExists = true;
          break;
        }
        
        // Also check by name and path for duplicates
        if (existingElement.name === mapping.codeElement.name && 
            existingElement.filePath === mapping.codeElement.filePath) {
          codeElementId = existingElement.id;
          codeElementExists = true;
          break;
        }
      }
      
      // Add code element if it doesn't exist
      if (!codeElementExists) {
        updatedMatrix.codeElements.push({
          id: codeElementId,
          type: mapping.codeElement.type,
          name: mapping.codeElement.name,
          filePath: mapping.codeElement.filePath,
          lineNumbers: mapping.codeElement.lineNumbers
        });
      }
      
      // Check if relationship already exists
      const relationshipExists = updatedMatrix.relationships.some(rel => 
        rel.paperElementId === mapping.paperElementId && 
        rel.codeElementId === codeElementId
      );
      
      // Add or update relationship
      if (relationshipExists) {
        // Update existing relationship
        updatedMatrix.relationships = updatedMatrix.relationships.map(rel => {
          if (rel.paperElementId === mapping.paperElementId && rel.codeElementId === codeElementId) {
            return {
              paperElementId: mapping.paperElementId,
              codeElementId,
              type: mapping.type,
              confidence: mapping.confidence,
              notes: mapping.notes
            };
          }
          return rel;
        });
      } else {
        // Add new relationship
        updatedMatrix.relationships.push({
          paperElementId: mapping.paperElementId,
          codeElementId,
          type: mapping.type,
          confidence: mapping.confidence,
          notes: mapping.notes
        });
      }
    });
    
    return updatedMatrix;
  } catch (error) {
    logger.error('Error updating traceability matrix', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return the original matrix
    return matrix;
  }
}

/**
 * Generate an HTML visualization of the traceability matrix
 * @param matrix Traceability matrix to visualize
 * @returns HTML string representing the visualization
 */
export function generateVisualization(matrix: PaperTraceabilityMatrix): string {
  try {
    logger.info('Generating traceability visualization');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Traceability Matrix Visualization</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    .stats {
      display: flex;
      justify-content: space-between;
      margin: 20px 0;
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
    }
    .stat-box {
      text-align: center;
      padding: 10px;
    }
    .stat-box h3 {
      margin: 0;
      color: #2c3e50;
    }
    .stat-box p {
      margin: 5px 0 0 0;
      font-size: 24px;
      font-weight: bold;
      color: #3498db;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #3498db;
      color: white;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .confidence-high {
      background-color: #a8f0c6;
    }
    .confidence-medium {
      background-color: #f7dc6f;
    }
    .confidence-low {
      background-color: #f5b7b1;
    }
    .coverage-meter {
      margin: 20px 0;
      background-color: #ecf0f1;
      height: 30px;
      border-radius: 15px;
      overflow: hidden;
    }
    .coverage-value {
      height: 100%;
      background-color: #3498db;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #7f8c8d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>Traceability Matrix Visualization</h1>
  
  <div class="stats">
    <div class="stat-box">
      <h3>Paper Elements</h3>
      <p>${matrix.paperElements.length}</p>
    </div>
    <div class="stat-box">
      <h3>Code Elements</h3>
      <p>${matrix.codeElements.length}</p>
    </div>
    <div class="stat-box">
      <h3>Relationships</h3>
      <p>${matrix.relationships.length}</p>
    </div>
    <div class="stat-box">
      <h3>Coverage</h3>
      <p>${calculateCoverage(matrix)}%</p>
    </div>
  </div>
  
  <div class="coverage-meter">
    <div class="coverage-value" style="width: ${calculateCoverage(matrix)}%">
      ${calculateCoverage(matrix)}%
    </div>
  </div>
  
  <h2>Implementation Status</h2>
  
  <table>
    <thead>
      <tr>
        <th>Paper Element</th>
        <th>Type</th>
        <th>Status</th>
        <th>Implementation</th>
        <th>Confidence</th>
      </tr>
    </thead>
    <tbody>
      ${generateTableRows(matrix)}
    </tbody>
  </table>
  
  <h2>Implementation Details</h2>
  
  <table>
    <thead>
      <tr>
        <th>Code Element</th>
        <th>Type</th>
        <th>File Path</th>
        <th>Lines</th>
        <th>Implements</th>
      </tr>
    </thead>
    <tbody>
      ${generateCodeTableRows(matrix)}
    </tbody>
  </table>
  
  <div class="footer">
    Generated on ${new Date().toLocaleDateString()} by DocGen Paper Architect
  </div>
</body>
</html>`;
    
    return html;
  } catch (error) {
    logger.error('Error generating traceability visualization', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return a simple error HTML
    return `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body>
  <h1>Error Generating Visualization</h1>
  <p>An error occurred while generating the traceability matrix visualization.</p>
</body>
</html>`;
  }
}

/**
 * Calculate the coverage percentage for the traceability matrix
 * @param matrix Traceability matrix
 * @returns Coverage percentage
 */
function calculateCoverage(matrix: PaperTraceabilityMatrix): number {
  if (matrix.paperElements.length === 0) {
    return 0;
  }
  
  // Count paper elements that have at least one relationship
  const implementedElements = new Set(matrix.relationships.map(rel => rel.paperElementId));
  
  return Math.round((implementedElements.size / matrix.paperElements.length) * 100);
}

/**
 * Generate HTML table rows for the paper elements
 * @param matrix Traceability matrix
 * @returns HTML string for table rows
 */
function generateTableRows(matrix: PaperTraceabilityMatrix): string {
  return matrix.paperElements.map(element => {
    // Find relationships for this element
    const rels = matrix.relationships.filter(rel => rel.paperElementId === element.id);
    
    // Determine status
    let status = 'Not Implemented';
    let statusClass = '';
    
    if (rels.length > 0) {
      // Check if any relationship is an implementation
      const implementsRel = rels.find(rel => 
        rel.type === 'implements' || rel.type === 'partiallyImplements'
      );
      
      if (implementsRel) {
        status = implementsRel.type === 'implements' ? 'Implemented' : 'Partially Implemented';
        statusClass = implementsRel.type === 'implements' ? 'confidence-high' : 'confidence-medium';
      } else {
        status = 'Referenced';
        statusClass = 'confidence-low';
      }
    }
    
    // Find code elements for the relationships
    const codeElementNames = rels.map(rel => {
      const codeElement = matrix.codeElements.find(ce => ce.id === rel.codeElementId);
      return codeElement ? codeElement.name : 'Unknown';
    }).join(', ');
    
    // Calculate average confidence
    const averageConfidence = rels.length > 0 
      ? rels.reduce((sum, rel) => sum + rel.confidence, 0) / rels.length 
      : 0;
    
    let confidenceClass = '';
    if (averageConfidence >= 0.8) {
      confidenceClass = 'confidence-high';
    } else if (averageConfidence >= 0.5) {
      confidenceClass = 'confidence-medium';
    } else if (averageConfidence > 0) {
      confidenceClass = 'confidence-low';
    }
    
    return `
      <tr>
        <td>${element.name}</td>
        <td>${element.type}</td>
        <td class="${statusClass}">${status}</td>
        <td>${codeElementNames || 'None'}</td>
        <td class="${confidenceClass}">${(averageConfidence * 100).toFixed(0)}%</td>
      </tr>
    `;
  }).join('');
}

/**
 * Generate HTML table rows for the code elements
 * @param matrix Traceability matrix
 * @returns HTML string for table rows
 */
function generateCodeTableRows(matrix: PaperTraceabilityMatrix): string {
  return matrix.codeElements.map(element => {
    // Find relationships for this element
    const rels = matrix.relationships.filter(rel => rel.codeElementId === element.id);
    
    // Find paper elements for the relationships
    const paperElementNames = rels.map(rel => {
      const paperElement = matrix.paperElements.find(pe => pe.id === rel.paperElementId);
      return paperElement ? paperElement.name : 'Unknown';
    }).join(', ');
    
    // Format line numbers
    const lines = element.lineNumbers ? `${element.lineNumbers[0]}-${element.lineNumbers[1]}` : 'N/A';
    
    return `
      <tr>
        <td>${element.name}</td>
        <td>${element.type}</td>
        <td>${element.filePath || 'N/A'}</td>
        <td>${lines}</td>
        <td>${paperElementNames || 'None'}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Export the traceability matrix for external tools
 * @param matrix Traceability matrix
 * @returns JSON string
 */
export function exportTraceabilityMatrix(matrix: PaperTraceabilityMatrix): string {
  return JSON.stringify(matrix, null, 2);
}

/**
 * Calculate stats about implementation completeness
 * @param matrix Traceability matrix
 * @returns Statistics about the implementation
 */
export function calculateImplementationStats(matrix: PaperTraceabilityMatrix): {
  totalPaperElements: number;
  implementedElements: number;
  partiallyImplementedElements: number;
  referencedElements: number;
  notImplementedElements: number;
  coveragePercentage: number;
  confidenceAverage: number;
} {
  const totalPaperElements = matrix.paperElements.length;
  
  // Count elements by implementation status
  let implementedElements = 0;
  let partiallyImplementedElements = 0;
  let referencedElements = 0;
  
  // Track which elements have been counted
  const countedElements = new Set<string>();
  
  // Calculate confidences for averaging
  const confidences: number[] = [];
  
  matrix.relationships.forEach(rel => {
    confidences.push(rel.confidence);
    
    if (countedElements.has(rel.paperElementId)) {
      return;
    }
    
    if (rel.type === 'implements') {
      implementedElements++;
      countedElements.add(rel.paperElementId);
    } else if (rel.type === 'partiallyImplements' && !countedElements.has(rel.paperElementId)) {
      partiallyImplementedElements++;
      countedElements.add(rel.paperElementId);
    } else if (
      (rel.type === 'tests' || rel.type === 'documents') && 
      !countedElements.has(rel.paperElementId)
    ) {
      referencedElements++;
      countedElements.add(rel.paperElementId);
    }
  });
  
  const notImplementedElements = totalPaperElements - 
    (implementedElements + partiallyImplementedElements + referencedElements);
  
  const coveragePercentage = totalPaperElements > 0 
    ? ((implementedElements + partiallyImplementedElements) / totalPaperElements) * 100 
    : 0;
  
  const confidenceAverage = confidences.length > 0 
    ? confidences.reduce((sum, val) => sum + val, 0) / confidences.length 
    : 0;
  
  return {
    totalPaperElements,
    implementedElements,
    partiallyImplementedElements,
    referencedElements,
    notImplementedElements,
    coveragePercentage,
    confidenceAverage
  };
}