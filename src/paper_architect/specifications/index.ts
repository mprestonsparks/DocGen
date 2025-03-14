/**
 * Executable Specifications Module
 * 
 * This module creates executable specifications from the knowledge model,
 * allowing verification of implementation correctness through execution.
 * Specifications include test fixtures and verification steps.
 */

import * as logger from '../../utils/logger';
import * as llm from '../../utils/llm';
import * as utils from '../utils';

import {
  PaperContent,
  PaperKnowledgeGraph,
  PaperAlgorithm,
  ExecutableSpecification
} from '../../types';

/**
 * Generate executable specifications from paper content and knowledge model
 * @param paperContent Extracted paper content
 * @param knowledgeGraph Knowledge graph of the paper
 * @param implementationLanguage Target implementation language
 * @returns Array of executable specifications
 */
export async function generateExecutableSpecifications(
  paperContent: PaperContent,
  knowledgeGraph: PaperKnowledgeGraph,
  implementationLanguage: string = 'python'
): Promise<ExecutableSpecification[]> {
  try {
    logger.info('Generating executable specifications', { implementationLanguage });
    
    const specifications: ExecutableSpecification[] = [];
    
    // Generate specifications for algorithms
    const algorithmSpecifications = await generateAlgorithmSpecifications(
      paperContent.algorithms,
      knowledgeGraph,
      implementationLanguage
    );
    specifications.push(...algorithmSpecifications);
    
    // If LLM is available, generate additional specifications for complex concepts
    if (llm.isLLMApiAvailable()) {
      const complexConcepts = knowledgeGraph.concepts.filter(c => 
        c.type === 'method' || c.type === 'dataStructure'
      );
      
      if (complexConcepts.length > 0) {
        const additionalSpecifications = await generateConceptSpecifications(
          complexConcepts,
          knowledgeGraph,
          paperContent,
          implementationLanguage
        );
        specifications.push(...additionalSpecifications);
      }
    }
    
    return specifications;
  } catch (error) {
    logger.error('Error generating executable specifications', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return [];
  }
}

/**
 * Generate executable specifications for algorithms
 * @param algorithms Paper algorithms
 * @param knowledgeGraph Knowledge graph of the paper
 * @param implementationLanguage Target implementation language
 * @returns Array of executable specifications for algorithms
 */
async function generateAlgorithmSpecifications(
  algorithms: PaperAlgorithm[],
  knowledgeGraph: PaperKnowledgeGraph,
  implementationLanguage: string
): Promise<ExecutableSpecification[]> {
  const specifications: ExecutableSpecification[] = [];
  
  for (const algorithm of algorithms) {
    try {
      logger.info(`Generating specification for algorithm: ${algorithm.name}`);
      
      // Find concept corresponding to this algorithm
      const algorithmConcept = knowledgeGraph.concepts.find(c => 
        c.sourceElements.includes(algorithm.id)
      );
      
      const conceptIds = algorithmConcept ? [algorithmConcept.id] : [];
      
      // If LLM is available, generate a detailed specification
      if (llm.isLLMApiAvailable()) {
        const spec = await generateSpecificationWithLLM(
          algorithm,
          knowledgeGraph,
          implementationLanguage
        );
        
        if (spec) {
          specifications.push({
            ...spec,
            sourceConceptIds: conceptIds
          });
          continue;
        }
      }
      
      // Fallback: Generate a basic specification
      const inputs = algorithm.inputs.map((input, index) => ({
        name: input || `input${index + 1}`,
        type: 'any',
        description: `Input parameter ${index + 1}`,
        exampleValue: 'example_value'
      }));
      
      const outputs = algorithm.outputs.map((output, index) => ({
        name: output || `output${index + 1}`,
        type: 'any',
        description: `Output parameter ${index + 1}`,
        exampleValue: 'example_value'
      }));
      
      // Split pseudocode into steps
      const pseudocodeLines = algorithm.pseudocode.split('\n')
        .filter(line => line.trim().length > 0);
      
      const steps = pseudocodeLines.map((line, index) => ({
        id: `step-${index + 1}`,
        description: line.trim(),
        code: generatePlaceholderCode(line.trim(), implementationLanguage)
      }));
      
      // Add a basic verification fixture
      const verificationFixtures = [
        {
          id: `fixture-${algorithm.id}-1`,
          input: { },
          expectedOutput: null,
          description: 'Basic verification fixture'
        }
      ];
      
      specifications.push({
        id: utils.generateUniqueId('spec', algorithm.name),
        title: algorithm.name,
        description: algorithm.description,
        inputs,
        outputs,
        steps,
        sourceConceptIds: conceptIds,
        verificationFixtures
      });
    } catch (error) {
      logger.error(`Error generating specification for algorithm: ${algorithm.name}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return specifications;
}

/**
 * Generate executable specifications for complex concepts
 * @param concepts Complex concepts from the knowledge graph
 * @param knowledgeGraph Knowledge graph of the paper
 * @param paperContent Extracted paper content
 * @param implementationLanguage Target implementation language
 * @returns Array of executable specifications for concepts
 */
async function generateConceptSpecifications(
  concepts: any[],
  knowledgeGraph: PaperKnowledgeGraph,
  paperContent: PaperContent,
  implementationLanguage: string
): Promise<ExecutableSpecification[]> {
  if (!llm.isLLMApiAvailable()) {
    return [];
  }
  
  const specifications: ExecutableSpecification[] = [];
  
  // Generate specifications for selected concepts
  for (const concept of concepts) {
    try {
      logger.info(`Generating specification for concept: ${concept.name}`);
      
      // Find all relationships where this concept is the source
      const relationships = knowledgeGraph.relationships.filter(r => r.sourceId === concept.id);
      
      // Find related concepts
      const relatedConceptIds = relationships.map(r => r.targetId);
      const relatedConcepts = knowledgeGraph.concepts.filter(c => 
        relatedConceptIds.includes(c.id)
      );
      
      // Generate prompt for LLM
      const conceptText = getConceptDetails(concept, relatedConcepts, paperContent);
      
      const prompt = `
        I need to create an executable specification for the following concept from an academic paper:
        
        Concept: ${concept.name}
        Type: ${concept.type}
        Description: ${concept.description}
        
        Additional information:
        ${conceptText}
        
        Please create an executable specification in ${implementationLanguage} with:
        1. Clear inputs and outputs with types and example values
        2. Implementation steps
        3. Verification fixtures to test correctness
        
        Return your answer as JSON in this format:
        {
          "title": "Specification title",
          "description": "Detailed description",
          "inputs": [
            {
              "name": "input_name",
              "type": "input_type",
              "description": "input description",
              "exampleValue": "example"
            }
          ],
          "outputs": [
            {
              "name": "output_name",
              "type": "output_type",
              "description": "output description",
              "exampleValue": "example"
            }
          ],
          "steps": [
            {
              "id": "step-1",
              "description": "Step description",
              "code": "Code for this step in ${implementationLanguage}",
              "expectedResult": "Expected result of this step"
            }
          ],
          "verificationFixtures": [
            {
              "id": "fixture-1",
              "input": {
                "input_name": "test value"
              },
              "expectedOutput": "expected output value",
              "description": "Test fixture description"
            }
          ]
        }
      `;
      
      // Get response from LLM
      const response = await llm.query(prompt);
      
      // Parse specification from response
      try {
        // Extract JSON from the response
        const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                          response.content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch) {
          const jsonString = jsonMatch[1].trim();
          const result = JSON.parse(jsonString);
          
          specifications.push({
            id: utils.generateUniqueId('spec', concept.name),
            title: result.title || concept.name,
            description: result.description || concept.description,
            inputs: result.inputs || [],
            outputs: result.outputs || [],
            steps: result.steps || [],
            sourceConceptIds: [concept.id],
            verificationFixtures: result.verificationFixtures || []
          });
        }
      } catch (parseError) {
        logger.error(`Error parsing LLM response for concept: ${concept.name}`, { 
          error: parseError instanceof Error ? parseError.message : String(parseError) 
        });
      }
    } catch (error) {
      logger.error(`Error generating specification for concept: ${concept.name}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  return specifications;
}

/**
 * Generate an executable specification for an algorithm using LLM
 * @param algorithm Paper algorithm
 * @param knowledgeGraph Knowledge graph of the paper
 * @param implementationLanguage Target implementation language
 * @returns Executable specification
 */
async function generateSpecificationWithLLM(
  algorithm: PaperAlgorithm,
  knowledgeGraph: PaperKnowledgeGraph,
  implementationLanguage: string
): Promise<ExecutableSpecification | null> {
  try {
    logger.info(`Generating specification with LLM for algorithm: ${algorithm.name}`);
    
    // Create prompt for LLM
    const prompt = `
      I need to create an executable specification for the following algorithm from an academic paper:
      
      Algorithm name: ${algorithm.name}
      Description: ${algorithm.description}
      Pseudocode:
      ${algorithm.pseudocode}
      
      Inputs: ${algorithm.inputs.join(', ') || 'Not specified'}
      Outputs: ${algorithm.outputs.join(', ') || 'Not specified'}
      Complexity: Time - ${algorithm.complexity?.time || 'Unknown'}, Space - ${algorithm.complexity?.space || 'Unknown'}
      
      Please create an executable specification in ${implementationLanguage} with:
      1. Clear inputs and outputs with types and example values
      2. Step-by-step implementation instructions
      3. Code examples for each step
      4. Verification fixtures to test correctness
      
      Return your answer as JSON in this format:
      {
        "title": "Specification title",
        "description": "Detailed description",
        "inputs": [
          {
            "name": "input_name",
            "type": "input_type",
            "description": "input description",
            "exampleValue": "example"
          }
        ],
        "outputs": [
          {
            "name": "output_name",
            "type": "output_type",
            "description": "output description",
            "exampleValue": "example"
          }
        ],
        "steps": [
          {
            "id": "step-1",
            "description": "Step description",
            "code": "Code for this step in ${implementationLanguage}",
            "expectedResult": "Expected result of this step"
          }
        ],
        "verificationFixtures": [
          {
            "id": "fixture-1",
            "input": {
              "input_name": "test value"
            },
            "expectedOutput": "expected output value",
            "description": "Test fixture description"
          }
        ]
      }
    `;
    
    // Get response from LLM
    const response = await llm.query(prompt);
    
    // Parse specification from response
    try {
      // Extract JSON from the response
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.content.match(/```\s*([\s\S]*?)\s*```/) ||
                        response.content.match(/(\{[\s\S]*\})/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1].trim();
        const result = JSON.parse(jsonString);
        
        return {
          id: utils.generateUniqueId('spec', algorithm.name),
          title: result.title || algorithm.name,
          description: result.description || algorithm.description,
          inputs: result.inputs || [],
          outputs: result.outputs || [],
          steps: result.steps || [],
          sourceConceptIds: [],
          verificationFixtures: result.verificationFixtures || []
        };
      }
    } catch (parseError) {
      logger.error(`Error parsing LLM response for algorithm: ${algorithm.name}`, { 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
    }
    
    return null;
  } catch (error) {
    logger.error(`Error generating specification with LLM for algorithm: ${algorithm.name}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return null;
  }
}

/**
 * Get concept details by searching paper content
 * @param concept Concept to search for
 * @param relatedConcepts Related concepts
 * @param paperContent Paper content
 * @returns Text with concept details
 */
function getConceptDetails(concept: any, relatedConcepts: any[], paperContent: PaperContent): string {
  // Find sections mentioning this concept
  const relevantSections = paperContent.sections.filter(section => 
    section.content.includes(concept.name)
  );
  
  let conceptText = '';
  
  if (relevantSections.length > 0) {
    // Get content from sections mentioning the concept
    conceptText += "Information from the paper:\n";
    relevantSections.forEach(section => {
      // Extract sentences mentioning the concept
      const sentences = section.content.split(/[.!?]/)
        .filter(sentence => sentence.includes(concept.name))
        .map(sentence => sentence.trim());
      
      if (sentences.length > 0) {
        conceptText += `From section "${section.title}":\n`;
        conceptText += sentences.join('. ') + '.\n\n';
      }
    });
  }
  
  if (relatedConcepts.length > 0) {
    conceptText += "Related concepts:\n";
    relatedConcepts.forEach(relatedConcept => {
      conceptText += `- ${relatedConcept.name}: ${relatedConcept.description}\n`;
    });
  }
  
  return conceptText;
}

/**
 * Generate placeholder code for a step based on description
 * @param description Step description
 * @param language Target implementation language
 * @returns Placeholder code
 */
function generatePlaceholderCode(description: string, language: string): string {
  // Remove leading numbers or bullets
  const cleanDescription = description.replace(/^[0-9]+[.)]\s*|^[-*•]\s*/, '');
  
  // Replace spaces with underscores for variable names
  const variableName = cleanDescription.toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 20);
  
  switch (language.toLowerCase()) {
    case 'python':
      return `# ${cleanDescription}\ndef ${variableName}(input_data):\n    # TODO: Implement this step\n    return input_data`;
    
    case 'javascript':
    case 'typescript':
      return `// ${cleanDescription}\nfunction ${variableName}(inputData) {\n    // TODO: Implement this step\n    return inputData;\n}`;
    
    case 'java':
      return `// ${cleanDescription}\npublic Object ${variableName}(Object inputData) {\n    // TODO: Implement this step\n    return inputData;\n}`;
    
    case 'c++':
      return `// ${cleanDescription}\ntemplate<typename T>\nT ${variableName}(T inputData) {\n    // TODO: Implement this step\n    return inputData;\n}`;
    
    default:
      return `# ${cleanDescription}\n# TODO: Implement this step in ${language}`;
  }
}

/**
 * Format an executable specification as markdown
 * @param spec Executable specification
 * @returns Markdown string
 */
export function formatExecutableSpecification(spec: ExecutableSpecification): string {
  try {
    logger.info(`Formatting specification: ${spec.title}`);
    
    let markdown = `---
title: "${spec.title}"
id: "${spec.id}"
type: "executable_specification"
status: "DRAFT"
---

# ${spec.title}

## Description

${spec.description}

## Inputs

| Name | Type | Description | Example |
|------|------|-------------|---------|
`;
    
    // Add inputs table
    spec.inputs.forEach(input => {
      markdown += `| \`${input.name}\` | \`${input.type}\` | ${input.description} | \`${input.exampleValue}\` |\n`;
    });
    
    markdown += `\n## Outputs

| Name | Type | Description | Example |
|------|------|-------------|---------|
`;
    
    // Add outputs table
    spec.outputs.forEach(output => {
      markdown += `| \`${output.name}\` | \`${output.type}\` | ${output.description} | \`${output.exampleValue}\` |\n`;
    });
    
    markdown += `\n## Implementation Steps

`;
    
    // Add implementation steps
    spec.steps.forEach(step => {
      markdown += `### ${step.description}\n\n`;
      
      if (step.code) {
        markdown += `\`\`\`${step.language || ''}\n${step.code}\n\`\`\`\n\n`;
      }
      
      if (step.expectedResult) {
        markdown += `Expected result: ${step.expectedResult}\n\n`;
      }
    });
    
    markdown += `## Verification Fixtures

`;
    
    // Add verification fixtures
    spec.verificationFixtures.forEach(fixture => {
      markdown += `### ${fixture.description}\n\n`;
      markdown += `**Fixture ID:** \`${fixture.id}\`\n\n`;
      markdown += `**Input:**\n\`\`\`json\n${JSON.stringify(fixture.input, null, 2)}\n\`\`\`\n\n`;
      markdown += `**Expected Output:**\n\`\`\`json\n${JSON.stringify(fixture.expectedOutput, null, 2)}\n\`\`\`\n\n`;
    });
    
    markdown += `## Source Concepts

${spec.sourceConceptIds.map(id => `- \`${id}\``).join('\n')}
`;
    
    return markdown;
  } catch (error) {
    logger.error(`Error formatting specification: ${spec.title}`, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return `# Error formatting specification: ${spec.title}`;
  }
}

/**
 * Parse an executable specification from markdown
 * @param markdown Markdown string
 * @returns Executable specification
 */
export function parseExecutableSpecification(markdown: string): ExecutableSpecification {
  try {
    logger.info('Parsing executable specification from markdown');
    
    // Extract frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';
    
    // Extract title and id
    const titleMatch = frontmatter.match(/title: "([^"]*)"/);
    const idMatch = frontmatter.match(/id: "([^"]*)"/);
    
    const title = titleMatch ? titleMatch[1] : 'Unknown Specification';
    const id = idMatch ? idMatch[1] : utils.generateUniqueId('spec', title);
    
    // Extract description
    const descriptionMatch = markdown.match(/## Description\s*\n\n([\s\S]*?)\n\n## /);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    // Extract inputs
    const inputsMatch = markdown.match(/## Inputs\s*\n\n\|[^\n]*\|\n\|[^\n]*\|\n([\s\S]*?)\n\n## /);
    const inputsTable = inputsMatch ? inputsMatch[1] : '';
    const inputs = inputsTable.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const [, name, type, description, exampleValue] = line.match(/\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|\s*(.*?)\s*\|\s*`([^`]*)`\s*\|/) || [];
        return { name, type, description, exampleValue };
      })
      .filter(input => input.name);
    
    // Extract outputs
    const outputsMatch = markdown.match(/## Outputs\s*\n\n\|[^\n]*\|\n\|[^\n]*\|\n([\s\S]*?)\n\n## /);
    const outputsTable = outputsMatch ? outputsMatch[1] : '';
    const outputs = outputsTable.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const [, name, type, description, exampleValue] = line.match(/\|\s*`([^`]*)`\s*\|\s*`([^`]*)`\s*\|\s*(.*?)\s*\|\s*`([^`]*)`\s*\|/) || [];
        return { name, type, description, exampleValue };
      })
      .filter(output => output.name);
    
    // Extract steps
    const stepsMatch = markdown.match(/## Implementation Steps\s*\n\n([\s\S]*?)\n\n## /);
    const stepsText = stepsMatch ? stepsMatch[1] : '';
    const stepMatches = [...stepsText.matchAll(/### (.*?)\s*\n\n```[^\n]*\n([\s\S]*?)\n```\s*\n\n(?:Expected result: (.*?)\n\n)?/g)];
    
    const steps = stepMatches.map((match, index) => {
      const description = match[1];
      const code = match[2];
      const expectedResult = match[3];
      
      return {
        id: `step-${index + 1}`,
        description,
        code,
        expectedResult
      };
    });
    
    // Extract verification fixtures
    const fixturesMatch = markdown.match(/## Verification Fixtures\s*\n\n([\s\S]*?)(?:\n\n## |$)/);
    const fixturesText = fixturesMatch ? fixturesMatch[1] : '';
    const fixtureMatches = [...fixturesText.matchAll(/### (.*?)\s*\n\n\*\*Fixture ID:\*\* `([^`]*)`\s*\n\n\*\*Input:\*\*\s*\n```json\s*\n([\s\S]*?)\n```\s*\n\n\*\*Expected Output:\*\*\s*\n```json\s*\n([\s\S]*?)\n```/g)];
    
    const verificationFixtures = fixtureMatches.map(match => {
      const description = match[1];
      const id = match[2];
      const input = JSON.parse(match[3]);
      const expectedOutput = JSON.parse(match[4]);
      
      return {
        id,
        description,
        input,
        expectedOutput
      };
    });
    
    // Extract source concepts
    const sourceConceptsMatch = markdown.match(/## Source Concepts\s*\n\n([\s\S]*?)(?:\n\n|$)/);
    const sourceConceptsText = sourceConceptsMatch ? sourceConceptsMatch[1] : '';
    const sourceConceptIds = [...sourceConceptsText.matchAll(/- `([^`]*)`/g)]
      .map(match => match[1]);
    
    return {
      id,
      title,
      description,
      inputs,
      outputs,
      steps,
      sourceConceptIds,
      verificationFixtures
    };
  } catch (error) {
    logger.error('Error parsing executable specification from markdown', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Return a minimal specification
    return {
      id: 'error-spec',
      title: 'Error Parsing Specification',
      description: 'An error occurred while parsing the specification',
      inputs: [],
      outputs: [],
      steps: [],
      sourceConceptIds: [],
      verificationFixtures: []
    };
  }
}

/**
 * Generate a verification report based on test results
 * @param knowledgeGraph Knowledge graph of the paper
 * @param testResults Test results
 * @returns Verification report as markdown
 */
export function generateVerificationReport(
  knowledgeGraph: PaperKnowledgeGraph,
  testResults: {
    specificationId: string;
    fixture: {
      id: string;
      passed: boolean;
      actual?: any;
      expected?: any;
      error?: string;
    }[];
  }[]
): string {
  try {
    logger.info('Generating verification report');
    
    let markdown = `---
title: "Verification Report"
status: "DRAFT"
date: "${new Date().toISOString().split('T')[0]}"
---

# Verification Report

## Summary

`;
    
    // Calculate summary statistics
    const totalTests = testResults.reduce((sum, result) => sum + result.fixture.length, 0);
    const passedTests = testResults.reduce((sum, result) => sum + result.fixture.filter(f => f.passed).length, 0);
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(2) : '0.00';
    
    markdown += `- **Total Tests:** ${totalTests}\n`;
    markdown += `- **Passed:** ${passedTests}\n`;
    markdown += `- **Failed:** ${failedTests}\n`;
    markdown += `- **Pass Rate:** ${passRate}%\n\n`;
    
    // Add detailed results
    markdown += `## Detailed Results\n\n`;
    
    testResults.forEach(result => {
      const specPassedTests = result.fixture.filter(f => f.passed).length;
      const specTotalTests = result.fixture.length;
      const specPassRate = specTotalTests > 0 ? (specPassedTests / specTotalTests * 100).toFixed(2) : '0.00';
      
      markdown += `### Specification: ${result.specificationId}\n\n`;
      markdown += `- **Pass Rate:** ${specPassRate}% (${specPassedTests}/${specTotalTests})\n\n`;
      
      // Add fixture results
      result.fixture.forEach(fixture => {
        const status = fixture.passed ? '✅ PASSED' : '❌ FAILED';
        markdown += `#### ${status}: ${fixture.id}\n\n`;
        
        if (!fixture.passed) {
          markdown += `**Error:** ${fixture.error || 'No error message provided'}\n\n`;
          
          if (fixture.expected !== undefined) {
            markdown += `**Expected:**\n\`\`\`json\n${JSON.stringify(fixture.expected, null, 2)}\n\`\`\`\n\n`;
          }
          
          if (fixture.actual !== undefined) {
            markdown += `**Actual:**\n\`\`\`json\n${JSON.stringify(fixture.actual, null, 2)}\n\`\`\`\n\n`;
          }
        }
      });
      
      markdown += '\n';
    });
    
    // Add Paper Fidelity Analysis
    markdown += `## Paper Fidelity Analysis\n\n`;
    
    // Calculate coverage
    const testedConceptIds = new Set<string>();
    testResults.forEach(result => {
      // Assume the specificationId is the same as the spec.id
      const specification = parseExecutableSpecification(''); // Placeholder - in a real implementation, we'd load the spec
      if (specification && specification.sourceConceptIds) {
        specification.sourceConceptIds.forEach(id => testedConceptIds.add(id));
      }
    });
    
    const totalConcepts = knowledgeGraph.concepts.length;
    const coveredConcepts = testedConceptIds.size;
    const coverageRate = totalConcepts > 0 ? (coveredConcepts / totalConcepts * 100).toFixed(2) : '0.00';
    
    markdown += `- **Concept Coverage:** ${coverageRate}% (${coveredConcepts}/${totalConcepts})\n\n`;
    
    // List untested concepts
    const untestedConcepts = knowledgeGraph.concepts
      .filter(concept => !testedConceptIds.has(concept.id));
    
    if (untestedConcepts.length > 0) {
      markdown += `### Untested Concepts\n\n`;
      untestedConcepts.forEach(concept => {
        markdown += `- **${concept.name}** (${concept.type}): ${concept.description}\n`;
      });
    }
    
    return markdown;
  } catch (error) {
    logger.error('Error generating verification report', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    return '# Error generating verification report';
  }
}