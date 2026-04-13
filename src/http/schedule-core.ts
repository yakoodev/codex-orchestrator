import {
  COMPARISON_OPERATORS,
  type ComparisonOperator,
  type ScheduleEvaluationContext
} from "./app-constants";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function asNonNegativeInteger(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed === null) {
    return null;
  }

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export function parseScheduleEvaluationContext(
  dryRunContext: unknown
): { context: ScheduleEvaluationContext; warnings: string[] } {
  const warnings: string[] = [];
  if (!isPlainObject(dryRunContext)) {
    return {
      context: {
        nowUtc: new Date(),
        eventType: null,
        taskStatus: null,
        moduleEnabled: null,
        weeklyRemainingPct: null,
        fiveHourRemainingPct: null,
        resetEtaHours: null
      },
      warnings
    };
  }

  let nowUtc = new Date();
  const rawNowUtc = asNonEmptyString(dryRunContext["now_utc"]);
  if (rawNowUtc) {
    const parsed = new Date(rawNowUtc);
    if (Number.isNaN(parsed.getTime())) {
      warnings.push("dry_run_context.now_utc_invalid_fallback_to_current_time");
    } else {
      nowUtc = parsed;
    }
  }

  return {
    context: {
      nowUtc,
      eventType: asNonEmptyString(dryRunContext["event_type"]),
      taskStatus: asNonEmptyString(dryRunContext["task_status"]),
      moduleEnabled:
        typeof dryRunContext["module_enabled"] === "boolean"
          ? dryRunContext["module_enabled"]
          : null,
      weeklyRemainingPct: asFiniteNumber(dryRunContext["weekly_remaining_pct"]),
      fiveHourRemainingPct: asFiniteNumber(dryRunContext["five_hour_remaining_pct"]),
      resetEtaHours: asFiniteNumber(dryRunContext["reset_eta_hours"])
    },
    warnings
  };
}

function defaultOperatorForPredicate(predicate: string): ComparisonOperator {
  switch (predicate) {
    case "limit.weekly_remaining_lt":
    case "limit.five_hour_remaining_lt":
    case "limit.reset_eta_hours_lt":
      return "lt";
    case "limit.weekly_remaining_gt":
      return "gt";
    default:
      return "eq";
  }
}

function parseComparisonOperator(
  operatorValue: unknown,
  fallback: ComparisonOperator
): ComparisonOperator {
  const value = asNonEmptyString(operatorValue);
  if (!value) {
    return fallback;
  }

  return COMPARISON_OPERATORS.has(value as ComparisonOperator)
    ? (value as ComparisonOperator)
    : fallback;
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return false;
  }

  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function compareValues(actual: unknown, expected: unknown, operator: ComparisonOperator): boolean {
  switch (operator) {
    case "eq":
      return areValuesEqual(actual, expected);
    case "ne":
      return !areValuesEqual(actual, expected);
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      const actualNumber = asFiniteNumber(actual);
      const expectedNumber = asFiniteNumber(expected);
      if (actualNumber === null || expectedNumber === null) {
        return false;
      }
      if (operator === "lt") {
        return actualNumber < expectedNumber;
      }
      if (operator === "lte") {
        return actualNumber <= expectedNumber;
      }
      if (operator === "gt") {
        return actualNumber > expectedNumber;
      }
      return actualNumber >= expectedNumber;
    }
    case "in": {
      if (!Array.isArray(expected)) {
        return false;
      }
      return expected.some((entry) => areValuesEqual(actual, entry));
    }
    case "contains": {
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return actual.some((entry) => areValuesEqual(entry, expected));
      }
      return false;
    }
    default:
      return false;
  }
}

function parseCronValue(
  rawValue: string,
  min: number,
  max: number,
  allowSevenAsZero: boolean
): number | null {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  if (allowSevenAsZero && parsed === 7) {
    return 0;
  }

  if (parsed < min || parsed > max) {
    return null;
  }

  return parsed;
}

