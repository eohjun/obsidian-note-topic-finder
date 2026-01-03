/**
 * LLM Providers
 */

export { BaseProvider } from './base-provider';
export { ClaudeProvider } from './claude-provider';
export { OpenAIProvider } from './openai-provider';
export { GeminiProvider } from './gemini-provider';
export { GrokProvider } from './grok-provider';

// Re-export types from domain layer
export type {
  ILLMProvider,
  AIProviderType,
  AIMessage,
  AIRequestOptions,
  AIProviderResponse,
} from '../../domain/interfaces/llm-provider';

import type { AIProviderType, ILLMProvider } from '../../domain/interfaces/llm-provider';
import { ClaudeProvider } from './claude-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { GrokProvider } from './grok-provider';

/**
 * Create LLM provider instance by type
 */
export function createLLMProvider(type: AIProviderType): ILLMProvider {
  switch (type) {
    case 'claude':
      return new ClaudeProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'gemini':
      return new GeminiProvider();
    case 'grok':
      return new GrokProvider();
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Create all available providers
 */
export function createAllProviders(): Map<AIProviderType, ILLMProvider> {
  const providers = new Map<AIProviderType, ILLMProvider>();
  providers.set('claude', new ClaudeProvider());
  providers.set('openai', new OpenAIProvider());
  providers.set('gemini', new GeminiProvider());
  providers.set('grok', new GrokProvider());
  return providers;
}
