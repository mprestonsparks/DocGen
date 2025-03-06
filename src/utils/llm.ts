/**
 * LLM integration utility for DocGen
 */
import Anthropic from '@anthropic-ai/sdk';
import { 
  ProjectInfo, 
  TechStackRecommendations, 
  LLMResponse, 
  EnhancementOptions,
  InterviewAnswers 
} from '../types';
import { getAnthropicApiKey, getLLMConfig, isLLMAvailable } from './config';
import * as logger from './logger';

// Cache for LLM responses to avoid duplicate calls
const responseCache = new Map<string, LLMResponse>();

/**
 * Get an Anthropic client
 * @returns An Anthropic client
 */
const getAnthropicClient = (): Anthropic => {
  return new Anthropic({
    apiKey: getAnthropicApiKey()
  });
};

/**
 * Normalize text for use as a cache key
 * @param text The text to normalize
 * @returns The normalized text
 */
const normalizeText = (text: string): string => {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Generate a cache key for an LLM request
 * @param prompt The prompt
 * @returns The cache key
 */
const generateCacheKey = (prompt: string): string => {
  return `${getLLMConfig().model}:${normalizeText(prompt)}`;
};

/**
 * Call the LLM with a prompt and get a response
 * @param prompt The prompt to send
 * @param useCache Whether to use the cache
 * @returns The LLM response
 */
export const callLLM = async (prompt: string, useCache = true): Promise<LLMResponse> => {
  if (!isLLMAvailable()) {
    throw new Error('LLM is not available. Please set the ANTHROPIC_API_KEY environment variable.');
  }

  const cacheKey = generateCacheKey(prompt);
  
  // Check if we have a cached response
  if (useCache && responseCache.has(cacheKey)) {
    logger.debug('Using cached LLM response', { cacheKey });
    return responseCache.get(cacheKey)!;
  }
  
  // Get the LLM configuration
  const config = getLLMConfig();
  
  try {
    const client = getAnthropicClient();
    
    logger.info('Calling LLM', { model: config.model, promptLength: prompt.length });
    
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: 'You are an expert software architect and technical writer assistant, helping generate high-quality documentation for software projects.',
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    const result: LLMResponse = {
      content: response.content[0].type === 'text' ? response.content[0].text : JSON.stringify(response.content[0]),
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      }
    };
    
    logger.debug('LLM response received', { 
      tokensUsed: result.usage.totalTokens,
      contentLength: result.content.length
    });
    
    // Cache the response
    if (useCache) {
      responseCache.set(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    logger.error('Error calling LLM', { error });
    throw new Error(`Error calling LLM: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Clear the LLM response cache
 */
export const clearResponseCache = (): void => {
  responseCache.clear();
};

/**
 * Recommend technologies based on project information
 * @param projectInfo The project information
 * @returns The recommended technologies
 */
export const recommendTechnologies = async (
  projectInfo: ProjectInfo
): Promise<TechStackRecommendations> => {
  const prompt = `
I need technology stack recommendations for a new project with the following details:

Project Name: ${projectInfo.name}
Project Description: ${projectInfo.description}
Project Type: ${projectInfo.type}

${projectInfo.type === 'MOBILE' ? 'If this appears to be an iOS app, please consider Swift in your recommendations. If it appears to be an Android app, consider Kotlin.' : ''}

Please provide recommendations in the following categories:
1. Frontend technologies
2. Backend technologies
3. Database technologies
4. DevOps tools and platforms

For each recommendation, explain briefly why it's suitable for this project.
Format your response as JSON with the following structure:
{
  "frontend": ["Technology1", "Technology2"],
  "backend": ["Technology1", "Technology2"],
  "database": ["Technology1"],
  "devops": ["Technology1", "Technology2"]
}
`;

  try {
    const response = await callLLM(prompt);
    
    // Extract the JSON from the response
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                       response.content.match(/```\n([\s\S]*?)\n```/) ||
                       response.content.match(/({[\s\S]*})/);
    
    if (jsonMatch && jsonMatch[1]) {
      const recommendations = JSON.parse(jsonMatch[1]) as TechStackRecommendations;
      return recommendations;
    }
    
    logger.warn('Could not parse LLM response as JSON', { response: response.content });
    throw new Error('Could not parse LLM response as JSON');
  } catch (error) {
    logger.error('Error recommending technologies', { error, projectInfo });
    throw new Error(`Error recommending technologies: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Generate follow-up questions based on project information and interview answers
 * @param projectInfo The project information
 * @param interviewAnswers The interview answers
 * @returns The follow-up questions
 */
export const generateFollowUpQuestions = async (
  projectInfo: ProjectInfo,
  interviewAnswers: InterviewAnswers
): Promise<string[]> => {
  const prompt = `
Based on the following project information and interview answers, please generate 3-5 follow-up questions
that would help gather more detailed information for generating comprehensive documentation.

Project Name: ${projectInfo.name}
Project Description: ${projectInfo.description}
Project Type: ${projectInfo.type}

Interview answers so far:
${Object.entries(interviewAnswers)
  .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
  .join('\n\n')}

Generate questions that would help clarify:
1. Technical requirements and constraints
2. User stories or use cases
3. Architecture decisions that need to be made
4. Potential challenges and risks
5. Success criteria and metrics

Format the questions as a simple list, one per line, without numbering.
`;

  try {
    const response = await callLLM(prompt);
    
    // Split the response into lines and filter out empty lines
    const questions = response.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('?'));
    
    // Limit to at most 5 questions
    return questions.slice(0, 5);
  } catch (error) {
    logger.error('Error generating follow-up questions', { error, projectInfo });
    return [
      'What are the key technical requirements for this project?',
      'Who are the primary users of this system?',
      'What are the main challenges you anticipate for this project?',
      'What metrics will determine the success of this project?'
    ];
  }
};

/**
 * Enhance documentation based on project information
 * @param content The original documentation content
 * @param projectInfo The project information
 * @param documentType The type of document
 * @param options Enhancement options
 * @returns The enhanced documentation
 */
export const enhanceDocumentation = async (
  content: string,
  projectInfo: ProjectInfo,
  documentType: string,
  options: EnhancementOptions = {}
): Promise<string> => {
  const prompt = `
You are helping enhance the following ${documentType.toUpperCase()} document for a project called "${projectInfo.name}".
The project is described as: "${projectInfo.description}"

Here's the current content:

${content}

Please improve this document while keeping its original structure and format intact. Specifically:
${options.improveFormatting ? '- Improve the formatting and readability' : ''}
${options.addExamples ? '- Add relevant examples where appropriate' : ''}
${options.expandExplanations ? '- Expand explanations of complex concepts' : ''}
${options.addReferences ? '- Add references to industry standards or best practices' : ''}
${options.checkConsistency ? '- Ensure terminology is consistent throughout' : ''}

Return the complete enhanced document.
`;

  try {
    const response = await callLLM(prompt, false); // Don't cache enhancement responses
    return response.content;
  } catch (error) {
    logger.error('Error enhancing documentation', { error, documentType });
    return content; // Return the original content if enhancement fails
  }
};

/**
 * Check if the LLM is available
 * @returns Whether the LLM is available
 */
export const isLLMApiAvailable = (): boolean => {
  return isLLMAvailable();
};