function expandCronToken(
  rawToken: string,
  min: number,
  max: number,
  allowSevenAsZero: boolean
): number[] | null {
  let token = rawToken.trim();
  if (!token) {
    return null;
  }

  let step = 1;
  if (token.includes("/")) {
    const [base, rawStep, ...rest] = token.split("/");
    if (rest.length > 0 || !base || !rawStep) {
      return null;
    }

    const parsedStep = Number(rawStep);
    if (!Number.isInteger(parsedStep) || parsedStep <= 0) {
      return null;
    }

    step = parsedStep;
    token = base;
  }

  let rangeStart = min;
  let rangeEnd = max;

  if (token !== "*") {
    if (token.includes("-")) {
      const [rawStart, rawEnd, ...rest] = token.split("-");
      if (rest.length > 0 || !rawStart || !rawEnd) {
        return null;
      }

      const parsedStart = parseCronValue(rawStart, min, max, allowSevenAsZero);
      const parsedEnd = parseCronValue(rawEnd, min, max, allowSevenAsZero);
      if (parsedStart === null || parsedEnd === null || parsedStart > parsedEnd) {
        return null;
      }

      rangeStart = parsedStart;
      rangeEnd = parsedEnd;
    } else {
      const parsedValue = parseCronValue(token, min, max, allowSevenAsZero);
      if (parsedValue === null) {
        return null;
      }

      rangeStart = parsedValue;
      rangeEnd = parsedValue;
    }
  }

  const values: number[] = [];
  for (let value = rangeStart; value <= rangeEnd; value += step) {
    values.push(allowSevenAsZero && value === 7 ? 0 : value);
  }

  return values;
}

function expandCronField(
  rawField: string,
  min: number,
  max: number,
  allowSevenAsZero = false
): Set<number> | null {
  const tokens = rawField.split(",");
  if (tokens.length === 0) {
    return null;
  }

  const expanded = new Set<number>();
  for (const token of tokens) {
    const values = expandCronToken(token, min, max, allowSevenAsZero);
    if (!values) {
      return null;
    }

    for (const value of values) {
      expanded.add(value);
    }
  }

  return expanded;
}

function matchesCronExpressionUtc(expression: string, nowUtc: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    return false;
  }

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = parts;
  if (!minuteField || !hourField || !dayOfMonthField || !monthField || !dayOfWeekField) {
    return false;
  }

  const minute = expandCronField(minuteField, 0, 59);
  const hour = expandCronField(hourField, 0, 23);
  const dayOfMonth = expandCronField(dayOfMonthField, 1, 31);
  const month = expandCronField(monthField, 1, 12);
  const dayOfWeek = expandCronField(dayOfWeekField, 0, 7, true);

  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) {
    return false;
  }

  return (
    minute.has(nowUtc.getUTCMinutes()) &&
    hour.has(nowUtc.getUTCHours()) &&
    dayOfMonth.has(nowUtc.getUTCDate()) &&
    month.has(nowUtc.getUTCMonth() + 1) &&
    dayOfWeek.has(nowUtc.getUTCDay())
  );
}

