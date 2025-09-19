import { vi } from 'vitest'

export const mockElectronAPI = {
  // File system operations
  selectFolder: vi.fn().mockResolvedValue('/Users/test/Music'),
  saveFile: vi.fn().mockResolvedValue('/Users/test/export.m3u'),
  openExternal: vi.fn().mockResolvedValue(undefined),
  showItemInFolder: vi.fn().mockResolvedValue(undefined),

  // Engine operations
  engineScan: vi.fn().mockResolvedValue({
    success: true,
    tracksFound: 5,
    tracksAdded: 3,
    tracksUpdated: 2,
    errors: []
  }),
  engineGetTracks: vi.fn().mockResolvedValue({
    success: true,
    tracks: []
  }),
  engineClearLibrary: vi.fn().mockResolvedValue({
    success: true,
    removedCount: 0
  }),
  getAllTracks: vi.fn().mockResolvedValue([]),
  engineAnalyze: vi.fn().mockResolvedValue({
    success: true,
    analyzed: 0
  }),
  engineExport: vi.fn().mockResolvedValue({
    success: true,
    path: '/Users/test/export.m3u'
  }),
  exportTracks: vi.fn().mockResolvedValue({
    success: true,
    path: '/Users/test/export.m3u'
  }),
  deleteTracks: vi.fn().mockResolvedValue({
    success: true,
    result: {
      removedFromLibrary: 0,
      deletedFiles: 0,
      errors: []
    }
  }),

  // Duplicate detection
  getDuplicateGroups: vi.fn().mockResolvedValue([]),
  scanForDuplicates: vi.fn().mockResolvedValue([]),

  // Analysis settings
  saveAnalysisSettings: vi.fn().mockResolvedValue({ success: true }),
  detectDJSoftware: vi.fn().mockResolvedValue({
    success: true,
    software: []
  }),

  // Additional API methods for UI components
  getAnalysisJobs: vi.fn().mockResolvedValue({
    success: true,
    jobs: []
  }),
  getLibraryHealth: vi.fn().mockResolvedValue({
    success: true,
    issues: []
  }),
  scanLibraryHealth: vi.fn().mockResolvedValue({
    success: true,
    issues: []
  }),
  saveSettings: vi.fn().mockResolvedValue({
    success: true
  }),
  fixHealthIssue: vi.fn().mockResolvedValue({
    success: true,
    message: 'Issue fixed'
  }),

  // Library Import operations
  importLibrarySource: vi.fn().mockResolvedValue({
    success: true,
    importedCount: 25,
    skippedCount: 2
  }),

  // STEM Separation operations
  stemCheckDependencies: vi.fn().mockResolvedValue({
    success: true,
    available: true,
    missingDeps: []
  }),
  stemStartSeparation: vi.fn().mockResolvedValue({
    success: true,
    separationId: 'test-id'
  }),
  stemGetStatus: vi.fn().mockResolvedValue({
    success: true,
    status: {}
  }),
  stemGetByTrack: vi.fn().mockResolvedValue({
    success: true,
    result: {}
  }),
  stemGetAll: vi.fn().mockResolvedValue({
    success: true,
    separations: []
  }),
  stemCancel: vi.fn().mockResolvedValue({
    success: true,
    cancelled: true
  }),
  stemDelete: vi.fn().mockResolvedValue({
    success: true,
    deleted: true
  }),
  stemGetModels: vi.fn().mockResolvedValue({
    success: true,
    models: ['htdemucs']
  }),
  stemGetDefaultSettings: vi.fn().mockResolvedValue({
    success: true,
    settings: {}
  }),
  stemEstimateTime: vi.fn().mockResolvedValue({
    success: true,
    estimatedTime: 120
  }),

  // Event listeners
  onScanLibrary: vi.fn(),
  onExportPlaylist: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn()
}

// Event system for testing
const eventListeners = new Map<string, Function[]>()

mockElectronAPI.on = vi.fn((event: string, listener: Function) => {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, [])
  }
  eventListeners.get(event)!.push(listener)
})

mockElectronAPI.removeListener = vi.fn((event: string, listener: Function) => {
  const listeners = eventListeners.get(event)
  if (listeners) {
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }
})

mockElectronAPI.removeAllListeners = vi.fn((event: string) => {
  eventListeners.delete(event)
})

// Helper to emit events in tests
export const emitElectronEvent = (event: string, data: any) => {
  const listeners = eventListeners.get(event)
  if (listeners) {
    listeners.forEach(listener => listener(null, data))
  }
}

// Helper to reset all mocks
export const resetElectronMocks = () => {
  Object.values(mockElectronAPI).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear()
    }
  })
  eventListeners.clear()
}

// Setup for tests
export const setupElectronAPIMock = () => {
  // Ensure window exists in the test environment
  if (typeof window === 'undefined') {
    // If window is not defined, we're in a test environment that hasn't properly set it up
    Object.defineProperty(globalThis, 'window', {
      value: {
        electronAPI: mockElectronAPI
      },
      writable: true,
      configurable: true
    })
  } else {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true
    })
  }
}