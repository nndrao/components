import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock WebSocket
class WebSocketMock {
  send = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

global.WebSocket = WebSocketMock as unknown as typeof WebSocket;