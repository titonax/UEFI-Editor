/**
 * File Manipulation Utilities Module
 * Safe file handling and binary operations for UEFI firmware files
 * @module core/file-manipulation
 */

import { saveAs } from "file-saver";
import type { Data, Menu, Forms, Suppression } from "../types";
import { calculateJsonChecksum, sha256Hex } from "../checksum";

/**
 * Result of file modification operation
 */
export interface FileModificationResult {
  readonly success: boolean;
  readonly modifiedData: Uint8Array | null;
  readonly error?: string;
  readonly modifications: readonly ModificationRecord[];
}

/**
 * Record of a single modification made to a file
 */
export interface ModificationRecord {
  readonly offset: string;
  readonly originalValue: string;
  readonly newValue: string;
  readonly description: string;
}

/**
 * Validates file size for safety
 * @param fileSize - Size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns True if file size is within limits
 */
export function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * Safely reads bytes from an ArrayBuffer at specified offset
 * @param buffer - Source ArrayBuffer
 * @param offset - Starting offset in bytes
 * @param length - Number of bytes to read
 * @returns Hex string of read bytes, or null if out of bounds
 */
export function readBytesAtOffset(
  buffer: ArrayBuffer,
  offset: number,
  length: number,
): string | null {
  const view: DataView = new DataView(buffer);

  if (offset < 0 || offset + length > buffer.byteLength) {
    return null;
  }

  const bytes: string[] = [];
  for (let i = 0; i < length; i++) {
    const byte: number = view.getUint8(offset + i);
    bytes.push(byte.toString(16).padStart(2, "0"));
  }

  return bytes.join(" ").toUpperCase();
}

/**
 * Safely writes bytes to a Uint8Array at specified offset
 * @param data - Target Uint8Array
 * @param offset - Starting offset in bytes
 * @param hexValues - Hex string with bytes to write (e.g., "1A 2B 3C")
 * @returns True if successful, false if out of bounds
 */
export function writeBytesAtOffset(
  data: Uint8Array,
  offset: number,
  hexValues: string,
): boolean {
  const cleanHex: string = hexValues.replace(/\s+/g, "");

  if (cleanHex.length % 2 !== 0) {
    return false;
  }

  const byteCount: number = cleanHex.length / 2;

  if (offset < 0 || offset + byteCount > data.length) {
    return false;
  }

  for (let i = 0; i < byteCount; i++) {
    const byteHex: string = cleanHex.substring(i * 2, i * 2 + 2);
    const byteValue: number = parseInt(byteHex, 16);

    if (Number.isNaN(byteValue)) {
      return false;
    }

    data[offset + i] = byteValue;
  }

  return true;
}

/**
 * Creates a backup copy of firmware data
 * @param data - Original Uint8Array
 * @returns New Uint8Array copy
 */
export function createBackup(data: Uint8Array): Uint8Array {
  return new Uint8Array(data.slice());
}

/**
 * Downloads modified firmware file with proper naming
 * @param data - Modified firmware data
 * @param originalFileName - Original file name
 * @param suffix - Suffix to append to filename (default: "-modified")
 */
export function downloadModifiedFile(
  data: Uint8Array,
  originalFileName: string,
  suffix: string = "-modified",
): void {
  const dotIndex: number = originalFileName.lastIndexOf(".");
  let baseName: string;
  let extension: string;

  if (dotIndex === -1) {
    baseName = originalFileName;
    extension = "";
  } else {
    baseName = originalFileName.substring(0, dotIndex);
    extension = originalFileName.substring(dotIndex);
  }

  const newFileName: string = `${baseName}${suffix}${extension}`;
  const blob: Blob = new Blob([data], { type: "application/octet-stream" });

  saveAs(blob, newFileName);
}

/**
 * Applies multiple modifications to firmware data safely
 * @param originalData - Original firmware data
 * @param modifications - Array of offset/value pairs to apply
 * @returns FileModificationResult with success status and records
 */
