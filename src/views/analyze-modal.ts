/**
 * Analyze Modal
 * Input dialog for URL, text, or vault note content analysis
 */

import { App, Modal, Setting, Notice, TextAreaComponent, TFile } from 'obsidian';
import type { SourceType } from '../core/domain/entities/analysis-result';

export interface AnalyzeModalResult {
  content: string;
  sourceType: SourceType;
  sourceUrl?: string;
  sourcePath?: string;
  language: string;
  detailLevel: 'brief' | 'standard' | 'detailed';
}

export class AnalyzeModal extends Modal {
  private result: AnalyzeModalResult | null = null;
  private onSubmit: (result: AnalyzeModalResult) => void;

  private sourceType: SourceType = 'text';
  private content: string = '';
  private sourceUrl: string = '';
  private selectedNote: TFile | null = null;
  private useCurrentNote: boolean = true;
  private language: string = 'auto';
  private detailLevel: 'brief' | 'standard' | 'detailed' = 'standard';

  constructor(app: App, onSubmit: (result: AnalyzeModalResult) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass('mod-note-topic-finder');
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Analyze Content' });

    // Source Type Selection
    new Setting(contentEl)
      .setName('Source Type')
      .setDesc('Select the type of content to analyze')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('text', 'Text')
          .addOption('url', 'URL')
          .addOption('note', 'Vault Note')
          .setValue(this.sourceType)
          .onChange((value: string) => {
            this.sourceType = value as SourceType;
            this.updateContentInput(contentEl);
          });
      });

    // Content Input Container
    const inputContainer = contentEl.createDiv({ cls: 'input-container' });
    this.renderContentInput(inputContainer);

    // Analysis Options
    contentEl.createEl('h3', { text: 'Analysis Options' });

    new Setting(contentEl)
      .setName('Language')
      .setDesc('Output language for the analysis')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('auto', 'Auto-detect (same as input)')
          .addOption('en', 'English')
          .addOption('ko', 'Korean')
          .setValue(this.language)
          .onChange((value) => {
            this.language = value;
          });
      });

    new Setting(contentEl)
      .setName('Detail Level')
      .setDesc('How detailed should the analysis be?')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('brief', 'Brief (quick overview)')
          .addOption('standard', 'Standard (balanced)')
          .addOption('detailed', 'Detailed (comprehensive)')
          .setValue(this.detailLevel)
          .onChange((value: string) => {
            this.detailLevel = value as 'brief' | 'standard' | 'detailed';
          });
      });

    // Action Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'button-container' });
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.onclick = () => this.close();

    const analyzeBtn = buttonContainer.createEl('button', {
      text: 'Analyze',
      cls: 'mod-cta',
    });
    analyzeBtn.onclick = () => this.submit();
  }

  private renderContentInput(container: HTMLElement): void {
    container.empty();

    if (this.sourceType === 'url') {
      new Setting(container)
        .setName('URL')
        .setDesc('Enter the URL to analyze')
        .addText((text) => {
          text
            .setPlaceholder('https://example.com/article')
            .setValue(this.sourceUrl)
            .onChange((value) => {
              this.sourceUrl = value;
              this.content = value;
            });
          text.inputEl.style.width = '100%';
        });
    } else if (this.sourceType === 'note') {
      this.renderNoteSelection(container);
    } else {
      const textAreaSetting = new Setting(container)
        .setName('Content')
        .setDesc('Paste the text content to analyze');

      textAreaSetting.controlEl.style.display = 'block';
      textAreaSetting.controlEl.style.width = '100%';

      const textArea = new TextAreaComponent(textAreaSetting.controlEl);
      textArea
        .setPlaceholder('Paste your text content here...')
        .setValue(this.content)
        .onChange((value) => {
          this.content = value;
        });
      textArea.inputEl.style.width = '100%';
      textArea.inputEl.style.minHeight = '200px';
      textArea.inputEl.style.fontFamily = 'var(--font-text)';
    }
  }

  private renderNoteSelection(container: HTMLElement): void {
    const currentFile = this.app.workspace.getActiveFile();

    // Current note option
    new Setting(container)
      .setName('Use current note')
      .setDesc(currentFile ? `Current: ${currentFile.basename}` : 'No note is currently open')
      .addToggle((toggle) => {
        toggle
          .setValue(this.useCurrentNote)
          .setDisabled(!currentFile)
          .onChange((value) => {
            this.useCurrentNote = value;
            if (value && currentFile) {
              this.selectedNote = currentFile;
            }
            this.renderNoteSelection(container);
          });
      });

    if (this.useCurrentNote && currentFile) {
      this.selectedNote = currentFile;
    }

    // Note search/selection (when not using current note)
    if (!this.useCurrentNote) {
      const searchContainer = container.createDiv({ cls: 'note-search-container' });

      new Setting(searchContainer)
        .setName('Select note')
        .setDesc('Search for a note to analyze')
        .addDropdown((dropdown) => {
          const files = this.app.vault.getMarkdownFiles()
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, 50); // Limit to 50 most recent notes

          dropdown.addOption('', '-- Select a note --');
          files.forEach((file) => {
            dropdown.addOption(file.path, file.basename);
          });

          if (this.selectedNote) {
            dropdown.setValue(this.selectedNote.path);
          }

          dropdown.onChange((value) => {
            if (value) {
              const file = this.app.vault.getAbstractFileByPath(value);
              if (file instanceof TFile) {
                this.selectedNote = file;
              }
            } else {
              this.selectedNote = null;
            }
          });
        });
    }
  }

  private updateContentInput(contentEl: HTMLElement): void {
    const container = contentEl.querySelector('.input-container') as HTMLElement;
    if (container) {
      this.renderContentInput(container);
    }
  }

  private async submit(): Promise<void> {
    // Validation
    if (this.sourceType === 'note') {
      if (!this.selectedNote) {
        new Notice('Please select a note to analyze');
        return;
      }
      // Read note content
      try {
        this.content = await this.app.vault.cachedRead(this.selectedNote);
      } catch {
        new Notice('Failed to read note content');
        return;
      }
    } else if (!this.content.trim()) {
      new Notice('Please enter content to analyze');
      return;
    }

    if (this.sourceType === 'url' && !this.isValidUrl(this.content)) {
      new Notice('Please enter a valid URL');
      return;
    }

    this.result = {
      content: this.content,
      sourceType: this.sourceType,
      sourceUrl: this.sourceType === 'url' ? this.content : undefined,
      sourcePath: this.sourceType === 'note' && this.selectedNote ? this.selectedNote.path : undefined,
      language: this.language,
      detailLevel: this.detailLevel,
    };

    this.onSubmit(this.result);
    this.close();
  }

  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
