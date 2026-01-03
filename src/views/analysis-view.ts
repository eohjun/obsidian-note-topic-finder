/**
 * Analysis View
 * Sidebar view for displaying analysis results
 */

import { ItemView, WorkspaceLeaf, setIcon, Notice } from 'obsidian';
import type { AnalysisResult } from '../core/domain/entities/analysis-result';
import type { Job } from '../core/domain/entities/job';
import type { PermanentNoteContent } from '../core/application';
import type AIPKMCompanionPlugin from '../main';

export const ANALYSIS_VIEW_TYPE = 'ai-pkm-analysis-view';

export class AnalysisView extends ItemView {
  private plugin: AIPKMCompanionPlugin;
  private currentResult: AnalysisResult | null = null;
  private currentJob: Job | null = null;
  private permanentNote: PermanentNoteContent | null = null;
  private permanentNoteMarkdown: string | null = null;
  private isGeneratingNote: boolean = false;

  constructor(leaf: WorkspaceLeaf, plugin: AIPKMCompanionPlugin) {
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
    this.currentResult = result;
    this.currentJob = null;
    this.permanentNote = null;
    this.permanentNoteMarkdown = null;
    this.isGeneratingNote = false;
    this.render();
  }

  public showPermanentNote(note: PermanentNoteContent, markdown: string): void {
    this.permanentNote = note;
    this.permanentNoteMarkdown = markdown;
    this.isGeneratingNote = false;
    this.render();
  }

  public setGeneratingNote(generating: boolean): void {
    this.isGeneratingNote = generating;
    this.render();
  }

  public showProgress(job: Job): void {
    this.currentJob = job;
    this.render();
  }

  public updateProgress(progress: number, message?: string): void {
    const progressBar = this.containerEl.querySelector('.progress-fill');
    const progressText = this.containerEl.querySelector('.progress-text');

    if (progressBar instanceof HTMLElement) {
      progressBar.style.width = `${progress}%`;
    }
    if (progressText instanceof HTMLElement && message) {
      progressText.textContent = message;
    }
  }

  public showError(error: string): void {
    this.currentJob = null;
    this.currentResult = null;
    this.render();

    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.createEl('h4', { text: 'Analysis Error' });
    container.createEl('p', { text: error, cls: 'error-message' });
  }

  private render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass('ai-pkm-analysis-view');

    // Header
    const header = container.createDiv({ cls: 'view-header' });
    header.createEl('h4', { text: 'AI Analysis' });

    // Action buttons
    const actions = header.createDiv({ cls: 'view-actions' });
    const newAnalysisBtn = actions.createEl('button', { cls: 'clickable-icon' });
    setIcon(newAnalysisBtn, 'plus');
    newAnalysisBtn.title = 'New Analysis';
    newAnalysisBtn.onclick = () => this.plugin.openAnalyzeModal();

    // Content
    if (this.currentJob && this.currentJob.status === 'running') {
      this.renderProgress(container);
    } else if (this.isGeneratingNote) {
      this.renderGeneratingNote(container);
    } else if (this.permanentNote && this.permanentNoteMarkdown) {
      this.renderPermanentNote(container);
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

  private renderProgress(container: HTMLElement): void {
    const progressContainer = container.createDiv({ cls: 'progress-container' });

    progressContainer.createEl('h5', { text: 'Analyzing...' });

    const progressBar = progressContainer.createDiv({ cls: 'progress-bar' });
    const progressFill = progressBar.createDiv({ cls: 'progress-fill indeterminate' });

    progressContainer.createEl('p', { cls: 'progress-text', text: 'Processing content with AI...' });
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

    const generateBtn = actionButtons.createEl('button', { text: 'Generate Permanent Note', cls: 'mod-cta' });
    generateBtn.onclick = () => this.plugin.generatePermanentNote(result);
  }

  private renderGeneratingNote(container: HTMLElement): void {
    const progressContainer = container.createDiv({ cls: 'progress-container' });

    progressContainer.createEl('h5', { text: 'Generating Permanent Note...' });

    const progressBar = progressContainer.createDiv({ cls: 'progress-bar' });
    progressBar.createDiv({ cls: 'progress-fill indeterminate' });

    progressContainer.createEl('p', { cls: 'progress-text', text: 'Creating Zettelkasten-style permanent note...' });
  }

  private renderPermanentNote(container: HTMLElement): void {
    if (!this.permanentNote || !this.permanentNoteMarkdown) return;

    const note = this.permanentNote;
    const resultContainer = container.createDiv({ cls: 'result-container' });

    // Title
    resultContainer.createEl('h5', { text: `📝 ${note.title}` });

    // Key Ideas
    if (note.keyIdeas.length > 0) {
      resultContainer.createEl('h6', { text: '핵심 아이디어' });
      const ideasList = resultContainer.createEl('ul', { cls: 'insights-list' });
      for (const idea of note.keyIdeas) {
        ideasList.createEl('li', { text: idea });
      }
    }

    // Connected Thoughts Preview
    if (note.connectedThoughts.relatedConcepts.length > 0) {
      resultContainer.createEl('h6', { text: '연결된 생각' });
      const thoughtsContainer = resultContainer.createDiv({ cls: 'topics-container' });
      for (const concept of note.connectedThoughts.relatedConcepts) {
        thoughtsContainer.createEl('span', { text: concept, cls: 'topic' });
      }
    }

    // Suggested Tags
    if (note.suggestedTags.length > 0) {
      resultContainer.createEl('h6', { text: '관련 태그' });
      const tagsContainer = resultContainer.createDiv({ cls: 'tags-container' });
      for (const tag of note.suggestedTags) {
        const tagEl = tagsContainer.createEl('span', { text: `#${tag}`, cls: 'tag' });
        tagEl.onclick = () => {
          navigator.clipboard.writeText(`#${tag}`);
          new Notice('Tag copied to clipboard');
        };
      }
    }

    // Action Buttons
    const actionButtons = resultContainer.createDiv({ cls: 'action-buttons' });

    const copyBtn = actionButtons.createEl('button', { text: 'Copy Markdown' });
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(this.permanentNoteMarkdown!);
      new Notice('Permanent note copied to clipboard');
    };

    const saveBtn = actionButtons.createEl('button', { text: 'Save Permanent Note', cls: 'mod-cta' });
    saveBtn.onclick = () => this.savePermanentNote();

    const backBtn = actionButtons.createEl('button', { text: 'Back to Analysis' });
    backBtn.onclick = () => {
      this.permanentNote = null;
      this.permanentNoteMarkdown = null;
      this.render();
    };
  }

  private async savePermanentNote(): Promise<void> {
    if (!this.permanentNote || !this.permanentNoteMarkdown) return;

    const note = this.permanentNote;

    // Create filename with timestamp
    const sanitizedTitle = note.title
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    const fileName = `${note.timestamp} ${sanitizedTitle}.md`;

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

      const file = await this.app.vault.create(filePath, this.permanentNoteMarkdown);
      new Notice(`Permanent note created: ${file.path}`);
      await this.app.workspace.openLinkText(file.path, '');
    } catch (error) {
      new Notice(`Error creating note: ${error}`);
    }
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
