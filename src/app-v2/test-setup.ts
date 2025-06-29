/**
 * Test setup for app-v2
 * 
 * Sets up the test environment with necessary polyfills and mocks.
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';

// Ensure global indexedDB is available
if (!global.indexedDB) {
  global.indexedDB = new IDBFactory();
}

// Mock window.indexedDB if not available
if (typeof window !== 'undefined' && !window.indexedDB) {
  // @ts-ignore
  window.indexedDB = global.indexedDB;
  // @ts-ignore
  window.IDBKeyRange = IDBKeyRange;
}

// Set up global test utilities
global.console = {
  ...console,
  // Suppress console logs in tests unless explicitly needed
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};