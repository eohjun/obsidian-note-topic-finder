/**
 * SuggestNoteTopics Use Case
 * Suggests permanent note topics from analysis result
 */

import type { AnalysisResult } from '../../domain/entities/analysis-result';
import { AIService, getAIService } from '../services/ai-service';
import { CostTracker } from '../services/cost-tracker';

export interface NoteTopic {
  title: string;
  rationale: string;
  keyPoints: string[];
  suggestedTags: string[];
}

export interface SuggestNoteTopicsRequest {
  analysisResult: AnalysisResult;
  language?: string;
  count?: number;
}

export interface SuggestNoteTopicsResponse {
  success: boolean;
  topics?: NoteTopic[];
  error?: string;
  tokensUsed?: number;
}

export class SuggestNoteTopicsUseCase {
  private aiService: AIService;
  private costTracker?: CostTracker;

  constructor(aiService?: AIService, costTracker?: CostTracker) {
    this.aiService = aiService ?? getAIService()!;
    this.costTracker = costTracker;
  }

  async execute(request: SuggestNoteTopicsRequest): Promise<SuggestNoteTopicsResponse> {
    const { analysisResult, language = 'auto', count = 4 } = request;

    const systemPrompt = this.buildSystemPrompt(language, count);
    const userPrompt = this.buildUserPrompt(analysisResult);

    try {
      const response = await this.aiService.simpleGenerateForFeature(
        'permanent-note',
        userPrompt,
        systemPrompt,
        { temperature: 0.5 }
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error || 'LLM generation failed',
        };
      }

      const parsed = this.parseResponse(response.content);
      if (!parsed) {
        return {
          success: false,
          error: 'Failed to parse LLM response',
        };
      }

      // Track cost
      const { provider: providerType, model } = this.aiService.getFeatureConfig('permanent-note');
      if (this.costTracker && response.tokensUsed) {
        this.costTracker.trackUsage(
          providerType,
          model,
          Math.floor(response.tokensUsed * 0.6),
          Math.floor(response.tokensUsed * 0.4),
          'suggest-topics'
        );
      }

      return {
        success: true,
        topics: parsed,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildSystemPrompt(language: string, count: number): string {
    const langInstruction = language === 'auto'
      ? 'Respond in Korean by default, but match the input language if clearly different.'
      : `Respond in ${language}.`;

    return `You are an expert PKM (Personal Knowledge Management) consultant specializing in Zettelkasten methodology.

${langInstruction}

Your task is to identify ${count} distinct concepts or ideas from the content analysis that would make excellent permanent notes.

Guidelines for selecting topics:
1. **Atomic**: Each topic should be a single, focused concept (not a broad category)
2. **Evergreen**: Topics should have lasting value, not time-sensitive information
3. **Connectable**: Topics that can connect to other knowledge areas
4. **Actionable**: Ideas that can influence thinking or behavior
5. **Original**: Prioritize unique insights over common knowledge

For each topic, provide:
- title: A clear, specific title (3-8 words)
- rationale: Why this deserves to be a permanent note (1-2 sentences)
- keyPoints: 3-4 specific aspects to explore when writing the note
- suggestedTags: 3-5 relevant tags for categorization

You MUST respond in this JSON format only:
{
  "topics": [
    {
      "title": "Concept title",
      "rationale": "Why this is worth capturing as permanent knowledge",
      "keyPoints": ["aspect 1", "aspect 2", "aspect 3"],
      "suggestedTags": ["tag1", "tag2", "tag3"]
    }
  ]
}`;
  }

  private buildUserPrompt(analysisResult: AnalysisResult): string {
    return `Based on this content analysis, suggest permanent note topics:

**Title**: ${analysisResult.suggestedTitle}

**Summary**:
${analysisResult.summary}

**Key Insights**:
${analysisResult.keyInsights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

**Related Topics**: ${analysisResult.relatedTopics.join(', ')}

**Tags**: ${analysisResult.suggestedTags.join(', ')}

Identify the most valuable concepts that deserve their own permanent notes.`;
  }

  private parseResponse(responseContent: string): NoteTopic[] | null {
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.topics || !Array.isArray(parsed.topics)) {
        console.error('Missing topics array in response');
        return null;
      }

      return parsed.topics.map((t: any) => ({
        title: t.title || '',
        rationale: t.rationale || '',
        keyPoints: t.keyPoints || [],
        suggestedTags: t.suggestedTags || [],
      }));
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return null;
    }
  }
}
