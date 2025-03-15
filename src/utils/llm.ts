/**
 * LLM integration utility for DocGen
 */
import Anthropic from '@anthropic-ai/sdk';
// Import OpenAI and Cohere conditionally to maintain backwards compatibility
let OpenAI: any;
let Cohere: any;

try {
  OpenAI = require('openai');
} catch (error) {
  // OpenAI package not installed, will be undefined
}

try {
  const cohereModule = require('cohere-ai');
  Cohere = cohereModule.Cohere;
} catch (error) {
  // Cohere package not installed, will be undefined
}

import { 
  ProjectInfo, 
  TechStackRecommendations, 
  LLMResponse, 
  EnhancementOptions,
  InterviewAnswers,
  LLMProvider,
  LLMProviderConfigs
} from '../types';
import { 
  getAnthropicApiKey, 
  getLLMConfig, 
  getLLMProviderConfigs,
  isLLMAvailable, 
  isProviderAvailable, 
  getLLMApiKey 
} from './config';
import * as logger from './logger';

// Cache for LLM responses to avoid duplicate calls
const responseCache = new Map<string, LLMResponse>();

// Provider client instances
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;
let cohereClient: Cohere | null = null;

/**
 * Get an Anthropic client
 * @returns An Anthropic client
 */
const getAnthropicClient = (): Anthropic => {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: getAnthropicApiKey()
    });
  }
  return anthropicClient;
};

/**
 * Get an OpenAI client
 * @returns An OpenAI client
 */
const getOpenAIClient = (): any => {
  if (!OpenAI) {
    throw new Error('OpenAI package is not installed. Run "npm install openai" to add support.');
  }
  
  if (!openaiClient) {
    const apiKey = getLLMApiKey('openai');
    if (!apiKey) {
      throw new Error('OpenAI API key not found');
    }
    openaiClient = new OpenAI({
      apiKey
    });
  }
  return openaiClient;
};

/**
 * Get a Cohere client
 * @returns A Cohere client
 */
