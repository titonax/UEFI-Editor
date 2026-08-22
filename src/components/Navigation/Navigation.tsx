import React from "react";
import {
  ActionIcon,
  AppShell,
  Group,
  ScrollArea,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronRight,
  IconFileDescription,
  IconFolder,
  IconFolderOpen,
  IconListTree,
  IconRefresh,
  IconSearch,
  IconSitemap,
} from "@tabler/icons-react";
import s from "./Navigation.module.css";
import type { Data } from "../scripts/types";
import {
  buildMenuTree,
  findNodePath,
  type MenuTreeNode,
} from "./menuTree";

interface NavigationProps {
  data: Data;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function Navigation({
  data,
  currentFormIndex,
  setCurrentFormIndex,
}: NavigationProps) {
  const tree = React.useMemo(
    () => buildMenuTree(data),
    [data],
  );
  const [expanded, setExpanded] = React.useState(
    () => new Set(tree.roots.map((node) => node.key)),
  );

  const activePath = React.useMemo(() => {
    if (currentFormIndex < 0) {
      return [];
    }

    const rootPath = findNodePath(tree.roots, currentFormIndex);
    return rootPath.length > 0
      ? rootPath
      : findNodePath(tree.orphans, currentFormIndex);
  }, [currentFormIndex, tree.orphans, tree.roots]);

  React.useEffect(() => {
    if (activePath.length < 2) {
      return;
    }

    setExpanded((current) => {
      const next = new Set(current);
      for (const node of activePath.slice(0, -1)) {
        next.add(node.key);
      }
      return next;
    });
  }, [activePath]);

  function toggleNode(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function renderNode(node: MenuTreeNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const opened = expanded.has(node.key);
    const active = node.formIndex === currentFormIndex;
    const isPrimaryNode =
      node.formIndex !== null &&
      tree.firstKeyByFormIndex.get(node.formIndex) === node.key;
    const title =
      node.label === node.formName
        ? `${node.formName} (${node.formId})`
        : `${node.label} — ${node.formName} (${node.formId})`;
    const statusClass = {
      visible: s.statusVisible,
      hidden: s.statusHidden,
      conditional: s.statusConditional,
      unknown: s.statusUnknown,
      orphaned: s.statusHidden,
      broken: s.statusBroken,
    }[node.status];
    const semanticTitle = `${title}\n${node.statusLabel}${
      node.conditionSummary ? `: ${node.conditionSummary}` : ""
    }`;

    return (
      <div
        key={node.key}
        role="treeitem"
        aria-expanded={hasChildren ? opened : undefined}
      >
        <div
          id={
            isPrimaryNode && node.formIndex !== null
              ? `nav-${String(node.formIndex)}`
              : undefined
          }
          className={[
            s.treeRow,
            active ? s.selected : "",
            node.missing ? s.missing : "",
            statusClass,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{ paddingLeft: `${String(depth * 16 + 6)}px` }}
          title={semanticTitle}
        >
          <button
            type="button"
            className={s.expander}
            disabled={!hasChildren}
            aria-label={opened ? "Collapse branch" : "Expand branch"}
            onClick={() => {
              if (hasChildren) {
                toggleNode(node.key);
              }
            }}
          >
            {hasChildren && (
              <IconChevronRight
                size={14}
                className={opened ? s.chevronOpen : s.chevron}
              />
            )}
          </button>

          {node.missing ? (
            <IconAlertTriangle size={16} className={s.warningIcon} />
          ) : node.cycle ? (
            <IconRefresh size={16} className={s.mutedIcon} />
          ) : hasChildren ? (
            opened ? (
              <IconFolderOpen size={17} className={s.folderIcon} />
            ) : (
              <IconFolder size={17} className={s.folderIcon} />
            )
          ) : (
            <IconFileDescription size={16} className={s.formIcon} />
          )}

          <button
            type="button"
            className={s.nodeLabel}
            disabled={node.formIndex === null}
            onClick={() => {
              if (node.formIndex !== null) {
                setCurrentFormIndex(node.formIndex);
              }
            }}
            onDoubleClick={() => {
              if (hasChildren) {
                toggleNode(node.key);
              }
            }}
          >
            <span className={s.nodeName}>{node.label}</span>
            <span className={s.formId}>{node.formId}</span>
            <span className={s.statusLabel}>{node.statusLabel}</span>
          </button>
        </div>

        {hasChildren && opened && (
          <div role="group" className={s.children}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <AppShell.Section className={s.treeHeader}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <IconListTree size={20} className={s.headerIcon} />
            <div>
              <Text size="sm" fw={600}>
                BIOS menu tree
              </Text>
              <Text size="xs" c="dimmed">
                {data.forms.length} forms
              </Text>
            </div>
          </Group>
          <Group gap={2} wrap="nowrap">
            <Tooltip label="Expand all">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                aria-label="Expand all menu branches"
                onClick={() => {
                  setExpanded(new Set(tree.expandableKeys));
                }}
              >
                <IconArrowsMaximize size={15} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Collapse all">
              <ActionIcon
                size="sm"
                variant="subtle"
                color="gray"
                aria-label="Collapse all menu branches"
                onClick={() => {
                  setExpanded(new Set());
                }}
              >
                <IconArrowsMinimize size={15} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Section>

      <AppShell.Section
        className={[
          s.navElement,
          s.menu,
          currentFormIndex === -1 ? s.selected : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          setCurrentFormIndex(-1);
        }}
      >
        <IconSitemap size={17} />
        <span>Top-level menu</span>
      </AppShell.Section>

      <AppShell.Section
        grow
        component={ScrollArea}
        type="always"
        className={s.treeScroll}
      >
        <div role="tree" aria-label="BIOS forms" className={s.tree}>
          {tree.roots.map((node) => renderNode(node, 0))}

          {tree.orphans.length > 0 && (
            <>
              <div className={s.sectionLabel}>Unlinked forms</div>
              {tree.orphans.map((node) => renderNode(node, 0))}
            </>
          )}
        </div>
      </AppShell.Section>

      <AppShell.Section
        className={[
          s.navElement,
          s.search,
          currentFormIndex === -2 ? s.selected : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => {
          setCurrentFormIndex(-2);
        }}
      >
        <IconSearch size={17} />
        <span>Search</span>
      </AppShell.Section>
    </>
  );
}
