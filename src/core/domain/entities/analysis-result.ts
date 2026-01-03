/**
 * AnalysisResult Entity
 * Represents the result of LLM content analysis
 */

export type SourceType = 'url' | 'text';

export interface AnalysisResultData {
  id: string;
  sourceType: SourceType;
  sourceContent: string;
  sourceUrl?: string;
  suggestedTitle: string;
  summary: string;
  keyInsights: string[];
  suggestedTags: string[];
  relatedTopics: string[];
  tokensUsed?: number;
  createdAt: Date;
}

export class AnalysisResult {
  private readonly _id: string;
  private readonly _sourceType: SourceType;
  private readonly _sourceContent: string;
  private readonly _sourceUrl?: string;
  private readonly _suggestedTitle: string;
  private readonly _summary: string;
  private readonly _keyInsights: string[];
  private readonly _suggestedTags: string[];
  private readonly _relatedTopics: string[];
  private readonly _tokensUsed?: number;
  private readonly _createdAt: Date;

  private constructor(data: AnalysisResultData) {
    this._id = data.id;
    this._sourceType = data.sourceType;
    this._sourceContent = data.sourceContent;
    this._sourceUrl = data.sourceUrl;
    this._suggestedTitle = data.suggestedTitle;
    this._summary = data.summary;
    this._keyInsights = [...data.keyInsights];
    this._suggestedTags = [...data.suggestedTags];
    this._relatedTopics = [...data.relatedTopics];
    this._tokensUsed = data.tokensUsed;
    this._createdAt = data.createdAt;
  }

  static create(data: Omit<AnalysisResultData, 'id' | 'createdAt'>): AnalysisResult {
    return new AnalysisResult({
      ...data,
      id: AnalysisResult.generateId(),
      createdAt: new Date(),
    });
  }

  static fromData(data: AnalysisResultData): AnalysisResult {
    return new AnalysisResult(data);
  }

  private static generateId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get sourceType(): SourceType {
    return this._sourceType;
  }

  get sourceContent(): string {
    return this._sourceContent;
  }

  get sourceUrl(): string | undefined {
    return this._sourceUrl;
  }

  get suggestedTitle(): string {
    return this._suggestedTitle;
  }

  get summary(): string {
    return this._summary;
  }

  get keyInsights(): readonly string[] {
    return this._keyInsights;
  }

  get suggestedTags(): readonly string[] {
    return this._suggestedTags;
  }

  get relatedTopics(): readonly string[] {
    return this._relatedTopics;
  }

  get tokensUsed(): number | undefined {
    return this._tokensUsed;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  // Business methods
  hasInsights(): boolean {
    return this._keyInsights.length > 0;
  }

  hasTags(): boolean {
    return this._suggestedTags.length > 0;
  }

  toMarkdown(): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`created: ${this._createdAt.toISOString().split('T')[0]}`);
    if (this._sourceUrl) {
      lines.push(`source: "${this._sourceUrl}"`);
    }
    if (this._suggestedTags.length > 0) {
      lines.push(`tags:`);
      this._suggestedTags.forEach((tag) => {
        // Replace spaces with underscores for valid tag format
        const formattedTag = tag.replace(/\s+/g, '_');
        lines.push(`  - ${formattedTag}`);
      });
    }
    if (this._relatedTopics.length > 0) {
      lines.push(`topics:`);
      this._relatedTopics.forEach((topic) => {
        lines.push(`  - "${topic}"`);
      });
    }
    lines.push(`analyzed_at: ${this._createdAt.toISOString()}`);
    lines.push(`source_type: ${this._sourceType}`);
    lines.push('---');
    lines.push('');

    // Content
    lines.push(`## Summary`);
    lines.push(this._summary);
    lines.push('');

    if (this._keyInsights.length > 0) {
      lines.push(`## Key Insights`);
      this._keyInsights.forEach((insight) => {
        lines.push(`- ${insight}`);
      });
      lines.push('');
    }

    if (this._sourceUrl) {
      lines.push(`## Source`);
      lines.push(`[${this._sourceUrl}](${this._sourceUrl})`);
    }

    return lines.join('\n');
  }

  toData(): AnalysisResultData {
    return {
      id: this._id,
      sourceType: this._sourceType,
      sourceContent: this._sourceContent,
      sourceUrl: this._sourceUrl,
      suggestedTitle: this._suggestedTitle,
      summary: this._summary,
      keyInsights: [...this._keyInsights],
      suggestedTags: [...this._suggestedTags],
      relatedTopics: [...this._relatedTopics],
      tokensUsed: this._tokensUsed,
      createdAt: this._createdAt,
    };
  }
}