export function applyModifications(
  originalData: Uint8Array,
  modifications: ReadonlyArray<{
    offset: string;
    value: string;
    description?: string;
  }>,
): FileModificationResult {
  try {
    const modifiedData: Uint8Array = createBackup(originalData);
    const records: ModificationRecord[] = [];

    for (const mod of modifications) {
      const offsetNum: number = parseInt(mod.offset, 16) * 2;

      if (Number.isNaN(offsetNum)) {
        return {
          success: false,
          modifiedData: null,
          error: `Invalid offset format: ${mod.offset}`,
          modifications: records,
        };
      }

      const originalValue: string | null = readBytesAtOffset(
        originalData,
        offsetNum,
        mod.value.replace(/\s+/g, "").length / 2,
      );

      const writeSuccess: boolean = writeBytesAtOffset(
        modifiedData,
        offsetNum,
        mod.value,
      );

      if (!writeSuccess) {
        return {
          success: false,
          modifiedData: null,
          error: `Failed to write at offset ${mod.offset}`,
          modifications: records,
        };
      }

      records.push({
        offset: mod.offset,
        originalValue: originalValue ?? "unknown",
        newValue: mod.value,
        description: mod.description ?? `Modification at ${mod.offset}`,
      });
    }

    return {
      success: true,
      modifiedData,
      modifications: records,
    };
  } catch (error) {
    const errorMessage: string =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      modifiedData: null,
      error: errorMessage,
      modifications: [],
    };
  }
}

/**
 * Verifies integrity of modified firmware by recalculating checksum
 * @param originalData - Original firmware data
 * @param modifiedData - Modified firmware data
 * @param menu - Menu structure
 * @param forms - Forms structure
 * @param suppressions - Suppressions array
 * @returns Object with verification results
 */
export async function verifyModificationIntegrity(
  originalData: Uint8Array,
  modifiedData: Uint8Array,
  menu: Menu,
  forms: Forms,
  suppressions: readonly Suppression[],
): Promise<{
  originalHash: string;
  modifiedHash: string;
  jsonChecksum: string;
  hasChanges: boolean;
}> {
  const originalHash: string = await sha256Hex(originalData);
  const modifiedHash: string = await sha256Hex(modifiedData);
  const jsonChecksum: string = await calculateJsonChecksum(menu, forms, suppressions);
  const hasChanges: boolean = originalHash !== modifiedHash;

  return {
    originalHash,
    modifiedHash,
    jsonChecksum,
    hasChanges,
  };
}

/**
 * Converts ArrayBuffer to hex string representation
 * @param buffer - ArrayBuffer to convert
 * @returns Hex string with space-separated bytes
 */
export function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes: Uint8Array = new Uint8Array(buffer);
  const hexParts: string[] = [];

  for (const byte of bytes) {
    hexParts.push(byte.toString(16).padStart(2, "0").toUpperCase());
  }

  return hexParts.join(" ");
}

/**
 * Converts hex string to ArrayBuffer
 * @param hexString - Hex string (with or without spaces)
 * @returns ArrayBuffer with binary data
 * @throws Error if hex string is invalid
 */
export function hexToArrayBuffer(hexString: string): ArrayBuffer {
  const cleanHex: string = hexString.replace(/\s+/g, "");

  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string: odd number of characters");
  }

  const byteLength: number = cleanHex.length / 2;
  const bytes: Uint8Array = new Uint8Array(byteLength);

  for (let i = 0; i < byteLength; i++) {
    const byteHex: string = cleanHex.substring(i * 2, i * 2 + 2);
    const byteValue: number = parseInt(byteHex, 16);

    if (Number.isNaN(byteValue)) {
      throw new Error(`Invalid hex character at position ${i * 2}`);
    }

    bytes[i] = byteValue;
  }

  return bytes.buffer;
}
