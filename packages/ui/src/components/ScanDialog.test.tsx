import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { ScanDialog } from './ScanDialog'
import { setupElectronAPIMock, resetElectronMocks, mockElectronAPI, emitElectronEvent } from '../test/mocks/electronAPI'

describe('ScanDialog Component', () => {
  const user = userEvent.setup()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    resetElectronMocks()
    setupElectronAPIMock()
    mockOnClose.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders the scan dialog with proper title', () => {
      render(<ScanDialog onClose={mockOnClose} />)

      expect(screen.getByText('Scan Music Library')).toBeInTheDocument()
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument()
    })

    it('renders folder selection interface', () => {
      render(<ScanDialog onClose={mockOnClose} />)

      expect(screen.getByText('Select Library Folder')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Type path or click Browse/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument()
    })

    it('renders scan options when not scanning', () => {
      render(<ScanDialog onClose={mockOnClose} />)

      expect(screen.getByText('Scan Options')).toBeInTheDocument()
      expect(screen.getByText('Include subdirectories')).toBeInTheDocument()
      expect(screen.getByText('Skip duplicate detection')).toBeInTheDocument()
      expect(screen.getByText('Auto-analyze BPM and key')).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      render(<ScanDialog onClose={mockOnClose} />)

      expect(screen.getByText('Start Scan')).toBeInTheDocument()
      expect(screen.getByText('Rescan Library')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('does not show progress or summary initially', () => {
      render(<ScanDialog onClose={mockOnClose} />)

      expect(screen.queryByText('Scanning files...')).not.toBeInTheDocument()
      expect(screen.queryByText('Scan complete!')).not.toBeInTheDocument()
      expect(screen.queryByTestId('scan-dialog')).not.toBeInTheDocument()
    })
  })

  // Folder Selection Tests
  describe('Folder Selection', () => {
    it('allows manual path entry', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      expect(pathInput).toHaveValue('/Users/test/Music')
    })

    it('enables scan button when path is entered', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      const scanButton = screen.getByText('Start Scan')

      expect(scanButton).toBeDisabled()

      await user.type(pathInput, '/Users/test/Music')

      expect(scanButton).toBeEnabled()
    })

    it('calls selectFolder API when browse button clicked', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/Users/selected/Music')
      render(<ScanDialog onClose={mockOnClose} />)

      const browseButton = screen.getByRole('button', { name: /browse/i })
      await user.click(browseButton)

      expect(mockElectronAPI.selectFolder).toHaveBeenCalled()

      await waitFor(() => {
        const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
        expect(pathInput).toHaveValue('/Users/selected/Music')
      })
    })

    it('handles folder selection cancellation', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('')
      render(<ScanDialog onClose={mockOnClose} />)

      const browseButton = screen.getByRole('button', { name: /browse/i })
      await user.click(browseButton)

      expect(mockElectronAPI.selectFolder).toHaveBeenCalled()

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      expect(pathInput).toHaveValue('')
    })

    it('handles folder selection API errors', async () => {
      mockElectronAPI.selectFolder.mockRejectedValue(new Error('Selection failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<ScanDialog onClose={mockOnClose} />)

      const browseButton = screen.getByRole('button', { name: /browse/i })
      await user.click(browseButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to select folder:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })

    it('shows web mode hint when electronAPI is not available', () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      render(<ScanDialog onClose={mockOnClose} />)

      expect(screen.getByText(/Click Browse to select a folder containing music files/)).toBeInTheDocument()
    })
  })

  // Scanning Process Tests
  describe('Scanning Process', () => {
    beforeEach(() => {
      mockElectronAPI.engineScan.mockResolvedValue({
        success: true,
        tracksFound: 5,
        tracksAdded: 3,
        tracksUpdated: 2,
        errors: []
      })
    })

    it('starts scan with valid path', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const scanButton = screen.getByText('Start Scan')
      await user.click(scanButton)

      expect(mockElectronAPI.engineScan).toHaveBeenCalledWith('/Users/test/Music')
    })

    it('shows scanning state during scan', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const scanButton = screen.getByText('Start Scan')
      await user.click(scanButton)

      expect(screen.getByText('Scanning...')).toBeInTheDocument()
      expect(screen.getByText('Scanning files...')).toBeInTheDocument()
    })

    it('disables UI elements during scan', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const scanButton = screen.getByText('Start Scan')
      const rescanButton = screen.getByText('Rescan Library')
      const browseButton = screen.getByRole('button', { name: /browse/i })

      await user.click(scanButton)

      expect(scanButton).toBeDisabled()
      expect(rescanButton).toBeDisabled()
      expect(browseButton).toBeDisabled()
    })

    it('handles scan completion', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const scanButton = screen.getByText('Start Scan')
      await user.click(scanButton)

      await waitFor(() => {
        expect(screen.getByText('✅ Scan Complete')).toBeInTheDocument()
      })
    })

    it('handles scan API errors', async () => {
      mockElectronAPI.engineScan.mockRejectedValue(new Error('Scan failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const scanButton = screen.getByText('Start Scan')
      await user.click(scanButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Scan failed:', expect.any(Error))
        expect(screen.getByText('Failed to scan library')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })

    it('prevents scan without selected path', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const scanButton = screen.getByText('Start Scan')
      expect(scanButton).toBeDisabled()

      await user.click(scanButton)
      expect(mockElectronAPI.engineScan).not.toHaveBeenCalled()
    })
  })

  // Real-time Event Handling Tests
  describe('Real-time Event Handling', () => {
    it('sets up event listeners on mount', () => {
      render(<ScanDialog onClose={mockOnClose} />)

      expect(mockElectronAPI.on).toHaveBeenCalledWith('scan:started', expect.any(Function))
      expect(mockElectronAPI.on).toHaveBeenCalledWith('scan:progress', expect.any(Function))
      expect(mockElectronAPI.on).toHaveBeenCalledWith('scan:completed', expect.any(Function))
    })

    it('handles scan:started events', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:started', { paths: ['/Users/test/Music'] })
      })

      await waitFor(() => {
        expect(screen.getByText(/🚀 Scan started for: \/Users\/test\/Music/)).toBeInTheDocument()
      })
    })

    it('handles scan:progress events', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:progress', {
          current: 3,
          total: 10,
          currentFile: '/Users/test/Music/track.mp3'
        })
      })

      await waitFor(() => {
        expect(screen.getByText('3 / 10')).toBeInTheDocument()
        expect(screen.getByText('Processing: /Users/test/Music/track.mp3')).toBeInTheDocument()
      })
    })

    it('handles scan:completed events', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 10,
          tracksAdded: 8,
          tracksUpdated: 2,
          errors: []
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/✅ Scan completed! Found 8 new tracks, updated 2 existing tracks/)).toBeInTheDocument()
        expect(screen.getByText('✅ Scan Complete')).toBeInTheDocument()
      })
    })

    it('updates progress bar correctly', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:progress', {
          current: 5,
          total: 10,
          currentFile: '/Users/test/Music/track.mp3'
        })
      })

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar')
        expect(progressBar).toHaveStyle('width: 50%')
      })
    })

    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(<ScanDialog onClose={mockOnClose} />)

      unmount()

      expect(mockElectronAPI.removeListener).toHaveBeenCalledWith('scan:started', expect.any(Function))
      expect(mockElectronAPI.removeListener).toHaveBeenCalledWith('scan:progress', expect.any(Function))
      expect(mockElectronAPI.removeListener).toHaveBeenCalledWith('scan:completed', expect.any(Function))
    })

    it('handles events with different argument patterns', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      // Test single argument pattern
      act(() => {
        emitElectronEvent('scan:started', { paths: ['/test'] })
      })

      // Test dual argument pattern (event, data)
      act(() => {
        const listeners = mockElectronAPI.on.mock.calls.find(call => call[0] === 'scan:started')?.[1]
        if (listeners) {
          listeners('event', { paths: ['/test2'] })
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/🚀 Scan started for: \/test2/)).toBeInTheDocument()
      })
    })
  })

  // Rescan Functionality Tests
  describe('Rescan Functionality', () => {
    beforeEach(() => {
      mockElectronAPI.engineClearLibrary.mockResolvedValue({
        success: true,
        removedCount: 5
      })
      mockElectronAPI.engineScan.mockResolvedValue({
        success: true,
        tracksFound: 8,
        tracksAdded: 8,
        tracksUpdated: 0,
        errors: []
      })
    })

    it('shows confirmation dialog for rescan', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const rescanButton = screen.getByText('Rescan Library')
      await user.click(rescanButton)

      expect(confirmSpy).toHaveBeenCalledWith(
        'This will clear all existing tracks and rescan with improved metadata parsing. Continue?'
      )

      confirmSpy.mockRestore()
    })

    it('cancels rescan when user declines confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const rescanButton = screen.getByText('Rescan Library')
      await user.click(rescanButton)

      expect(mockElectronAPI.engineClearLibrary).not.toHaveBeenCalled()
      expect(mockElectronAPI.engineScan).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })

    it('performs rescan when user confirms', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const rescanButton = screen.getByText('Rescan Library')
      await user.click(rescanButton)

      await waitFor(() => {
        expect(mockElectronAPI.engineClearLibrary).toHaveBeenCalled()
        expect(mockElectronAPI.engineScan).toHaveBeenCalledWith('/Users/test/Music')
      })

      confirmSpy.mockRestore()
    })

    it('handles rescan errors gracefully', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockElectronAPI.engineClearLibrary.mockRejectedValue(new Error('Clear failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const rescanButton = screen.getByText('Rescan Library')
      await user.click(rescanButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Rescan failed:', expect.any(Error))
        expect(screen.getByText('Failed to rescan library')).toBeInTheDocument()
      })

      confirmSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })

  // Scan Summary and Results Tests
  describe('Scan Summary and Results', () => {
    it('displays completion summary with metrics', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 15,
          tracksAdded: 10,
          tracksUpdated: 3,
          errors: ['Error 1', 'Error 2']
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Files Scanned:')).toBeInTheDocument()
        expect(screen.getByText('15')).toBeInTheDocument()
        expect(screen.getByText('New Tracks:')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('Updated:')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('Errors:')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('calculates success rate correctly', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 20,
          tracksAdded: 15,
          tracksUpdated: 3,
          errors: ['Error 1'] // 1 error out of 20 = 95% success
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Success Rate:')).toBeInTheDocument()
        expect(screen.getByText('95%')).toBeInTheDocument()
      })
    })

    it('displays scan errors when present', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 10,
          tracksAdded: 8,
          tracksUpdated: 0,
          errors: ['Error 1', 'Error 2', 'Error 3']
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Scan Errors:')).toBeInTheDocument()
        expect(screen.getByText('• Error 1')).toBeInTheDocument()
        expect(screen.getByText('• Error 2')).toBeInTheDocument()
        expect(screen.getByText('• Error 3')).toBeInTheDocument()
      })
    })

    it('truncates error list when more than 5 errors', async () => {
      const errors = Array.from({ length: 8 }, (_, i) => `Error ${i + 1}`)

      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 10,
          tracksAdded: 2,
          tracksUpdated: 0,
          errors
        })
      })

      await waitFor(() => {
        expect(screen.getByText('• Error 1')).toBeInTheDocument()
        expect(screen.getByText('• Error 5')).toBeInTheDocument()
        expect(screen.getByText('... and 3 more')).toBeInTheDocument()
        expect(screen.queryByText('• Error 6')).not.toBeInTheDocument()
      })
    })

    it('shows action buttons after completion', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 10,
          tracksAdded: 8,
          tracksUpdated: 2,
          errors: []
        })
      })

      await waitFor(() => {
        expect(screen.getByText('View Library (8 tracks)')).toBeInTheDocument()
        expect(screen.getByText('Show Logs')).toBeInTheDocument()
      })
    })
  })

  // Logging System Tests
  describe('Logging System', () => {
    it('toggles log visibility', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      // Add some logs first
      act(() => {
        emitElectronEvent('scan:started', { paths: ['/test'] })
      })

      await waitFor(() => {
        expect(screen.getByText('Show Logs')).toBeInTheDocument()
      })

      const showLogsButton = screen.getByText('Show Logs')
      await user.click(showLogsButton)

      expect(screen.getByText('Scan Logs')).toBeInTheDocument()
      expect(screen.getByText('Hide Logs')).toBeInTheDocument()

      const hideLogsButton = screen.getByText('Hide Logs')
      await user.click(hideLogsButton)

      expect(screen.queryByText('Scan Logs')).not.toBeInTheDocument()
      expect(screen.getByText('Show Logs')).toBeInTheDocument()
    })

    it('maintains log history', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:started', { paths: ['/test'] })
      })

      act(() => {
        emitElectronEvent('scan:progress', {
          current: 1,
          total: 5,
          currentFile: '/test/file1.mp3'
        })
      })

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 5,
          tracksAdded: 3,
          tracksUpdated: 2,
          errors: []
        })
      })

      const showLogsButton = screen.getByText('Show Logs')
      await user.click(showLogsButton)

      await waitFor(() => {
        expect(screen.getByText(/🚀 Scan started for: \/test/)).toBeInTheDocument()
        expect(screen.getByText(/📁 Processing: \/test\/file1.mp3/)).toBeInTheDocument()
        expect(screen.getByText(/✅ Scan completed! Found 3 new tracks, updated 2 existing tracks/)).toBeInTheDocument()
      })
    })

    it('limits log history to prevent memory issues', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      // Add more than 20 logs
      for (let i = 0; i < 25; i++) {
        act(() => {
          emitElectronEvent('scan:progress', {
            current: i,
            total: 25,
            currentFile: `/test/file${i}.mp3`
          })
        })
      }

      const showLogsButton = screen.getByText('Show Logs')
      await user.click(showLogsButton)

      // Should only show last 20 logs
      await waitFor(() => {
        expect(screen.queryByText(/file0.mp3/)).not.toBeInTheDocument()
        expect(screen.getByText(/file24.mp3/)).toBeInTheDocument()
      })
    })

    it('clears logs when clear button clicked', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:started', { paths: ['/test'] })
      })

      const showLogsButton = screen.getByText('Show Logs')
      await user.click(showLogsButton)

      await waitFor(() => {
        expect(screen.getByText(/🚀 Scan started for: \/test/)).toBeInTheDocument()
      })

      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)

      expect(screen.queryByText(/🚀 Scan started for: \/test/)).not.toBeInTheDocument()
    })
  })

  // Dialog Management Tests
  describe('Dialog Management', () => {
    it('closes dialog when close button clicked', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('closes dialog when cancel button clicked', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('changes cancel to close after scan completion', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      expect(screen.getByText('Cancel')).toBeInTheDocument()

      act(() => {
        emitElectronEvent('scan:completed', {
          tracksScanned: 5,
          tracksAdded: 3,
          tracksUpdated: 2,
          errors: []
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument()
        expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
      })
    })

    it('prevents closing during scan', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const scanButton = screen.getByText('Start Scan')
      await user.click(scanButton)

      const cancelButton = screen.getByText('Cancel')
      expect(cancelButton).toBeDisabled()
    })
  })

  // Edge Cases and Error Handling
  describe('Edge Cases', () => {
    it('handles missing electronAPI gracefully', () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      render(<ScanDialog onClose={mockOnClose} />)

      expect(consoleSpy).toHaveBeenCalledWith('[UI] No electronAPI available')

      consoleSpy.mockRestore()
    })

    it('handles malformed event data', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      act(() => {
        emitElectronEvent('scan:progress', null)
      })

      // Should not crash, just not update progress
      expect(screen.queryByText('Processing:')).not.toBeInTheDocument()
    })

    it('handles rapid state changes', async () => {
      render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/test')

      const scanButton = screen.getByText('Start Scan')

      // Rapidly click scan button
      await user.click(scanButton)
      await user.click(scanButton)

      // Should only call scan once
      expect(mockElectronAPI.engineScan).toHaveBeenCalledTimes(1)
    })

    it('maintains scan state across re-renders', async () => {
      const { rerender } = render(<ScanDialog onClose={mockOnClose} />)

      const pathInput = screen.getByPlaceholderText(/Type path or click Browse/)
      await user.type(pathInput, '/Users/test/Music')

      const scanButton = screen.getByText('Start Scan')
      await user.click(scanButton)

      rerender(<ScanDialog onClose={mockOnClose} />)

      expect(screen.getByText('Scanning...')).toBeInTheDocument()
    })
  })
})