/**
 * Adapters Layer
 * External integrations for the Note Topic Finder plugin
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
