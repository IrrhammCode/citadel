// ─── Agent Scheduler ────────────────────────────────────────
// Manages agent execution schedules with configurable intervals

export type ScheduleConfig = {
  systemId: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
};

export type SchedulerState = {
  schedules: Map<string, ScheduleConfig>;
  isRunning: boolean;
};

const STORAGE_KEY = "citadel:agent-schedules";

// ─── Storage ────────────────────────────────────────────────

function loadSchedules(): Record<string, ScheduleConfig> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  return JSON.parse(raw);
}

function saveSchedules(schedules: Record<string, ScheduleConfig>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
  window.dispatchEvent(new Event("schedules_updated"));
}

// ─── Scheduler Class ────────────────────────────────────────

export class AgentScheduler {
  private static instance: AgentScheduler;
  private schedules: Map<string, ScheduleConfig> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isRunning = false;
  private onExecute?: (systemId: string) => Promise<void>;

  private constructor() {
    // Load persisted schedules
    const saved = loadSchedules();
    for (const [id, config] of Object.entries(saved)) {
      this.schedules.set(id, config);
    }
  }

  static getInstance(): AgentScheduler {
    if (!AgentScheduler.instance) {
      AgentScheduler.instance = new AgentScheduler();
    }
    return AgentScheduler.instance;
  }

  // ── Set Execute Callback ──────────────────────────────────

  setExecuteCallback(callback: (systemId: string) => Promise<void>) {
    this.onExecute = callback;
  }

  // ── Add Schedule ──────────────────────────────────────────

  addSchedule(systemId: string, intervalMinutes: number): ScheduleConfig {
    const config: ScheduleConfig = {
      systemId,
      intervalMinutes,
      enabled: true,
      runCount: 0,
      nextRun: Date.now() + intervalMinutes * 60 * 1000,
    };

    this.schedules.set(systemId, config);
    this.persistSchedules();

    if (this.isRunning) {
      this.scheduleNext(systemId);
    }

    console.log(`📅 Schedule added: ${systemId} (every ${intervalMinutes}min)`);
    return config;
  }

  // ── Remove Schedule ───────────────────────────────────────

  removeSchedule(systemId: string) {
    const timer = this.timers.get(systemId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(systemId);
    }
    this.schedules.delete(systemId);
    this.persistSchedules();
    console.log(`🗑️ Schedule removed: ${systemId}`);
  }

  // ── Update Schedule ───────────────────────────────────────

  updateSchedule(systemId: string, updates: Partial<ScheduleConfig>) {
    const config = this.schedules.get(systemId);
    if (!config) return;

    Object.assign(config, updates);
    this.schedules.set(systemId, config);
    this.persistSchedules();

    // Reschedule if interval changed
    if (updates.intervalMinutes) {
      const timer = this.timers.get(systemId);
      if (timer) clearTimeout(timer);
      if (this.isRunning && config.enabled) {
        this.scheduleNext(systemId);
      }
    }
  }

  // ── Start Scheduler ───────────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Schedule all enabled agents
    for (const [systemId, config] of this.schedules) {
      if (config.enabled) {
        this.scheduleNext(systemId);
      }
    }

    console.log(`🚀 Scheduler started with ${this.schedules.size} schedules`);
  }

  // ── Stop Scheduler ────────────────────────────────────────

  stop() {
    this.isRunning = false;

    // Clear all timers
    for (const [systemId, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();

    console.log(`⏹️ Scheduler stopped`);
  }

  // ── Schedule Next Execution ───────────────────────────────

  private scheduleNext(systemId: string) {
    const config = this.schedules.get(systemId);
    if (!config || !config.enabled) return;

    const now = Date.now();
    const delay = config.nextRun ? Math.max(0, config.nextRun - now) : 0;

    const timer = setTimeout(async () => {
      await this.executeSchedule(systemId);
    }, delay);

    this.timers.set(systemId, timer);
  }

  // ── Execute Schedule ──────────────────────────────────────

  private async executeSchedule(systemId: string) {
    const config = this.schedules.get(systemId);
    if (!config || !config.enabled) return;

    try {
      console.log(`⏰ Executing schedule: ${systemId}`);

      // Execute callback
      if (this.onExecute) {
        await this.onExecute(systemId);
      }

      // Update config
      config.lastRun = Date.now();
      config.nextRun = Date.now() + config.intervalMinutes * 60 * 1000;
      config.runCount++;
      this.schedules.set(systemId, config);
      this.persistSchedules();

      // Schedule next
      this.scheduleNext(systemId);

      console.log(`✅ Schedule executed: ${systemId} (run #${config.runCount})`);
    } catch (error) {
      console.error(`❌ Schedule execution failed: ${systemId}`, error);

      // Retry after 5 minutes
      const timer = setTimeout(() => {
        this.scheduleNext(systemId);
      }, 5 * 60 * 1000);
      this.timers.set(systemId, timer);
    }
  }

  // ── Get Schedule ──────────────────────────────────────────

  getSchedule(systemId: string): ScheduleConfig | undefined {
    return this.schedules.get(systemId);
  }

  // ── Get All Schedules ─────────────────────────────────────

  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values());
  }

  // ── Get Status ────────────────────────────────────────────

  getStatus() {
    return {
      isRunning: this.isRunning,
      totalSchedules: this.schedules.size,
      enabledSchedules: Array.from(this.schedules.values()).filter((s) => s.enabled).length,
      schedules: this.getAllSchedules(),
    };
  }

  // ── Persist Schedules ─────────────────────────────────────

  private persistSchedules() {
    const obj: Record<string, ScheduleConfig> = {};
    for (const [id, config] of this.schedules) {
      obj[id] = config;
    }
    saveSchedules(obj);
  }
}

// ─── Quick Schedule Functions ───────────────────────────────

export function scheduleAgent(systemId: string, intervalMinutes: number = 60) {
  const scheduler = AgentScheduler.getInstance();
  return scheduler.addSchedule(systemId, intervalMinutes);
}

export function unscheduleAgent(systemId: string) {
  const scheduler = AgentScheduler.getInstance();
  scheduler.removeSchedule(systemId);
}

export function getScheduledAgents() {
  const scheduler = AgentScheduler.getInstance();
  return scheduler.getAllSchedules();
}
