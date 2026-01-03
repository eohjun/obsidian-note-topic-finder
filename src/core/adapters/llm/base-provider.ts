/**
 * BaseProvider Abstract Class
 * Common functionality for all LLM providers
 */

import { requestUrl, RequestUrlParam } from 'obsidian';
import type {
  ILLMProvider,
  AIProviderType,
  AIMessage,
  AIRequestOptions,
  AIProviderResponse,
} from '../../domain/interfaces/llm-provider';
import { AI_PROVIDERS } from '../../domain/constants/model-configs';

export abstract class BaseProvider implements ILLMProvider {
  abstract readonly id: AIProviderType;
  abstract readonly name: string;

  get config() {
    return AI_PROVIDERS[this.id];
  }

  /**
   * HTTP request wrapper using Obsidian's requestUrl
   */
  protected async makeRequest<T>(options: RequestUrlParam): Promise<T> {
    try {
      const response = await requestUrl(options);
      return response.json as T;
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Handle errors and return normalized response
   */
  protected handleError(error: unknown): AIProviderResponse {
    const normalized = this.normalizeError(error);
    return {
      success: false,
      content: '',
      error: normalized.message,
      errorCode: normalized.code,
    };
  }

  /**
   * Normalize various error types to standard format
   */
  private normalizeError(error: unknown): { message: string; code: string } {
    if (error instanceof Error) {
      // Rate limit detection
      if (error.message.includes('429') || error.message.includes('rate')) {
        return { message: 'Rate limit exceeded. Please try again later.', code: 'RATE_LIMIT' };
      }
      // Authentication error
      if (error.message.includes('401') || error.message.includes('403')) {
        return { message: 'Invalid API key or unauthorized access.', code: 'AUTH_ERROR' };
      }
      // Timeout
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return { message: 'Request timed out. Please try again.', code: 'TIMEOUT' };
      }
      return { message: error.message, code: 'UNKNOWN' };
    }
    return { message: 'An unknown error occurred', code: 'UNKNOWN' };
  }

  /**
   * Estimate token count (approximate)
   * Korean: ~2 chars = 1 token, English: ~4 chars = 1 token
   */
  protected estimateTokens(text: string): number {
    const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
    const otherChars = text.length - koreanChars;
    return Math.ceil(koreanChars / 2 + otherChars / 4);
  }

  abstract testApiKey(apiKey: string): Promise<boolean>;
  abstract generateText(
    messages: AIMessage[],
    apiKey: string,
    options?: AIRequestOptions
  ): Promise<AIProviderResponse>;
}
