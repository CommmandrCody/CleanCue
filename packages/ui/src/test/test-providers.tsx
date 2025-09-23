import React from 'react'
import { vi } from 'vitest'
import { YouTubeDownloadProvider } from '../contexts/YouTubeDownloadContext'
import { StemSeparationProvider } from '../contexts/StemSeparationContext'

// 🎧 COMPREHENSIVE TEST PROVIDER WRAPPER - Iron-Clad Testing Support
export function TestProviders({ children }: { children: React.ReactNode }) {
  return (
    <YouTubeDownloadProvider>
      <StemSeparationProvider>
        {children}
      </StemSeparationProvider>
    </YouTubeDownloadProvider>
  )
}

// Enhanced render function with all providers
export function renderWithProviders(ui: React.ReactElement, options = {}) {
  const { render } = require('@testing-library/react')

  return render(ui, {
    wrapper: TestProviders,
    ...options,
  })
}

// Mock providers for isolated testing
export function MockYouTubeProvider({ children }: { children: React.ReactNode }) {
  const mockContextValue = {
    downloads: [],
    addDownload: vi.fn(),
    updateDownload: vi.fn(),
    removeDownload: vi.fn(),
    pauseDownload: vi.fn(),
    resumeDownload: vi.fn(),
    cancelDownload: vi.fn(),
    retryDownload: vi.fn(),
    clearCompleted: vi.fn(),
    getActiveDownloads: vi.fn(() => []),
    getTotalProgress: vi.fn(() => 0)
  }

  const MockContext = React.createContext(mockContextValue)

  return (
    <MockContext.Provider value={mockContextValue}>
      {children}
    </MockContext.Provider>
  )
}

export function MockStemProvider({ children }: { children: React.ReactNode }) {
  const mockContextValue = {
    jobs: [],
    addJob: vi.fn(),
    updateJob: vi.fn(),
    removeJob: vi.fn(),
    cancelJob: vi.fn(),
    retryJob: vi.fn(),
    clearCompleted: vi.fn(),
    getActiveJobs: vi.fn(() => []),
    getTotalProgress: vi.fn(() => 0),
    getQueueLength: vi.fn(() => 0)
  }

  const MockContext = React.createContext(mockContextValue)

  return (
    <MockContext.Provider value={mockContextValue}>
      {children}
    </MockContext.Provider>
  )
}