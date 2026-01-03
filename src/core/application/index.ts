/**
 * Application Layer
 * Use cases and services for the Note Topic Finder plugin
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
export { AnalyzeContentUseCase, SuggestNoteTopicsUseCase } from './use-cases';
export type {
  AnalyzeContentRequest,
  AnalyzeContentResponse,
  SuggestNoteTopicsRequest,
  SuggestNoteTopicsResponse,
  NoteTopic,
} from './use-cases';
