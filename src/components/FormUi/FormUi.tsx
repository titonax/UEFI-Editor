import React from "react";
import s from "./FormUi.module.css";
import type { Updater } from "use-immer";
import {
  Table,
  TextInput,
  NativeSelect,
  Spoiler,
  Stack,
  Group,
  Badge,
  Button,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDebouncedState } from "@mantine/hooks";
import type {
  Data,
  FormChildren,
  VisibilityStatus,
} from "../scripts/types";
import { validateByteInput } from "../scripts/scripts";
import SearchUi from "./SearchUi/SearchUi";
import {
  childVisibility,
  conditionsForChild,
  summarizeFormBranch,
} from "../scripts/visibility";
import { buildMenuTree, findNodePath } from "../Navigation/menuTree";

const visibilityColors = {
  visible: "green",
  hidden: "red",
  conditional: "orange",
  unknown: "gray",
  orphaned: "red",
  broken: "pink",
} as const;

function ConditionDetails({
  child,
  data,
  setData,
}: {
  child: FormChildren;
  data: Data;
  setData: Updater<Data>;
}) {
  const conditions = conditionsForChild(data, child);
  if (conditions.length === 0 && child.accessLevel === null) {
    return <Text size="xs" c="dimmed">No condition</Text>;
  }

  return (
    <Stack gap={5} className={s.conditionList}>
      {conditions.map((condition) => {
        const index = data.suppressions.indexOf(condition);
        const kind = condition.kind ?? "SuppressIf";
        const runtime = condition.source === "runtime";
        const sourceLabel = runtime
          ? "Runtime / HW candidate"
          : condition.source === "setup"
            ? "Setup variable"
            : condition.source ?? "unknown";
        return (
          <div key={condition.offset} className={s.conditionCard}>
            <Group gap={5} justify="space-between" wrap="nowrap">
              <Group gap={5} wrap="wrap">
                <Badge size="xs" color={runtime ? "orange" : kind === "SuppressIf" ? "red" : "yellow"}>
                  {kind}
                </Badge>
                <Tooltip
                  label={
                    condition.varStoreNames?.length
                      ? `VarStore: ${condition.varStoreNames.join(", ")}`
                      : "Variable source could not be resolved"
                  }
                >
                  <Badge size="xs" variant="outline" color={runtime ? "orange" : "gray"}>
                    {sourceLabel}
                  </Badge>
                </Tooltip>
              </Group>
              {kind === "SuppressIf" ? (
                <Tooltip label="Disable this suppression in the generated change set">
                  <Button
                    size="compact-xs"
                    color={condition.active ? "red" : "green"}
                    variant={condition.active ? "light" : "filled"}
                    onClick={() => {
                      if (index < 0) {
                        return;
                      }
                      setData((draft) => {
                        draft.suppressions[index].active = !condition.active;
                      });
                    }}
                  >
                    {condition.active ? "Force visible" : "Visibility forced"}
                  </Button>
                </Tooltip>
              ) : (
                <Badge size="xs" color="gray" variant="light">Read-only</Badge>
              )}
            </Group>
            <Text size="xs" mt={4} className={s.conditionExpression}>
              {condition.expression || `Condition at ${condition.offset}`}
            </Text>
            <Text size="xs" c="dimmed" mt={3}>
              IFR condition offset: {condition.offset}
            </Text>
            {condition.varStoreNames?.length ? (
              <Text size="xs" c="dimmed" mt={3}>
                VarStore: {condition.varStoreNames.join(", ")}
              </Text>
            ) : null}
          </div>
        );
      })}
      {child.accessLevel !== null ? (
        <div className={s.conditionCard}>
          <Badge size="xs" color="gray" variant="outline">
            AMI access policy
          </Badge>
          <Text size="xs" mt={4} className={s.conditionExpression}>
            SetupData AccessLevel == 0x{child.accessLevel}
          </Text>
          <Text size="xs" c="dimmed" mt={3}>
            Shown as evidence only; this byte is not classified as hidden or
            visible without model-specific proof.
          </Text>
        </div>
      ) : null}
    </Stack>
  );
}

