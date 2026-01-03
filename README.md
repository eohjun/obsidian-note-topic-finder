# AI-PKM Companion

An Obsidian plugin for AI-powered Personal Knowledge Management. Analyze content from URLs or text, extract key insights, and manage your knowledge with LLM assistance.

## Features

### MVP (v0.1.0)
- **Multi-Provider LLM Support**: Claude (Anthropic), GPT-4 (OpenAI), Gemini (Google)
- **Content Analysis**: Analyze URLs or pasted text content
- **Insight Extraction**: Get summaries, key insights, suggested tags, and related topics
- **Cost Tracking**: Monitor API usage and set budget limits
- **Sidebar View**: View analysis results in a dedicated sidebar

## Installation

### Via BRAT (Recommended for Beta)
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Open BRAT settings
3. Add beta plugin: `eohjun/obsidian-ai-pkm-companion`
4. Enable the plugin

### Manual Installation
1. Download the latest release from GitHub
2. Extract to `.obsidian/plugins/ai-pkm-companion/`
3. Enable the plugin in Obsidian settings

## Configuration

### API Keys
1. Go to Settings → AI-PKM Companion
2. Enter your API key for your preferred provider:
   - **Claude**: Get from [Anthropic Console](https://console.anthropic.com/)
   - **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/)
   - **Gemini**: Get from [Google AI Studio](https://aistudio.google.com/)
3. Click "Test" to verify your API key

### Model Selection
Choose the model based on your needs:
- **Claude Sonnet 4**: Best quality, higher cost ($3/$15 per 1M tokens)
- **Claude Haiku**: Fast and affordable ($0.8/$4 per 1M tokens)
- **GPT-4o**: High quality with vision ($2.5/$10 per 1M tokens)
- **GPT-4o Mini**: Most affordable OpenAI option ($0.15/$0.6 per 1M tokens)
- **Gemini Flash**: Fast and very affordable ($0.075/$0.3 per 1M tokens)

### Budget Management
Set a monthly budget limit to control costs. You'll receive warnings when approaching the limit.

## Usage

### Analyze Content
1. Click the sparkles icon in the ribbon, or
2. Use command palette: "AI-PKM Companion: Analyze content"
3. Choose source type (URL or Text)
4. Enter content and select options
5. Click "Analyze"

### Analyze Clipboard
1. Copy text or URL to clipboard
2. Use command palette: "AI-PKM Companion: Analyze clipboard content"

### View Results
Results appear in the sidebar with:
- Summary
- Key Insights (bullet points)
- Suggested Tags (click to copy)
- Related Topics

### Save as Note
Click "Save as Note" to create a new markdown file with the analysis.

## Roadmap

### v0.2.0 (Post-MVP)
- [ ] Semantic connection suggestions (OpenAI embeddings)
- [ ] Permanent note generation (Zettelkasten templates)
- [ ] Knowledge gap detection

### v0.3.0
- [ ] Reading queue management
- [ ] Note maturity tracking
- [ ] Spaced repetition integration

## Architecture

This plugin follows Clean Architecture principles:

```
src/
├── core/
│   ├── domain/       # Entities, interfaces, constants
│   ├── application/  # Use cases, services
│   └── adapters/     # LLM provider implementations
└── views/            # UI components
```

## Development

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Type check
npm run typecheck

# Production build
npm run build
```

## License

MIT License

## Credits

Built with:
- [Obsidian](https://obsidian.md/) - The knowledge base that works on top of local Markdown files
- [Anthropic Claude](https://www.anthropic.com/) - AI assistant
- [OpenAI](https://openai.com/) - GPT models
- [Google Gemini](https://deepmind.google/technologies/gemini/) - Multimodal AI
