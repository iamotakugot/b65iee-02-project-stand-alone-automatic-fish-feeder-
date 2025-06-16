import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock Firebase modules
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("firebase/database", () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(),
  onValue: vi.fn(),
  set: vi.fn(),
  push: vi.fn(),
  off: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({})),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock environment variables
Object.defineProperty(import.meta, "env", {
  value: {
    VITE_FIREBASE_API_KEY: "test-api-key",
    VITE_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
    VITE_FIREBASE_DATABASE_URL: "https://test.firebasedatabase.app",
    VITE_FIREBASE_PROJECT_ID: "test-project",
    VITE_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789",
    VITE_FIREBASE_APP_ID: "test-app-id",
    DEV: true,
  },
  writable: true,
});

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

// Mock performance API
Object.defineProperty(global, "performance", {
  value: {
    now: vi.fn(() => Date.now()),
    timing: {
      navigationStart: 0,
      loadEventEnd: 1000,
    },
    memory: {
      usedJSHeapSize: 1000000,
    },
  },
  writable: true,
});

// Mock window methods
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Setup cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

export {};
