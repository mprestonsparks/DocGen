/**
 * Type definitions for Anthropic API interactions
 */

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

export interface CodeCompletionRequest {
  code: string;
  language: string;
  maxTokens?: number;
  temperature?: number;
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
