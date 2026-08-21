import React from "react";
import { Alert, FileInput, Group, Stack, Table, Text } from "@mantine/core";
import { IconBinary, IconUpload } from "@tabler/icons-react";
import {
  formatHexOffset,
  inspectAptioIvImage,
  type AptioIvImageReport,
} from "../scripts/aptioIvImage";

function offsets(values: number[]) {
  return values.length === 0 ? "Not found" : values.map(formatHexOffset).join(", ");
}

export default function BiosImageUpload() {
  const [file, setFile] = React.useState<File | null>(null);
  const [report, setReport] = React.useState<AptioIvImageReport | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <Stack>
      <Group gap="xs">
        <IconBinary />
        <Text fw={700}>Full Aptio IV image</Text>
      </Group>
      <FileInput
        leftSection={<IconUpload />}
        size="lg"
        placeholder="Complete BIOS dump (.bin/.rom)"
        accept=".bin,.rom"
        value={file}
        disabled={loading}
        onChange={(selected) => {
          setFile(selected);
          setReport(null);
          if (selected) {
            setLoading(true);
            void inspectAptioIvImage(selected)
              .then((imageReport) => {
                setReport(imageReport);
              })
              .finally(() => {
                setLoading(false);
              });
          }
        }}
      />
      {report && (
        <>
          <Alert color={report.aptioIvCandidate ? "green" : "yellow"}>
            {report.aptioIvCandidate
              ? report.nestedFirmwareCandidate
                ? "AMI Aptio IV candidate: Setup and AMITSE are inside a compressed nested volume. Recursive extraction is required."
                : "AMI Aptio IV candidate: Setup and AMITSE were found. Full automatic extraction is the next pipeline stage."
              : "The required Aptio IV structures were not found. No changes can be generated for this image."}
          </Alert>
          <Table striped withColumnBorders>
            <Table.Tbody>
              <Table.Tr><Table.Th>Image size</Table.Th><Table.Td>{report.size.toLocaleString()} bytes</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>Intel descriptor</Table.Th><Table.Td>{report.intelDescriptor ? "Present" : "Not detected"}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>Firmware volumes</Table.Th><Table.Td>{offsets(report.firmwareVolumes)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>Setup FFS</Table.Th><Table.Td>{offsets(report.setupFfs)}</Table.Td></Table.Tr>
              <Table.Tr><Table.Th>AMITSE FFS</Table.Th><Table.Td>{offsets(report.amitseFfs)}</Table.Td></Table.Tr>
            </Table.Tbody>
          </Table>
        </>
      )}
    </Stack>
  );
}
