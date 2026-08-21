import lzmaWorkerUrl from "lzma/src/lzma_worker-min.js?url";
import {
  ConsoleStdout,
  File as WasiFile,
  OpenFile,
  PreopenDirectory,
  WASI,
} from "@bjorn3/browser_wasi_shim";

const setupGuid = "899407D7-99FE-43D8-9A21-79EC328CAC21";
const hiiGuid = "97E409E6-4CC1-11D9-81F6-000000000000";

export interface AptioIvArtifacts {
  hii: Uint8Array;
  ifrText: string;
  formPackageCount: number;
  extractionDepth: number;
}

function u24(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function u16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    true,
  );
}

function u64(bytes: Uint8Array, offset: number) {
  const value = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getBigUint64(offset, true);
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : 0;
}

function align(value: number, alignment: number) {
  return Math.ceil(value / alignment) * alignment;
}

function hex(value: number, width: number) {
  return value.toString(16).toUpperCase().padStart(width, "0");
}

function guid(bytes: Uint8Array, offset: number) {
  return `${hex(u32(bytes, offset), 8)}-${hex(u16(bytes, offset + 4), 4)}-${hex(
    u16(bytes, offset + 6),
    4,
  )}-${hex(bytes[offset + 8], 2)}${hex(bytes[offset + 9], 2)}-${Array.from(
    bytes.slice(offset + 10, offset + 16),
    (byte) => hex(byte, 2),
  ).join("")}`;
}

function lzmaDecompress(input: Uint8Array) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const bootstrap = `
      importScripts(${JSON.stringify(lzmaWorkerUrl)});
      const nativePostMessage = self.postMessage.bind(self);
      self.postMessage = (message) => {
        if (message && message.action === 2 && Array.isArray(message.result)) {
          const result = Uint8Array.from(message.result);
          message.result = result;
          nativePostMessage(message, [result.buffer]);
          return;
        }
        nativePostMessage(message);
      };
    `;
    const bootstrapUrl = URL.createObjectURL(
      new Blob([bootstrap], { type: "text/javascript" }),
    );
    const worker = new Worker(bootstrapUrl);
    worker.onerror = (event) => {
      worker.terminate();
      URL.revokeObjectURL(bootstrapUrl);
      reject(new Error(event.message || "LZMA worker failed."));
    };
    worker.onmessage = (event: MessageEvent<{ action: number; result: Uint8Array | null; error?: unknown }>) => {
      if (event.data.action !== 2) return;
      worker.terminate();
      URL.revokeObjectURL(bootstrapUrl);
      if (event.data.error || event.data.result === null) {
        const message =
          event.data.error instanceof Error
            ? event.data.error.message
            : "LZMA decompression failed.";
        reject(new Error(message));
      } else {
        resolve(event.data.result);
      }
    };
    const transferable = input.slice();
    worker.postMessage(
      { action: 2, data: transferable, cbn: 1 },
      [transferable.buffer],
    );
  });
}

function validVolume(bytes: Uint8Array, start: number) {
  if (start + 0x38 > bytes.length) return false;
  const length = u64(bytes, start + 0x20);
  const headerLength = u16(bytes, start + 0x30);
  return (
    bytes[start + 0x28] === 0x5f &&
    bytes[start + 0x29] === 0x46 &&
    bytes[start + 0x2a] === 0x56 &&
    bytes[start + 0x2b] === 0x48 &&
    length >= headerLength &&
    start + length <= bytes.length
  );
}

function findVolumes(bytes: Uint8Array) {
  const volumes: number[] = [];
  for (let signature = 0x28; signature + 4 <= bytes.length; signature += 4) {
    const start = signature - 0x28;
    if (validVolume(bytes, start)) volumes.push(start);
  }
  return volumes;
}

interface LocatedFile {
  bytes: Uint8Array;
  bodyStart: number;
  end: number;
  depth: number;
}

function findFile(bytes: Uint8Array, wantedGuid: string, depth: number) {
  for (const volumeStart of findVolumes(bytes)) {
    const volumeEnd = volumeStart + u64(bytes, volumeStart + 0x20);
    let fileStart = align(volumeStart + u16(bytes, volumeStart + 0x30), 8);
    while (fileStart + 24 <= volumeEnd) {
      if (bytes.slice(fileStart, fileStart + 24).every((byte) => byte === 0xff)) break;
      const size = u24(bytes, fileStart + 20);
      if (size < 24 || fileStart + size > volumeEnd) break;
      if (guid(bytes, fileStart) === wantedGuid) {
        return { bytes, bodyStart: fileStart + 24, end: fileStart + size, depth };
      }
      fileStart = align(fileStart + size, 8);
    }
  }
  return null;
}

