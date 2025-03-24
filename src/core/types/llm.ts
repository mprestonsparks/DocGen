/**
 * Type definitions for LLM integrations
 */

export interface LLMProviderConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export type LLMProvider = 'anthropic' | 'openai' | 'cohere' | 'fallback';

export interface LLMProviderConfigs {
  anthropic?: LLMProviderConfig;
  openai?: LLMProviderConfig;
  cohere?: LLMProviderConfig;
  fallback?: LLMProviderConfig;
}

export interface LLMConfig {
  provider: LLMProvider;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  providerConfigs: LLMProviderConfigs;
  timeout?: number;
}

export interface LLMResponse {
  text: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
}

export interface CohereGenerateRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
}

export interface CohereGeneration {
  text: string;
}

export interface CohereClient {
  generate(options: CohereGenerateRequest): Promise<{
    generations: CohereGeneration[];
  }>;
}

export interface LLMStreamOptions {
  onChunk: (chunk: string) => void;
  onProgress?: (progress: { tokensProcessed: number; estimatedTotal: number }) => void;
  onError?: (error: Error) => void;
  onComplete?: (fullResponse: LLMResponse) => void;
}

// Re-export OpenAI types
export type { OpenAI } from 'openai';
