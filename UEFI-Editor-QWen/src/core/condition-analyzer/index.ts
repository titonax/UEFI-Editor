/**
 * Condition Analyzer Module
 * Analyzes and evaluates form visibility conditions
 * @module core/condition-analyzer
 */

import type {
  Data,
  FormChildren,
  ConditionKind,
  VisibilityStatus,
  Suppression,
  VarStores,
} from "../types";
import { parseExpression, type ParsedExpression } from "../expression-parser";

/**
 * Result of condition analysis for a form child
 */
export interface ConditionAnalysisResult {
  readonly status: VisibilityStatus;
  readonly conditions: readonly ParsedExpression[];
  readonly suppressionCount: number;
  readonly hardwareDependent: boolean;
  readonly accessDependent: boolean;
  readonly uiStateDependent: boolean;
  readonly setupValueDependent: boolean;
  readonly summary: string;
}

/**
 * Retrieves all conditions affecting a specific form child
 * @param data - Complete firmware data structure
 * @param child - Form child element to analyze
 * @returns Array of condition expressions
 */
export function conditionsForChild(
  data: Data,
  child: FormChildren,
): readonly string[] {
  const conditions: string[] = [];

  if (child.conditions !== undefined && child.conditions.length > 0) {
    conditions.push(...child.conditions);
  }

  if (child.suppressIf !== undefined && child.suppressIf.length > 0) {
    for (const suppressOffset of child.suppressIf) {
      const matchingSuppression: Suppression | undefined = data.suppressions.find(
        (suppression) => suppression.offset === suppressOffset,
      );

      if (
        matchingSuppression !== undefined &&
        matchingSuppression.expression !== undefined
      ) {
        conditions.push(matchingSuppression.expression);
      }
    }
  }

  return conditions;
}

/**
 * Determines visibility status based on conditions
 * @param conditions - Array of parsed expressions
 * @returns VisibilityStatus indicating element visibility
 */
function determineVisibilityFromConditions(
  conditions: readonly ParsedExpression[],
): VisibilityStatus {
  if (conditions.length === 0) {
    return "visible";
  }

  const hasConstantTrue: boolean = conditions.some(
    (condition) => condition.isConstant && condition.constantValue === true,
  );

  if (hasConstantTrue) {
    return "hidden";
  }

  const hasNonConstant: boolean = conditions.some(
    (condition) => !condition.isConstant,
  );

  if (hasNonConstant) {
    return "conditional";
  }

  return "visible";
}

/**
 * Combines multiple visibility statuses into a single status
 * @param statuses - Array of visibility statuses to combine
 * @returns Combined VisibilityStatus
 */
export function combineVisibility(
  statuses: readonly VisibilityStatus[],
): VisibilityStatus {
  if (statuses.length === 0) {
    return "unknown";
  }

  if (statuses.includes("broken")) {
    return "broken";
  }

  if (statuses.includes("orphaned")) {
    return "orphaned";
  }

  if (statuses.includes("conditional")) {
    return "conditional";
  }

  if (statuses.includes("unknown")) {
    return "unknown";
  }

  if (statuses.every((status) => status === "visible")) {
    return "visible";
  }

  if (statuses.every((status) => status === "hidden")) {
    return "hidden";
  }

  return "conditional";
}

/**
 * Generates human-readable label for visibility status
 * @param status - VisibilityStatus to convert
 * @returns Descriptive label string
 */
export function visibilityLabel(status: VisibilityStatus): string {
  const labels: Record<VisibilityStatus, string> = {
    visible: "Always Visible",
    hidden: "Always Hidden",
    conditional: "Conditionally Visible",
    unknown: "Unknown Status",
    orphaned: "Orphaned Reference",
    broken: "Broken Reference",
  };

  return labels[status] ?? "Unknown";
}

/**
 * Analyzes conditions for a form child element
 * @param data - Complete firmware data structure
 * @param child - Form child element to analyze
 * @returns ConditionAnalysisResult with detailed analysis
 */
export function analyzeChildConditions(
  data: Data,
  child: FormChildren,
): ConditionAnalysisResult {
  const rawConditions: readonly string[] = conditionsForChild(data, child);
  const parsedConditions: readonly ParsedExpression[] = rawConditions.map(
    (condition) => parseExpression(condition, data.varStores),
  );

  const status: VisibilityStatus = determineVisibilityFromConditions(
    parsedConditions,
  );

  const hardwareDependent: boolean = parsedConditions.some(
    (condition) => condition.source === "hardware",
  );

  const accessDependent: boolean = parsedConditions.some(
    (condition) => condition.source === "access",
  );

  const uiStateDependent: boolean = parsedConditions.some(
    (condition) => condition.source === "ui",
  );

  const setupValueDependent: boolean = parsedConditions.some(
    (condition) => condition.source === "setup",
  );

  // Count suppressions
  let suppressionCount: number = 0;
  if (child.suppressIf !== undefined) {
    suppressionCount = child.suppressIf.length;
  }

  // Generate summary
  const dependencyParts: string[] = [];
  if (hardwareDependent) {
    dependencyParts.push("hardware");
  }
  if (accessDependent) {
    dependencyParts.push("access policy");
  }
  if (uiStateDependent) {
    dependencyParts.push("UI state");
  }
  if (setupValueDependent) {
    dependencyParts.push("setup values");
  }

  let summary: string;
  if (dependencyParts.length === 0) {
    summary = "No conditional dependencies";
  } else if (dependencyParts.length === 1) {
    summary = `Depends on ${dependencyParts[0]}`;
  } else {
    summary = `Depends on ${dependencyParts.join(", ")}`;
  }

  return {
    status,
    conditions: parsedConditions,
    suppressionCount,
    hardwareDependent,
    accessDependent,
    uiStateDependent,
    setupValueDependent,
    summary,
  };
}

/**
 * Summarizes visibility conditions for an entire form
 * @param data - Complete firmware data structure
 * @param formIndex - Index of the form to analyze
 * @returns Summary string describing form's conditional visibility
 */
export function summarizeFormBranch(
  data: Data,
  formIndex: number,
): string {
  const form = data.forms[formIndex];
  if (form === undefined) {
    return "Form not found";
  }

  const conditionalCount: number = form.children.filter(
    (child) => {
      const analysis: ConditionAnalysisResult = analyzeChildConditions(
        data,
        child,
      );
      return analysis.status === "conditional";
    },
  ).length;

  const totalCount: number = form.children.length;

  if (totalCount === 0) {
    return "Empty form";
  }

  if (conditionalCount === 0) {
    return "All elements always visible";
  }

  const percentage: number = Math.round((conditionalCount / totalCount) * 100);
  return `${conditionalCount}/${totalCount} elements conditional (${percentage}%)`;
}

/**
 * Evaluates child visibility considering form context
 * @param data - Complete firmware data structure
 * @param child - Form child element
 * @param parentFormId - Parent form identifier
 * @returns VisibilityStatus for the child
 */
export function childVisibility(
  data: Data,
  child: FormChildren,
  parentFormId?: string,
): VisibilityStatus {
  const analysis: ConditionAnalysisResult = analyzeChildConditions(data, child);
  return analysis.status;
}