async function nestedBuffers(bytes: Uint8Array) {
  const nested: Uint8Array[] = [];
  for (const volumeStart of findVolumes(bytes)) {
    const volumeEnd = volumeStart + u64(bytes, volumeStart + 0x20);
    let fileStart = align(volumeStart + u16(bytes, volumeStart + 0x30), 8);
    while (fileStart + 24 <= volumeEnd) {
      if (bytes.slice(fileStart, fileStart + 24).every((byte) => byte === 0xff)) break;
      const size = u24(bytes, fileStart + 20);
      if (size < 24 || fileStart + size > volumeEnd) break;
      let section = fileStart + 24;
      const fileEnd = fileStart + size;
      while (section + 4 <= fileEnd) {
        const sectionSize = u24(bytes, section);
        const type = bytes[section + 3];
        if (sectionSize < 4 || section + sectionSize > fileEnd) break;
        if (type === 0x01 && sectionSize >= 9) {
          const compressionType = bytes[section + 8];
          const body = bytes.slice(section + 9, section + sectionSize);
          if (compressionType === 0) nested.push(body);
          if (compressionType === 2) nested.push(await lzmaDecompress(body));
        }
        section = align(section + sectionSize, 4);
      }
      fileStart = align(fileStart + size, 8);
    }
  }
  return nested;
}

async function locateSetup(bytes: Uint8Array) {
  const queue = [{ bytes, depth: 0 }];
  for (let index = 0; index < queue.length && index < 64; index++) {
    const current = queue[index];
    const found = findFile(current.bytes, setupGuid, current.depth);
    if (found) return found;
    const children = await nestedBuffers(current.bytes);
    queue.push(...children.map((child) => ({ bytes: child, depth: current.depth + 1 })));
  }
  throw new Error("Setup FFS was not found after recursive decompression.");
}

function locateHii(file: LocatedFile): Uint8Array | null {
  let section = file.bodyStart;
  while (section + 4 <= file.end) {
    const size = u24(file.bytes, section);
    const type = file.bytes[section + 3];
    if (size < 4 || section + size > file.end) break;
    if (type === 0x01 && size >= 9 && file.bytes[section + 8] === 0) {
      const nested = file.bytes.slice(section + 9, section + size);
      const nestedFile = { bytes: nested, bodyStart: 0, end: nested.length, depth: file.depth };
      const result: Uint8Array | null = locateHii(nestedFile);
      if (result) return result;
    }
    if (type === 0x18 && size >= 20 && guid(file.bytes, section + 4) === hiiGuid) {
      return file.bytes.slice(section + 20, section + size);
    }
    section = align(section + size, 4);
  }
  return null;
}

async function runIfrExtractor(hii: Uint8Array) {
  const directory = new Map<string, WasiFile>();
  directory.set("setup.bin", new WasiFile(hii));
  const stdout: string[] = [];
  const wasi = new WASI(
    ["ifrextractor", "setup.bin", "verbose"],
    [],
    [
      new OpenFile(new WasiFile([])),
      ConsoleStdout.lineBuffered((line) => stdout.push(line)),
      ConsoleStdout.lineBuffered((line) => stdout.push(line)),
      new PreopenDirectory(".", directory),
    ],
  );
  const url = `${import.meta.env.BASE_URL}ifrextractor.wasm`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("IFRExtractor WebAssembly is not available.");
  const module = await WebAssembly.compileStreaming(response);
  const instance = await WebAssembly.instantiate(module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  const exitCode = wasi.start(instance as WebAssembly.Instance & { exports: { memory: WebAssembly.Memory; _start: () => unknown } });
  if (exitCode !== 0) throw new Error(stdout.join("\n") || `IFRExtractor exited with ${String(exitCode)}.`);
  const outputs = [...directory.entries()].filter(([name]) => name.endsWith(".ifr.txt"));
  if (outputs.length === 0) throw new Error("IFRExtractor did not generate a verbose IFR file.");
  return outputs.map(([, output]) => new TextDecoder().decode(output.data)).join("\n");
}

export async function extractAptioIvArtifacts(file: File): Promise<AptioIvArtifacts> {
  const image = new Uint8Array(await file.arrayBuffer());
  const setup = await locateSetup(image);
  const hii = locateHii(setup);
  if (!hii) throw new Error("The Setup HII package was not found.");
  const ifrText = await runIfrExtractor(hii);
  const formPackageCount = (ifrText.match(/FormSet Guid:/g) ?? []).length;
  return { hii, ifrText, formPackageCount, extractionDepth: setup.depth };
}
