import type {
  Data,
  FormChildren,
  Suppression,
  VisibilityStatus,
} from "./types";

export interface VisibilityInfo {
  status: VisibilityStatus;
  label: string;
  explanation: string;
  conditions: Suppression[];
}

export type VisibilityCounts = Record<VisibilityStatus, number>;

export interface FormBranchVisibility {
  direct: VisibilityCounts;
  branch: VisibilityCounts;
  descendantForms: number;
}

const labels: Record<VisibilityStatus, string> = {
  visible: "Statically visible",
  hidden: "Hidden",
  conditional: "Conditional",
  unknown: "Not confirmed",
  orphaned: "Orphaned",
  broken: "Broken reference",
};

export function visibilityLabel(status: VisibilityStatus) {
  return labels[status];
}

export function conditionsForChild(data: Data, child: FormChildren) {
  return (child.conditions ?? child.suppressIf ?? [])
    .map((offset) =>
      data.suppressions.find((condition) => condition.offset === offset),
    )
    .filter((condition): condition is Suppression => condition !== undefined);
}

export function childVisibility(
  data: Data,
  child: FormChildren,
): VisibilityInfo {
  const conditions = conditionsForChild(data, child).filter(
    (condition) => condition.active,
  );
  const suppressions = conditions.filter(
    (condition) => (condition.kind ?? "SuppressIf") === "SuppressIf",
  );

  if (suppressions.some((condition) => condition.constant === true)) {
    return {
      status: "hidden",
      label: labels.hidden,
      explanation: "The IFR contains an always-true SuppressIf condition.",
      conditions,
    };
  }

  if (conditions.some((condition) => condition.constant !== false)) {
    const runtime = conditions.some(
      (condition) => condition.source === "runtime",
    );
    return {
      status: "conditional",
      label: runtime ? "Runtime / HW candidate" : labels.conditional,
      explanation: runtime
        ? "Visibility depends on a non-Setup runtime variable; hardware involvement is possible but not yet proven."
        : "Visibility depends on an IFR expression whose current runtime value is not available in the image.",
      conditions,
    };
  }

  return {
    status: "visible",
    label: labels.visible,
    explanation:
      child.accessLevel === null
        ? "No active IFR condition is known to hide this item."
        : `No active IFR condition is known. AMI SetupData AccessLevel is 0x${child.accessLevel}; that policy byte is reported separately and is not treated as proof of live visibility.`,
    conditions,
  };
}

export function combineVisibility(
  parent: VisibilityStatus,
  child: VisibilityStatus,
): VisibilityStatus {
  const priority: Record<VisibilityStatus, number> = {
    visible: 0,
    unknown: 1,
    conditional: 2,
    hidden: 3,
    orphaned: 4,
    broken: 5,
  };

  return priority[parent] >= priority[child] ? parent : child;
}

function emptyCounts(): VisibilityCounts {
  return {
    visible: 0,
    hidden: 0,
    conditional: 0,
    unknown: 0,
    orphaned: 0,
    broken: 0,
  };
}

function normalizedFormId(formId: string) {
  const parsed = parseInt(formId);
  return Number.isNaN(parsed) ? formId : String(parsed);
}

function findReferencedForm(
  data: Data,
  formId: string,
  formSetGuid?: string,
) {
  const normalized = normalizedFormId(formId);
  const inFormSet = data.forms.findIndex(
    (form) =>
      form.formSetGuid === formSetGuid &&
      normalizedFormId(form.formId) === normalized,
  );

  return inFormSet >= 0
    ? inFormSet
    : data.forms.findIndex(
        (form) => normalizedFormId(form.formId) === normalized,
      );
}

export function summarizeFormBranch(
  data: Data,
  rootFormIndex: number,
  inheritedStatus: VisibilityStatus = "visible",
): FormBranchVisibility {
  const direct = emptyCounts();
  const branch = emptyCounts();
  const descendantForms = new Set<number>();

  function visit(
    formIndex: number,
    inheritedStatus: VisibilityStatus,
    ancestors: Set<number>,
    depth: number,
  ) {
    const form = data.forms[formIndex];
    if (!form) {
      return;
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(formIndex);

    for (const child of form.children) {
      let status = combineVisibility(
        inheritedStatus,
        childVisibility(data, child).status,
      );
      let targetIndex = -1;

      if (child.type === "Ref") {
        targetIndex = findReferencedForm(
          data,
          child.formId,
          form.formSetGuid,
        );
        if (targetIndex < 0) {
          status = "broken";
        }
      }

      branch[status]++;
      if (depth === 0) {
        direct[status]++;
      }

      if (
        child.type === "Ref" &&
        targetIndex >= 0 &&
        !nextAncestors.has(targetIndex)
      ) {
        descendantForms.add(targetIndex);
        visit(targetIndex, status, nextAncestors, depth + 1);
      }
    }
  }

  visit(rootFormIndex, inheritedStatus, new Set(), 0);
  descendantForms.delete(rootFormIndex);

  return {
    direct,
    branch,
    descendantForms: descendantForms.size,
  };
}
