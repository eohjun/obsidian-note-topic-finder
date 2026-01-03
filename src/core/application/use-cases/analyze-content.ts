/**
 * AnalyzeContent Use Case
 * Analyzes content (URL or text) using LLM and extracts insights
 */

import { AnalysisResult, SourceType } from '../../domain/entities/analysis-result';
import type { AIMessage } from '../../domain/interfaces/llm-provider';
import { AIService, getAIService } from '../services/ai-service';
import { CostTracker } from '../services/cost-tracker';
import { estimateTokens } from '../../domain/constants/model-configs';
import { ContentTooLongError, InvalidResponseError } from '../../domain/errors/ai-errors';

export interface AnalyzeContentRequest {
  content: string;
  sourceType: SourceType;
  sourceUrl?: string;
  language?: string;
  detailLevel?: 'brief' | 'standard' | 'detailed';
}

export interface AnalyzeContentResponse {
  success: boolean;
  result?: AnalysisResult;
  error?: string;
  tokensUsed?: number;
}

interface LLMAnalysisOutput {
  summary: string;
  keyInsights: string[];
  suggestedTags: string[];
  relatedTopics: string[];
}

export class AnalyzeContentUseCase {
  private aiService: AIService;
  private costTracker?: CostTracker;

  constructor(aiService?: AIService, costTracker?: CostTracker) {
    this.aiService = aiService ?? getAIService()!;
    this.costTracker = costTracker;
  }

  async execute(request: AnalyzeContentRequest): Promise<AnalyzeContentResponse> {
    const { content, sourceType, sourceUrl, language = 'auto', detailLevel = 'standard' } = request;

    // Validate content length
    const estimatedTokens = estimateTokens(content);
    if (estimatedTokens > 100000) {
      return {
        success: false,
        error: 'Content too long. Please provide shorter content.',
      };
    }

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(language, detailLevel);

    // Build user prompt
    const userPrompt = this.buildUserPrompt(content, sourceType, sourceUrl);

    // Call LLM
    try {
      const response = await this.aiService.simpleGenerate(
        userPrompt,
        systemPrompt,
        { temperature: 0.3 } // Lower temperature for more consistent output
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'LLM generation failed',
        };
      }

      // Parse LLM response
      const parsed = this.parseResponse(response.content);
      if (!parsed) {
        return {
          success: false,
          error: 'Failed to parse LLM response',
        };
      }

      // Track cost
      if (this.costTracker && response.tokensUsed) {
        this.costTracker.trackUsage(
          this.aiService.getCurrentProvider()?.id || 'unknown',
          this.aiService.getCurrentModel(),
          Math.floor(response.tokensUsed * 0.7), // Rough input estimate
          Math.floor(response.tokensUsed * 0.3), // Rough output estimate
          'analyze-content'
        );
      }

      // Create result
      const result = AnalysisResult.create({
        sourceType,
        sourceContent: content.slice(0, 1000), // Store first 1000 chars
        sourceUrl,
        summary: parsed.summary,
        keyInsights: parsed.keyInsights,
        suggestedTags: parsed.suggestedTags,
        relatedTopics: parsed.relatedTopics,
        tokensUsed: response.tokensUsed,
      });

      return {
        success: true,
        result,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildSystemPrompt(language: string, detailLevel: string): string {
    const langInstruction = language === 'auto'
      ? 'Respond in the same language as the input content.'
      : `Respond in ${language}.`;

    const detailInstruction = {
      brief: 'Keep the summary under 100 words. Provide 2-3 key insights.',
      standard: 'Provide a comprehensive summary (150-250 words). Provide 3-5 key insights.',
      detailed: 'Provide a detailed summary (300-400 words). Provide 5-7 key insights with examples.',
    }[detailLevel];

    return `You are an expert content analyst for a Personal Knowledge Management (PKM) system.
Your task is to analyze the provided content and extract structured insights.

${langInstruction}
${detailInstruction}

You MUST respond in the following JSON format only, with no additional text:
{
  "summary": "A clear, concise summary of the main points",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "relatedTopics": ["related topic 1", "related topic 2"]
}

Guidelines:
- summary: Capture the essence and main arguments
- keyInsights: Extract actionable or notable points that are worth remembering
- suggestedTags: Suggest 3-5 relevant tags for categorization (single words or short phrases, no # prefix)
- relatedTopics: Suggest 2-4 related topics or concepts for further exploration`;
  }

  private buildUserPrompt(content: string, sourceType: SourceType, sourceUrl?: string): string {
    const sourceInfo = sourceType === 'url' && sourceUrl
      ? `Source URL: ${sourceUrl}\n\n`
      : '';

    return `${sourceInfo}Please analyze the following content:

---
${content}
---

Provide your analysis in the specified JSON format.`;
  }

  private parseResponse(responseContent: string): LLMAnalysisOutput | null {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.summary || !Array.isArray(parsed.keyInsights)) {
        console.error('Missing required fields in response');
        return null;
      }

      return {
        summary: parsed.summary,
        keyInsights: parsed.keyInsights || [],
        suggestedTags: parsed.suggestedTags || [],
        relatedTopics: parsed.relatedTopics || [],
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return null;
    }
  }
}
