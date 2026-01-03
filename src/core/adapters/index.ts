/**
 * Adapters Layer
 * External integrations for the AI-PKM Companion plugin
 */

// LLM Providers
export {
  BaseProvider,
  ClaudeProvider,
  OpenAIProvider,
  GeminiProvider,
  createLLMProvider,
  createAllProviders,
} from './llm';

export type {
  ILLMProvider,
  AIProviderType,
  AIMessage,
  AIRequestOptions,
  AIProviderResponse,
} from './llm';
