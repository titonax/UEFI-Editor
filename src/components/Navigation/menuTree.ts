import type { Data, VisibilityStatus } from "../scripts/types";
import {
  childVisibility,
  combineVisibility,
  visibilityLabel,
} from "../scripts/visibility";

export type ReachabilityStatus =
  | "root"
  | "reachable"
  | "detached"
  | "broken";

export type RootSource = "amitse" | "hii-formset" | "inferred";

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
  reachability: ReachabilityStatus;
  reachabilityLabel: string;
  rootSource?: RootSource;
  hardwareDependent: boolean;
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

function sameGuid(left?: string, right?: string) {
  return (left ?? "").toLowerCase() === (right ?? "").toLowerCase();
}

function findFormIndex(data: Data, formId: string, formSetGuid?: string) {
  const normalized = normalizedFormId(formId);
  const inFormSet = data.forms.findIndex(
    (form) =>
      sameGuid(form.formSetGuid, formSetGuid) &&
      normalizedFormId(form.formId) === normalized,
  );

  if (inFormSet >= 0) {
    return inFormSet;
  }

  return data.forms.findIndex(
    (form) => normalizedFormId(form.formId) === normalized,
  );
}

function conditionDescriptions(
  visibility: ReturnType<typeof childVisibility>,
) {
  return visibility.conditions
    .filter((condition) => condition.active && condition.constant !== false)
    .map((condition) => {
      const kind = condition.kind ?? "SuppressIf";
      return `${kind}: ${condition.expression ?? `condition at ${condition.offset}`}`;
    });
}

