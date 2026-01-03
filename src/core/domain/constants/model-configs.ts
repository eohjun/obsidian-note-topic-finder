/**
 * Model Configurations
 * Centralized model settings, pricing, and token limits
 */

import type { AIProviderType, AIProviderConfig } from '../interfaces/llm-provider';

export interface ModelConfig {
  id: string;
  displayName: string;
  provider: AIProviderType;
  inputCostPer1M: number;
  outputCostPer1M: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportsVision: boolean;
  supportsStreaming: boolean;
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Claude Models
  'claude-sonnet': {
    id: 'claude-sonnet-4-20250514',
    displayName: 'Claude Sonnet 4',
    provider: 'claude',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
  },
  'claude-haiku': {
    id: 'claude-3-5-haiku-20241022',
    displayName: 'Claude 3.5 Haiku',
    provider: 'claude',
    inputCostPer1M: 0.8,
    outputCostPer1M: 4.0,
    maxInputTokens: 200000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
  },

  // Gemini Models
  'gemini-flash': {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    provider: 'gemini',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.3,
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
  },
  'gemini-pro': {
    id: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    provider: 'gemini',
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.0,
    maxInputTokens: 2000000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsStreaming: true,
  },

  // OpenAI Models
  'gpt-4o': {
    id: 'gpt-4o',
    displayName: 'GPT-4o',
    provider: 'openai',
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsStreaming: true,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
    maxInputTokens: 128000,
    maxOutputTokens: 16384,
    supportsVision: true,
    supportsStreaming: true,
  },

  // Grok Models
  'grok-3-mini': {
    id: 'grok-3-mini',
    displayName: 'Grok 3 Mini',
    provider: 'grok',
    inputCostPer1M: 0.3,
    outputCostPer1M: 0.5,
    maxInputTokens: 131072,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsStreaming: true,
  },
};

/**
 * Provider configurations
 */
export const AI_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    displayName: 'Claude',
    endpoint: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    displayName: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyPrefix: 'AIza',
    defaultModel: 'gemini-2.0-flash',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    displayName: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    apiKeyPrefix: 'sk-',
    defaultModel: 'gpt-4o-mini',
  },
  grok: {
    id: 'grok',
    name: 'xAI Grok',
    displayName: 'Grok',
    endpoint: 'https://api.x.ai/v1',
    defaultModel: 'grok-3-mini',
  },
};

/**
 * Calculate estimated cost for token usage
 */
export function calculateCost(
  modelKey: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_CONFIGS[modelKey];
  if (!config) return 0;

  const inputCost = (inputTokens / 1_000_000) * config.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * config.outputCostPer1M;
  return inputCost + outputCost;
}

/**
 * Get models for a specific provider
 */
export function getModelsByProvider(provider: AIProviderType): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter((m: ModelConfig) => m.provider === provider);
}

/**
 * Get model configuration by model ID
 */
export function getModelConfigById(modelId: string): ModelConfig | undefined {
  return Object.values(MODEL_CONFIGS).find((m: ModelConfig) => m.id === modelId);
}

/**
 * Estimate token count from text
 * Rough approximation: ~4 chars = 1 token for English, ~2 chars = 1 token for Korean
 */
export function estimateTokens(text: string): number {
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  const otherChars = text.length - koreanChars;
  return Math.ceil(koreanChars / 2 + otherChars / 4);
}