const getCohereClient = (): any => {
  if (!Cohere) {
    throw new Error('Cohere package is not installed. Run "npm install cohere-ai" to add support.');
  }
  
  if (!cohereClient) {
    const apiKey = getLLMApiKey('cohere');
    if (!apiKey) {
      throw new Error('Cohere API key not found');
    }
    cohereClient = new Cohere({
      token: apiKey
    });
  }
  return cohereClient;
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
 * Exposed version of normalizeText for testing purposes
 */
export const normalizeTextForTesting = normalizeText;

/**
 * Generate a cache key for an LLM request
 * @param prompt The prompt
 * @returns The cache key
 */
const generateCacheKey = (prompt: string): string => {
  return `${getLLMConfig().model}:${normalizeText(prompt)}`;
};

/**
 * Exposed version of generateCacheKey for testing purposes
 */
export const generateCacheKeyForTesting = generateCacheKey;

/**
 * Estimate token count based on text length
 * This is a rough approximation, assumes 4 chars per token which is a common average for English text
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  // A rough approximation - typically 1 token is ~4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Adaptively determine max tokens based on input length to prevent exceeding context limits
 * @param inputText The input text
 * @param maxAvailableTokens Maximum tokens available for the model
 * @param reserveTokenRatio Ratio of tokens to reserve for the response (0.0 to 1.0)
 * @returns The recommended max tokens for the response
 */
export function adaptiveMaxTokens(
  inputText: string, 
  maxAvailableTokens: number = 16000, // Default to Claude 3.5 Sonnet context size
  reserveTokenRatio: number = 0.5 // Reserve 50% by default
): number {
  const inputTokensEstimate = estimateTokenCount(inputText);
  const maxOutputTokens = Math.max(
    100, // Minimum tokens to return
    Math.floor((maxAvailableTokens - inputTokensEstimate) * reserveTokenRatio)
  );
  
  logger.debug('Adaptive token management', { 
    inputTokensEstimate, 
    maxOutputTokens,
    inputLength: inputText.length 
  });
  
  return maxOutputTokens;
}

/**
 * Call the LLM with a prompt and get a response
 * @param prompt The prompt to send
 * @param useCache Whether to use the cache
 * @returns The LLM response
 * 
 * TODO: Enhance LLM integration with the following improvements:
 * 1. Implement fallback mechanisms for API failures and rate limiting
 * 2. Add support for streaming responses for large generations
 * 3. Implement adaptive token management to optimize context usage
 * 4. Add support for multi-provider fallbacks (OpenAI, Cohere, etc.)
 * 5. Implement better error handling with automatic retries and backoff
 * 6. Enable thread/conversation management for multi-turn interactions
 * This relates to issue #15.
 * Github issue: https://github.com/mprestonsparks/DocGen/issues/15
 */

/**
 * Query the LLM with a prompt (alias for callLLM for compatibility)
 * @param prompt The prompt to send to the LLM
 * @param useCache Whether to use cached responses
 * @returns The LLM response
 */
export const query = async (prompt: string, useCache = true): Promise<LLMResponse> => {
  return callLLM(prompt, useCache);
};

/**
 * Make an API call with exponential backoff retry logic
 * @param apiCallFn Function that makes the API call
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns The result of the API call
 */
async function withRetry<T>(
  apiCallFn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the API call
      return await apiCallFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we've exhausted our retries
      if (attempt >= maxRetries) {
        break;
      }
      
      // Check if error is retryable (rate limit or server error)
      if (
        lastError.message.includes('rate limit') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('5') || // 5xx errors
        lastError.message.includes('429') // Too many requests
      ) {
        // Calculate delay with exponential backoff and jitter
        const delay = initialDelay * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
        
        logger.warn(`LLM API call failed, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`, {
          error: lastError.message
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Non-retryable error
        logger.error('Non-retryable LLM API error', { error: lastError });
        throw lastError;
      }
    }
  }
  
  // If we get here, we've exhausted retries
  throw lastError;
}

/**
 * Call Anthropic Claude LLM
 * @param prompt The prompt to send
 * @returns The LLM response
 */
async function callAnthropic(prompt: string): Promise<LLMResponse> {
  try {
    const client = getAnthropicClient();
    const providerConfigs = getLLMProviderConfigs();
    const config = providerConfigs.anthropic!;
    
    // Use adaptive token management
    const maxTokens = adaptiveMaxTokens(prompt, 
      config.model.includes('sonnet') ? 16000 : 
      config.model.includes('haiku') ? 8000 : 100000); // Different context sizes for different models
    
    logger.info('Calling Anthropic', { 
      model: config.model, 
      promptLength: prompt.length,
      maxTokens 
    });
    
    const response = await client.messages.create({
      model: config.model,
      max_tokens: maxTokens,
      temperature: config.temperature,
      system: 'You are an expert software architect and technical writer assistant, helping generate high-quality documentation for software projects.',
      messages: [
        { role: 'user', content: prompt }
      ]
    });
    
    return {
      content: response.content[0].type === 'text' ? response.content[0].text : JSON.stringify(response.content[0]),
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
      }
    };
  } catch (error) {
    logger.error('Error calling Anthropic', { error });
    throw error;
  }
}

/**
 * Call OpenAI GPT LLM
 * @param prompt The prompt to send
 * @returns The LLM response
 */
async function callOpenAI(prompt: string): Promise<LLMResponse> {
  try {
    const client = getOpenAIClient();
    const providerConfigs = getLLMProviderConfigs();
    const config = providerConfigs.openai!;
    
    // Use adaptive token management
    const maxTokens = adaptiveMaxTokens(prompt,
      config.model.includes('gpt-4') ? 8000 : 4000); // Different context sizes for different models
    
    logger.info('Calling OpenAI', { 
      model: config.model, 
      promptLength: prompt.length,
      maxTokens
    });
    
    const response = await client.chat.completions.create({
      model: config.model,
      max_tokens: maxTokens,
      temperature: config.temperature,
      messages: [
        { role: 'system', content: 'You are an expert software architect and technical writer assistant, helping generate high-quality documentation for software projects.' },
        { role: 'user', content: prompt }
      ]
    });
    
    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };
  } catch (error) {
    logger.error('Error calling OpenAI', { error });
    throw error;
  }
}