function inheritedStatusLabel(
  status: VisibilityStatus,
  directStatus: VisibilityStatus,
  directLabel: string,
) {
  if (status === directStatus) {
    return directLabel;
  }

  if (status === "hidden") {
    return "Hidden by parent gate";
  }

  if (status === "conditional") {
    return "Unavailable by parent gate";
  }

  return visibilityLabel(status);
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
    reachability: ReachabilityStatus,
    conditionPath: string[] = [],
    hardwareDependent = false,
    statusLabel = visibilityLabel(inheritedStatus),
    reachabilityLabel =
      reachability === "detached"
        ? "Detached descendant"
        : "Reachable from menu",
    rootSource?: RootSource,
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
            const targetFormSetGuid =
              reference.targetFormSetGuid ?? form.formSetGuid;
            const targetIndex = findFormIndex(
              data,
              reference.formId,
              targetFormSetGuid,
            );
            const childKey = `${key}/ref-${String(childIndex)}-${normalizedFormId(
              reference.formId,
            )}`;
            const visibility = childVisibility(data, reference);
            const descriptions = conditionDescriptions(visibility);
            const nextConditionPath = [...conditionPath, ...descriptions];
            const nextHardwareDependent =
              hardwareDependent || visibility.hardwareDependent;

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
                reachability: "broken",
                reachabilityLabel: "Dangling Ref target",
                hardwareDependent: nextHardwareDependent,
                conditionSummary:
                  nextConditionPath.join("; ") ||
                  "The Ref target does not exist in the parsed HII graph.",
              };
            }

            const target = data.forms[targetIndex];
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
              reachability === "detached" ? "detached" : "reachable",
              nextConditionPath,
              nextHardwareDependent,
              inheritedStatusLabel(status, visibility.status, visibility.label),
              reachability === "detached"
                ? "Detached descendant"
                : "Reachable through Ref",
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
      statusLabel,
      reachability,
      reachabilityLabel,
      rootSource,
      hardwareDependent,
      conditionSummary:
        conditionPath.length > 0 ? conditionPath.join("; ") : undefined,
    };
  }

  const hasAmitseRoots = data.menu.some(
    (entry) => entry.source === "amitse" || entry.offset !== null,
  );
  const rootEntries = hasAmitseRoots
    ? data.menu.filter(
        (entry) => entry.source === "amitse" || entry.offset !== null,
      )
    : data.menu;

  const roots = rootEntries
    .map((entry, menuIndex): MenuTreeNode | null => {
      const formIndex = findFormIndex(data, entry.formId, entry.formSetGuid);
      const rootSource: RootSource =
        entry.source === "amitse" || entry.offset !== null
          ? "amitse"
          : "hii-formset";
      const reachabilityLabel =
        rootSource === "amitse" ? "AMITSE menu root" : "HII FormSet entry";

      if (formIndex < 0) {
        return {
          key: `root-${String(menuIndex)}-${normalizedFormId(entry.formId)}`,
          label: entry.name || `Missing root ${entry.formId}`,
          formName: "Menu root target was not found",
          formId: entry.formId,
          formIndex: null,
          children: [],
          missing: true,
          status: "broken",
          statusLabel: visibilityLabel("broken"),
          reachability: "broken",
          reachabilityLabel: "Broken root target",
          rootSource,
          hardwareDependent: false,
          conditionSummary:
            "The menu entry points to a form that does not exist in the parsed HII graph.",
        };
      }

      const form = data.forms[formIndex];
      return buildFormNode(
        formIndex,
        `root-${String(menuIndex)}-${normalizedFormId(entry.formId)}`,
        entry.name.length > 0
          ? entry.name
          : (form.formSetTitle ?? form.name),
        new Set(),
        "visible",
        "root",
        [],
        false,
        "No visibility gate",
        reachabilityLabel,
        rootSource,
      );
    })
    .filter((node): node is MenuTreeNode => node !== null);

  if (roots.length === 0) {
    for (const [formIndex, form] of data.forms.entries()) {
      if (form.referencedIn.length === 0 && !reachable.has(formIndex)) {
        roots.push(
          buildFormNode(
            formIndex,
            `root-fallback-${String(formIndex)}`,
            form.formSetTitle ?? form.name,
            new Set(),
            "visible",
            "root",
            [],
            false,
            "No visibility gate",
            "Inferred graph entry",
            "inferred",
          ),
        );
      }
    }
  }

  const remaining = new Set(
    data.forms
      .map((_, formIndex) => formIndex)
      .filter((formIndex) => !reachable.has(formIndex)),
  );
  const incomingFromRemaining = new Map<number, number>();
  for (const formIndex of remaining) {
    incomingFromRemaining.set(formIndex, 0);
  }
  for (const formIndex of remaining) {
    const form = data.forms[formIndex];
    for (const child of form.children) {
      if (child.type !== "Ref") {
        continue;
      }
      const targetIndex = findFormIndex(
        data,
        child.formId,
        child.targetFormSetGuid ?? form.formSetGuid,
      );
      if (remaining.has(targetIndex)) {
        incomingFromRemaining.set(
          targetIndex,
          (incomingFromRemaining.get(targetIndex) ?? 0) + 1,
        );
      }
    }
  }

  const formSetRootIndices = new Set(
    (
      data.formSetRoots ??
      data.menu.filter((entry) => entry.source === "formset")
    )
      .map((entry) => findFormIndex(data, entry.formId, entry.formSetGuid))
      .filter((formIndex) => formIndex >= 0),
  );
  const detachedCandidates = [
    ...[...remaining].filter((formIndex) => formSetRootIndices.has(formIndex)),
    ...[...remaining].filter(
      (formIndex) =>
        !formSetRootIndices.has(formIndex) &&
        (incomingFromRemaining.get(formIndex) ?? 0) === 0,
    ),
  ];

  const orphans: MenuTreeNode[] = [];
  function addDetachedRoot(formIndex: number, reason: string) {
    if (reachable.has(formIndex)) {
      return;
    }
    const form = data.forms[formIndex];
    orphans.push(
      buildFormNode(
        formIndex,
        `detached-${String(formIndex)}`,
        form.formSetTitle ?? form.name,
        new Set(),
        "visible",
        "detached",
        [],
        false,
        "No visibility gate",
        reason,
      ),
    );
  }

  for (const formIndex of detachedCandidates) {
    addDetachedRoot(
      formIndex,
      formSetRootIndices.has(formIndex)
        ? "Detached HII FormSet"
        : "Unreferenced form",
    );
  }

  for (const formIndex of remaining) {
    addDetachedRoot(formIndex, "Detached cycle or isolated subgraph");
  }

  const signature = [
    ...roots.map((node) => node.key),
    ...orphans.map((node) => node.key),
    ...data.forms.map(
      (form) =>
        `${form.formSetGuid ?? ""}:${normalizedFormId(form.formId)}:${form.children
          .filter((child) => child.type === "Ref")
          .map(
            (child) =>
              `${child.targetFormSetGuid ?? form.formSetGuid ?? ""}:${normalizedFormId(child.formId)}`,
          )
          .join(",")}`,
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
