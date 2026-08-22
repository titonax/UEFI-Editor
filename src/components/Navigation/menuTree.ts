import type { Data, VisibilityStatus } from "../scripts/types";
import {
  childVisibility,
  combineVisibility,
  visibilityLabel,
} from "../scripts/visibility";

export interface MenuTreeNode {
  key: string;
  label: string;
  formName: string;
  formId: string;
  formIndex: number | null;
  children: MenuTreeNode[];
  cycle?: boolean;
  missing?: boolean;
  status: VisibilityStatus;
  statusLabel: string;
  conditionSummary?: string;
}

export interface MenuTree {
  roots: MenuTreeNode[];
  orphans: MenuTreeNode[];
  expandableKeys: string[];
  firstKeyByFormIndex: Map<number, string>;
  signature: string;
}

function normalizedFormId(formId: string) {
  const parsed = parseInt(formId);
  return Number.isNaN(parsed) ? formId : String(parsed);
}

function findFormIndex(
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

  if (inFormSet >= 0) {
    return inFormSet;
  }

  return data.forms.findIndex(
    (form) => normalizedFormId(form.formId) === normalized,
  );
}

export function buildMenuTree(data: Data): MenuTree {
  const reachable = new Set<number>();
  const expandableKeys: string[] = [];
  const firstKeyByFormIndex = new Map<number, string>();

  function buildFormNode(
    formIndex: number,
    key: string,
    label: string,
    ancestors: Set<number>,
    inheritedStatus: VisibilityStatus,
    conditionSummary?: string,
  ): MenuTreeNode {
    const form = data.forms[formIndex];
    const cycle = ancestors.has(formIndex);
    reachable.add(formIndex);

    if (!firstKeyByFormIndex.has(formIndex)) {
      firstKeyByFormIndex.set(formIndex, key);
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(formIndex);

    const children = cycle
      ? []
      : form.children
          .map((child, childIndex): MenuTreeNode | null => {
            if (child.type !== "Ref") {
              return null;
            }

            const reference = child;
            const targetIndex = findFormIndex(
              data,
              reference.formId,
              form.formSetGuid,
            );
            const childKey = `${key}/ref-${String(childIndex)}-${normalizedFormId(
              reference.formId,
            )}`;

            if (targetIndex < 0) {
              return {
                key: childKey,
                label:
                  reference.name.length > 0
                    ? reference.name
                    : `Missing form ${reference.formId}`,
                formName: "Referenced form was not found",
                formId: reference.formId,
                formIndex: null,
                children: [],
                missing: true,
                status: "broken",
                statusLabel: visibilityLabel("broken"),
                conditionSummary: "The Ref target does not exist in the parsed HII graph.",
              };
            }

            const target = data.forms[targetIndex];
            const visibility = childVisibility(data, reference);
            const status = combineVisibility(
              inheritedStatus,
              visibility.status,
            );
            return buildFormNode(
              targetIndex,
              childKey,
              reference.name.length > 0 ? reference.name : target.name,
              nextAncestors,
              status,
              visibility.conditions
                .map((item) => item.expression)
                .filter((item): item is string => Boolean(item))
                .join("; ") || visibility.explanation,
            );
          })
          .filter((node): node is MenuTreeNode => node !== null);

    if (children.length > 0) {
      expandableKeys.push(key);
    }

    return {
      key,
      label:
        label.length > 0
          ? label
          : form.name.length > 0
            ? form.name
            : `Form ${form.formId}`,
      formName: form.name,
      formId: form.formId,
      formIndex,
      children,
      cycle,
      status: inheritedStatus,
      statusLabel: visibilityLabel(inheritedStatus),
      conditionSummary,
    };
  }

  const roots = data.menu
    .map((entry, menuIndex): MenuTreeNode | null => {
      const formIndex = findFormIndex(
        data,
        entry.formId,
        entry.formSetGuid,
      );
      if (formIndex < 0) {
        return {
          key: `root-${String(menuIndex)}-${normalizedFormId(entry.formId)}`,
          label: entry.name || `Missing root ${entry.formId}`,
          formName: "AMITSE root target was not found",
          formId: entry.formId,
          formIndex: null,
          children: [],
          missing: true,
          status: "broken",
          statusLabel: visibilityLabel("broken"),
          conditionSummary:
            "The menu table points to a form that does not exist in the parsed HII graph.",
        };
      }

      const form = data.forms[formIndex];
      const confirmed = entry.source === "amitse" || entry.offset !== null;
      return buildFormNode(
        formIndex,
        `root-${String(menuIndex)}-${normalizedFormId(entry.formId)}`,
        entry.name.length > 0
          ? entry.name
          : (form.formSetTitle ?? form.name),
        new Set(),
        confirmed ? "visible" : "unknown",
        confirmed
          ? "Confirmed in the AMITSE menu table."
          : "FormSet root found in HII, but presence in the visible AMITSE tab list is not confirmed.",
      );
    })
    .filter((node): node is MenuTreeNode => node !== null);

  if (roots.length === 0) {
    for (const [formIndex, form] of data.forms.entries()) {
      if (form.referencedIn.length === 0) {
        roots.push(
          buildFormNode(
            formIndex,
            `root-fallback-${String(formIndex)}`,
            form.formSetTitle ?? form.name,
            new Set(),
            "unknown",
            "Fallback root inferred from an unreferenced FormSet.",
          ),
        );
      }
    }
  }

  const orphans: MenuTreeNode[] = [];
  for (const [formIndex, form] of data.forms.entries()) {
    if (!reachable.has(formIndex)) {
      orphans.push(
        buildFormNode(
          formIndex,
          `orphan-${String(formIndex)}`,
          form.name,
          new Set(),
          "orphaned",
          "No path from a detected menu root reaches this form.",
        ),
      );
    }
  }

  const signature = [
    ...roots.map((node) => node.key),
    ...orphans.map((node) => node.key),
    ...data.forms.map(
      (form) =>
        `${form.formSetGuid ?? ""}:${normalizedFormId(form.formId)}:${String(
          form.children.filter((child) => child.type === "Ref").length,
        )}`,
    ),
  ].join("|");

  return {
    roots,
    orphans,
    expandableKeys,
    firstKeyByFormIndex,
    signature,
  };
}

export function findNodePath(
  nodes: MenuTreeNode[],
  formIndex: number,
): MenuTreeNode[] {
  for (const node of nodes) {
    if (node.formIndex === formIndex) {
      return [node];
    }

    const childPath = findNodePath(node.children, formIndex);
    if (childPath.length > 0) {
      return [node, ...childPath];
    }
  }

  return [];
}
