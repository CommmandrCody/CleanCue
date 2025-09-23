import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { JobManagement } from './JobManagement'

// Mock the global electronAPI
const mockElectronAPI = {
  getAllJobs: vi.fn(),
  getActiveJobs: vi.fn(),
  getQueuedJobs: vi.fn(),
  getJobById: vi.fn(),
  cancelJob: vi.fn(),
  retryJob: vi.fn(),
  abortAllJobs: vi.fn(),
  createScanJob: vi.fn(),
  createAnalysisJobs: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn()
}

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
})

describe('JobManagement Component', () => {

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockElectronAPI.getAllJobs.mockResolvedValue([])
    mockElectronAPI.getActiveJobs.mockResolvedValue([])
    mockElectronAPI.getQueuedJobs.mockResolvedValue([])
    mockElectronAPI.cancelJob.mockResolvedValue(true)
    mockElectronAPI.retryJob.mockResolvedValue(true)
    mockElectronAPI.abortAllJobs.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render with empty job list', async () => {
      render(<JobManagement />)

      expect(screen.getByText('Job Management')).toBeInTheDocument()
      expect(screen.getByText('All Jobs')).toBeInTheDocument()
      expect(screen.getByText('Active Jobs')).toBeInTheDocument()
      expect(screen.getByText('Queued Jobs')).toBeInTheDocument()
      expect(screen.getByText('Abort All Jobs')).toBeInTheDocument()
    })

    it('should display loading state initially', async () => {
      render(<JobManagement />)

      // Should show loading indicator while jobs are being fetched
      expect(screen.getByText('Loading jobs...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByText('Loading jobs...')).not.toBeInTheDocument()
      })
    })

    it('should display job statistics', async () => {
      const mockJobs = [
        { id: '1', type: 'scan', status: 'completed', priority: 5, user_initiated: 1, created_at: new Date().toISOString(), progress: 100 },
        { id: '2', type: 'analyze', status: 'running', priority: 3, user_initiated: 1, created_at: new Date().toISOString(), progress: 50 },
        { id: '3', type: 'export', status: 'queued', priority: 1, user_initiated: 1, created_at: new Date().toISOString(), progress: 0 },
        { id: '4', type: 'scan', status: 'failed', priority: 5, user_initiated: 0, created_at: new Date().toISOString(), progress: 0 }
      ]

      mockElectronAPI.getAllJobs.mockResolvedValue(mockJobs)

      render(<JobManagement />)

      await waitFor(() => {
        expect(screen.getByText('Total: 4')).toBeInTheDocument()
        expect(screen.getByText('Completed: 1')).toBeInTheDocument()
        expect(screen.getByText('Running: 1')).toBeInTheDocument()
        expect(screen.getByText('Queued: 1')).toBeInTheDocument()
        expect(screen.getByText('Failed: 1')).toBeInTheDocument()
      })
    })
  })

  describe('Job List Display', () => {
    const mockJobs = [
      {
        id: 'job-1',
        type: 'scan',
        status: 'completed',
        priority: 5,
        user_initiated: 1,
        created_at: '2024-01-01T10:00:00Z',
        completed_at: '2024-01-01T10:05:00Z',
        progress: 100,
        payload: JSON.stringify({ paths: ['/music'], extensions: ['mp3'] }),
        result: JSON.stringify({ tracksFound: 10, tracksAdded: 8 })
      },
      {
        id: 'job-2',
        type: 'analyze',
        status: 'running',
        priority: 3,
        user_initiated: 1,
        created_at: '2024-01-01T10:01:00Z',
        started_at: '2024-01-01T10:02:00Z',
        progress: 75,
        payload: JSON.stringify({ trackId: 'track-123' })
      },
      {
        id: 'job-3',
        type: 'export',
        status: 'failed',
        priority: 1,
        user_initiated: 1,
        created_at: '2024-01-01T10:03:00Z',
        error: 'Export failed: disk full',
        attempts: 3,
        max_attempts: 3,
        payload: JSON.stringify({ trackIds: ['track-1', 'track-2'], format: 'mp3' })
      }
    ]

    beforeEach(() => {
      mockElectronAPI.getAllJobs.mockResolvedValue(mockJobs)
    })

    it('should display job information correctly', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        // Check scan job
        expect(screen.getByText('scan')).toBeInTheDocument()
        expect(screen.getByText('completed')).toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument()
        expect(screen.getByText('Priority: 5')).toBeInTheDocument()

        // Check analyze job
        expect(screen.getByText('analyze')).toBeInTheDocument()
        expect(screen.getByText('running')).toBeInTheDocument()
        expect(screen.getByText('75%')).toBeInTheDocument()
        expect(screen.getByText('Priority: 3')).toBeInTheDocument()

        // Check export job
        expect(screen.getByText('export')).toBeInTheDocument()
        expect(screen.getByText('failed')).toBeInTheDocument()
        expect(screen.getByText('Priority: 1')).toBeInTheDocument()
      })
    })

    it('should show job details when expanded', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        const expandButton = screen.getAllByText('▶')[0]
        fireEvent.click(expandButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Job ID:')).toBeInTheDocument()
        expect(screen.getByText('job-1')).toBeInTheDocument()
        expect(screen.getByText('Payload:')).toBeInTheDocument()
        expect(screen.getByText('Result:')).toBeInTheDocument()
      })
    })

    it('should display error message for failed jobs', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        expect(screen.getByText('Export failed: disk full')).toBeInTheDocument()
      })
    })

    it('should show attempt count for retried jobs', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        expect(screen.getByText('Attempts: 3/3')).toBeInTheDocument()
      })
    })
  })

  describe('Job Actions', () => {
    const mockRunningJob = {
      id: 'running-job',
      type: 'analyze',
      status: 'running',
      priority: 3,
      user_initiated: 1,
      created_at: '2024-01-01T10:00:00Z',
      progress: 50,
      payload: JSON.stringify({ trackId: 'track-123' })
    }

    const mockFailedJob = {
      id: 'failed-job',
      type: 'scan',
      status: 'failed',
      priority: 5,
      user_initiated: 1,
      created_at: '2024-01-01T10:00:00Z',
      error: 'Scan failed',
      attempts: 2,
      max_attempts: 3,
      payload: JSON.stringify({ paths: ['/music'] })
    }

    it('should cancel a running job', async () => {
      mockElectronAPI.getAllJobs.mockResolvedValue([mockRunningJob])
      render(<JobManagement />)

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)
      })

      expect(mockElectronAPI.cancelJob).toHaveBeenCalledWith('running-job')
    })

    it('should retry a failed job', async () => {
      mockElectronAPI.getAllJobs.mockResolvedValue([mockFailedJob])
      render(<JobManagement />)

      await waitFor(() => {
        const retryButton = screen.getByText('Retry')
        fireEvent.click(retryButton)
      })

      expect(mockElectronAPI.retryJob).toHaveBeenCalledWith('failed-job')
    })

    it('should not show retry button for exhausted jobs', async () => {
      const exhaustedJob = { ...mockFailedJob, attempts: 3, max_attempts: 3 }
      mockElectronAPI.getAllJobs.mockResolvedValue([exhaustedJob])
      render(<JobManagement />)

      await waitFor(() => {
        expect(screen.queryByText('Retry')).not.toBeInTheDocument()
      })
    })

    it('should abort all jobs when button clicked', async () => {
      mockElectronAPI.getAllJobs.mockResolvedValue([mockRunningJob])
      render(<JobManagement />)

      await waitFor(() => {
        const abortAllButton = screen.getByText('Abort All Jobs')
        fireEvent.click(abortAllButton)
      })

      expect(mockElectronAPI.abortAllJobs).toHaveBeenCalled()
    })
  })

  describe('Job Filtering', () => {
    const mockJobs = [
      { id: '1', type: 'scan', status: 'completed', priority: 5, user_initiated: 1, created_at: '2024-01-01T10:00:00Z', progress: 100 },
      { id: '2', type: 'analyze', status: 'running', priority: 3, user_initiated: 1, created_at: '2024-01-01T10:01:00Z', progress: 50 },
      { id: '3', type: 'export', status: 'queued', priority: 1, user_initiated: 1, created_at: '2024-01-01T10:02:00Z', progress: 0 },
      { id: '4', type: 'scan', status: 'failed', priority: 5, user_initiated: 0, created_at: '2024-01-01T10:03:00Z', progress: 0 }
    ]

    beforeEach(() => {
      mockElectronAPI.getAllJobs.mockResolvedValue(mockJobs)
      mockElectronAPI.getActiveJobs.mockResolvedValue([mockJobs[1], mockJobs[2]])
      mockElectronAPI.getQueuedJobs.mockResolvedValue([mockJobs[2]])
    })

    it('should filter to active jobs', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        const activeJobsTab = screen.getByText('Active Jobs')
        fireEvent.click(activeJobsTab)
      })

      expect(mockElectronAPI.getActiveJobs).toHaveBeenCalled()
    })

    it('should filter to queued jobs only', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        const queuedJobsTab = screen.getByText('Queued Jobs')
        fireEvent.click(queuedJobsTab)
      })

      expect(mockElectronAPI.getQueuedJobs).toHaveBeenCalled()
    })

    it('should filter by job type', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        const typeFilter = screen.getByLabelText('Filter by type:')
        fireEvent.change(typeFilter, { target: { value: 'scan' } })
      })

      // Should only show scan jobs
      await waitFor(() => {
        const scanJobs = screen.getAllByText('scan')
        expect(scanJobs).toHaveLength(2) // Both scan jobs visible
        expect(screen.queryByText('analyze')).not.toBeInTheDocument()
        expect(screen.queryByText('export')).not.toBeInTheDocument()
      })
    })

    it('should filter by job status', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        const statusFilter = screen.getByLabelText('Filter by status:')
        fireEvent.change(statusFilter, { target: { value: 'failed' } })
      })

      // Should only show failed jobs
      await waitFor(() => {
        expect(screen.getAllByText('failed')).toHaveLength(1)
        expect(screen.queryByText('completed')).not.toBeInTheDocument()
        expect(screen.queryByText('running')).not.toBeInTheDocument()
      })
    })

    it('should show user vs system jobs', async () => {
      render(<JobManagement />)

      await waitFor(() => {
        const userFilter = screen.getByLabelText('Show only user jobs')
        fireEvent.click(userFilter)
      })

      // Should filter out system jobs
      await waitFor(() => {
        const visibleJobs = screen.getAllByTestId('job-row')
        expect(visibleJobs).toHaveLength(3) // 3 user jobs, 1 system job hidden
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should register event listeners for job updates', () => {
      render(<JobManagement />)

      expect(mockElectronAPI.on).toHaveBeenCalledWith(
        'job-status-changed',
        expect.any(Function)
      )
      expect(mockElectronAPI.on).toHaveBeenCalledWith(
        'job-progress',
        expect.any(Function)
      )
    })

    it('should clean up event listeners on unmount', () => {
      const { unmount } = render(<JobManagement />)

      unmount()

      expect(mockElectronAPI.removeAllListeners).toHaveBeenCalledWith('job-status-changed')
      expect(mockElectronAPI.removeAllListeners).toHaveBeenCalledWith('job-progress')
    })

    it('should update job list when receiving job updates', async () => {
      let jobUpdateCallback: Function | undefined

      mockElectronAPI.on.mockImplementation((channel, callback) => {
        if (channel === 'job-status-changed') {
          jobUpdateCallback = callback
        }
      })

      const initialJobs = [
        { id: 'job-1', type: 'scan', status: 'running', priority: 5, user_initiated: 1, created_at: '2024-01-01T10:00:00Z', progress: 50 }
      ]

      mockElectronAPI.getAllJobs.mockResolvedValue(initialJobs)
      render(<JobManagement />)

      await waitFor(() => {
        expect(screen.getByText('running')).toBeInTheDocument()
      })

      // Simulate job completion event
      const updatedJobs = [
        { ...initialJobs[0], status: 'completed', progress: 100 }
      ]
      mockElectronAPI.getAllJobs.mockResolvedValue(updatedJobs)

      // Trigger the event callback
      if (jobUpdateCallback) {
        jobUpdateCallback({ jobId: 'job-1', status: 'completed' })
      }

      await waitFor(() => {
        expect(screen.getByText('completed')).toBeInTheDocument()
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockElectronAPI.getAllJobs.mockRejectedValue(new Error('API Error'))

      render(<JobManagement />)

      await waitFor(() => {
        expect(screen.getByText('Error loading jobs')).toBeInTheDocument()
      })
    })

    it('should handle cancellation errors', async () => {
      const mockJob = {
        id: 'job-1',
        type: 'scan',
        status: 'running',
        priority: 5,
        user_initiated: 1,
        created_at: '2024-01-01T10:00:00Z',
        progress: 50
      }

      mockElectronAPI.getAllJobs.mockResolvedValue([mockJob])
      mockElectronAPI.cancelJob.mockRejectedValue(new Error('Cancel failed'))

      render(<JobManagement />)

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel')
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Failed to cancel job')).toBeInTheDocument()
      })
    })

    it('should handle retry errors', async () => {
      const mockJob = {
        id: 'job-1',
        type: 'scan',
        status: 'failed',
        priority: 5,
        user_initiated: 1,
        created_at: '2024-01-01T10:00:00Z',
        attempts: 1,
        max_attempts: 3,
        error: 'Original error'
      }

      mockElectronAPI.getAllJobs.mockResolvedValue([mockJob])
      mockElectronAPI.retryJob.mockRejectedValue(new Error('Retry failed'))

      render(<JobManagement />)

      await waitFor(() => {
        const retryButton = screen.getByText('Retry')
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Failed to retry job')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<JobManagement />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'All Jobs' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Active Jobs' })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'Queued Jobs' })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const mockJobs = [
        { id: 'job-1', type: 'scan', status: 'running', priority: 5, user_initiated: 1, created_at: '2024-01-01T10:00:00Z', progress: 50 }
      ]

      mockElectronAPI.getAllJobs.mockResolvedValue(mockJobs)
      render(<JobManagement />)

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel')

        // Button should be focusable
        cancelButton.focus()
        expect(cancelButton).toHaveFocus()

        // Should activate with Enter key
        fireEvent.keyDown(cancelButton, { key: 'Enter' })
        expect(mockElectronAPI.cancelJob).toHaveBeenCalled()
      })
    })

    it('should have proper heading structure', async () => {
      render(<JobManagement />)

      expect(screen.getByRole('heading', { level: 1, name: 'Job Management' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Statistics' })).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of jobs without performance issues', async () => {
      const manyJobs = Array.from({ length: 1000 }, (_, i) => ({
        id: `job-${i}`,
        type: 'analyze',
        status: i % 4 === 0 ? 'completed' : i % 4 === 1 ? 'running' : i % 4 === 2 ? 'queued' : 'failed',
        priority: Math.floor(Math.random() * 10) + 1,
        user_initiated: 1,
        created_at: new Date().toISOString(),
        progress: Math.floor(Math.random() * 100)
      }))

      mockElectronAPI.getAllJobs.mockResolvedValue(manyJobs)

      const startTime = Date.now()
      render(<JobManagement />)

      await waitFor(() => {
        expect(screen.getByText('Total: 1000')).toBeInTheDocument()
      })

      const renderTime = Date.now() - startTime

      // Should render quickly even with many jobs
      expect(renderTime).toBeLessThan(2000)
    })

    it('should use virtualization for large job lists', async () => {
      const manyJobs = Array.from({ length: 100 }, (_, i) => ({
        id: `job-${i}`,
        type: 'analyze',
        status: 'completed',
        priority: 5,
        user_initiated: 1,
        created_at: new Date().toISOString(),
        progress: 100
      }))

      mockElectronAPI.getAllJobs.mockResolvedValue(manyJobs)
      render(<JobManagement />)

      await waitFor(() => {
        // Should not render all jobs in DOM immediately (virtualization)
        const visibleJobs = screen.getAllByTestId('job-row')
        expect(visibleJobs.length).toBeLessThan(100)
      })
    })
  })
})