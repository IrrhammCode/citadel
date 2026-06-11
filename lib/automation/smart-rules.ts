export type RuleConditionType =
  | "balance_threshold"
  | "time_based"
  | "price_trigger"
  | "kpi_trigger";

export type RuleConditionOperator = "gt" | "lt" | "eq" | "gte" | "lte";

export interface RuleCondition {
  type: RuleConditionType;
  operator: RuleConditionOperator;
  value: number;
}

export type RuleActionType = "transfer" | "alert" | "pause_agent" | "adjust_budget";

export interface RuleAction {
  type: RuleActionType;
  params: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  targetSystem: string;
  enabled: boolean;
  lastTriggered?: number;
}

interface RuleWithDetails extends AutomationRule {
  parsedCondition: RuleCondition;
  parsedAction: RuleAction;
}

// In-memory store
const rules: Map<string, RuleWithDetails> = new Map();

function generateId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function compare(operator: RuleConditionOperator, actual: number, threshold: number): boolean {
  switch (operator) {
    case "gt":  return actual > threshold;
    case "lt":  return actual < threshold;
    case "eq":  return actual === threshold;
    case "gte": return actual >= threshold;
    case "lte": return actual <= threshold;
  }
}

/**
 * Create a new automation rule.
 */
export function createAutomationRule(
  name: string,
  condition: RuleCondition,
  action: RuleAction,
  targetSystem: string,
  enabled = true,
): AutomationRule {
  const rule: RuleWithDetails = {
    id: generateId(),
    name,
    condition: JSON.stringify(condition),
    action: JSON.stringify(action),
    targetSystem,
    enabled,
    parsedCondition: condition,
    parsedAction: action,
  };
  rules.set(rule.id, rule);
  const { parsedCondition, parsedAction, ...plain } = rule;
  return plain;
}

/**
 * Evaluate all enabled rules against a current state snapshot.
 * Returns rules whose conditions are met.
 */
export function evaluateRules(
  state: Record<string, number>,
): AutomationRule[] {
  const triggered: AutomationRule[] = [];
  for (const rule of rules.values()) {
    if (!rule.enabled) continue;
    const { type, operator, value: threshold } = rule.parsedCondition;
    const actual = state[type];
    if (actual !== undefined && compare(operator, actual, threshold)) {
      const { parsedCondition, parsedAction, ...plain } = rule;
      triggered.push(plain);
    }
  }
  return triggered;
}

/**
 * Execute a triggered rule — returns a result describing what would happen.
 */
export function executeRule(
  ruleId: string,
  state: Record<string, unknown>,
): { success: boolean; ruleId: string; action: RuleAction; result: string } {
  const rule = rules.get(ruleId);
  if (!rule) {
    return { success: false, ruleId, action: { type: "alert", params: {} }, result: "Rule not found" };
  }
  rule.lastTriggered = Date.now();

  const { type, params } = rule.parsedAction;
  let result: string;

  switch (type) {
    case "transfer":
      result = `Transfer executed: ${JSON.stringify(params)}`;
      break;
    case "alert":
      result = `Alert sent: ${params.message ?? "Automation rule triggered"}`;
      break;
    case "pause_agent":
      result = `Agent paused: ${params.agentId ?? "unknown"}`;
      break;
    case "adjust_budget":
      result = `Budget adjusted: ${JSON.stringify(params)}`;
      break;
    default:
      result = `Unknown action type: ${type}`;
  }

  return { success: true, ruleId, action: rule.parsedAction, result };
}

/**
 * Get all automation rules.
 */
export function getAutomationRules(): AutomationRule[] {
  return Array.from(rules.values()).map(({ parsedCondition, parsedAction, ...plain }) => plain);
}

/**
 * Toggle a rule's enabled state.
 */
export function toggleRule(ruleId: string, enabled?: boolean): AutomationRule | null {
  const rule = rules.get(ruleId);
  if (!rule) return null;
  rule.enabled = enabled ?? !rule.enabled;
  const { parsedCondition, parsedAction, ...plain } = rule;
  return plain;
}