interface TableRowProps {
  child: FormChildren;
  index: number;
  handleRefClick: (formId: string, formSetGuid?: string) => void;
  data: Data;
  setData: Updater<Data>;
  currentFormIndex: number;
}

const TableRow = React.memo(
  function TableRow({
    child,
    index,
    handleRefClick,
    data,
    setData,
    currentFormIndex,
  }: TableRowProps) {
    const type = child.type;
    const visibility = childVisibility(data, child);
    const info = [];

    if (type === "CheckBox" || type === "OneOf" || type === "Numeric") {
      if (type === "OneOf") {
        for (const option of child.options) {
          info.push([option.option, option.value]);
        }

        info.push(["newline"]);
      }

      if (type === "Numeric") {
        info.push(
          ["Min", child.min],
          ["Max", child.max],
          ["Step", child.step],
          ["newline"]
        );
      }

      if (child.defaults) {
        for (const def of child.defaults) {
          info.push([`DefaultId ${def.defaultId}`, def.value]);
        }

        if (type !== "CheckBox") {
          info.push(["newline"]);
        }
      }

      if (type === "CheckBox") {
        const def = /\bDefault: (Enabled|Disabled)/.exec(child.flags);
        if (def) {
          info.push(["Default", def[1] === "Enabled" ? "1" : "0"]);
        }

        const mfgDef = /MfgDefault: (Enabled|Disabled)/.exec(child.flags);
        if (mfgDef) {
          info.push(["MfgDefault", mfgDef[1] === "Enabled" ? "1" : "0"]);
        }

        if (def ?? mfgDef ?? child.defaults) {
          info.push(["newline"]);
        }
      }

      info.push(
        ["QuestionId", child.questionId],
        ["VarStoreId", child.varStoreId],
        ["VarStoreName", child.varStoreName],
        ["VarOffset", child.varOffset]
      );

      if (type !== "CheckBox") {
        info.push(["Size (bits)", child.size]);
      }
    }

    return (
      <tr className={s.memoRow}>
        <td
          className={type === "Ref" ? s.pointer : undefined}
          onClick={() => {
            if (type === "Ref") {
              handleRefClick(child.formId);
            }
          }}
        >
          {child.name}
        </td>
        <td>{type}</td>
        <td>
          <Tooltip label={visibility.explanation} multiline w={320}>
            <Badge color={visibilityColors[visibility.status]} variant="light">
              {visibility.label}
            </Badge>
          </Tooltip>
        </td>
        <td className={s.width}>
          {child.accessLevel !== null && (
            <TextInput
              value={child.accessLevel}
              onChange={(ev) => {
                const value = ev.target.value.toUpperCase();

                if (validateByteInput(value)) {
                  setData((draft) => {
                    draft.forms[currentFormIndex].children[index].accessLevel =
                      value;
                  });
                }
              }}
            />
          )}
        </td>
        <td className={s.width}>
          {child.failsafe !== null && (
            <TextInput
              value={child.failsafe}
              onChange={(ev) => {
                const value = ev.target.value.toUpperCase();

                if (validateByteInput(value)) {
                  setData((draft) => {
                    draft.forms[currentFormIndex].children[index].failsafe =
                      value;
                  });
                }
              }}
            />
          )}
        </td>
        <td className={s.width}>
          {child.optimal !== null && (
            <TextInput
              value={child.optimal}
              onChange={(ev) => {
                const value = ev.target.value.toUpperCase();

                if (validateByteInput(value)) {
                  setData((draft) => {
                    draft.forms[currentFormIndex].children[index].optimal =
                      value;
                  });
                }
              }}
            />
          )}
        </td>
        <td><ConditionDetails child={child} data={data} setData={setData} /></td>
        <td>
          <Spoiler
            transitionDuration={0}
            maxHeight={70}
            showLabel=".........."
            hideLabel="....."
          >
            <Stack>
              {child.description && (
                <div>
                  {child.description
                    .split("<br>")
                    .filter((line) => line !== "")
                    .map((line, index) => (
                      <div key={index.toString() + line.slice(0, 10)}>
                        {line}
                      </div>
                    ))}
                </div>
              )}
              {info.length > 0 && (
                <div>
                  {info.map((item, index) => (
                    <div
                      key={index.toString() + item.toString().slice(0, 10)}
                      className={s.infoRow}
                    >
                      {item[0] === "newline" ? (
                        <br />
                      ) : (
                        <>
                          <div>{item[0]}</div>
                          <div>{item[1]}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Stack>
          </Spoiler>
        </td>
      </tr>
    );
  },
  (oldProps: TableRowProps, newProps: TableRowProps) => {
    const oldChild =
      oldProps.data.forms[oldProps.currentFormIndex].children[oldProps.index];
    const newChild =
      newProps.data.forms[newProps.currentFormIndex].children[newProps.index];

    return (
      oldChild.accessLevel === newChild.accessLevel &&
      oldChild.failsafe === newChild.failsafe &&
      oldChild.optimal === newChild.optimal &&
      JSON.stringify(
        (oldChild.conditions ?? oldChild.suppressIf ?? []).map(
          (offset) =>
            oldProps.data.suppressions.find(
              (suppression) => suppression.offset === offset
            )?.active
        )
      ) ===
        JSON.stringify(
          (newChild.conditions ?? newChild.suppressIf ?? []).map(
            (offset) =>
              newProps.data.suppressions.find(
                (suppression) => suppression.offset === offset
              )?.active
          )
        )
    );
  }
);

interface FormUiProps {
  data: Data;
  setData: Updater<Data>;
  currentFormIndex: number;
  setCurrentFormIndex: React.Dispatch<React.SetStateAction<number>>;
}

export default function FormUi({
  data,
  setData,
  currentFormIndex,
  setCurrentFormIndex,
}: FormUiProps) {
  const [search, setSearch] = useDebouncedState("", 200);
  const semanticTree = React.useMemo(() => buildMenuTree(data), [data]);

  function handleRefClick(formId: string, formSetGuid?: string) {
    const sourceFormSetGuid =
      formSetGuid ??
      (currentFormIndex >= 0
        ? data.forms[currentFormIndex].formSetGuid
        : undefined);
    let formIndex = data.forms.findIndex(
      (form) =>
        form.formSetGuid === sourceFormSetGuid &&
        parseInt(form.formId) === parseInt(formId),
    );

    if (formIndex < 0) {
      formIndex = data.forms.findIndex(
        (form) => parseInt(form.formId) === parseInt(formId),
      );
    }

    if (formIndex >= 0) {
      setCurrentFormIndex(formIndex);

      document.getElementById(`nav-${formIndex.toString()}`)?.scrollIntoView();
    }
  }

  if (currentFormIndex === -2) {
    return (
      <SearchUi
        data={data}
        handleRefClick={handleRefClick}
        search={search}
        setSearch={setSearch}
      />
    );
  }

  if (currentFormIndex === -1) {
    return (
      <Table striped withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Form Id</Table.Th>
            <Table.Th>Visibility</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.menu.map((entry, index) => (
            <Table.Tr
              key={index.toString() + (entry.offset ?? "readonly") + entry.formId}
            >
              <Table.Td
                className={s.pointer}
                onClick={() => {
                  handleRefClick(entry.formId, entry.formSetGuid);
                }}
              >
                {entry.name}
              </Table.Td>
              <Table.Td className={s.formIdWidth}>
                <NativeSelect
                  className={s.formIdChildWidth}
                  disabled={entry.offset === null}
                  value={entry.formId}
                  data={data.forms
                    .filter(
                      (form) =>
                        !entry.formSetGuid ||
                        form.formSetGuid === entry.formSetGuid,
                    )
                    .map((form) => form.formId)}
                  onChange={(ev) => {
                    const value = ev.target.value;

                    setData((draft) => {
                      draft.menu[index].formId = value;
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
                      draft.menu[index].name = data.forms.find(
                        (form) =>
                          (!entry.formSetGuid ||
                            form.formSetGuid === entry.formSetGuid) &&
                          parseInt(form.formId) === parseInt(value),
                      )?.name!;
                    });
                  }}
                />
              </Table.Td>
              <Table.Td>
                <Tooltip
                  label={
                    entry.source === "amitse" || entry.offset !== null
                      ? "This root is present in the AMITSE menu table."
                      : "This FormSet exists in HII, but its presence in the visible AMITSE tab list is not confirmed."
                  }
                  multiline
                  w={320}
                >
                  <Badge
                    color={
                      entry.source === "amitse" || entry.offset !== null
                        ? "green"
                        : "gray"
                    }
                    variant="light"
                  >
                    {entry.source === "amitse" || entry.offset !== null
                      ? "Confirmed"
                      : "Not confirmed"}
                  </Badge>
                </Tooltip>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    );
  }

  const currentPath = findNodePath(semanticTree.roots, currentFormIndex);
  const orphanPath =
    currentPath.length === 0
      ? findNodePath(semanticTree.orphans, currentFormIndex)
      : [];
  const activePath = currentPath.length > 0 ? currentPath : orphanPath;
  const pageNode = activePath[activePath.length - 1];
  const pageStatus = pageNode?.status ?? "unknown";
  const visibilitySummary = summarizeFormBranch(
    data,
    currentFormIndex,
    pageStatus,
  );

  function summaryBadges(counts: Record<VisibilityStatus, number>) {
    return (
      <>
        <Badge color="green">{counts.visible} visible</Badge>
        <Badge color="red">{counts.hidden} hidden</Badge>
        <Badge color="orange">{counts.conditional} conditional</Badge>
        {counts.orphaned > 0 && (
          <Badge color="red">{counts.orphaned} orphaned</Badge>
        )}
        {counts.broken > 0 && (
          <Badge color="pink">{counts.broken} broken</Badge>
        )}
        {counts.unknown > 0 && (
          <Badge color="gray">{counts.unknown} unresolved</Badge>
        )}
      </>
    );
  }

  return (
    <Stack gap={0}>
      <Stack gap={4} className={s.visibilitySummary}>
        <Group gap="xs">
          <Text size="sm" fw={600}>Selected path:</Text>
          <Tooltip
            label={
              pageNode?.conditionSummary ??
              "No confirmed path from an AMITSE root was found."
            }
            multiline
            w={420}
          >
            <Badge color={visibilityColors[pageStatus]} variant="light">
              {pageNode?.statusLabel ?? "Not confirmed"}
            </Badge>
          </Tooltip>
        </Group>
        <Group gap="xs">
          <Text size="sm" fw={600}>This page:</Text>
          {summaryBadges(visibilitySummary.direct)}
        </Group>
        <Group gap="xs">
          <Tooltip label="Includes controls and Ref targets in every nested page">
            <Text size="sm" fw={600}>Whole branch:</Text>
          </Tooltip>
          {summaryBadges(visibilitySummary.branch)}
          <Text size="xs" c="dimmed">
            {visibilitySummary.descendantForms} nested pages
          </Text>
        </Group>
      </Stack>
      <Table stickyHeader stickyHeaderOffset={150} striped withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Type</Table.Th>
          <Table.Th>Visibility</Table.Th>
          <Table.Th>Access Level</Table.Th>
          <Table.Th>Failsafe</Table.Th>
          <Table.Th>Optimal</Table.Th>
          <Table.Th>Condition</Table.Th>
          <Table.Th>Info</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody className={s.striped}>
        {data.forms[currentFormIndex].children.map((child, index) => (
          <TableRow
            key={index.toString() + child.questionId}
            child={child}
            index={index}
            handleRefClick={handleRefClick}
            data={data}
            setData={setData}
            currentFormIndex={currentFormIndex}
          />
        ))}
      </Table.Tbody>
      </Table>
    </Stack>
  );
}
