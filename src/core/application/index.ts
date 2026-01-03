/**
 * Application Layer
 * Use cases and services for the AI-PKM Companion plugin
 */

// Services
export {
  EventEmitter,
  getEventEmitter,
  resetEventEmitter,
  JobQueue,
  AIService,
  initializeAIService,
  getAIService,
  updateAIServiceSettings,
  resetAIService,
  CostTracker,
} from './services';

export type {
  EventCallback,
  PluginEvents,
  JobExecutor,
  UsageRecord,
  CostSummary,
} from './services';

// Use Cases
export { AnalyzeContentUseCase, GeneratePermanentNoteUseCase } from './use-cases';
export type {
  AnalyzeContentRequest,
  AnalyzeContentResponse,
  GeneratePermanentNoteRequest,
  GeneratePermanentNoteResponse,
  PermanentNoteContent,
} from './use-cases';
