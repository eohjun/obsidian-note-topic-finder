# Note Topic Finder

An Obsidian plugin that analyzes content and discovers permanent note topics from URLs, text, and vault notes.

## Features

- **Content Analysis**: Analyze URLs, pasted text, or existing vault notes
- **Permanent Note Topics**: AI-powered suggestions for Zettelkasten-style permanent notes
- **Connection Discovery**: Find connections to existing notes in your vault
- **Multi-Provider Support**: OpenAI, Anthropic Claude, Google Gemini, xAI Grok
- **Clipboard Analysis**: Quick analyze from clipboard content
- **Cost Tracking**: Monitor API usage with optional budget limits

## PKM Workflow

```
Content Sources → Note Topic Finder → Permanent Note Topics
      ↓                   ↓                    ↓
   URL/Text          AI Analysis         Topic Suggestions
   Vault Notes       Extraction          Connection Points
   Clipboard         Insights            Tag Recommendations
```

## Supported AI Providers

| Provider | Model | Notes |
|----------|-------|-------|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-5.2 | Default provider |
| **Anthropic** | Claude Sonnet 4 | Deep analysis |
| **Google Gemini** | Gemini 3 Flash | Fast and affordable |
| **xAI** | Grok 3 | Alternative provider |

## Installation

### BRAT (Recommended)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings
3. Click "Add Beta plugin"
4. Enter: `eohjun/obsidian-note-topic-finder`
5. Enable the plugin

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the latest release
2. Create folder: `<vault>/.obsidian/plugins/note-topic-finder/`
3. Copy downloaded files to the folder
4. Enable the plugin in Obsidian settings

## Setup

### API Key Configuration

1. Open Settings → Note Topic Finder
2. Select your preferred AI provider
3. Enter the API key for the selected provider
4. Optionally set a budget limit for cost tracking

## Commands

| Command | Description |
|---------|-------------|
| **Analyze content** | Open modal to analyze URL or text |
| **Analyze clipboard content** | Analyze content from clipboard |
| **Open analysis view** | Open the analysis sidebar |
| **Suggest permanent note topics from analysis** | Generate topic suggestions from current analysis |

## Usage Workflow

```
1. Input content:
   - Paste a URL to analyze web content
   - Paste text directly for analysis
   - Select existing note from vault
2. AI analyzes the content
3. Review results:
   - Summary
   - Key insights
   - Suggested tags
   - Related topics
4. Generate permanent note topic suggestions
5. Create new notes from suggestions
```

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **AI Provider** | Provider for analysis | OpenAI |
| **API Key** | API key for selected provider | - |
| **Content Analysis Model** | Model for content analysis | gpt-4o-mini |
| **Permanent Note Model** | Model for topic suggestions | gpt-5.2 |
| **Output Folder** | Folder for generated notes | - |
| **Budget Limit** | Optional monthly budget limit | - |
| **Default Language** | Output language | auto |

## Related Plugins

This plugin works well with:

- **[Reading Queue Manager](https://github.com/eohjun/obsidian-reading-queue-manager)**: Manage content for analysis
- **[Evergreen Note Cultivator](https://github.com/eohjun/obsidian-evergreen-note-cultivator)**: Evaluate quality of created notes
- **[PKM Note Recommender](https://github.com/eohjun/obsidian-pkm-note-recommender)**: Find connections for new notes
- **[Socratic Challenger](https://github.com/eohjun/obsidian-socratic-challenger)**: Deepen understanding of topics

## Development

```bash
# Install dependencies
npm install

# Development with watch mode
npm run dev

# Type check
npm run typecheck

# Production build
npm run build
```

## License

MIT
