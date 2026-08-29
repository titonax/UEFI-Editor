/**
 * Checksum calculation utilities for firmware integrity verification
 * @module core/checksum
 */

import type { Menu, Forms, Suppression } from "../types";

/**
 * Calculates SHA-256 hash of data and returns as hex string
 * @param data - BufferSource to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function sha256Hex(data: BufferSource): Promise<string> {
  const digest: ArrayBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes: Uint8Array = new Uint8Array(digest);

  return Array.from(bytes, (byte: number) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Calculates SHA-256 hash of a File object
 * @param file - File to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashFile(file: File): Promise<string> {
  const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
  return sha256Hex(arrayBuffer);
}

/**
 * Calculates checksum for JSON structure based on offsets
 * @param menu - Menu items array
 * @param forms - Forms array
 * @param suppressions - Suppressions array
 * @returns Hex-encoded SHA-256 hash of concatenated offsets
 */
export async function calculateJsonChecksum(
  menu: Menu,
  forms: Forms,
  suppressions: readonly Suppression[],
): Promise<string> {
  let offsetChecksum = "";

  for (const menuItem of menu) {
    if (menuItem.offset !== null) {
      offsetChecksum += menuItem.offset;
    }
  }

  for (const form of forms) {
    for (const child of form.children) {
      if (child.offsets !== null) {
        offsetChecksum += JSON.stringify(child.offsets);
      }
    }
  }

  for (const suppression of suppressions) {
    offsetChecksum += suppression.offset + suppression.start + suppression.end;
  }

  const encoder: TextEncoder = new TextEncoder();
  return sha256Hex(encoder.encode(offsetChecksum));
}

/**
 * Validates hexadecimal byte input (00-FF)
 * @param value - String to validate
 * @returns True if valid hex byte input
 */
export function validateByteInput(value: string): boolean {
  return (
    value.length <= 2 &&
    (value.length === 0 || /^[a-fA-F0-9]*$/.test(value))
  );
}

/**
 * Converts decimal number to uppercase hex string with 0x prefix
 * @param decimal - Decimal number to convert
 * @returns Hex string (e.g., "0x1A")
 */
export function decToHexString(decimal: number): string {
  return `0x${decimal.toString(16).toUpperCase()}`;
}

/**
 * Reverses byte order in hex string
 * @param value - Hex string to reverse
 * @returns Reversed hex string
 */
export function reversedHexBytes(value: string): string {
  const pairs: string[] | null = value.match(/../g);
  if (pairs === null) {
    return "";
  }
  return pairs.reverse().join("");
}

/**
 * Converts GUID to UEFI hex format
 * @param value - GUID string
 * @returns UEFI-formatted hex string
 */
export function guidToUefiHex(value: string): string {
  const parts: string[] = value.split("-");
  if (parts.length !== 5) {
    throw new Error(`Invalid GUID format: ${value}`);
  }

  const [part1, part2, part3, part4, part5] = parts;
  const reversedPart1 = reversedHexBytes(part1);
  const reversedPart2 = reversedHexBytes(part2);
  const reversedPart3 = reversedHexBytes(part3);

  return `${reversedPart1}-${reversedPart2}-${reversedPart3}-${part4}-${part5}`.toUpperCase();
}
