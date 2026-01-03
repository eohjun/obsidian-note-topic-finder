/**
 * Job Entity
 * Represents an async job in the queue
 */

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type JobType = 'analyze-content' | 'embed-note' | 'generate-note' | 'batch-process';

export interface Job<TData = unknown, TResult = unknown> {
  id: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  data: TData;
  result?: TResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  priority: number;
  retryCount: number;
  maxRetries: number;
}

export interface JobProgress {
  jobId: string;
  progress: number;
  message?: string;
}

export interface CreateJobOptions {
  priority?: number;
  maxRetries?: number;
}

/**
 * Create a new job
 */
export function createJob<TData>(
  type: JobType,
  data: TData,
  options: CreateJobOptions = {}
): Job<TData> {
  return {
    id: generateJobId(),
    type,
    status: 'pending',
    progress: 0,
    data,
    createdAt: new Date(),
    priority: options.priority ?? 5,
    retryCount: 0,
    maxRetries: options.maxRetries ?? 3,
  };
}

function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if job can be retried
 */
export function canRetry(job: Job): boolean {
  return job.retryCount < job.maxRetries;
}

/**
 * Check if job is in terminal state
 */
export function isTerminal(job: Job): boolean {
  return job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
}

/**
 * Calculate job duration in milliseconds
 */
export function getJobDuration(job: Job): number | null {
  if (!job.startedAt) return null;
  const endTime = job.completedAt || new Date();
  return endTime.getTime() - job.startedAt.getTime();
}
