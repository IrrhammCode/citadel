/**
 * Circuit Breaker & Security Layer
 * Emergency pause, rate limiting, and access control
 */

// ─── Types ──────────────────────────────────────────────────

export type CircuitState = "closed" | "open" | "half-open";

export type CircuitBreakerConfig = {
  failureThreshold: number; // failures before opening
  resetTimeout: number; // ms before half-open
  halfOpenMaxAttempts: number; // attempts in half-open
  monitoringPeriod: number; // ms window for failures
};

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  blockDuration: number; // ms to block after limit exceeded
};

export type SecurityEvent = {
  id: string;
  type: "circuit_open" | "circuit_close" | "rate_limit" | "auth_failure" | "emergency_stop";
  systemId?: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

// ─── Circuit Breaker ────────────────────────────────────────

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  halfOpenMaxAttempts: 3,
  monitoringPeriod: 300000, // 5 minutes
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private config: CircuitBreakerConfig;
  private systemId: string;

  constructor(systemId: string, config?: Partial<CircuitBreakerConfig>) {
    this.systemId = systemId;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.systemId}`);
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
    if (this.state === "half-open") {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = "closed";
        this.failureCount = 0;
        this.emitEvent("circuit_close", "Circuit breaker closed");
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.state = "open";
      this.emitEvent("circuit_open", "Circuit breaker opened (half-open failure)");
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = "open";
      this.emitEvent("circuit_open", `Circuit breaker opened (${this.failureCount} failures)`);
    }
  }

  private emitEvent(type: SecurityEvent["type"], message: string) {
    const events = getSecurityEvents();
    events.push({
      id: crypto.randomUUID(),
      type,
      systemId: this.systemId,
      message,
      timestamp: Date.now(),
    });
    saveSecurityEvents(events);
  }

  getState(): CircuitState {
    return this.state;
  }

  reset() {
    this.state = "closed";
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
  }
}

// ─── Rate Limiter ───────────────────────────────────────────

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  blockDuration: 300000, // 5 minutes
};

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private blocked: Map<string, number> = new Map();
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_RATE_LIMIT, ...config };
  }

  isAllowed(key: string): boolean {
    // Check if blocked
    const blockedUntil = this.blocked.get(key);
    if (blockedUntil && Date.now() < blockedUntil) {
      return false;
    }
    if (blockedUntil && Date.now() >= blockedUntil) {
      this.blocked.delete(key);
    }

    // Get request timestamps
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Filter to current window
    const windowStart = now - this.config.windowMs;
    const recentRequests = requests.filter((t) => t > windowStart);

    // Check limit
    if (recentRequests.length >= this.config.maxRequests) {
      this.blocked.set(key, now + this.config.blockDuration);
      this.emitEvent("rate_limit", `Rate limit exceeded for ${key}`);
      return false;
    }

    // Record request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true;
  }

  private emitEvent(type: SecurityEvent["type"], message: string) {
    const events = getSecurityEvents();
    events.push({
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: Date.now(),
    });
    saveSecurityEvents(events);
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const windowStart = now - this.config.windowMs;
    const recentRequests = requests.filter((t) => t > windowStart);
    return Math.max(0, this.config.maxRequests - recentRequests.length);
  }

  isBlocked(key: string): boolean {
    const blockedUntil = this.blocked.get(key);
    return blockedUntil ? Date.now() < blockedUntil : false;
  }
}

// ─── Security Events Storage ────────────────────────────────

const SECURITY_EVENTS_KEY = "***";

function getSecurityEvents(): SecurityEvent[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SECURITY_EVENTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveSecurityEvents(events: SecurityEvent[]) {
  if (typeof window === "undefined") return;
  // Keep last 1000 events
  const trimmed = events.slice(-1000);
  localStorage.setItem(SECURITY_EVENTS_KEY, JSON.stringify(trimmed));
}

export function getRecentSecurityEvents(limit: number = 50): SecurityEvent[] {
  return getSecurityEvents()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// ─── Emergency Stop (Global) ────────────────────────────────

const EMERGENCY_KEY = "***";

export function isGlobalEmergencyStop(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(EMERGENCY_KEY) === "true";
}

export function activateGlobalEmergencyStop(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMERGENCY_KEY, "true");
  const events = getSecurityEvents();
  events.push({
    id: crypto.randomUUID(),
    type: "emergency_stop",
    message: "Global emergency stop activated",
    timestamp: Date.now(),
  });
  saveSecurityEvents(events);
}

export function deactivateGlobalEmergencyStop(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMERGENCY_KEY, "false");
  const events = getSecurityEvents();
  events.push({
    id: crypto.randomUUID(),
    type: "emergency_stop",
    message: "Global emergency stop deactivated",
    timestamp: Date.now(),
  });
  saveSecurityEvents(events);
}

// ─── Guardian System (Multi-sig) ────────────────────────────

export type Guardian = {
  address: string;
  name: string;
  addedAt: number;
  active: boolean;
};

export type GuardianVote = {
  id: string;
  action: "pause" | "unpause" | "revoke_permission" | "change_config";
  target: string;
  votes: { guardian: string; vote: "yes" | "no"; timestamp: number }[];
  requiredVotes: number;
  status: "pending" | "approved" | "rejected" | "executed";
  createdAt: number;
  executedAt?: number;
};

const GUARDIANS_KEY = "***";
const VOTES_KEY = "***";

export function getGuardians(): Guardian[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(GUARDIANS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addGuardian(address: string, name: string): void {
  const guardians = getGuardians();
  if (guardians.some((g) => g.address === address)) return;
  guardians.push({
    address,
    name,
    addedAt: Date.now(),
    active: true,
  });
  localStorage.setItem(GUARDIANS_KEY, JSON.stringify(guardians));
}

export function removeGuardian(address: string): void {
  const guardians = getGuardians().map((g) =>
    g.address === address ? { ...g, active: false } : g,
  );
  localStorage.setItem(GUARDIANS_KEY, JSON.stringify(guardians));
}

export function createGuardianVote(
  action: GuardianVote["action"],
  target: string,
  requiredVotes: number = 3,
): GuardianVote {
  const vote: GuardianVote = {
    id: crypto.randomUUID(),
    action,
    target,
    votes: [],
    requiredVotes,
    status: "pending",
    createdAt: Date.now(),
  };

  const votes = getGuardianVotes();
  votes.push(vote);
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));

  return vote;
}

export function castVote(
  voteId: string,
  guardian: string,
  vote: "yes" | "no",
): void {
  const votes = getGuardianVotes();
  const voteRequest = votes.find((v) => v.id === voteId);

  if (voteRequest && voteRequest.status === "pending") {
    // Check if already voted
    if (voteRequest.votes.some((v) => v.guardian === guardian)) return;

    voteRequest.votes.push({
      guardian,
      vote,
      timestamp: Date.now(),
    });

    // Check if approved
    const yesVotes = voteRequest.votes.filter((v) => v.vote === "yes").length;
    if (yesVotes >= voteRequest.requiredVotes) {
      voteRequest.status = "approved";
    }

    // Check if rejected (all guardians voted and not enough yes)
    const guardians = getGuardians().filter((g) => g.active);
    if (voteRequest.votes.length >= guardians.length) {
      if (yesVotes < voteRequest.requiredVotes) {
        voteRequest.status = "rejected";
      }
    }

    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  }
}

export function getGuardianVotes(): GuardianVote[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(VOTES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getPendingVotes(): GuardianVote[] {
  return getGuardianVotes().filter((v) => v.status === "pending");
}
