/**
 * Claude Provider
 * Anthropic Claude API implementation
 */

import { BaseProvider } from './base-provider';
import type {
  AIProviderType,
  AIMessage,
  AIRequestOptions,
  AIProviderResponse,
} from '../../domain/interfaces/llm-provider';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
}

interface ClaudeResponse {
  content: { type: string; text: string }[];
  usage: { input_tokens: number; output_tokens: number };
  error?: { type: string; message: string };
}

export class ClaudeProvider extends BaseProvider {
  readonly id: AIProviderType = 'claude';
  readonly name = 'Anthropic Claude';
  private readonly API_VERSION = '2023-06-01';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await this.makeRequest<ClaudeResponse>({
        url: `${this.config.endpoint}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': this.API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });
      return !response.error && !!response.content;
    } catch {
      return false;
    }
  }

  async generateText(
    messages: AIMessage[],
    apiKey: string,
    options?: AIRequestOptions
  ): Promise<AIProviderResponse> {
    const { claudeMessages, systemPrompt } = this.convertMessages(messages);

    const requestBody: ClaudeRequest = {
      model: options?.model || this.config.defaultModel,
      messages: claudeMessages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    };

    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    try {
      const response = await this.makeRequest<ClaudeResponse>({
        url: `${this.config.endpoint}/messages`,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': this.API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.error) {
        return {
          success: false,
          content: '',
          error: response.error.message,
          errorCode: response.error.type,
        };
      }

      const generatedText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      return {
        success: true,
        content: generatedText,
        tokensUsed: response.usage
          ? response.usage.input_tokens + response.usage.output_tokens
          : undefined,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private convertMessages(messages: AIMessage[]): {
    claudeMessages: ClaudeMessage[];
    systemPrompt: string | null;
  } {
    const claudeMessages: ClaudeMessage[] = [];
    let systemPrompt: string | null = null;

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        claudeMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { claudeMessages, systemPrompt };
  }
}
