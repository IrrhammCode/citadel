/**
 * Error Handling & Resilience
 * Retry logic, fallback mechanisms, graceful degradation
 */

// ─── Types ──────────────────────────────────────────────────

export type RetryConfig = {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
};

export type FallbackConfig = {
  fallbackFn: () => Promise<any>;
  timeout: number; // ms
};

export type ErrorContext = {
  operation: string;
  systemId?: string;
  timestamp: number;
  error: Error;
  retryCount: number;
  resolved: boolean;
};

// ─── Default Configs ────────────────────────────────────────

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// ─── Retry with Exponential Backoff ─────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// ─── Timeout Wrapper ────────────────────────────────────────

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

// ─── Fallback Chain ─────────────────────────────────────────

export async function withFallback<T>(
  fns: Array<() => Promise<T>>,
): Promise<T> {
  let lastError: Error | null = null;

  for (const fn of fns) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError;
}

// ─── Circuit Breaker Pattern ────────────────────────────────

export class ResilienceCircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 60000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failures = 0;
    this.state = "closed";
  }
}

// ─── Graceful Degradation ───────────────────────────────────

export async function withGracefulDegradation<T>(
  primaryFn: () => Promise<T>,
  fallbackValue: T,
  options?: {
    logError?: boolean;
    notifyUser?: boolean;
  },
): Promise<T> {
  try {
    return await primaryFn();
  } catch (error) {
    if (options?.logError) {
      console.error("Primary function failed, using fallback:", error);
    }
    return fallbackValue;
  }
}

// ─── Error Logging ──────────────────────────────────────────

const ERROR_LOG_KEY = "***";

export function logError(context: ErrorContext): void {
  if (typeof window === "undefined") return;

  const logs = getErrorLogs();
  logs.push({
    ...context,
    timestamp: Date.now(),
  });

  // Keep last 500 errors
  const trimmed = logs.slice(-500);
  localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(trimmed));
}

export function getErrorLogs(): ErrorContext[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(ERROR_LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function clearErrorLogs(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ERROR_LOG_KEY);
}

// ─── Venice AI Fallback ─────────────────────────────────────

export async function veniceWithFallback<T>(
  veniceFn: () => Promise<T>,
  fallbackFn: () => T,
): Promise<T> {
  try {
    return await withTimeout(veniceFn, 30000); // 30s timeout
  } catch (error) {
    console.warn("Venice AI failed, using fallback:", error);
    return fallbackFn();
  }
}

// ─── MetaMask Error Handler ─────────────────────────────────

export function handleMetaMaskError(error: any): string {
  if (error?.code === 4001) {
    return "Transaction rejected by user";
  }
  if (error?.code === -32002) {
    return "MetaMask is already processing a request";
  }
  if (error?.code === -32603) {
    return "Internal MetaMask error";
  }
  if (error?.message?.includes("insufficient funds")) {
    return "Insufficient funds for transaction";
  }
  if (error?.message?.includes("user rejected")) {
    return "Transaction rejected by user";
  }
  return error?.message || "Unknown MetaMask error";
}

// ─── Network Error Handler ──────────────────────────────────

export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes("fetch") ||
    error?.message?.includes("network") ||
    error?.message?.includes("timeout") ||
    error?.code === "NETWORK_ERROR"
  );
}

// ─── Recovery Suggestions ───────────────────────────────────

export function getRecoverySuggestion(error: ErrorContext): string {
  if (error.error.message.includes("timeout")) {
    return "Operation timed out. Check your network connection and try again.";
  }
  if (error.error.message.includes("rejected")) {
    return "Transaction was rejected. Please approve the request in MetaMask.";
  }
  if (error.error.message.includes("insufficient")) {
    return "Insufficient funds. Please add more USDC to your wallet.";
  }
  if (error.error.message.includes("Circuit breaker")) {
    return "Service temporarily unavailable. Please wait a moment and try again.";
  }
  return "An unexpected error occurred. Please try again.";
}
