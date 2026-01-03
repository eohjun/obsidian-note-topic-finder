/**
 * Gemini Provider
 * Google Gemini API implementation
 */

import { BaseProvider } from './base-provider';
import type {
  AIProviderType,
  AIMessage,
  AIRequestOptions,
  AIProviderResponse,
} from '../../domain/interfaces/llm-provider';

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: { text: string }[];
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiProvider extends BaseProvider {
  readonly id: AIProviderType = 'gemini';
  readonly name = 'Google Gemini';

  async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const model = this.config.defaultModel;
      const url = `${this.config.endpoint}/models/${model}:generateContent?key=${apiKey}`;

      const response = await this.makeRequest<GeminiResponse>({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Hello' }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 10,
          },
        }),
      });

      return !response.error && !!response.candidates && response.candidates.length > 0;
    } catch {
      return false;
    }
  }

  async generateText(
    messages: AIMessage[],
    apiKey: string,
    options?: AIRequestOptions
  ): Promise<AIProviderResponse> {
    const { contents, systemInstruction } = this.convertMessages(messages);

    const model = options?.model || this.config.defaultModel;
    const url = `${this.config.endpoint}/models/${model}:generateContent?key=${apiKey}`;

    const requestBody: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 4096,
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction;
    }

    try {
      const response = await this.makeRequest<GeminiResponse>({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.error) {
        return {
          success: false,
          content: '',
          error: response.error.message,
          errorCode: response.error.status || String(response.error.code),
        };
      }

      if (!response.candidates || response.candidates.length === 0) {
        return {
          success: false,
          content: '',
          error: 'No response generated',
          errorCode: 'EMPTY_RESPONSE',
        };
      }

      const generatedText = response.candidates[0].content.parts
        .map((part) => part.text)
        .join('');

      return {
        success: true,
        content: generatedText,
        tokensUsed: response.usageMetadata?.totalTokenCount,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private convertMessages(messages: AIMessage[]): {
    contents: GeminiContent[];
    systemInstruction: { parts: { text: string }[] } | null;
  } {
    const contents: GeminiContent[] = [];
    let systemInstruction: { parts: { text: string }[] } | null = null;

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = {
          parts: [{ text: msg.content }],
        };
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return { contents, systemInstruction };
  }
}
