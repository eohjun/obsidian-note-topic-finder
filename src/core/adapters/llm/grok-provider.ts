/**
 * Grok Provider
 * xAI Grok API implementation (OpenAI-compatible)
 */

import { BaseProvider } from './base-provider';
import type {
  AIProviderType,
  AIMessage,
  AIRequestOptions,
  AIProviderResponse,
} from '../../domain/interfaces/llm-provider';

interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GrokRequest {
  model: string;
  messages: GrokMessage[];
  max_tokens?: number;
  temperature?: number;
}

interface GrokResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

export class GrokProvider extends BaseProvider {
  readonly id: AIProviderType = 'grok';
  readonly name = 'xAI Grok';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<GrokResponse>({
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });
      return !response.error && response.choices && response.choices.length > 0;
    } catch {
      return false;
    }
  }

  async generateText(
    messages: AIMessage[],
    apiKey: string,
    options?: AIRequestOptions
  ): Promise<AIProviderResponse> {
    const grokMessages = this.convertMessages(messages);

    const requestBody: GrokRequest = {
      model: options?.model || this.config.defaultModel,
      messages: grokMessages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    };

    try {
      const response = await this.makeRequest<GrokResponse>({
        url: `${this.config.endpoint}/chat/completions`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.error) {
        return {
          success: false,
          content: '',
          error: response.error.message,
          errorCode: response.error.code || response.error.type,
        };
      }

      if (!response.choices || response.choices.length === 0) {
        return {
          success: false,
          content: '',
          error: 'No response generated',
          errorCode: 'EMPTY_RESPONSE',
        };
      }

      const generatedText = response.choices[0].message.content;

      return {
        success: true,
        content: generatedText,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private convertMessages(messages: AIMessage[]): GrokMessage[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}
