/**
 * LLM Provider Interface
 * Defines the contract for LLM provider implementations
 */

export type AIProviderType = 'claude' | 'gemini' | 'openai' | 'grok';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIProviderResponse {
  success: boolean;
  content: string;
  tokensUsed?: number;
  error?: string;
  errorCode?: string;
}

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  displayName: string;
  defaultModel: string;
  endpoint: string;
  apiKeyPrefix?: string;
}

/**
 * LLM Provider Interface
 * All LLM providers must implement this interface
 */
export interface ILLMProvider {
  readonly id: AIProviderType;
  readonly name: string;
  readonly config: AIProviderConfig;

  /**
   * Test if the API key is valid
   */
  testApiKey(apiKey: string): Promise<boolean>;

  /**
   * Generate text completion from messages
   */
  generateText(
    messages: AIMessage[],
    apiKey: string,
    options?: AIRequestOptions
  ): Promise<AIProviderResponse>;
}

/**
 * Feature-specific model settings
 */
export type FeatureType = 'content-analysis' | 'permanent-note';

export interface FeatureModelSettings {
  provider: AIProviderType;
  model: string;
}

/**
 * AI Service Settings Interface
 */
export interface AISettings {
  provider: AIProviderType;
  apiKeys: Partial<Record<AIProviderType, string>>;
  models: Record<AIProviderType, string>;
  featureModels: Partial<Record<FeatureType, FeatureModelSettings>>;
  defaultLanguage: string;
  budgetLimit?: number;
}
