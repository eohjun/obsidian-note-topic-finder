/**
 * GeneratePermanentNote Use Case
 * Generates a permanent note from analysis result following Zettelkasten principles
 */

import type { AnalysisResult } from '../../domain/entities/analysis-result';
import type { AIMessage } from '../../domain/interfaces/llm-provider';
import { AIService, getAIService } from '../services/ai-service';
import { CostTracker } from '../services/cost-tracker';

export interface PermanentNoteContent {
  title: string;
  timestamp: string;
  keyIdeas: string[];
  detailedDescription: {
    definition: string;
    mechanism: string;
    limitations: string;
  };
  connectedThoughts: {
    relatedConcepts: string[];
    parentConcepts: string[];
    opposingConcepts: string[];
  };
  applicationExamples: Array<{
    title: string;
    description: string;
  }>;
  suggestedTags: string[];
}

export interface GeneratePermanentNoteRequest {
  analysisResult: AnalysisResult;
  language?: string;
}

export interface GeneratePermanentNoteResponse {
  success: boolean;
  note?: PermanentNoteContent;
  markdown?: string;
  error?: string;
  tokensUsed?: number;
}

export class GeneratePermanentNoteUseCase {
  private aiService: AIService;
  private costTracker?: CostTracker;

  constructor(aiService?: AIService, costTracker?: CostTracker) {
    this.aiService = aiService ?? getAIService()!;
    this.costTracker = costTracker;
  }

