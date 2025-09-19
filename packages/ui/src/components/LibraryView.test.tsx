import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { LibraryView } from './LibraryView'
import { setupElectronAPIMock, resetElectronMocks, mockElectronAPI } from '../test/mocks/electronAPI'

// Mock ExportDialog component
vi.mock('./ExportDialog', () => ({
  ExportDialog: ({ onClose, selectedTracks }: { onClose: () => void, selectedTracks: string[] }) => (
    <div data-testid="export-dialog">
      <span>Export Dialog - {selectedTracks.length} tracks</span>
      <button onClick={onClose} data-testid="close-export">Close</button>
    </div>
  )
}))

// Mock data
const mockTracks = [
  {
    id: '1',
    title: 'Test Track 1',
    artist: 'Test Artist 1',
    album: 'Test Album 1',
    genre: 'House',
    year: 2023,
    bpm: 128,
    key: 'A',
    durationMs: 240000,
    analysis: { bpm: 128, key: 'A', energy: 75 },
    path: '/test/track1.mp3'
  },
  {
    id: '2',
    title: 'Another Song',
    artist: 'Different Artist',
    album: 'Another Album',
    genre: 'Techno',
    year: 2022,
    bpm: 140,
    key: 'Cm',
    durationMs: 300000,
    analysis: { bpm: 140, key: 'Cm', energy: 85 },
    path: '/test/track2.mp3'
  },
  {
    id: '3',
    title: 'Slow Ballad',
    artist: 'Ballad Singer',
    album: 'Emotional Songs',
    genre: 'R&B',
    year: 2021,
    bpm: 75,
    key: 'F#m',
    durationMs: 180000,
    analysis: { bpm: 75, key: 'F#m', energy: 45 },
    path: '/test/track3.mp3'
  }
]

