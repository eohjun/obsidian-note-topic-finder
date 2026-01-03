/**
 * AIService
 * Unified interface for LLM providers
 */

import type {
  ILLMProvider,
  AIProviderType,
  AIMessage,
  AIRequestOptions,
  AIProviderResponse,
  AISettings,
  FeatureType,
} from '../../domain/interfaces/llm-provider';
import { BudgetExceededError } from '../../domain/errors/ai-errors';
import { calculateCost, getModelConfigById } from '../../domain/constants/model-configs';

export class AIService {
  private providers: Map<AIProviderType, ILLMProvider> = new Map();
  private settings: AISettings;

  constructor(settings: AISettings) {
    this.settings = settings;
  }

  /**
   * Register a provider
   */
  registerProvider(provider: ILLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Update settings
   */
  updateSettings(settings: AISettings): void {
    this.settings = settings;
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): ILLMProvider | undefined {
    return this.providers.get(this.settings.provider);
  }

  /**
   * Get current API key
   */
  getCurrentApiKey(): string | undefined {
    return this.settings.apiKeys[this.settings.provider];
  }

  /**
   * Get current model
   */
  getCurrentModel(): string {
    return this.settings.models[this.settings.provider];
  }

  /**
   * Test current API key
   */
  async testCurrentApiKey(): Promise<boolean> {
    const provider = this.getCurrentProvider();
    const apiKey = this.getCurrentApiKey();
    if (!provider || !apiKey) return false;
    return provider.testApiKey(apiKey);
  }

  /**
   * Generate text completion
   */
  async generateText(
    messages: AIMessage[],
    options?: AIRequestOptions,
    currentSpend?: number
  ): Promise<AIProviderResponse> {
    const provider = this.getCurrentProvider();
    const apiKey = this.getCurrentApiKey();

    if (!provider) {
      return { success: false, content: '', error: 'No provider selected' };
    }
    if (!apiKey) {
      return { success: false, content: '', error: 'No API key configured' };
    }

    // Check budget before making request
    if (this.settings.budgetLimit && currentSpend !== undefined) {
      if (currentSpend >= this.settings.budgetLimit) {
        throw new BudgetExceededError(
          'Budget limit exceeded',
          currentSpend,
          this.settings.budgetLimit
        );
      }
    }

    const mergedOptions: AIRequestOptions = {
      model: this.settings.models[this.settings.provider],
      ...options,
    };

    return provider.generateText(messages, apiKey, mergedOptions);
  }

  /**
   * Simple generation helper
   */
  async simpleGenerate(
    userPrompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions,
    currentSpend?: number
  ): Promise<AIProviderResponse> {
    const messages: AIMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });
    return this.generateText(messages, options, currentSpend);
  }

  /**
   * Estimate cost for a response
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    const modelId = this.getCurrentModel();
    const modelConfig = getModelConfigById(modelId);
    if (!modelConfig) return 0;

    return calculateCost(
      Object.keys(modelConfig).find(
        (key) => modelConfig.id === modelId
      ) || '',
      inputTokens,
      outputTokens
    );
  }

  /**
   * Get feature-specific provider and model
   */
  getFeatureConfig(feature: FeatureType): { provider: AIProviderType; model: string } {
    const featureSettings = this.settings.featureModels?.[feature];
    if (featureSettings) {
      return {
        provider: featureSettings.provider,
        model: featureSettings.model,
      };
    }
    // Fallback to default provider/model
    return {
      provider: this.settings.provider,
      model: this.settings.models[this.settings.provider],
    };
  }

  /**
   * Generate text for a specific feature using its configured model
   */
  async generateForFeature(
    feature: FeatureType,
    messages: AIMessage[],
    options?: AIRequestOptions,
    currentSpend?: number
  ): Promise<AIProviderResponse> {
    const { provider: providerType, model } = this.getFeatureConfig(feature);
    const provider = this.providers.get(providerType);
    const apiKey = this.settings.apiKeys[providerType];

    if (!provider) {
      return { success: false, content: '', error: `Provider ${providerType} not available` };
    }
    if (!apiKey) {
      return { success: false, content: '', error: `No API key configured for ${providerType}` };
    }

    // Check budget before making request
    if (this.settings.budgetLimit && currentSpend !== undefined) {
      if (currentSpend >= this.settings.budgetLimit) {
        throw new BudgetExceededError(
          'Budget limit exceeded',
          currentSpend,
          this.settings.budgetLimit
        );
      }
    }

    const mergedOptions: AIRequestOptions = {
      model,
      ...options,
    };

    return provider.generateText(messages, apiKey, mergedOptions);
  }

  /**
   * Simple generation helper for a specific feature
   */
  async simpleGenerateForFeature(
    feature: FeatureType,
    userPrompt: string,
    systemPrompt?: string,
    options?: AIRequestOptions,
    currentSpend?: number
  ): Promise<AIProviderResponse> {
    const messages: AIMessage[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });
    return this.generateForFeature(feature, messages, options, currentSpend);
  }

  /**
   * Get all registered providers
   */
  getAvailableProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is configured (has API key)
   */
  isProviderConfigured(provider: AIProviderType): boolean {
    return !!this.settings.apiKeys[provider];
  }
}

// Singleton management
let aiServiceInstance: AIService | null = null;

export function initializeAIService(settings: AISettings): AIService {
  aiServiceInstance = new AIService(settings);
  return aiServiceInstance;
}

export function getAIService(): AIService | null {
  return aiServiceInstance;
}

export function updateAIServiceSettings(settings: AISettings): void {
  if (aiServiceInstance) {
    aiServiceInstance.updateSettings(settings);
  }
}

export function resetAIService(): void {
  aiServiceInstance = null;
}
