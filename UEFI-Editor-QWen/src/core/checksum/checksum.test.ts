/**
 * Checksum Module Tests
 * 
 * Unit tests for checksum calculation utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sha256Hex,
  validateByteInput,
  decToHexString,
  reversedHexBytes,
} from "./index";

describe("Checksum Utilities", () => {
  describe("validateByteInput", () => {
    it("should accept valid hex bytes", () => {
      expect(validateByteInput("")).toBe(true);
      expect(validateByteInput("A")).toBe(true);
      expect(validateByteInput("FF")).toBe(true);
      expect(validateByteInput("ff")).toBe(true);
      expect(validateByteInput("0")).toBe(true);
      expect(validateByteInput("1A")).toBe(true);
    });

    it("should reject invalid input", () => {
      expect(validateByteInput("GG")).toBe(false);
      expect(validateByteInput("123")).toBe(false);
      expect(validateByteInput("ZZ")).toBe(false);
      expect(validateByteInput("1G")).toBe(false);
      expect(validateByteInput("FFF")).toBe(false);
    });
  });

  describe("decToHexString", () => {
    it("should convert decimal to uppercase hex with 0x prefix", () => {
      expect(decToHexString(0)).toBe("0x0");
      expect(decToHexString(1)).toBe("0x1");
      expect(decToHexString(10)).toBe("0xA");
      expect(decToHexString(16)).toBe("0x10");
      expect(decToHexString(255)).toBe("0xFF");
      expect(decToHexString(256)).toBe("0x100");
    });
  });

  describe("reversedHexBytes", () => {
    it("should reverse byte order in hex string", () => {
      expect(reversedHexBytes("12345678")).toBe("78563412");
      expect(reversedHexBytes("AABBCCDD")).toBe("DDCCBBAA");
      expect(reversedHexBytes("01")).toBe("01");
    });

    it("should return empty string for invalid input", () => {
      expect(reversedHexBytes("")).toBe("");
      expect(reversedHexBytes("1")).toBe("");
      expect(reversedHexBytes("abc")).toBe("");
    });
  });

  describe("sha256Hex", () => {
    it("should produce consistent hash for same input", async () => {
      const encoder = new TextEncoder();
      const data1 = encoder.encode("test");
      const data2 = encoder.encode("test");

      const hash1 = await sha256Hex(data1);
      const hash2 = await sha256Hex(data2);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it("should produce different hashes for different inputs", async () => {
      const encoder = new TextEncoder();
      const hash1 = await sha256Hex(encoder.encode("test1"));
      const hash2 = await sha256Hex(encoder.encode("test2"));

      expect(hash1).not.toBe(hash2);
    });
  });
});