describe('LibraryView Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    resetElectronMocks()
    setupElectronAPIMock()
    // Setup default successful track loading
    mockElectronAPI.getAllTracks.mockResolvedValue(mockTracks)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders the library header', async () => {
      render(<LibraryView />)

      expect(screen.getByText('Music Library')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })
    })

    it('shows loading state initially', () => {
      render(<LibraryView />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByText('Loading tracks...')).toBeInTheDocument()
      // The loading spinner is an animated Music icon
      const loadingSpinner = screen.getByText('Loading tracks...').closest('div')?.querySelector('.animate-spin')
      expect(loadingSpinner).toBeInTheDocument()
    })

    it('renders track table headers', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Select')).toBeInTheDocument()
        expect(screen.getByText('Track')).toBeInTheDocument()
        expect(screen.getByText('Artist')).toBeInTheDocument()
        expect(screen.getByText('Genre')).toBeInTheDocument()
        expect(screen.getByText('BPM')).toBeInTheDocument()
        expect(screen.getByText('Key')).toBeInTheDocument()
        expect(screen.getByText('Camelot')).toBeInTheDocument()
        expect(screen.getByText('Duration')).toBeInTheDocument()
        expect(screen.getByText('Energy')).toBeInTheDocument()
      })
    })

    it('renders all tracks after loading', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
        expect(screen.getByText('Another Song')).toBeInTheDocument()
        expect(screen.getByText('Slow Ballad')).toBeInTheDocument()
      })
    })

    it('displays empty state when no tracks', async () => {
      mockElectronAPI.getAllTracks.mockResolvedValue([])
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('No tracks found')).toBeInTheDocument()
      })
    })

    it('handles API errors gracefully', async () => {
      mockElectronAPI.getAllTracks.mockRejectedValue(new Error('API Error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('0 tracks')).toBeInTheDocument()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load tracks:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  // Search and Filtering Tests
  describe('Search and Filtering', () => {
    it('filters tracks by title', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'Test Track')

      expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      expect(screen.queryByText('Another Song')).not.toBeInTheDocument()
      expect(screen.queryByText('Slow Ballad')).not.toBeInTheDocument()
    })

    it('filters tracks by artist', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Different Artist')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'Different')

      expect(screen.getByText('Another Song')).toBeInTheDocument()
      expect(screen.queryByText('Test Track 1')).not.toBeInTheDocument()
    })

    it('filters tracks by genre', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('House')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'house')

      expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      expect(screen.queryByText('Another Song')).not.toBeInTheDocument()
    })

    it('shows no results message when search yields no matches', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByText('No tracks found')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your search query')).toBeInTheDocument()
    })

    it('is case insensitive', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'TEST TRACK')

      expect(screen.getByText('Test Track 1')).toBeInTheDocument()
    })

    it('clears search properly', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'house')

      expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      expect(screen.queryByText('Another Song')).not.toBeInTheDocument()

      await user.clear(searchInput)

      expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      expect(screen.getByText('Another Song')).toBeInTheDocument()
      expect(screen.getByText('Slow Ballad')).toBeInTheDocument()
    })
  })

  // Track Selection Tests
  describe('Track Selection', () => {
    it('selects individual tracks', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )

      await user.click(firstTrackCheckbox!)

      expect(firstTrackCheckbox).toBeChecked()
      expect(screen.getByText('Delete (1)')).toBeInTheDocument()
      expect(screen.getByText('Export (1)')).toBeInTheDocument()
    })

    it('deselects individual tracks', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )

      await user.click(firstTrackCheckbox!)
      expect(firstTrackCheckbox).toBeChecked()

      await user.click(firstTrackCheckbox!)
      expect(firstTrackCheckbox).not.toBeChecked()
      expect(screen.getByText('Delete (0)')).toBeInTheDocument()
    })

    it('selects all tracks', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      const selectAllButton = screen.getByText('Select All')
      await user.click(selectAllButton)

      expect(screen.getByText('Deselect All')).toBeInTheDocument()
      expect(screen.getByText('Delete (3)')).toBeInTheDocument()
      expect(screen.getByText('Export (3)')).toBeInTheDocument()

      // Check that all track checkboxes are selected
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })

    it('deselects all tracks', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      // First select all
      const selectAllButton = screen.getByText('Select All')
      await user.click(selectAllButton)
      expect(screen.getByText('Deselect All')).toBeInTheDocument()

      // Then deselect all
      const deselectAllButton = screen.getByText('Deselect All')
      await user.click(deselectAllButton)

      expect(screen.getByText('Select All')).toBeInTheDocument()
      expect(screen.getByText('Delete (0)')).toBeInTheDocument()
    })

    it('handles selection with filtered tracks', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      // Filter to only show one track
      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'Test Track')

      expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      expect(screen.queryByText('Another Song')).not.toBeInTheDocument()

      // Select all (should only select the filtered track)
      const selectAllButton = screen.getByText('Select All')
      await user.click(selectAllButton)

      expect(screen.getByText('Delete (1)')).toBeInTheDocument()
    })

    it('disables action buttons when no tracks selected', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      const deleteButton = screen.getByText('Delete (0)')
      const exportButton = screen.getByText('Export (0)')

      expect(deleteButton).toBeDisabled()
      expect(exportButton).toBeDisabled()
    })

    it('disables select all when no tracks available', async () => {
      mockElectronAPI.getAllTracks.mockResolvedValue([])
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('No tracks found')).toBeInTheDocument()
      })

      const selectAllButton = screen.getByText('Select All')
      expect(selectAllButton).toBeDisabled()
    })
  })

  // Data Processing Tests
  describe('Data Processing', () => {
    it('converts keys to Camelot notation correctly', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('11B')).toBeInTheDocument() // A major -> 11B
        expect(screen.getByText('5A')).toBeInTheDocument()  // Cm -> 5A
        expect(screen.getByText('11A')).toBeInTheDocument() // F#m -> 11A
      })
    })

    it('applies correct BPM color coding', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // Test different BPM ranges
        const bpmElements = screen.getAllByText(/\d+/).filter(el =>
          el.textContent === '128' || el.textContent === '140' || el.textContent === '75'
        )

        expect(bpmElements.length).toBeGreaterThan(0)
      })
    })

    it('applies correct energy color coding', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // High energy (85) should be red, medium (75) should be yellow, low (45) should be green
        const energyElements = screen.getAllByText(/\d+/).filter(el =>
          el.textContent === '85' || el.textContent === '75' || el.textContent === '45'
        )

        expect(energyElements.length).toBeGreaterThan(0)
      })
    })

    it('formats duration correctly', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('4:00')).toBeInTheDocument() // 240 seconds
        expect(screen.getByText('5:00')).toBeInTheDocument() // 300 seconds
        expect(screen.getByText('3:00')).toBeInTheDocument() // 180 seconds
      })
    })

    it('handles missing data gracefully', async () => {
      const incompleteTrack = {
        id: '4',
        title: 'Incomplete Track',
        artist: 'Unknown Artist',
        path: '/test/incomplete.mp3'
        // Missing: album, genre, bpm, key, duration, analysis
      }

      mockElectronAPI.getAllTracks.mockResolvedValue([incompleteTrack])
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Incomplete Track')).toBeInTheDocument()
        expect(screen.getByText('Unknown Artist')).toBeInTheDocument()
        expect(screen.getByText('No energy data')).toBeInTheDocument()
      })
    })
  })

  // Delete Functionality Tests
  describe('Delete Functionality', () => {
    it('opens delete dialog when delete button clicked with selection', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      // Select a track
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      // Click delete button
      const deleteButton = screen.getByText('Delete (1)')
      await user.click(deleteButton)

      expect(screen.getByText('Delete Tracks')).toBeInTheDocument()
      expect(screen.getByText('You are about to delete 1 track.')).toBeInTheDocument()
    })

    it('shows correct pluralization in delete dialog', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      // Select all tracks
      const selectAllButton = screen.getByText('Select All')
      await user.click(selectAllButton)

      // Click delete button
      const deleteButton = screen.getByText('Delete (3)')
      await user.click(deleteButton)

      expect(screen.getByText('You are about to delete 3 tracks.')).toBeInTheDocument()
    })

    it('closes delete dialog when cancel clicked', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      // Select a track and open delete dialog
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      const deleteButton = screen.getByText('Delete (1)')
      await user.click(deleteButton)

      // Cancel the dialog
      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(screen.queryByText('Delete Tracks')).not.toBeInTheDocument()
    })

    it('handles library-only deletion', async () => {
      mockElectronAPI.deleteTracks.mockResolvedValue({
        success: true,
        result: { removedFromLibrary: 1, deletedFiles: 0, errors: [] }
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      // Select and delete
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      const deleteButton = screen.getByText('Delete (1)')
      await user.click(deleteButton)

      const libraryOnlyButton = screen.getByText('Remove from Library')
      await user.click(libraryOnlyButton)

      await waitFor(() => {
        expect(mockElectronAPI.deleteTracks).toHaveBeenCalledWith(['1'], false)
        expect(mockElectronAPI.getAllTracks).toHaveBeenCalledTimes(2) // Initial load + reload after delete
      })
    })

    it('handles permanent file deletion', async () => {
      mockElectronAPI.deleteTracks.mockResolvedValue({
        success: true,
        result: { removedFromLibrary: 1, deletedFiles: 1, errors: [] }
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      // Select and delete
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      const deleteButton = screen.getByText('Delete (1)')
      await user.click(deleteButton)

      const permanentDeleteButton = screen.getByText('Delete Files Permanently')
      await user.click(permanentDeleteButton)

      await waitFor(() => {
        expect(mockElectronAPI.deleteTracks).toHaveBeenCalledWith(['1'], true)
      })
    })

    it('handles delete API errors', async () => {
      mockElectronAPI.deleteTracks.mockRejectedValue(new Error('Delete failed'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      // Select and delete
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      const deleteButton = screen.getByText('Delete (1)')
      await user.click(deleteButton)

      const libraryOnlyButton = screen.getByText('Remove from Library')
      await user.click(libraryOnlyButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete tracks:', expect.any(Error))
        // Dialog should remain open on error
        expect(screen.getByText('Delete Tracks')).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  // Export Functionality Tests
  describe('Export Functionality', () => {
    it('opens export dialog when export button clicked with selection', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      // Select a track
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      // Click export button
      const exportButton = screen.getByText('Export (1)')
      await user.click(exportButton)

      expect(screen.getByTestId('export-dialog')).toBeInTheDocument()
      expect(screen.getByText('Export Dialog - 1 tracks')).toBeInTheDocument()
    })

    it('closes export dialog', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      // Select a track and open export dialog
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      const exportButton = screen.getByText('Export (1)')
      await user.click(exportButton)

      // Close the dialog
      const closeButton = screen.getByTestId('close-export')
      await user.click(closeButton)

      expect(screen.queryByTestId('export-dialog')).not.toBeInTheDocument()
    })
  })

  // Edge Cases and Error Handling
  describe('Edge Cases', () => {
    it('handles web environment gracefully', async () => {
      // Remove electronAPI to simulate web environment
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('0 tracks')).toBeInTheDocument()
      })
    })

    it('handles rapid selection changes', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      const selectAllButton = screen.getByText('Select All')

      // Rapidly toggle selection
      await user.click(selectAllButton)
      await user.click(screen.getByText('Deselect All'))
      await user.click(screen.getByText('Select All'))

      expect(screen.getByText('Delete (3)')).toBeInTheDocument()
    })

    it('maintains selection across search operations', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      // Select a track
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Test Track 1')
      )
      await user.click(firstTrackCheckbox!)

      expect(screen.getByText('Delete (1)')).toBeInTheDocument()

      // Search for that track
      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      await user.type(searchInput, 'Test Track')

      // Selection should be maintained
      expect(screen.getByText('Delete (1)')).toBeInTheDocument()
    })
  })

  // Accessibility Tests
  describe('Accessibility', () => {
    it('provides proper checkbox labels and states', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Test Track 1')).toBeInTheDocument()
      })

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)

      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('type', 'checkbox')
      })
    })

    it('has proper button states and labels', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('3 tracks')).toBeInTheDocument()
      })

      const selectAllButton = screen.getByText('Select All')
      const deleteButton = screen.getByText('Delete (0)')
      const exportButton = screen.getByText('Export (0)')

      expect(selectAllButton).toBeEnabled()
      expect(deleteButton).toBeDisabled()
      expect(exportButton).toBeDisabled()
    })

    it('provides search input with proper placeholder', async () => {
      render(<LibraryView />)

      const searchInput = screen.getByPlaceholderText('Search tracks, artists, or genres...')
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('type', 'text')
    })
  })
})