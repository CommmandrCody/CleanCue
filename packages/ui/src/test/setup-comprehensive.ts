import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock HTMLMediaElement
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: vi.fn(),
})

// Mock Audio constructor
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 100,
  volume: 1,
  muted: false,
  paused: true,
  ended: false,
}))

// Setup electron API mock
const mockElectronAPI = {
  getAllTracks: vi.fn().mockResolvedValue([]),
  deleteTracks: vi.fn().mockResolvedValue({ success: true, result: { removedFromLibrary: 0, deletedFiles: 0, errors: [] } }),
  exportTracks: vi.fn().mockResolvedValue({ success: true, path: '/test/export.m3u' }),
  engineScan: vi.fn().mockResolvedValue({ success: true, tracksFound: 0, tracksAdded: 0, tracksUpdated: 0, errors: [] }),
  selectFolder: vi.fn().mockResolvedValue('/test/folder'),
  saveFile: vi.fn().mockResolvedValue('/test/file.m3u'),
  getAnalysisJobs: vi.fn().mockResolvedValue({ success: true, jobs: [] }),
  getDuplicateGroups: vi.fn().mockResolvedValue([]),
  scanForDuplicates: vi.fn().mockResolvedValue([]),
  getLibraryHealth: vi.fn().mockResolvedValue({ success: true, issues: [] }),
  saveSettings: vi.fn().mockResolvedValue({ success: true }),
  stemCheckDependencies: vi.fn().mockResolvedValue({ success: true, available: true, missingDeps: [] }),
  stemGetAll: vi.fn().mockResolvedValue({ success: true, separations: [] }),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
}

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true,
})

// Ensure global cleanup
global.window = window

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Setup before all tests
beforeAll(() => {
  // Additional global setup if needed
})