/**
 * LLM integration utility for DocGen
 */
import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import type { CohereClient, CohereGenerateRequest, LLMStreamOptions } from '../core/types/llm';
import { LLMConfig, LLMProvider, LLMResponse, LLMProviderConfig } from '../core/types/llm';
import { getLLMConfig, getLLMApiKey } from './config';
import * as logger from './logger';

// Re-export types that are commonly used by other modules
export type { 
  LLMConfig,
  LLMProvider, 
  LLMResponse, 
  LLMProviderConfig,
  LLMStreamOptions,
  CohereClient,
  CohereGenerateRequest
} from '../core/types/llm';

// Initialize clients
let openaiClient: OpenAI | undefined;
let cohereClient: CohereClient | null = null;
let anthropicClient: Anthropic | undefined;

/**
 * Check if a specific LLM provider is available
 */
export const isProviderAvailable = (provider: LLMProvider): boolean => {
  const apiKey = getLLMApiKey(provider);
  return apiKey !== undefined && apiKey.length > 0;
};

/**
 * Check if any LLM provider is available
 */
export const isLLMAvailable = (): boolean => {
  return ['anthropic', 'openai', 'cohere'].some(provider => 
    isProviderAvailable(provider as LLMProvider)
  );
};

/**
 * Initialize OpenAI client if available
 */
export const initOpenAI = async (): Promise<OpenAI | undefined> => {
  if (!isProviderAvailable('openai')) {
    return undefined;
  }

  const apiKey = getLLMApiKey('openai');
  if (!apiKey) {
    return undefined;
  }

  return new OpenAI({ apiKey });
};

/**
 * Initialize Cohere client if available
 */
export const initCohere = async (): Promise<CohereClient | null> => {
  if (!isProviderAvailable('cohere')) {
    return null;
  }

  try {
    const { CohereClient } = await import('cohere-ai');
    const apiKey = getLLMApiKey('cohere');
    if (!apiKey) {
      return null;
    }

    return new CohereClient({ token: apiKey }) as CohereClient;
  } catch (error) {
    logger.error('Failed to initialize Cohere client', { error: formatError(error) });
    return null;
  }
};

/**
 * Initialize Anthropic client if available
 */
export const initAnthropic = (): Anthropic | undefined => {
  if (!isProviderAvailable('anthropic')) {
    return undefined;
  }

  const apiKey = getLLMApiKey('anthropic');
  if (!apiKey) {
    return undefined;
  }

  return new Anthropic({ apiKey });
};

/**
 * Format an error for logging
 */
export const formatError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
  }
  return { message: String(error) };
};

/**
 * Format an LLM response
 */
export const formatLLMResponse = (content: string, usage?: { promptTokens: number; completionTokens: number; totalTokens: number }): LLMResponse => {
  return {
    content,
    text: content,
    usage
  };
};

/**
 * Call the OpenAI API
 */
export const callOpenAI = async (prompt: string, config: LLMProviderConfig): Promise<LLMResponse> => {
  if (!openaiClient) {
    openaiClient = await initOpenAI();
  }
  if (!openaiClient) {
    throw new Error('OpenAI client not available');
  }

  const response = await openaiClient.chat.completions.create({
    model: config.model || 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: config.maxTokens,
    temperature: config.temperature
  });

  return formatLLMResponse(
    response.choices[0]?.message?.content || 'No response generated',
    {
      promptTokens: response.usage?.prompt_tokens || 0,
      completionTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0
    }
  );
};

/**
 * Call the Cohere API
 */
export const callCohere = async (prompt: string, config: LLMProviderConfig): Promise<LLMResponse> => {
  if (!cohereClient) {
    cohereClient = await initCohere();
  }
  if (!cohereClient) {
    throw new Error('Cohere client not available');
  }

  const response = await cohereClient.generate({
    prompt,
    model: config.model || 'command',
    max_tokens: config.maxTokens || 2000,
    temperature: config.temperature || 0.7
  } as CohereGenerateRequest);

  return formatLLMResponse(
    response.generations[0]?.text || 'No response generated'
  );
};

