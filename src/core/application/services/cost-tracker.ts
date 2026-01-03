/**
 * CostTracker Service
 * Tracks API usage costs and manages budget
 */

import { EventEmitter, getEventEmitter } from './event-emitter';
import { calculateCost } from '../../domain/constants/model-configs';

export interface UsageRecord {
  id: string;
  timestamp: Date;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  jobType?: string;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  recordCount: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
}

export class CostTracker {
  private records: UsageRecord[] = [];
  private budgetLimit: number | undefined;
  private emitter: EventEmitter;

  constructor(budgetLimit?: number, emitter?: EventEmitter) {
    this.budgetLimit = budgetLimit;
    this.emitter = emitter ?? getEventEmitter();
  }

  /**
   * Set budget limit
   */
  setBudgetLimit(limit: number | undefined): void {
    this.budgetLimit = limit;
  }

  /**
   * Track a new usage
   */
  trackUsage(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    jobType?: string
  ): UsageRecord {
    const cost = calculateCost(model, inputTokens, outputTokens);

    const record: UsageRecord = {
      id: `usage_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
      provider,
      model,
      inputTokens,
      outputTokens,
      cost,
      jobType,
    };

    this.records.push(record);

    // Emit cost update event
    this.emitter.emit('cost:updated', {
      totalSpend: this.getCurrentSpend(),
      budgetLimit: this.budgetLimit,
    });

    return record;
  }

  /**
   * Get current total spend
   */
  getCurrentSpend(): number {
    return this.records.reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get spend for a specific time period
   */
  getSpendForPeriod(startDate: Date, endDate: Date): number {
    return this.records
      .filter((r) => r.timestamp >= startDate && r.timestamp <= endDate)
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get current month's spend
   */
  getCurrentMonthSpend(): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.getSpendForPeriod(startOfMonth, now);
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number | undefined {
    if (!this.budgetLimit) return undefined;
    return Math.max(0, this.budgetLimit - this.getCurrentSpend());
  }

  /**
   * Check if budget is exceeded
   */
  isBudgetExceeded(): boolean {
    if (!this.budgetLimit) return false;
    return this.getCurrentSpend() >= this.budgetLimit;
  }

  /**
   * Get budget usage percentage
   */
  getBudgetUsagePercent(): number | undefined {
    if (!this.budgetLimit) return undefined;
    return (this.getCurrentSpend() / this.budgetLimit) * 100;
  }

  /**
   * Get usage history
   */
  getHistory(limit?: number): UsageRecord[] {
    const sorted = [...this.records].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get cost summary
   */
  getSummary(): CostSummary {
    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const record of this.records) {
      byProvider[record.provider] = (byProvider[record.provider] || 0) + record.cost;
      byModel[record.model] = (byModel[record.model] || 0) + record.cost;
      totalInputTokens += record.inputTokens;
      totalOutputTokens += record.outputTokens;
    }

    return {
      totalCost: this.getCurrentSpend(),
      totalInputTokens,
      totalOutputTokens,
      recordCount: this.records.length,
      byProvider,
      byModel,
    };
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
  }

  /**
   * Export records as JSON
   */
  exportRecords(): string {
    return JSON.stringify(this.records, null, 2);
  }

  /**
   * Import records from JSON
   */
  importRecords(json: string): void {
    try {
      const imported = JSON.parse(json) as UsageRecord[];
      // Convert date strings back to Date objects
      imported.forEach((r) => {
        r.timestamp = new Date(r.timestamp);
      });
      this.records = imported;
    } catch (error) {
      console.error('Failed to import cost records:', error);
    }
  }

  /**
   * Get total record count
   */
  getRecordCount(): number {
    return this.records.length;
  }
}
