/**
 * Test Setup File
 * 
 * Configures testing environment for Vitest
 * @module test/setup
 */

import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

/**
 * Cleanup after each test to prevent state leakage
 */
afterEach(() => {
  cleanup();
});

/**
 * Mock the Notifications module
 */
vi.mock("@mantine/notifications", () => ({
  useNotifications: () => ({
    show: vi.fn(),
    hide: vi.fn(),
    update: vi.fn(),
    clean: vi.fn(),
    cleanQueue: vi.fn(),
  }),
  Notifications: () => null,
  createNotificationsStore: () => ({}),
  notificationsStore: {},
}));

/**
 * Mock crypto.subtle for checksum tests
 */
Object.defineProperty(globalThis, "crypto", {
  value: {
    subtle: {
      digest: vi.fn(async (algorithm: string, data: BufferSource) => {
        // Simple mock implementation for SHA-256
        const buffer = data instanceof ArrayBuffer ? data : data.buffer;
        const bytes = new Uint8Array(buffer);
        const hash = new Uint8Array(32);
        
        // Create a simple hash (not real SHA-256, just for testing)
        for (let i = 0; i < bytes.length; i++) {
          hash[i % 32] ^= bytes[i];
        }
        
        return hash.buffer;
      }),
    },
  },
});

/**
 * Mock matchMedia for Mantine components
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
