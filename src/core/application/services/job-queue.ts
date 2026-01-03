/**
 * JobQueue Service
 * Manages async job execution with priority queue
 */

import { Job, JobStatus, createJob, JobType, canRetry } from '../../domain/entities/job';
import { EventEmitter, getEventEmitter } from './event-emitter';

export interface JobExecutor<TData, TResult> {
  execute(
    job: Job<TData>,
    onProgress: (progress: number, message?: string) => void
  ): Promise<TResult>;
}

export class JobQueue {
  private queue: Job[] = [];
  private running: Job | null = null;
  private paused: boolean = false;
  private executors: Map<JobType, JobExecutor<unknown, unknown>> = new Map();
  private emitter: EventEmitter;

  constructor(emitter?: EventEmitter) {
    this.emitter = emitter ?? getEventEmitter();
  }

  /**
   * Register a job executor for a specific job type
   */
  registerExecutor<TData, TResult>(
    type: JobType,
    executor: JobExecutor<TData, TResult>
  ): void {
    this.executors.set(type, executor as JobExecutor<unknown, unknown>);
  }

  /**
   * Add a job to the queue
   */
  enqueue<TData>(type: JobType, data: TData, priority?: number): Job<TData> {
    const job = createJob(type, data, { priority });

    // Insert by priority (lower number = higher priority)
    const insertIndex = this.queue.findIndex((j) => j.priority > job.priority);
    if (insertIndex === -1) {
      this.queue.push(job);
    } else {
      this.queue.splice(insertIndex, 0, job);
    }

    this.emitter.emit('job:created', job);
    this.processNext();
    return job;
  }

  /**
   * Process next job in queue
   */
  private async processNext(): Promise<void> {
    if (this.paused || this.running || this.queue.length === 0) {
      if (this.queue.length === 0 && !this.running) {
        this.emitter.emit('queue:empty', undefined);
      }
      return;
    }

    const job = this.queue.shift()!;
    this.running = job;

    const executor = this.executors.get(job.type);
    if (!executor) {
      job.status = 'failed';
      job.error = `No executor registered for job type: ${job.type}`;
      this.emitter.emit('job:failed', job as Job & { error: string });
      this.running = null;
      this.processNext();
      return;
    }

    job.status = 'running';
    job.startedAt = new Date();
    this.emitter.emit('job:started', job);

    try {
      const result = await executor.execute(job, (progress, message) => {
        job.progress = progress;
        this.emitter.emit('job:progress', {
          jobId: job.id,
          progress,
          message,
        });
      });

      job.status = 'completed';
      job.result = result;
      job.progress = 100;
      job.completedAt = new Date();
      this.emitter.emit('job:completed', job);
    } catch (error) {
      job.retryCount++;

      if (canRetry(job)) {
        // Re-queue for retry
        job.status = 'pending';
        this.queue.unshift(job);
      } else {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : String(error);
        job.completedAt = new Date();
        this.emitter.emit('job:failed', job as Job & { error: string });
      }
    }

    this.running = null;
    this.processNext();
  }

  /**
   * Cancel a pending job
   */
  cancel(jobId: string): boolean {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      const job = this.queue.splice(index, 1)[0];
      job.status = 'cancelled';
      this.emitter.emit('job:cancelled', job);
      return true;
    }
    return false;
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.paused = true;
    this.emitter.emit('queue:paused', undefined);
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    this.paused = false;
    this.emitter.emit('queue:resumed', undefined);
    this.processNext();
  }

  /**
   * Get queue status
   */
  getStatus(): {
    pending: number;
    running: boolean;
    paused: boolean;
    currentJob: Job | null;
  } {
    return {
      pending: this.queue.length,
      running: this.running !== null,
      paused: this.paused,
      currentJob: this.running,
    };
  }

  /**
   * Get a specific job
   */
  getJob(jobId: string): Job | undefined {
    if (this.running?.id === jobId) return this.running;
    return this.queue.find((j) => j.id === jobId);
  }

  /**
   * Get all jobs (running + queued)
   */
  getAllJobs(): Job[] {
    return this.running ? [this.running, ...this.queue] : [...this.queue];
  }

  /**
   * Clear all pending jobs
   */
  clear(): void {
    this.queue.forEach((job) => {
      job.status = 'cancelled';
      this.emitter.emit('job:cancelled', job);
    });
    this.queue = [];
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0 && !this.running;
  }
}