/**
 * Call Cohere LLM
 * @param prompt The prompt to send
 * @returns The LLM response
 */
async function callCohere(prompt: string): Promise<LLMResponse> {
  try {
    const client = getCohereClient();
    const providerConfigs = getLLMProviderConfigs();
    const config = providerConfigs.cohere!;
    
    // Use adaptive token management
    const maxTokens = adaptiveMaxTokens(prompt, 4000); // Cohere has different context sizes by model
    
    logger.info('Calling Cohere', { 
      model: config.model, 
      promptLength: prompt.length,
      maxTokens
    });
    
    const response = await client.generate({
      model: config.model,
      prompt,
      max_tokens: maxTokens,
      temperature: config.temperature,
    });
    
    return {
      content: response.generations[0]?.text || '',
      usage: {
        promptTokens: estimateTokenCount(prompt), // Estimate since Cohere doesn't provide token usage details
        completionTokens: estimateTokenCount(response.generations[0]?.text || ''),
        totalTokens: estimateTokenCount(prompt) + estimateTokenCount(response.generations[0]?.text || '')
      }
    };
  } catch (error) {
    logger.error('Error calling Cohere', { error });
    throw error;
  }
}

/**
 * Wrap a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Error message to throw on timeout
 * @returns The wrapped promise
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]);
}

/**
 * Call the appropriate LLM provider with fallback logic
 * @param prompt The prompt to send
 * @param provider The provider to use
 * @param fallbackProviders List of fallback providers
 * @returns The LLM response
 */