/**
 * Call the Anthropic API
 */
export const callAnthropic = async (prompt: string, config: LLMProviderConfig): Promise<LLMResponse> => {
  if (!anthropicClient) {
    anthropicClient = initAnthropic();
  }
  if (!anthropicClient) {
    throw new Error('Anthropic client not available');
  }

  const response = await anthropicClient.messages.create({
    model: config.model || 'claude-2',
    max_tokens: config.maxTokens || 1000, // Default to 1000 tokens if not specified
    messages: [{ role: 'user', content: prompt }]
  });

  const content = typeof response.content[0] === 'object' && 'type' in response.content[0] ?
    response.content[0].type === 'text' ? response.content[0].text : JSON.stringify(response.content[0]) :
    'No response generated';

  return formatLLMResponse(
    content,
    {
      promptTokens: response.usage?.input_tokens || 0,
      completionTokens: response.usage?.output_tokens || 0,
      totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    }
  );
};

/**
 * Call the fallback provider
 */
export const callFallback = async (prompt: string): Promise<LLMResponse> => {
  return formatLLMResponse('Fallback response: No LLM providers are available.');
};

/**
 * Call the appropriate LLM provider
 * @param prompt The prompt to send to the LLM
 * @returns A promise that resolves to the LLM response
 */
export const callLLM = async (prompt: string): Promise<LLMResponse> => {
  const config = getLLMConfig();
  const provider = config.provider;

  try {
    const providerConfig = config.providerConfigs[provider];
    
    switch (provider) {
      case 'anthropic':
        return await callAnthropic(prompt, providerConfig || {});
      case 'openai':
        return await callOpenAI(prompt, providerConfig || {});
      case 'cohere':
        return await callCohere(prompt, providerConfig || {});
      case 'fallback':
        return await callFallback(prompt);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    const errorData = formatError(error);
    logger.error('LLM call failed', { error: errorData });
    return formatLLMResponse(`Error: ${errorData.message || String(error)}`);
  }
};

/**
 * Stream a response from the LLM
 * @param prompt The prompt to send to the LLM
 * @param options The streaming options
 */
export const streamLLM = async (prompt: string, options: LLMStreamOptions): Promise<void> => {
  const config = getLLMConfig();
  const provider = config.provider;
  const providerConfig = config.providerConfigs[provider];

  try {
    switch (provider) {
      case 'anthropic':
        if (!anthropicClient) {
          anthropicClient = initAnthropic();
        }
        if (!anthropicClient) {
          throw new Error('Anthropic client not available');
        }
        
        const stream = await anthropicClient.messages.create({
          model: providerConfig?.model || 'claude-2',
          max_tokens: providerConfig?.maxTokens || 2000,
          messages: [{ role: 'user', content: prompt }],
          stream: true
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && 'text' in chunk.delta && typeof chunk.delta.text === 'string') {
            if (options.onChunk) {
              options.onChunk(chunk.delta.text);
            }
          }
        }

        if (options.onComplete) {
          options.onComplete(formatLLMResponse(prompt));
        }
        break;

      case 'openai':
        const openai = await initOpenAI();
        if (!openai) {
          throw new Error('OpenAI client not available');
        }

        const openaiStream = await openai.chat.completions.create({
          model: providerConfig?.model || 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          stream: true
        });

        for await (const part of openaiStream) {
          const content = part.choices[0]?.delta?.content;
          if (content && options.onChunk) {
            options.onChunk(content);
          }
        }

        if (options.onComplete) {
          options.onComplete(formatLLMResponse(prompt));
        }
        break;

      case 'cohere':
        // Cohere doesn't support streaming yet
        const response = await callCohere(prompt, providerConfig || {});
        if (options.onChunk) {
          options.onChunk(response.content);
        }
        if (options.onComplete) {
          options.onComplete(response);
        }
        break;

      default:
        throw new Error(`Streaming not supported for provider: ${provider}`);
    }
  } catch (error) {
    const errorData = formatError(error);
    logger.error('LLM streaming failed', { error: errorData });
    if (options.onComplete) {
      options.onComplete(formatLLMResponse(`Error: ${errorData.message || String(error)}`));
    }
  }
};

/**
 * Interface for a conversation message
 */
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Interface for conversation options
 */
export interface ConversationOptions {
  maxMessages?: number;
  systemMessage?: string;
  provider?: LLMProvider;
  useSummary?: boolean;
  summarizeThreshold?: number;
}

/**
 * Class for managing a conversation with an LLM
 */
export class Conversation {
  private messages: ConversationMessage[] = [];
  private maxMessages: number;
  private provider: LLMProvider;
  private useSummary: boolean;
  private summarizeThreshold: number;
  private summary: string = '';

  constructor(options: ConversationOptions = {}) {
    this.maxMessages = options.maxMessages || 100;
    this.provider = options.provider || getLLMConfig().provider;
    this.useSummary = options.useSummary !== undefined ? options.useSummary : true;
    this.summarizeThreshold = options.summarizeThreshold || 4000;
    
    // Add system message if provided
    if (options.systemMessage) {
      this.addMessage({
        role: 'system',
        content: options.systemMessage
      });
    } else {
      // Default system message
      this.addMessage({
        role: 'system',
        content: 'You are an expert software architect and technical writer assistant, helping generate high-quality documentation for software projects.'
      });
    }
  }

  /**
   * Add a message to the conversation
   * @param message The message to add
   */
  public addMessage(message: ConversationMessage): void {
    this.messages.push({
      ...message,
      timestamp: message.timestamp || new Date()
    });
  }

  /**
   * Get all messages in the conversation
   */
  public getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Clear all messages in the conversation
   */
  public clearMessages(): void {
    this.messages = [];
  }

  /**
   * Get the conversation summary
   */
  public getSummary(): string {
    return this.summary;
  }

  /**
   * Add a user message and get an assistant response
   * @param userMessage The user message
   * @param useStream Whether to use streaming
   * @param streamOptions Options for streaming (if enabled)
   * @returns The assistant's response
   */
  public async sendMessage(
    userMessage: string,
    useStream: boolean = false,
    streamOptions?: Omit<LLMStreamOptions, 'onComplete'>
  ): Promise<string> {
    // Add user message to conversation
    this.addMessage({
      role: 'user',
      content: userMessage
    });

    // Check if we need to summarize before adding the new response
    if (this.useSummary) {
      await this.checkAndSummarize();
    }

    let assistantResponse = '';
    const messageHistory = this.prepareMessageHistory();

    if (useStream && streamOptions) {
      // Use streaming for the response
      await streamLLM(this.buildPromptFromHistory(messageHistory), {
        ...streamOptions,
        onChunk: (chunk) => {
          assistantResponse += chunk;
          if (streamOptions.onChunk) {
            streamOptions.onChunk(chunk);
          }
        },
        onComplete: (response) => {
          // Add the assistant response to the conversation
          this.addMessage({
            role: 'assistant',
            content: assistantResponse
          });
        }
      });
    } else {
      // Use regular LLM call
      const response = await callLLM(this.buildPromptFromHistory(messageHistory));
      assistantResponse = response.content;
      
      // Add the assistant response to the conversation
      this.addMessage({
        role: 'assistant',
        content: assistantResponse
      });
    }
    
    return assistantResponse;
  }

  /**
   * Build a prompt from the message history for providers that don't support message history
   * @param messageHistory The message history
   * @returns The prompt
   */
  private buildPromptFromHistory(messageHistory: ConversationMessage[]): string {
    return messageHistory
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
  }

  /**
   * Prepare message history for an LLM call based on provider
   * @returns The message history
   */
  private prepareMessageHistory(): ConversationMessage[] {
    // Get all messages except the most recent (which will be added after the response)
    return this.messages;
  }

  /**
   * Check if the conversation needs to be summarized and summarize it if needed
   */
  private async checkAndSummarize(): Promise<void> {
    const estimatedTokens = this.estimateConversationTokens();
    if (estimatedTokens > this.summarizeThreshold) {
      await this.summarizeConversation();
    }
  }

  /**
   * Estimate the number of tokens in the conversation
   * @returns The estimated token count
   */
  private estimateConversationTokens(): number {
    return this.messages.reduce((total, msg) => {
      return total + estimateTokenCount(msg.content);
    }, 0);
  }

  /**
   * Summarize the conversation using the LLM
   */
  private async summarizeConversation(): Promise<void> {
    // Get all non-system messages
    const historyToSummarize = this.messages.filter(m => m.role !== 'system');
    const historyText = historyToSummarize
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    
    if (historyText.trim().length === 0) {
      return; // Nothing to summarize
    }
    
    const prompt = `
    Summarize the following conversation while preserving all important information, context, and decisions.
    This summary will be used to maintain context in a longer conversation while reducing token usage.
    
    ${historyText}
    
    Provide a concise summary (max 250 words) that captures the essence of this conversation.
    `;
    
    try {
      const response = await callLLM(prompt);
      this.summary = response.content;
      
      // Replace the summarized messages with just the summary in a system message
      // Keep system message(s) and recent messages
      const systemMessages = this.messages.filter(m => m.role === 'system');
      const recentMessages = this.messages.slice(-2);
      
      this.messages = [
        ...systemMessages,
        {
          role: 'system',
          content: `Previous conversation summary:\n${this.summary}`
        },
        ...recentMessages
      ];
    } catch (error) {
      logger.error('Error summarizing conversation', { error: formatError(error) });
    }
  }

  /**
   * Export the conversation to JSON
   */
  public exportConversation(): string {
    return JSON.stringify({
      messages: this.messages,
      summary: this.summary,
      provider: this.provider,
      maxMessages: this.maxMessages,
      useSummary: this.useSummary,
      summarizeThreshold: this.summarizeThreshold
    });
  }

  /**
   * Import a conversation from JSON
   * @param json The conversation as JSON
   */
  public importConversation(json: string): void {
    try {
      const data = JSON.parse(json);
      this.messages = data.messages;
      this.summary = data.summary;
      this.provider = data.provider;
      this.maxMessages = data.maxMessages;
      this.useSummary = data.useSummary;
      this.summarizeThreshold = data.summarizeThreshold;
    } catch (error) {
      logger.error('Error importing conversation', { error: formatError(error) });
      throw new Error('Invalid conversation JSON');
    }
  }

  /**
   * Fork this conversation to create a branch
   * @param name Optional name for the forked conversation
   * @returns A new conversation with the same history
   */
  public fork(name?: string): Conversation {
    const forked = new Conversation({
      provider: this.provider,
      maxMessages: this.maxMessages,
      useSummary: this.useSummary,
      summarizeThreshold: this.summarizeThreshold
    });

    // Copy messages and summary
    forked.messages = [...this.messages];
    forked.summary = this.summary;

    if (name) {
      forked.addMessage({
        role: 'system',
        content: `Forked conversation: ${name}`
      });
    }

    return forked;
  }
}

/**
 * Get an Anthropic client
 * @returns An Anthropic client
 */
export const getAnthropicClient = (): Anthropic | undefined => {
  if (!anthropicClient) {
    anthropicClient = initAnthropic();
  }
  return anthropicClient;
};

/**
 * Get an OpenAI client
 * @returns An OpenAI client
 */
export const getOpenAIClient = async (): Promise<OpenAI | undefined> => {
  await initOpenAI();
  return openaiClient;
};

/**
 * Get a Cohere client
 * @returns A Cohere client
 */
export const getCohereClient = async (): Promise<CohereClient | null> => {
  await initCohere();
  return cohereClient;
};

/**
 * Normalize text for use as a cache key
 * @param text The text to normalize
 * @returns The normalized text
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
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
export const generateCacheKey = (prompt: string): string => {
  return `llm:${normalizeText(prompt)}`;
};

/**
 * Estimate token count based on text length
 * @param text The text to estimate tokens for
 * @returns Estimated token count
 */
export const estimateTokenCount = (text: string): number => {
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
};

/**
 * Adaptively determine max tokens based on input length
 * @param inputText The input text
 * @param maxAvailableTokens Maximum tokens available for the model
 * @returns The recommended max tokens for the response
 */
export const adaptiveMaxTokens = (
  inputText: string,
  maxAvailableTokens: number = 16000 // Default to Claude 3.5 Sonnet context size
): number => {
  const estimatedInputTokens = estimateTokenCount(inputText);
  const maxResponseTokens = maxAvailableTokens - estimatedInputTokens;
  
  // Ensure we leave some buffer for safety
  return Math.max(100, Math.min(maxResponseTokens - 100, 4000));
};

/**
 * Make an API call with exponential backoff retry logic
 * @param apiCallFn Function that makes the API call
 * @param maxRetries Maximum number of retries
 * @returns The result of the API call
 */
export const withRetry = async <T>(
  apiCallFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> => {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCallFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error('API call failed after retries');
};

/**
 * Check if the LLM is functional by making a test call
 * @returns A promise that resolves to true if the LLM is functional, false otherwise
 */
export const isLLMFunctional = async (): Promise<boolean> => {
  try {
    const response = await callLLM('Test message. Please respond with "OK".');
    return response.content.toLowerCase().includes('ok');
  } catch (error) {
    logger.error('LLM functionality test failed', { error: formatError(error) });
    return false;
  }
};

/**
 * Recommend technologies based on project information
 * @param projectInfo The project information
 * @returns The recommended technologies
 */
export const recommendTechnologies = async (
  projectInfo: { name: string; description: string; type: string }
): Promise<{ frontend: string[]; backend: string[]; database: string[]; devops: string[] }> => {
  const prompt = `
  Given the following project information, recommend appropriate technologies for each category.
  Project Name: ${projectInfo.name}
  Description: ${projectInfo.description}
  Type: ${projectInfo.type}

  Please provide specific technology recommendations in these categories:
  1. Frontend technologies
  2. Backend technologies
  3. Database technologies
  4. DevOps tools and platforms

  Format your response as a JSON object with these arrays:
  {
    "frontend": ["tech1", "tech2"],
    "backend": ["tech1", "tech2"],
    "database": ["tech1", "tech2"],
    "devops": ["tool1", "tool2"]
  }
  `;

  try {
    const response = await callLLM(prompt);
    return JSON.parse(response.content);
  } catch (error) {
    logger.error('Failed to recommend technologies', { error: formatError(error) });
    return {
      frontend: [],
      backend: [],
      database: [],
      devops: []
    };
  }
};

/**
 * Generate follow-up questions based on project information and interview answers
 * @param projectInfo The project information
 * @param interviewAnswers The interview answers
 * @returns The follow-up questions
 */
export const generateFollowUpQuestions = async (
  projectInfo: { name: string; description: string; type: string },
  interviewAnswers: { [key: string]: string }
): Promise<string[]> => {
  const prompt = `
  Based on the following project information and interview answers, generate relevant follow-up questions
  to gather more details about the project requirements and technical needs.

  Project Information:
  Name: ${projectInfo.name}
  Description: ${projectInfo.description}
  Type: ${projectInfo.type}

  Interview Answers:
  ${Object.entries(interviewAnswers)
    .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
    .join('\n\n')}

  Generate 3-5 specific follow-up questions that would help clarify requirements or technical decisions.
  Format each question on a new line starting with "- ".
  `;

  try {
    const response = await callLLM(prompt);
    return response.content
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(2).trim());
  } catch (error) {
    logger.error('Failed to generate follow-up questions', { error: formatError(error) });
    return [];
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
  projectInfo: { name: string; description: string; type: string },
  analysisContext: { projectType: string; languages: string; frameworks: string; existingDocs: string },
  interviewAnswers: { [key: string]: string }
): Promise<string[]> => {
  const prompt = `
  Based on the following project information, analysis context, and interview answers,
  generate relevant follow-up questions to gather more details about improving the project's documentation.

  Project Information:
  Name: ${projectInfo.name}
  Description: ${projectInfo.description}
  Type: ${projectInfo.type}

  Analysis Context:
  Project Type: ${analysisContext.projectType}
  Languages: ${analysisContext.languages}
  Frameworks: ${analysisContext.frameworks}
  Existing Documentation: ${analysisContext.existingDocs}

  Interview Answers:
  ${Object.entries(interviewAnswers)
    .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
    .join('\n\n')}

  Generate 3-5 specific follow-up questions that would help:
  1. Identify gaps in the current documentation
  2. Understand pain points in the development process
  3. Determine what types of documentation would be most beneficial
  4. Clarify technical requirements or architecture decisions

  Format each question on a new line starting with "- ".
  `;

  try {
    const response = await callLLM(prompt);
    return response.content
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().substring(2).trim());
  } catch (error) {
    logger.error('Failed to generate follow-up questions for existing project', {
      error: formatError(error)
    });
    return [];
  }
};

/**
 * Recommend technologies with context from detected technologies
 * @param projectInfo The project information
 * @param detectedTech The detected technologies
 * @returns The recommended technologies
 */
export const recommendTechnologiesWithContext = async (
  projectInfo: { name: string; description: string; type: string },
  detectedTech: string[]
): Promise<{ frontend: string[]; backend: string[]; database: string[]; devops: string[] }> => {
  const prompt = `
  Given the following project information and detected technologies, recommend appropriate additional or alternative technologies for each category.

  Project Information:
  Name: ${projectInfo.name}
  Description: ${projectInfo.description}
  Type: ${projectInfo.type}

  Detected Technologies:
  ${detectedTech.join(', ')}

  Please provide specific technology recommendations in these categories, taking into account the existing technologies:
  1. Frontend technologies (complementary to or replacing existing ones)
  2. Backend technologies (complementary to or replacing existing ones)
  3. Database technologies (complementary to or replacing existing ones)
  4. DevOps tools and platforms (complementary to or replacing existing ones)

  Format your response as a JSON object with these arrays:
  {
    "frontend": ["tech1", "tech2"],
    "backend": ["tech1", "tech2"],
    "database": ["tech1", "tech2"],
    "devops": ["tool1", "tool2"]
  }

  Consider compatibility with existing technologies and modern best practices.
  `;

  try {
    const response = await callLLM(prompt);
    return JSON.parse(response.content);
  } catch (error) {
    logger.error('Failed to recommend technologies with context', {
      error: formatError(error)
    });
    return {
      frontend: [],
      backend: [],
      database: [],
      devops: []
    };
  }
};

/**
 * Check if the LLM is available
 * @returns Whether the LLM is available
 */
export const isLLMApiAvailable = (): boolean => {
  return isLLMAvailable();
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
  projectInfo: { name: string; description: string; type: string },
  documentType: string,
  options: { improveFormatting?: boolean; addExamples?: boolean; expandExplanations?: boolean; addReferences?: boolean; checkConsistency?: boolean } = {}
): Promise<string> => {
  const prompt = `
  Enhance the following ${documentType} documentation for the project:
  ${projectInfo.name} (${projectInfo.type})
  ${projectInfo.description}

  Original Content:
  ${content}

  Enhancement Requirements:
  ${options.improveFormatting ? '- Improve formatting and structure\n' : ''}
  ${options.addExamples ? '- Add relevant code examples\n' : ''}
  ${options.expandExplanations ? '- Expand technical explanations\n' : ''}
  ${options.addReferences ? '- Add references to related documentation\n' : ''}
  ${options.checkConsistency ? '- Check and fix any inconsistencies\n' : ''}

  Please provide the enhanced documentation while maintaining technical accuracy and clarity.
  `;

  try {
    const response = await callLLM(prompt);
    return response.content;
  } catch (error) {
    logger.error('Failed to enhance documentation', { error: formatError(error) });
    return content;
  }
};