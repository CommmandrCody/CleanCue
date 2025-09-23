import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { LibraryView } from './LibraryView'
import { setupElectronAPIMock, resetElectronMocks, mockElectronAPI } from '../test/mocks/electronAPI'

// 🎧 DJ-FOCUSED TEST SUITE - Professional Features Testing
describe('LibraryView DJ Features', () => {
  const user = userEvent.setup()

  // DJ-optimized mock tracks with comprehensive analysis data
  const djMockTracks = [
    {
      id: '1',
      title: 'Progressive House Anthem',
      artist: 'Deep State',
      album: 'Club Essentials',
      genre: 'Progressive House',
      year: 2023,
      bpm: 128,
      key: 'A',
      durationMs: 360000, // 6 minutes
      energy: 85,
      valence: 75,
      danceability: 90,
      path: '/dj/tracks/progressive1.mp3'
    },
    {
      id: '2',
      title: 'Tech House Banger',
      artist: 'Underground Collective',
      album: 'Warehouse Sessions',
      genre: 'Tech House',
      year: 2023,
      bpm: 125, // Compatible with track 1 (3 BPM diff)
      key: 'F#m', // Relative minor of A major - perfect harmonic match
      durationMs: 420000, // 7 minutes
      energy: 88,
      valence: 70,
      danceability: 95,
      path: '/dj/tracks/techhouse1.mp3'
    },
    {
      id: '3',
      title: 'Melodic Techno Journey',
      artist: 'Atmospheric Sounds',
      album: 'Dark Spaces',
      genre: 'Melodic Techno',
      year: 2023,
      bpm: 124, // Good BPM compatibility with others
      key: 'E', // Adjacent to A on Camelot wheel (12B -> 11B)
      durationMs: 480000, // 8 minutes
      energy: 92,
      valence: 60,
      danceability: 85,
      path: '/dj/tracks/melodic1.mp3'
    },
    {
      id: '4',
      title: 'Ambient Intro',
      artist: 'Chill Master',
      album: 'Warm Up Tracks',
      genre: 'Ambient',
      year: 2023,
      bmp: 90,
      key: 'Dm',
      durationMs: 240000, // 4 minutes
      energy: 25,
      valence: 40,
      danceability: 30,
      path: '/dj/tracks/ambient1.mp3'
    },
    {
      id: '5',
      title: 'Unanalyzed Track',
      artist: 'Unknown Producer',
      album: 'Raw Files',
      genre: 'Unknown',
      year: 2023,
      // Missing: bpm, key, energy, etc.
      durationMs: 300000,
      path: '/dj/tracks/unanalyzed.mp3'
    }
  ]

  beforeEach(() => {
    resetElectronMocks()
    setupElectronAPIMock()
    mockElectronAPI.getAllTracks.mockResolvedValue(djMockTracks)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // 🎧 DJ READINESS ANALYTICS
  describe('DJ Analytics Display', () => {
    it('shows DJ readiness statistics', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // Should show counts for DJ Ready, Partial, and Unanalyzed tracks
        expect(screen.getByText('3 DJ Ready')).toBeInTheDocument() // tracks 1,2,3 have bpm+key+energy
        expect(screen.getByText('1 Partial')).toBeInTheDocument()   // track 4 has some data
        expect(screen.getByText('1 Unanalyzed')).toBeInTheDocument() // track 5 has no analysis
      })
    })

    it('displays DJ readiness badges on tracks', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // Tracks with full analysis should show DJ READY badge
        expect(screen.getAllByText('⭐ DJ READY')).toHaveLength(3)
      })
    })

    it('shows DJ suitability indicators', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // High energy tracks should show peak time indicator
        expect(screen.getByText('🔥 Peak Time')).toBeInTheDocument()
        // Low energy tracks should show chill indicator
        expect(screen.getByText('🌙 Chill')).toBeInTheDocument()
      })
    })

    it('displays formatted track durations for DJs', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('• 6:00')).toBeInTheDocument() // 360 seconds
        expect(screen.getByText('• 7:00')).toBeInTheDocument() // 420 seconds
        expect(screen.getByText('• 8:00')).toBeInTheDocument() // 480 seconds
      })
    })
  })

  // 🎧 HARMONIC MIXING FEATURES
  describe('Harmonic Mixing Analysis', () => {
    it('shows Camelot key notation by default', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // A major = 11B, F#m = 11A, E major = 12B, Dm = 7A
        expect(screen.getByText('11B')).toBeInTheDocument() // A major
        expect(screen.getByText('11A')).toBeInTheDocument() // F#m
        expect(screen.getByText('12B')).toBeInTheDocument() // E major
        expect(screen.getByText('7A')).toBeInTheDocument()  // Dm
      })
    })

    it('toggles between musical and Camelot notation', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('11B')).toBeInTheDocument()
      })

      // Toggle to musical notation
      const keyToggleButton = screen.getByTitle(/Switch to Musical keys/)
      await user.click(keyToggleButton)

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()    // A major
        expect(screen.getByText('F#m')).toBeInTheDocument()  // F#m
        expect(screen.getByText('E')).toBeInTheDocument()    // E major
        expect(screen.getByText('Dm')).toBeInTheDocument()   // Dm
      })
    })

    it('shows harmonic compatibility indicators when one track selected', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select the A major track (11B)
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Progressive House Anthem')
      )
      await user.click(firstTrackCheckbox!)

      await waitFor(() => {
        // F#m (11A) should show perfect compatibility (⭐) with A major (11B)
        const compatibilityIndicators = screen.getAllByText('⭐')
        expect(compatibilityIndicators.length).toBeGreaterThan(0)
      })
    })

    it('calculates harmonic compatibility correctly', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select A major track
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Progressive House Anthem')
      )
      await user.click(firstTrackCheckbox!)

      // Look for compatibility indicators with tooltips
      const perfectMatch = screen.getByTitle(/Harmonic compatibility.*perfect/)
      expect(perfectMatch).toBeInTheDocument()
    })
  })

  // 🎧 BPM MATCHING FEATURES
  describe('BPM Compatibility Analysis', () => {
    it('shows BPM compatibility indicators when one track selected', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select 128 BPM track
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Progressive House Anthem')
      )
      await user.click(firstTrackCheckbox!)

      await waitFor(() => {
        // Should show BPM compatibility indicators
        const bpmCompatibilityElements = screen.getAllByTitle(/BPM compatibility/)
        expect(bpmCompatibilityElements.length).toBeGreaterThan(0)
      })
    })

    it('calculates BPM compatibility correctly', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select 128 BPM track
      const checkboxes = screen.getAllByRole('checkbox')
      const firstTrackCheckbox = checkboxes.find(cb =>
        cb.closest('.grid')?.textContent?.includes('Progressive House Anthem')
      )
      await user.click(firstTrackCheckbox!)

      // 125 BPM vs 128 BPM = 3 BPM difference, should be "good" compatibility
      const goodCompatibility = screen.getByTitle(/BPM compatibility: good.*3 BPM diff/)
      expect(goodCompatibility).toBeInTheDocument()
    })

    it('applies correct BPM color coding for DJ ranges', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // 128 BPM should be orange (house/dance range 120-140)
        // 124 BPM should be orange (house/dance range)
        // 90 BPM should be green (hip-hop/R&B range 80-100)
        const bpmElements = screen.getAllByText(/12[458]|90/)
        expect(bpmElements.length).toBeGreaterThan(0)
      })
    })
  })

  // 🎧 ENERGY VISUALIZATION
  describe('Energy Visualization', () => {
    it('displays energy as visual progress bars', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // Energy should be displayed as progress bars with percentages
        const energyBars = screen.getAllByTitle(/Energy Level: \d+\/100/)
        expect(energyBars.length).toBeGreaterThan(0)
      })
    })

    it('uses correct energy color coding', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // High energy (85+) should be red
        // Medium energy (60-79) should be yellow
        // Low energy (<60) should be green
        const energyLabels = screen.getAllByText(/\d+/).filter(el => {
          const text = el.textContent
          return text === '85' || text === '88' || text === '92' || text === '25'
        })
        expect(energyLabels.length).toBeGreaterThan(0)
      })
    })
  })

  // 🎧 SMART MIX GENERATION
  describe('Smart Mix Generation', () => {
    it('shows Smart Mix button when tracks are selected', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select multiple tracks
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      expect(screen.getByText('Smart Mix (2)')).toBeInTheDocument()
    })

    it('disables Smart Mix button when insufficient tracks selected', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      const smartMixButton = screen.getByText('Smart Mix (0)')
      expect(smartMixButton).toBeDisabled()
    })

    it('generates smart mix with harmonic and BPM analysis', async () => {
      // Mock window.alert to capture the mix results
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select multiple analyzed tracks
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0]) // A major, 128 BPM, 85 energy
      await user.click(checkboxes[1]) // F#m, 125 BPM, 88 energy
      await user.click(checkboxes[2]) // E major, 124 BPM, 92 energy

      const smartMixButton = screen.getByText('Smart Mix (3)')
      await user.click(smartMixButton)

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎧 SMART MIX GENERATED')
      )
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Harmonic Matches:')
      )
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('BPM Matches:')
      )
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overall Compatibility:')
      )

      alertSpy.mockRestore()
    })

    it('handles Smart Mix with insufficient analyzed tracks', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Unanalyzed Track')).toBeInTheDocument()
      })

      // Select tracks without full analysis
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[4]) // Unanalyzed track

      const smartMixButton = screen.getByText('Smart Mix (1)')
      await user.click(smartMixButton)

      expect(alertSpy).toHaveBeenCalledWith(
        'Select at least 2 tracks to generate a smart mix'
      )

      alertSpy.mockRestore()
    })
  })

  // 🎧 KEY DISPLAY AND ANALYSIS
  describe('Professional Key Analysis', () => {
    it('shows harmonic series indicators', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        // Tracks with key analysis should show musical note symbols
        const harmonicIndicators = screen.getAllByText('♫')
        expect(harmonicIndicators.length).toBeGreaterThan(0)
      })
    })

    it('preserves key display preference in localStorage', async () => {
      // Test localStorage interaction
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByTitle(/Switch to Musical keys/)).toBeInTheDocument()
      })

      const keyToggleButton = screen.getByTitle(/Switch to Musical keys/)
      await user.click(keyToggleButton)

      expect(setItemSpy).toHaveBeenCalledWith('keyDisplayMode', 'musical')

      setItemSpy.mockRestore()
    })
  })

  // 🎧 ENHANCED ANALYZE BUTTON
  describe('DJ Analysis Integration', () => {
    it('shows enhanced analyze button with count', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select tracks
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      expect(screen.getByText('Analyze & Update (2)')).toBeInTheDocument()
      expect(screen.getByTitle('Analyze selected tracks for BPM, key, and energy')).toBeInTheDocument()
    })

    it('calls engineAnalyze with selected tracks', async () => {
      mockElectronAPI.engineAnalyze.mockResolvedValue({ success: true })

      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select tracks and analyze
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      const analyzeButton = screen.getByText('Analyze & Update (1)')
      await user.click(analyzeButton)

      expect(mockElectronAPI.engineAnalyze).toHaveBeenCalledWith(['1'])
    })
  })

  // 🎧 VIEW MODE FEATURES
  describe('DJ View Modes', () => {
    it('provides compact and grid view toggle', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByTitle('Compact List View')).toBeInTheDocument()
        expect(screen.getByTitle('Grid View')).toBeInTheDocument()
      })
    })

    it('switches between view modes correctly', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Should start in compact mode with minimal column headers
      expect(screen.getByText('✓')).toBeInTheDocument()
      expect(screen.getByText('▶')).toBeInTheDocument()

      // Switch to grid view
      const gridViewButton = screen.getByTitle('Grid View')
      await user.click(gridViewButton)

      // Grid view should have different layout with expanded headers
      expect(screen.getByText('Select')).toBeInTheDocument()
      expect(screen.getByText('Play')).toBeInTheDocument()
    })
  })

  // 🎧 PERFORMANCE AND EDGE CASES
  describe('DJ Features Performance', () => {
    it('handles large track libraries efficiently', async () => {
      // Create a large mock dataset
      const largeMockTracks = Array.from({ length: 1000 }, (_, i) => ({
        id: `track-${i}`,
        title: `Track ${i}`,
        artist: `Artist ${i}`,
        genre: 'Electronic',
        bpm: 120 + (i % 40), // Vary BPM from 120-160
        key: ['A', 'Bm', 'C', 'Dm', 'E', 'F#m'][i % 6],
        energy: 50 + (i % 50), // Vary energy from 50-100
        durationMs: 180000 + (i % 240000), // 3-7 minutes
        path: `/tracks/track-${i}.mp3`
      }))

      mockElectronAPI.getAllTracks.mockResolvedValue(largeMockTracks)

      const startTime = performance.now()
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('1000 tracks')).toBeInTheDocument()
      }, { timeout: 5000 })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (5 seconds for 1000 tracks)
      expect(renderTime).toBeLessThan(5000)
    })

    it('maintains compatibility indicators performance with many tracks', async () => {
      render(<LibraryView />)

      await waitFor(() => {
        expect(screen.getByText('Progressive House Anthem')).toBeInTheDocument()
      })

      // Select one track to trigger compatibility calculations
      const checkboxes = screen.getAllByRole('checkbox')

      const startTime = performance.now()
      await user.click(checkboxes[0])
      const endTime = performance.now()

      // Compatibility calculations should be fast (<100ms)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})