/**
 * Anthropic service for Main MCP Server
 * Handles interactions with the Anthropic API for document generation and language tasks
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger, logError } from '../utils/logger';
import { EventEmitter } from 'events';

// Type definitions for Anthropic API
export interface AnthropicClientStatus {
  status: 'ok' | 'error' | 'warning';
  message: string;
  rateLimitRemaining?: string;
  rateLimitReset?: string;
}

export interface DocumentGenerationRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface DocumentGenerationResponse {
  id: string;
  content: string;
  model: string;
  finishReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface DocumentGenerationStreamResponse extends EventEmitter {
  id: string;
  model: string;
}

export interface StreamChunk {
  id: string;
  content: string;
  isDone: boolean;
}

export interface CodeCompletionRequest {
  code: string;
  language: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface CodeCompletionResponse {
  id: string;
  completion: string;
  model: string;
  finishReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface SemanticAnalysisRequest {
  text: string;
  analysisType: 'sentiment' | 'entities' | 'topics' | 'summary';
}

export interface SemanticAnalysisResponse {
  id: string;
  analysis: any; // Type depends on analysisType
  model: string;
}

export interface NaturalLanguageProcessingRequest {
  text: string;
  task: 'translation' | 'paraphrase' | 'grammar' | 'question-answering';
  options?: Record<string, any>;
}

export interface NaturalLanguageProcessingResponse {
  id: string;
  result: string;
  model: string;
}

// Anthropic client instance
let anthropic: Anthropic | null = null;

/**
 * Initialize the Anthropic API client
 */
export const setupAnthropicClient = (): void => {
  try {
    // Read Anthropic API key from Docker secret
    const keyPath = '/run/secrets/anthropic_key';
    let apiKey: string;
    
    if (fs.existsSync(keyPath)) {
      apiKey = fs.readFileSync(keyPath, 'utf8').trim();
    } else {
      // Fallback to environment variable
      apiKey = process.env.ANTHROPIC_API_KEY || '';
    }
    
    if (!apiKey) {
      throw new Error('Anthropic API key not found');
    }
    
    // Create Anthropic instance
    anthropic = new Anthropic({ apiKey });
    logger.info('Anthropic client initialized successfully');
  } catch (error) {
    logError('Failed to initialize Anthropic client', error as Error);
    throw error;
  }
};

/**
 * Get Anthropic client status
 */