export function evaluateScheduleRuleAst(
  node: unknown,
  context: ScheduleEvaluationContext,
  path = "rule_ast"
): { matched: boolean; reasons: string[] } {
  if (!isPlainObject(node)) {
    return {
      matched: false,
      reasons: [`${path}:invalid_node`]
    };
  }

  if (Array.isArray(node["all"])) {
    const all = node["all"];
    if (all.length === 0) {
      return {
        matched: false,
        reasons: [`${path}.all:empty`]
      };
    }

    const reasons: string[] = [];
    let matched = true;
    all.forEach((child, index) => {
      const childResult = evaluateScheduleRuleAst(child, context, `${path}.all[${index}]`);
      matched = matched && childResult.matched;
      reasons.push(...childResult.reasons);
    });

    reasons.push(`${path}.all:${matched ? "matched" : "not_matched"}`);
    return { matched, reasons };
  }

  if (Array.isArray(node["any"])) {
    const any = node["any"];
    if (any.length === 0) {
      return {
        matched: false,
        reasons: [`${path}.any:empty`]
      };
    }

    const reasons: string[] = [];
    let matched = false;
    any.forEach((child, index) => {
      const childResult = evaluateScheduleRuleAst(child, context, `${path}.any[${index}]`);
      matched = matched || childResult.matched;
      reasons.push(...childResult.reasons);
    });

    reasons.push(`${path}.any:${matched ? "matched" : "not_matched"}`);
    return { matched, reasons };
  }

  if (node["not"] !== undefined) {
    const childResult = evaluateScheduleRuleAst(node["not"], context, `${path}.not`);
    const matched = !childResult.matched;
    return {
      matched,
      reasons: [...childResult.reasons, `${path}.not:${matched ? "matched" : "not_matched"}`]
    };
  }

  if (Array.isArray(node["conditions"])) {
    const conditions = node["conditions"];
    if (conditions.length === 0) {
      return {
        matched: false,
        reasons: [`${path}.conditions:empty`]
      };
    }

    const reasons: string[] = [];
    let matched = true;
    conditions.forEach((child, index) => {
      const childResult = evaluateScheduleRuleAst(child, context, `${path}.conditions[${index}]`);
      matched = matched && childResult.matched;
      reasons.push(...childResult.reasons);
    });

    reasons.push(`${path}.conditions:${matched ? "matched" : "not_matched"}`);
    return { matched, reasons };
  }

  const predicate = asNonEmptyString(node["predicate"]);
  if (!predicate) {
    return {
      matched: false,
      reasons: [`${path}:unsupported_node`]
    };
  }

  const expectedValue = node["value"];
  if (expectedValue === undefined) {
    return {
      matched: false,
      reasons: [`${path}.${predicate}:value_required`]
    };
  }

  const operator = parseComparisonOperator(
    node["operator"],
    defaultOperatorForPredicate(predicate)
  );

  if (predicate === "time.cron") {
    const expression = asNonEmptyString(expectedValue);
    if (!expression) {
      return {
        matched: false,
        reasons: [`${path}.time.cron:invalid_expression`]
      };
    }

    const matched = matchesCronExpressionUtc(expression, context.nowUtc);
    return {
      matched,
      reasons: [
        `${path}.time.cron:${matched ? "matched" : "not_matched"}:${context.nowUtc.toISOString()}`
      ]
    };
  }

  const compareWithContext = (actual: unknown, reasonPrefix: string): { matched: boolean; reasons: string[] } => {
    const matched = compareValues(actual, expectedValue, operator);
    return {
      matched,
      reasons: [`${reasonPrefix}:${matched ? "matched" : "not_matched"}`]
    };
  };

  switch (predicate) {
    case "event.type":
      return compareWithContext(context.eventType, `${path}.event.type`);
    case "state.task_status":
      return compareWithContext(context.taskStatus, `${path}.state.task_status`);
    case "state.module_enabled":
      return compareWithContext(context.moduleEnabled, `${path}.state.module_enabled`);
    case "limit.weekly_remaining_lt":
    case "limit.weekly_remaining_gt":
      if (context.weeklyRemainingPct === null) {
        return {
          matched: false,
          reasons: [`${path}.${predicate}:context_missing_weekly_remaining_pct`]
        };
      }
      return compareWithContext(context.weeklyRemainingPct, `${path}.${predicate}`);
    case "limit.five_hour_remaining_lt":
      if (context.fiveHourRemainingPct === null) {
        return {
          matched: false,
          reasons: [`${path}.${predicate}:context_missing_five_hour_remaining_pct`]
        };
      }
      return compareWithContext(context.fiveHourRemainingPct, `${path}.${predicate}`);
    case "limit.reset_eta_hours_lt":
      if (context.resetEtaHours === null) {
        return {
          matched: false,
          reasons: [`${path}.${predicate}:context_missing_reset_eta_hours`]
        };
      }
      return compareWithContext(context.resetEtaHours, `${path}.${predicate}`);
    default:
      return {
        matched: false,
        reasons: [`${path}.${predicate}:unsupported_predicate`]
      };
  }
}