  async execute(request: GeneratePermanentNoteRequest): Promise<GeneratePermanentNoteResponse> {
    const { analysisResult, language = 'auto' } = request;

    // Build system prompt for permanent note generation
    const systemPrompt = this.buildSystemPrompt(language);

    // Build user prompt from analysis result
    const userPrompt = this.buildUserPrompt(analysisResult);

    try {
      // Use feature-specific model for permanent note generation
      const response = await this.aiService.simpleGenerateForFeature(
        'permanent-note',
        userPrompt,
        systemPrompt,
        { temperature: 0.4 }
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
      const { provider: providerType, model } = this.aiService.getFeatureConfig('permanent-note');
      if (this.costTracker && response.tokensUsed) {
        this.costTracker.trackUsage(
          providerType,
          model,
          Math.floor(response.tokensUsed * 0.6),
          Math.floor(response.tokensUsed * 0.4),
          'permanent-note'
        );
      }

      // Generate markdown
      const markdown = this.generateMarkdown(parsed);

      return {
        success: true,
        note: parsed,
        markdown,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildSystemPrompt(language: string): string {
    const langInstruction = language === 'auto'
      ? 'Respond in Korean by default, but match the input language if clearly different.'
      : `Respond in ${language}.`;

    return `You are an expert PKM (Personal Knowledge Management) assistant specialized in creating Zettelkasten permanent notes.

${langInstruction}

Your task is to transform content analysis into a well-structured permanent note following strict Zettelkasten principles.

IMPORTANT RULES:
1. 핵심 아이디어 (Key Ideas): 3-5 bullet points capturing core insights
2. 상세 설명 (Detailed Description): Must have 3 subsections with ≥350 total characters
   - Definition: What is it?
   - Mechanism: How does it work?
   - Limitations: What are its boundaries or weaknesses?
3. 연결된 생각 (Connected Thoughts): Keywords ONLY, no links or sentences
   - 관련 개념 (Related concepts): 3-5 keywords
   - 상위 개념 (Parent concepts): 2-3 keywords
   - 대립 개념 (Opposing concepts): 1-2 keywords
4. 적용 예시 (Application Examples): ≥3 real-world scenarios, not tool-focused
5. 관련 태그: 6-10 tags without # prefix

You MUST respond in the following JSON format only:
{
  "title": "A concise title capturing the main concept",
  "keyIdeas": ["idea 1", "idea 2", "idea 3"],
  "detailedDescription": {
    "definition": "Clear definition of the concept (≥100 chars)",
    "mechanism": "How it works or operates (≥100 chars)",
    "limitations": "Boundaries, weaknesses, or caveats (≥100 chars)"
  },
  "connectedThoughts": {
    "relatedConcepts": ["keyword1", "keyword2", "keyword3"],
    "parentConcepts": ["parent1", "parent2"],
    "opposingConcepts": ["opposite1"]
  },
  "applicationExamples": [
    {"title": "Example 1", "description": "Real-world application scenario"},
    {"title": "Example 2", "description": "Another practical scenario"},
    {"title": "Example 3", "description": "Third application scenario"}
  ],
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}`;
  }

  private buildUserPrompt(analysisResult: AnalysisResult): string {
    return `Based on the following content analysis, create a permanent note:

**Title Suggestion**: ${analysisResult.suggestedTitle}

**Summary**:
${analysisResult.summary}

**Key Insights**:
${analysisResult.keyInsights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

**Suggested Tags**: ${analysisResult.suggestedTags.join(', ')}

**Related Topics**: ${analysisResult.relatedTopics.join(', ')}

Transform this into a comprehensive permanent note following the Zettelkasten format.`;
  }

  private parseResponse(responseContent: string): PermanentNoteContent | null {
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.title || !parsed.keyIdeas || !parsed.detailedDescription) {
        console.error('Missing required fields in response');
        return null;
      }

      // Generate timestamp
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

      return {
        title: parsed.title,
        timestamp,
        keyIdeas: parsed.keyIdeas || [],
        detailedDescription: {
          definition: parsed.detailedDescription.definition || '',
          mechanism: parsed.detailedDescription.mechanism || '',
          limitations: parsed.detailedDescription.limitations || '',
        },
        connectedThoughts: {
          relatedConcepts: parsed.connectedThoughts?.relatedConcepts || [],
          parentConcepts: parsed.connectedThoughts?.parentConcepts || [],
          opposingConcepts: parsed.connectedThoughts?.opposingConcepts || [],
        },
        applicationExamples: parsed.applicationExamples || [],
        suggestedTags: parsed.suggestedTags || [],
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return null;
    }
  }

  private generateMarkdown(note: PermanentNoteContent): string {
    const frontmatter = `---
id: "${note.timestamp}"
created: "${new Date().toISOString()}"
type: permanent
status: seedling
tags:
${note.suggestedTags.map(t => `  - ${t.replace(/\s+/g, '_')}`).join('\n')}
---`;

    const keyIdeasSection = note.keyIdeas.map(idea => `- ${idea}`).join('\n');

    const detailedSection = `#### 정의 (Definition)

${note.detailedDescription.definition}

#### 작동 원리 (Mechanism)

${note.detailedDescription.mechanism}

#### 한계 및 주의점 (Limitations)

${note.detailedDescription.limitations}`;

    const connectedThoughtsSection = `- 관련 개념: ${note.connectedThoughts.relatedConcepts.join(', ')}
- 상위 개념: ${note.connectedThoughts.parentConcepts.join(', ')}
- 대립 개념: ${note.connectedThoughts.opposingConcepts.join(', ')}`;

    const examplesSection = note.applicationExamples
      .map(ex => `#### ${ex.title}\n\n${ex.description}`)
      .join('\n\n');

    const tagsSection = note.suggestedTags.map(t => `#${t.replace(/\s+/g, '_')}`).join(' ');

    return `${frontmatter}

# ${note.timestamp} ${note.title}

## 핵심 아이디어

${keyIdeasSection}

## 상세 설명

${detailedSection}

## 연결된 생각

${connectedThoughtsSection}

## 적용 예시

${examplesSection}

## 참고 자료

> 참고 자료는 분석 원본을 기반으로 추가해주세요.

### 🔗 연결된 노트

> 볼트의 다른 노트와 연결하여 지식 네트워크를 확장해주세요.

### 🏷️ 관련 태그

${tagsSection}
`;
  }
}
