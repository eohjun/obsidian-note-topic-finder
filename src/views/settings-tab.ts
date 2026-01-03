/**
 * Settings Tab
 * Plugin configuration UI
 */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type { AIProviderType, AISettings } from '../core/domain/interfaces/llm-provider';
import { AI_PROVIDERS, getModelsByProvider } from '../core/domain/constants/model-configs';
import type AIPKMCompanionPlugin from '../main';

export class SettingsTab extends PluginSettingTab {
  plugin: AIPKMCompanionPlugin;

  constructor(app: App, plugin: AIPKMCompanionPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'AI-PKM Companion Settings' });

    // Provider Selection
    this.renderProviderSection(containerEl);

    // API Keys
    this.renderApiKeySection(containerEl);

    // Model Selection
    this.renderModelSection(containerEl);

    // Budget Settings
    this.renderBudgetSection(containerEl);

    // Language Settings
    this.renderLanguageSection(containerEl);
  }

  private renderProviderSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'LLM Provider' });

    new Setting(containerEl)
      .setName('Active Provider')
      .setDesc('Select the LLM provider to use for content analysis')
      .addDropdown((dropdown) => {
        const providers = Object.entries(AI_PROVIDERS);
        for (const [key, config] of providers) {
          dropdown.addOption(key, config.displayName);
        }
        dropdown
          .setValue(this.plugin.settings.ai.provider)
          .onChange(async (value: string) => {
            this.plugin.settings.ai.provider = value as AIProviderType;
            await this.plugin.saveSettings();
            this.display(); // Refresh to update model options
          });
      });
  }

  private renderApiKeySection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'API Keys' });

    const providers: AIProviderType[] = ['claude', 'openai', 'gemini', 'grok'];

    for (const provider of providers) {
      const config = AI_PROVIDERS[provider];
      const isActive = this.plugin.settings.ai.provider === provider;

      const setting = new Setting(containerEl)
        .setName(`${config.displayName} API Key`)
        .setDesc(isActive ? '(Active)' : '')
        .addText((text) => {
          text
            .setPlaceholder('Enter API key...')
            .setValue(this.plugin.settings.ai.apiKeys[provider] || '')
            .onChange(async (value) => {
              this.plugin.settings.ai.apiKeys[provider] = value;
              await this.plugin.saveSettings();
            });
          text.inputEl.type = 'password';
          text.inputEl.style.width = '300px';
        })
        .addButton((button) => {
          button
            .setButtonText('Test')
            .onClick(async () => {
              const apiKey = this.plugin.settings.ai.apiKeys[provider];
              if (!apiKey) {
                new Notice('Please enter an API key first');
                return;
              }

              button.setButtonText('Testing...');
              button.setDisabled(true);

              try {
                const isValid = await this.plugin.testApiKey(provider);
                if (isValid) {
                  new Notice(`${config.displayName} API key is valid!`);
                } else {
                  new Notice(`${config.displayName} API key is invalid`);
                }
              } catch (error) {
                new Notice(`Error testing API key: ${error}`);
              } finally {
                button.setButtonText('Test');
                button.setDisabled(false);
              }
            });
        });

      if (isActive) {
        setting.settingEl.style.backgroundColor = 'var(--background-secondary)';
      }
    }
  }

  private renderModelSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Model Selection' });

    const currentProvider = this.plugin.settings.ai.provider;
    const models = getModelsByProvider(currentProvider);

    new Setting(containerEl)
      .setName('Model')
      .setDesc(`Select the model for ${AI_PROVIDERS[currentProvider].displayName}`)
      .addDropdown((dropdown) => {
        for (const model of models) {
          const costInfo = `$${model.inputCostPer1M}/$${model.outputCostPer1M} per 1M`;
          dropdown.addOption(model.id, `${model.displayName} (${costInfo})`);
        }
        dropdown
          .setValue(this.plugin.settings.ai.models[currentProvider] || AI_PROVIDERS[currentProvider].defaultModel)
          .onChange(async (value) => {
            this.plugin.settings.ai.models[currentProvider] = value;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderBudgetSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Budget Management' });

    new Setting(containerEl)
      .setName('Monthly Budget Limit')
      .setDesc('Set a spending limit in USD (0 = unlimited)')
      .addText((text) => {
        text
          .setPlaceholder('e.g., 10.00')
          .setValue(String(this.plugin.settings.ai.budgetLimit || 0))
          .onChange(async (value) => {
            const parsed = parseFloat(value);
            this.plugin.settings.ai.budgetLimit = isNaN(parsed) ? undefined : parsed;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'number';
        text.inputEl.step = '0.01';
        text.inputEl.min = '0';
      });

    // Display current spend
    const currentSpend = this.plugin.getCurrentSpend();
    const budgetLimit = this.plugin.settings.ai.budgetLimit;

    if (budgetLimit && budgetLimit > 0) {
      const percentage = (currentSpend / budgetLimit) * 100;
      const statusText = `Current: $${currentSpend.toFixed(4)} / $${budgetLimit.toFixed(2)} (${percentage.toFixed(1)}%)`;
      containerEl.createEl('p', {
        text: statusText,
        cls: 'setting-item-description',
      });
    }
  }

  private renderLanguageSection(containerEl: HTMLElement): void {
    containerEl.createEl('h3', { text: 'Output Settings' });

    new Setting(containerEl)
      .setName('Default Language')
      .setDesc('Language for analysis output (auto = same as input)')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('auto', 'Auto-detect')
          .addOption('en', 'English')
          .addOption('ko', 'Korean')
          .addOption('ja', 'Japanese')
          .addOption('zh', 'Chinese')
          .setValue(this.plugin.settings.ai.defaultLanguage || 'auto')
          .onChange(async (value) => {
            this.plugin.settings.ai.defaultLanguage = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Output Folder')
      .setDesc('Folder path for saved notes (leave empty for vault root)')
      .addText((text) => {
        text
          .setPlaceholder('e.g., Notes/Analysis')
          .setValue(this.plugin.settings.outputFolder || '')
          .onChange(async (value) => {
            this.plugin.settings.outputFolder = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '300px';
      });
  }
}
