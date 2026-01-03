/**
 * Analysis View
 * Sidebar view for displaying analysis results
 */

import { ItemView, WorkspaceLeaf, setIcon, Notice } from 'obsidian';
import type { AnalysisResult } from '../core/domain/entities/analysis-result';
import type { Job } from '../core/domain/entities/job';
import type { NoteTopic } from '../core/application';
import type NoteTopicFinderPlugin from '../main';

export const ANALYSIS_VIEW_TYPE = 'note-topic-finder-view';

export class AnalysisView extends ItemView {
  private plugin: NoteTopicFinderPlugin;
  private currentResult: AnalysisResult | null = null;
  private currentJob: Job | null = null;
  private suggestedTopics: NoteTopic[] | null = null;
  private isSuggestingTopics: boolean = false;

  // Loading overlay elements (direct DOM references)
  private loadingOverlayEl: HTMLElement | null = null;
  private loadingTextEl: HTMLElement | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: NoteTopicFinderPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return ANALYSIS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'AI Analysis';
  }

  getIcon(): string {
    return 'sparkles';
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    // Cleanup
  }

  public showResult(result: AnalysisResult): void {
    this.hideLoadingOverlay();
    this.currentResult = result;
    this.currentJob = null;
    this.suggestedTopics = null;
    this.isSuggestingTopics = false;
    this.render();
  }

  public showTopicSuggestions(topics: NoteTopic[]): void {
    this.hideLoadingOverlay();
    this.suggestedTopics = topics;
    this.isSuggestingTopics = false;
    this.render();
  }

  public setSuggestingTopics(suggesting: boolean): void {
    this.isSuggestingTopics = suggesting;
    if (suggesting) {
      this.showLoadingOverlay('Finding note topics...');
    } else {
      this.hideLoadingOverlay();
    }
  }

  public showProgress(job: Job): void {
    this.currentJob = job;
    // Determine message based on source type
    const data = job.data as { sourceType?: string; sourceUrl?: string; sourcePath?: string };
    let message = 'Analyzing content...';
    if (data.sourceType === 'url') {
      message = 'Analyzing URL...';
    } else if (data.sourceType === 'note') {
      message = 'Analyzing note...';
    } else if (data.sourceType === 'text') {
      message = 'Analyzing text...';
    }
    this.showLoadingOverlay(message);
  }

  public updateProgress(progress: number, message?: string): void {
    if (this.loadingTextEl && message) {
      this.loadingTextEl.textContent = message;
    }
  }

  public showError(error: string): void {
    this.hideLoadingOverlay();
    this.currentJob = null;
    this.currentResult = null;

    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('note-topic-finder-view');

    // Header
    const header = container.createDiv({ cls: 'view-header' });
    header.createEl('h4', { text: 'AI Analysis' });
    const actions = header.createDiv({ cls: 'view-actions' });
    const newAnalysisBtn = actions.createEl('button', { cls: 'clickable-icon' });
    setIcon(newAnalysisBtn, 'plus');
    newAnalysisBtn.title = 'New Analysis';
    newAnalysisBtn.onclick = () => this.plugin.openAnalyzeModal();

    container.createEl('p', { text: error, cls: 'error-message' });
  }

  /**
   * Show loading overlay with spinner and text message
   */
  private showLoadingOverlay(message: string): void {
    const container = this.containerEl.children[1] as HTMLElement;

    // Remove existing overlay if any
    this.hideLoadingOverlay();

    // Create overlay element
    this.loadingOverlayEl = container.createDiv({ cls: 'progress-overlay' });

    const loadingContainer = this.loadingOverlayEl.createDiv({ cls: 'loading-container' });
    loadingContainer.createDiv({ cls: 'loading-spinner' });
    this.loadingTextEl = loadingContainer.createEl('p', { cls: 'loading-text', text: message });
  }

  /**
   * Hide loading overlay
   */
  private hideLoadingOverlay(): void {
    if (this.loadingOverlayEl) {
      this.loadingOverlayEl.remove();
      this.loadingOverlayEl = null;
      this.loadingTextEl = null;
    }
  }

  private render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('note-topic-finder-view');

    // Header
    const header = container.createDiv({ cls: 'view-header' });
    header.createEl('h4', { text: 'AI Analysis' });

    // Action buttons
    const actions = header.createDiv({ cls: 'view-actions' });
    const newAnalysisBtn = actions.createEl('button', { cls: 'clickable-icon' });
    setIcon(newAnalysisBtn, 'plus');
    newAnalysisBtn.title = 'New Analysis';
    newAnalysisBtn.onclick = () => this.plugin.openAnalyzeModal();

    // Content - no longer handle progress here
    if (this.suggestedTopics && this.suggestedTopics.length > 0) {
      this.renderTopicSuggestions(container);
    } else if (this.currentResult) {
      this.renderResult(container);
    } else {
      this.renderEmpty(container);
    }
  }

  private renderEmpty(container: HTMLElement): void {
    const emptyState = container.createDiv({ cls: 'empty-state' });
    emptyState.createEl('p', { text: 'No analysis results yet.' });
    emptyState.createEl('p', { text: 'Click the + button or use the command palette to start analyzing content.' });
  }

  private renderResult(container: HTMLElement): void {
    if (!this.currentResult) return;

    const result = this.currentResult;
    const resultContainer = container.createDiv({ cls: 'result-container' });

    // Source info
    if (result.sourceUrl) {
      const sourceEl = resultContainer.createEl('p', { cls: 'source-info' });
      sourceEl.createEl('strong', { text: 'Source: ' });
      const link = sourceEl.createEl('a', { text: result.sourceUrl, href: result.sourceUrl });
      link.setAttr('target', '_blank');
    } else if (result.sourcePath) {
      const sourceEl = resultContainer.createEl('p', { cls: 'source-info' });
      sourceEl.createEl('strong', { text: 'Source Note: ' });
      sourceEl.createSpan({ text: result.sourcePath });
    }

    // Summary
    resultContainer.createEl('h5', { text: 'Summary' });
    resultContainer.createEl('p', { text: result.summary, cls: 'summary-text' });

    // Key Insights
    if (result.keyInsights.length > 0) {
      resultContainer.createEl('h5', { text: 'Key Insights' });
      const insightsList = resultContainer.createEl('ul', { cls: 'insights-list' });
      for (const insight of result.keyInsights) {
        insightsList.createEl('li', { text: insight });
      }
    }

    // Suggested Tags
    if (result.suggestedTags.length > 0) {
      resultContainer.createEl('h5', { text: 'Suggested Tags' });
      const tagsContainer = resultContainer.createDiv({ cls: 'tags-container' });
      for (const tag of result.suggestedTags) {
        const tagEl = tagsContainer.createEl('span', { text: `#${tag}`, cls: 'tag' });
        tagEl.onclick = () => {
          navigator.clipboard.writeText(`#${tag}`);
          new Notice('Tag copied to clipboard');
        };
      }
    }

    // Related Topics
    if (result.relatedTopics.length > 0) {
      resultContainer.createEl('h5', { text: 'Related Topics' });
      const topicsContainer = resultContainer.createDiv({ cls: 'topics-container' });
      for (const topic of result.relatedTopics) {
        topicsContainer.createEl('span', { text: topic, cls: 'topic' });
      }
    }

    // Action Buttons
    const actionButtons = resultContainer.createDiv({ cls: 'action-buttons' });

    const copyBtn = actionButtons.createEl('button', { text: 'Copy as Markdown' });
    copyBtn.onclick = () => {
      const markdown = result.toMarkdown();
      navigator.clipboard.writeText(markdown);
      new Notice('Copied to clipboard');
    };

    const saveBtn = actionButtons.createEl('button', { text: 'Save as Note' });
    saveBtn.onclick = () => this.saveAsNote(result);

    const suggestBtn = actionButtons.createEl('button', { text: 'Suggest Note Topics', cls: 'mod-cta' });
    suggestBtn.onclick = () => this.plugin.suggestNoteTopics(result);
  }

  private renderTopicSuggestions(container: HTMLElement): void {
    if (!this.suggestedTopics) return;

    const resultContainer = container.createDiv({ cls: 'result-container' });

    // Header
    resultContainer.createEl('h5', { text: '📚 Permanent Note Topics' });
    resultContainer.createEl('p', {
      text: 'Use /permanent-note-author skill to write these notes with high quality.',
      cls: 'setting-item-description'
    });

    // Topics list
    for (const topic of this.suggestedTopics) {
      const topicCard = resultContainer.createDiv({ cls: 'topic-card' });

      // Title (copyable)
      const titleEl = topicCard.createEl('h6', { text: `💡 ${topic.title}` });
      titleEl.style.cursor = 'pointer';
      titleEl.onclick = () => {
        navigator.clipboard.writeText(topic.title);
        new Notice(`Copied: ${topic.title}`);
      };
      titleEl.title = 'Click to copy title';

      // Rationale
      topicCard.createEl('p', { text: topic.rationale, cls: 'topic-rationale' });

      // Key Points
      if (topic.keyPoints.length > 0) {
        const pointsContainer = topicCard.createDiv({ cls: 'key-points' });
        pointsContainer.createEl('strong', { text: 'Key Points:' });
        const pointsList = pointsContainer.createEl('ul');
        for (const point of topic.keyPoints) {
          pointsList.createEl('li', { text: point });
        }
      }

      // Tags
      if (topic.suggestedTags.length > 0) {
        const tagsContainer = topicCard.createDiv({ cls: 'tags-container' });
        for (const tag of topic.suggestedTags) {
          const tagEl = tagsContainer.createEl('span', { text: `#${tag}`, cls: 'tag' });
          tagEl.onclick = () => {
            navigator.clipboard.writeText(`#${tag}`);
            new Notice('Tag copied');
          };
        }
      }
    }

    // Action Buttons
    const actionButtons = resultContainer.createDiv({ cls: 'action-buttons' });

    const copyAllBtn = actionButtons.createEl('button', { text: 'Copy All Topics' });
    copyAllBtn.onclick = () => {
      const text = this.suggestedTopics!.map((t, i) =>
        `${i + 1}. ${t.title}\n   - ${t.rationale}\n   - Key: ${t.keyPoints.join(', ')}\n   - Tags: ${t.suggestedTags.join(', ')}`
      ).join('\n\n');
      navigator.clipboard.writeText(text);
      new Notice('All topics copied to clipboard');
    };

    const backBtn = actionButtons.createEl('button', { text: 'Back to Analysis' });
    backBtn.onclick = () => {
      this.suggestedTopics = null;
      this.render();
    };
  }

  private async saveAsNote(result: AnalysisResult): Promise<void> {
    const markdown = result.toMarkdown();

    // Sanitize title for file name
    const sanitizedTitle = result.suggestedTitle
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);
    const fileName = `${sanitizedTitle}.md`;

    // Determine output folder
    const outputFolder = this.plugin.settings.outputFolder?.trim();
    const filePath = outputFolder ? `${outputFolder}/${fileName}` : fileName;

    try {
      // Create output folder if it doesn't exist
      if (outputFolder) {
        const folderExists = this.app.vault.getAbstractFileByPath(outputFolder);
        if (!folderExists) {
          await this.app.vault.createFolder(outputFolder);
        }
      }

      const file = await this.app.vault.create(filePath, markdown);
      new Notice(`Note created: ${file.path}`);
      await this.app.workspace.openLinkText(file.path, '');
    } catch (error) {
      new Notice(`Error creating note: ${error}`);
    }
  }
}
