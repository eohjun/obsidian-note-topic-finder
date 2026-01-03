/**
 * Custom Error Classes for AI Operations
 */

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export class RateLimitError extends AIError {
  constructor(
    message: string = 'Rate limit exceeded. Please try again later.',
    public readonly retryAfterMs?: number
  ) {
    super(message, 'RATE_LIMIT', true);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AIError {
  constructor(message: string = 'Invalid API key or unauthorized access.') {
    super(message, 'AUTH_ERROR', false);
    this.name = 'AuthenticationError';
  }
}

export class BudgetExceededError extends AIError {
  constructor(
    message: string = 'Budget limit exceeded.',
    public readonly currentSpend: number,
    public readonly budgetLimit: number
  ) {
    super(message, 'BUDGET_EXCEEDED', false);
    this.name = 'BudgetExceededError';
  }
}

export class TimeoutError extends AIError {
  constructor(message: string = 'Request timed out. Please try again.') {
    super(message, 'TIMEOUT', true);
    this.name = 'TimeoutError';
  }
}

export class ContentTooLongError extends AIError {
  constructor(
    message: string = 'Content exceeds maximum token limit.',
    public readonly contentLength: number,
    public readonly maxLength: number
  ) {
    super(message, 'CONTENT_TOO_LONG', false);
    this.name = 'ContentTooLongError';
  }
}

export class ProviderUnavailableError extends AIError {
  constructor(
    message: string = 'AI provider is currently unavailable.',
    public readonly provider: string
  ) {
    super(message, 'PROVIDER_UNAVAILABLE', true);
    this.name = 'ProviderUnavailableError';
  }
}

export class InvalidResponseError extends AIError {
  constructor(message: string = 'Invalid response from AI provider.') {
    super(message, 'INVALID_RESPONSE', true);
    this.name = 'InvalidResponseError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AIError) {
    return error.retryable;
  }
  return false;
}

/**
 * Normalize unknown error to AIError
 */
export function normalizeError(error: unknown): AIError {
  if (error instanceof AIError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limit detection
    if (message.includes('429') || message.includes('rate')) {
      return new RateLimitError();
    }

    // Authentication detection
    if (message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return new AuthenticationError();
    }

    // Timeout detection
    if (message.includes('timeout') || message.includes('etimedout')) {
      return new TimeoutError();
    }

    return new AIError(error.message, 'UNKNOWN', false);
  }

  return new AIError('An unknown error occurred', 'UNKNOWN', false);
}