async function callProvider(
  prompt: string, 
  provider: LLMProvider,
  fallbackProviders: LLMProvider[] = []
): Promise<LLMResponse> {
  // Get the timeout value from config
  const config = getLLMConfig();
  const timeoutMs = config.timeout || 30000;
  
  // Skip unavailable providers
  if (!isProviderAvailable(provider)) {
    if (fallbackProviders.length === 0) {
      throw new Error(`No available LLM providers. Primary provider '${provider}' is not available.`);
    }
    logger.warn(`Provider ${provider} API key not available, trying fallback`, { fallbackProviders });
    return callProvider(prompt, fallbackProviders[0], fallbackProviders.slice(1));
  }
  
  try {
    let responsePromise: Promise<LLMResponse>;
    
    switch (provider) {
      case 'anthropic':
        responsePromise = callAnthropic(prompt);
        break;
      case 'openai':
        // Check if OpenAI package is available
        if (!OpenAI) {
          if (fallbackProviders.length === 0) {
            throw new Error(`OpenAI package not installed. Run "npm install openai" to add support.`);
          }
          logger.warn(`OpenAI package not installed, trying fallback`, { fallbackProviders });
          return callProvider(prompt, fallbackProviders[0], fallbackProviders.slice(1));
        }
        responsePromise = callOpenAI(prompt);
        break;
      case 'cohere':
        // Check if Cohere package is available
        if (!Cohere) {
          if (fallbackProviders.length === 0) {
            throw new Error(`Cohere package not installed. Run "npm install cohere-ai" to add support.`);
          }
          logger.warn(`Cohere package not installed, trying fallback`, { fallbackProviders });
          return callProvider(prompt, fallbackProviders[0], fallbackProviders.slice(1));
        }
        responsePromise = callCohere(prompt);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
    
    // Add timeout to the provider call
    return await withTimeout(
      responsePromise,
      timeoutMs,
      `Request to ${provider} timed out after ${timeoutMs}ms`
    );
  } catch (error) {
    // If there are fallback providers, try the next one
    if (fallbackProviders.length > 0) {
      logger.warn(`Provider ${provider} failed, trying fallback`, { 
        error: error instanceof Error ? error.message : String(error),
        nextProvider: fallbackProviders[0] 
      });
      return callProvider(prompt, fallbackProviders[0], fallbackProviders.slice(1));
    }
    
    // No more fallbacks, re-throw the error
    throw error;
  }
}

export const callLLM = async (prompt: string, useCache = true): Promise<LLMResponse> => {
  if (!isLLMAvailable()) {
    throw new Error('No LLM provider is available. Please set at least one API key (ANTHROPIC_API_KEY, OPENAI_API_KEY, or COHERE_API_KEY).');
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
    // Define the actual API call function to be retried
    const makeApiCall = async (): Promise<LLMResponse> => {
      // Call the primary provider with fallbacks
      return callProvider(prompt, config.provider, config.fallbackProviders);
    };
    
    // Call the API with retry logic
    const result = await withRetry(makeApiCall);
    
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
    logger.error('Error calling LLM after retries', { error });
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
 * Generate follow-up questions for an existing project
 * @param projectInfo The project information
 * @param analysisContext The analysis context from the project analyzer
 * @param interviewAnswers The interview answers
 * @returns The follow-up questions
 */
export const generateFollowUpQuestionsForExistingProject = async (
  projectInfo: ProjectInfo,
  analysisContext: {
    projectType: string;
    languages: string;
    frameworks: string;
    existingDocs: string;
  },
  interviewAnswers: InterviewAnswers
): Promise<string[]> => {
  const prompt = `
Based on the following project information, analysis results, and interview answers, please generate 3-5 follow-up questions
that would help gather more detailed information for generating comprehensive documentation for an EXISTING project.

Project Name: ${projectInfo.name}
Project Description: ${projectInfo.description}
Project Type: ${projectInfo.type}

Project Analysis Results:
- Detected Project Type: ${analysisContext.projectType}
- Languages: ${analysisContext.languages}
- Frameworks: ${analysisContext.frameworks}
- Existing Documentation: ${analysisContext.existingDocs}

Interview answers so far:
${Object.entries(interviewAnswers)
  .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
  .join('\n\n')}

Generate questions that would help clarify:
1. How new documentation should integrate with existing documentation
2. Specific areas where current documentation is lacking
3. Technical details that would be important to document
4. Project-specific challenges that documentation should address
5. Documentation priorities based on the current state of the project

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
    logger.error('Error generating follow-up questions for existing project', { error, projectInfo });
    return [
      'What are the most important aspects of the project that need better documentation?',
      'How should new documentation integrate with existing documentation?',
      'Are there specific areas where the current documentation is lacking?',
      'What documentation formats would be most useful for your team?',
      'Are there specific standards or conventions you want to follow in the documentation?'
    ];
  }
};

/**
 * Recommend technologies with context from detected technologies
 * @param projectInfo The project information
 * @param detectedTech The detected technologies
 * @returns The recommended technologies
 */
export const recommendTechnologiesWithContext = async (
  projectInfo: ProjectInfo,
  detectedTech: string[]
): Promise<TechStackRecommendations> => {
  const prompt = `
I need additional technology stack recommendations for an existing project with the following details:

Project Name: ${projectInfo.name}
Project Description: ${projectInfo.description}
Project Type: ${projectInfo.type}

Detected Technologies:
${detectedTech.map(tech => `- ${tech}`).join('\n')}

Based on these detected technologies, please suggest complementary or additional technologies that would work well with the existing stack.
Consider modern alternatives or enhancements that might benefit the project.

Please provide recommendations in the following categories:
1. Frontend technologies
2. Backend technologies
3. Database technologies
4. DevOps tools and platforms

For each recommendation, explain briefly why it would complement the existing technology stack.
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
    
    logger.warn('Could not parse LLM response as JSON for technology recommendations', { response: response.content });
    throw new Error('Could not parse LLM response as JSON');
  } catch (error) {
    logger.error('Error recommending technologies with context', { error, projectInfo });
    throw new Error(`Error recommending technologies with context: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Check if the LLM is available
 * @returns Whether the LLM is available
 */
export const isLLMApiAvailable = (): boolean => {
  return isLLMAvailable();
};