export const getAnthropicClientStatus = async (): Promise<AnthropicClientStatus> => {
  try {
    if (!anthropic) {
      return {
        status: 'error',
        message: 'Anthropic client not initialized'
      };
    }
    
    // Simple check to see if the client is configured
    if (anthropic.apiKey) {
      return {
        status: 'ok',
        message: 'Anthropic API client configured'
      };
    } else {
      return {
        status: 'error',
        message: 'Anthropic API key not configured'
      };
    }
  } catch (error) {
    logError('Anthropic API client status check failed', error as Error);
    
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Generate document based on prompt
 */
export const generateDocument = async (
  request: DocumentGenerationRequest
): Promise<DocumentGenerationResponse> => {
  try {
    if (!anthropic) {
      throw new Error('Anthropic client not initialized');
    }
    
    if (!request.prompt) {
      throw new Error('Prompt is required');
    }
    
    const response = await anthropic.completions.create({
      model: 'claude-2.1',
      max_tokens_to_sample: request.maxTokens || 4000,
      temperature: request.temperature || 0.7,
      prompt: `\n\nHuman: ${request.prompt}\n\nAssistant: `,
      stop_sequences: request.stopSequences || ["\n\nHuman:"],
    });
    
    return {
      id: uuidv4(), // Generate a unique ID
      content: response.completion,
      model: response.model,
      finishReason: response.stop_reason || 'stop',
      usage: {
        inputTokens: 0, // Not provided in v0.7.0
        outputTokens: 0 // Not provided in v0.7.0
      }
    };
  } catch (error) {
    logError('Document generation failed', error as Error);
    throw error;
  }
};

/**
 * Generate document with streaming response
 */
export const generateDocumentStream = (
  request: DocumentGenerationRequest
): DocumentGenerationStreamResponse => {
  const streamEmitter = new EventEmitter() as DocumentGenerationStreamResponse;
  const streamId = uuidv4();
  
  streamEmitter.id = streamId;
  streamEmitter.model = 'claude-2.1';
  
  // Process in the background
  (async () => {
    try {
      if (!anthropic) {
        throw new Error('Anthropic client not initialized');
      }
      
      const stream = await anthropic.completions.create({
        model: 'claude-2.1',
        max_tokens_to_sample: request.maxTokens || 4000,
        temperature: request.temperature || 0.7,
        prompt: `\n\nHuman: ${request.prompt}\n\nAssistant: `,
        stop_sequences: request.stopSequences || ["\n\nHuman:"],
        stream: true,
      });
      
      let contentSoFar = '';
      
      for await (const completion of stream) {
        contentSoFar += completion.completion;
        
        const chunk: StreamChunk = {
          id: streamId,
          content: completion.completion,
          isDone: false
        };
        
        streamEmitter.emit('chunk', chunk);
      }
      
      // Emit the final chunk with isDone flag
      streamEmitter.emit('chunk', {
        id: streamId,
        content: '',
        isDone: true
      });
      
      // Emit the complete event with the full response
      streamEmitter.emit('complete', {
        id: streamId,
        content: contentSoFar,
        model: 'claude-2.1',
        finishReason: 'stop',
        usage: {
          inputTokens: 0,
          outputTokens: 0
        }
      });
      
    } catch (error) {
      logError('Document generation stream failed', error as Error);
      streamEmitter.emit('error', error);
    }
  })();
  
  return streamEmitter;
};

/**
 * Complete code based on context
 */
export const completeCode = async (
  request: CodeCompletionRequest
): Promise<CodeCompletionResponse> => {
  try {
    if (!anthropic) {
      throw new Error('Anthropic client not initialized');
    }
    
    if (!request.code || !request.language) {
      throw new Error('Code and language are required');
    }
    
    const prompt = `\n\nHuman: Complete the following ${request.language} code:\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n\nAssistant: `;
    
    const response = await anthropic.completions.create({
      model: 'claude-2.1',
      max_tokens_to_sample: request.maxTokens || 2000,
      temperature: request.temperature || 0.2,
      prompt: prompt,
      stop_sequences: ["\n\nHuman:"]
    });
    
    // Extract just the code from the response
    const completion = response.completion.trim();
    const codeRegex = new RegExp(`\`\`\`${request.language}\\s*([\\s\\S]*?)\\s*\`\`\``);
    const match = completion.match(codeRegex);
    const extractedCode = match ? match[1].trim() : completion;
    
    return {
      id: uuidv4(), // Generate a unique ID
      completion: extractedCode,
      model: response.model,
      finishReason: response.stop_reason || 'stop',
      usage: {
        inputTokens: 0, // Not provided in v0.7.0
        outputTokens: 0 // Not provided in v0.7.0
      }
    };
  } catch (error) {
    logError('Code completion failed', error as Error);
    throw error;
  }
};

/**
 * Perform semantic analysis on text
 */
export const performSemanticAnalysis = async (
  request: SemanticAnalysisRequest
): Promise<SemanticAnalysisResponse> => {
  try {
    if (!anthropic) {
      throw new Error('Anthropic client not initialized');
    }
    
    if (!request.text || !request.analysisType) {
      throw new Error('Text and analysisType are required');
    }
    
    let systemPrompt = "You are a semantic analysis assistant. ";
    let userPrompt = "";
    
    switch (request.analysisType) {
      case 'sentiment':
        systemPrompt += "Analyze the sentiment of the text and return a JSON object with polarity (positive/negative/neutral) and confidence score.";
        userPrompt = `Perform sentiment analysis on the following text and return only a JSON object:\n\n${request.text}`;
        break;
      case 'entities':
        systemPrompt += "Extract named entities from the text and return a JSON array of entities with type and text.";
        userPrompt = `Extract named entities from the following text and return only a JSON array:\n\n${request.text}`;
        break;
      case 'topics':
        systemPrompt += "Identify the main topics in the text and return a JSON array of topics with relevance scores.";
        userPrompt = `Identify the main topics in the following text and return only a JSON array:\n\n${request.text}`;
        break;
      case 'summary':
        systemPrompt += "Summarize the text and return a JSON object with a concise summary and key points.";
        userPrompt = `Summarize the following text and return only a JSON object:\n\n${request.text}`;
        break;
      default:
        throw new Error(`Unsupported analysis type: ${request.analysisType}`);
    }
    
    const prompt = `\n\nHuman: ${systemPrompt}\n${userPrompt}\n\nAssistant: `;
    
    const response = await anthropic.completions.create({
      model: 'claude-2.1',
      max_tokens_to_sample: 1000,
      temperature: 0.1,
      prompt: prompt,
      stop_sequences: ["\n\nHuman:"]
    });
    
    // Parse the JSON response
    const content = response.completion.trim();
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/{[\s\S]*}|\\[[\s\S]*\\]/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const analysis = JSON.parse(jsonStr);
    
    return {
      id: uuidv4(), // Generate a unique ID
      analysis,
      model: response.model
    };
  } catch (error) {
    logError('Semantic analysis failed', error as Error);
    throw error;
  }
};

/**
 * Process natural language request
 */
export const processNaturalLanguage = async (
  request: NaturalLanguageProcessingRequest
): Promise<NaturalLanguageProcessingResponse> => {
  try {
    if (!anthropic) {
      throw new Error('Anthropic client not initialized');
    }
    
    if (!request.text || !request.task) {
      throw new Error('Text and task are required');
    }
    
    let systemPrompt = "You are a natural language processing assistant. ";
    let userPrompt = "";
    
    switch (request.task) {
      case 'translation':
        const targetLanguage = request.options?.targetLanguage || 'English';
        systemPrompt += `Translate text to ${targetLanguage} accurately.`;
        userPrompt = `Translate the following text to ${targetLanguage}:\n\n${request.text}`;
        break;
      case 'paraphrase':
        systemPrompt += "Paraphrase the text while preserving its meaning.";
        userPrompt = `Paraphrase the following text:\n\n${request.text}`;
        break;
      case 'grammar':
        systemPrompt += "Correct grammar and improve the text without changing its meaning.";
        userPrompt = `Correct the grammar in the following text:\n\n${request.text}`;
        break;
      case 'question-answering':
        const context = request.options?.context || '';
        systemPrompt += "Answer questions based on the provided context.";
        userPrompt = context 
          ? `Context: ${context}\n\nQuestion: ${request.text}`
          : `Answer the following question: ${request.text}`;
        break;
      default:
        throw new Error(`Unsupported NLP task: ${request.task}`);
    }
    
    const prompt = `\n\nHuman: ${systemPrompt}\n${userPrompt}\n\nAssistant: `;
    
    const response = await anthropic.completions.create({
      model: 'claude-2.1',
      max_tokens_to_sample: 2000,
      temperature: 0.7,
      prompt: prompt,
      stop_sequences: ["\n\nHuman:"]
    });
    
    return {
      id: uuidv4(), // Generate a unique ID
      result: response.completion,
      model: response.model
    };
  } catch (error) {
    logError('Natural language processing failed', error as Error);
    throw error;
  }
};
