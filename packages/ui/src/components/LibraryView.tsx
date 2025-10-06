import React, { useState, useEffect, useRef } from 'react'
import { Play, Music, Key, Trash2, FolderMinus, X, CheckSquare, Square, List, Grid3X3, ChevronDown, ChevronRight, Layers, Zap, Info } from 'lucide-react'
import clsx from 'clsx'
// import { StemSeparationDialog } from './StemSeparationDialog' // Disabled: not implemented in simple engine

interface StemFile {
  type: 'vocals' | 'drums' | 'bass' | 'other' | 'piano' | 'guitar'
  path: string
  status: 'completed' | 'processing' | 'failed'
}

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  albumArtist?: string
  genre?: string
  year?: number
  trackNumber?: number
  composer?: string
  comment?: string
  bpm?: number
  key?: string
  camelotKey?: string
  duration?: number
  energy?: number
  path: string
  stemSeparation?: {
    status: 'pending' | 'processing' | 'completed' | 'error'
    progress?: number
    stems?: StemFile[]
    separationId?: string
    errorMessage?: string
  }
}

interface LibraryViewProps {
  onPlayTrack?: (tracks: Track[], startIndex: number) => void
  onSelectionChange?: (selectedIds: string[]) => void
  selectedTracks?: string[]
}

export function LibraryView({ onPlayTrack, onSelectionChange, selectedTracks: selectedTracksProp = [] }: LibraryViewProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const selectedTracks = selectedTracksProp
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  // const [showStemSeparationDialog, setShowStemSeparationDialog] = useState(false) // Disabled: not implemented in simple engine
  const [viewMode, setViewMode] = useState<'compact' | 'grid'>('compact')
  const [expandedTracks, setExpandedTracks] = useState<string[]>([])
  const [keyDisplayMode, setKeyDisplayMode] = useState<'musical' | 'camelot'>(() => {
    // Load from localStorage or default to camelot
    return (localStorage.getItem('keyDisplayMode') as 'musical' | 'camelot') || 'camelot'
  })

  // Column widths state
  const [columnWidths, setColumnWidths] = useState({
    checkbox: 40,
    play: 40,
    expand: 40,
    track: 400,
    artist: 200,
    bpm: 80,
    key: 80,
    energy: 60
  })

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    track: Track
  } | null>(null)

  // Resize state
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  useEffect(() => {
    console.log('[LibraryView] Component mounted, loading tracks')
    loadTracks()
  }, [])

  // Handle column resize
  const handleResizeStart = (columnName: string, e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(columnName)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = columnWidths[columnName as keyof typeof columnWidths]
  }

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return

      const diff = e.clientX - resizeStartX.current
      const newWidth = Math.max(50, resizeStartWidth.current + diff)

      setColumnWidths(prev => ({
        ...prev,
        [isResizing]: newWidth
      }))
    }

    const handleResizeEnd = () => {
      setIsResizing(null)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)

      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing])

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, track: Track) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      track
    })
  }

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const loadTracks = async () => {
    try {
      setLoading(true)
      if (window.electronAPI) {
        const dbTracks = await window.electronAPI.getAllTracks()
        console.log(`🔍 UI DEBUG - Received ${dbTracks.length} tracks from database`)

        // Log first track for debugging
        if (dbTracks && dbTracks.length > 0) {
          const firstTrack = dbTracks[0]
          if (firstTrack) {
            console.log(`🔍 UI DEBUG - First track from DB:`, {
              id: firstTrack.id,
              title: firstTrack.title,
              artist: firstTrack.artist,
              bpm: firstTrack.bpm,
              key: firstTrack.key,
              energy: firstTrack.energy,
              path: firstTrack.path
            })
          }
        }

        const convertedTracks = dbTracks.map((dbTrack: any) => {
          const key = dbTrack.key
          const converted: Track = {
            id: dbTrack.id,
            title: dbTrack.title || 'Unknown Title',
            artist: dbTrack.artist || 'Unknown Artist',
            album: dbTrack.album,
            genre: dbTrack.genre,
            year: dbTrack.year,
            bpm: dbTrack.bpm,
            key: key,
            camelotKey: key ? keyToCamelot(key) : undefined,
            duration: dbTrack.durationMs ? Math.floor(dbTrack.durationMs / 1000) : undefined,
            energy: dbTrack.energy,
            path: dbTrack.path,
            stemSeparation: dbTrack.stemSeparation || undefined
          }

          // Log conversion for tracks with analysis data
          if (dbTrack.bpm || dbTrack.key || dbTrack.energy) {
            console.log(`🔍 UI DEBUG - Converting track with analysis:`, {
              original: { bpm: dbTrack.bpm, key: dbTrack.key, energy: dbTrack.energy },
              converted: { bpm: converted.bpm, key: converted.key, energy: converted.energy }
            })
          }


          return converted
        })
        setTracks(convertedTracks)
      }
    } catch (error) {
      console.error('Failed to load tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleTrackSelection = (trackId: string) => {
    const newSelection = selectedTracks.includes(trackId)
      ? selectedTracks.filter(id => id !== trackId)
      : [...selectedTracks, trackId]

    // Notify parent of selection change
    if (onSelectionChange) {
      onSelectionChange(newSelection)
    }
  }

  const toggleSelectAll = () => {
    const newSelection = selectedTracks.length === filteredTracks.length
      ? [] // All tracks are selected, deselect all
      : filteredTracks.map(track => track.id) // Not all tracks are selected, select all

    // Notify parent of selection change
    if (onSelectionChange) {
      onSelectionChange(newSelection)
    }
  }

  const toggleTrackExpansion = (trackId: string) => {
    setExpandedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const getStemTypeIcon = (type: string) => {
    switch (type) {
      case 'vocals': return '🎤'
      case 'drums': return '🥁'
      case 'bass': return '🎸'
      case 'other': return '🎵'
      case 'piano': return '🎹'
      case 'guitar': return '🎸'
      default: return '🎶'
    }
  }

  const getStemTypeColor = (type: string) => {
    switch (type) {
      case 'vocals': return 'text-blue-400'
      case 'drums': return 'text-red-400'
      case 'bass': return 'text-yellow-400'
      case 'other': return 'text-green-400'
      case 'piano': return 'text-purple-400'
      case 'guitar': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }


  const getEnergyColor = (energy: number) => {
    if (energy >= 80) return 'text-red-400'
    if (energy >= 60) return 'text-yellow-400'
    return 'text-green-400'
  }

  // 🎧 DJ HARMONIC MIXING - Professional Key Compatibility
  const getHarmonicCompatibility = (trackKey: string, targetKey: string): 'perfect' | 'good' | 'caution' | 'clash' => {
    if (!trackKey || !targetKey) return 'caution'

    const track1Camelot = keyToCamelot(trackKey)
    const track2Camelot = keyToCamelot(targetKey)

    if (!track1Camelot || !track2Camelot) return 'caution'

    // Extract number and letter from Camelot notation (e.g., "8A" -> num: 8, mode: "A")
    const track1Num = parseInt(track1Camelot)
    const track1Mode = track1Camelot.slice(-1)
    const track2Num = parseInt(track2Camelot)
    const track2Mode = track2Camelot.slice(-1)

    // Perfect matches - same key or relative major/minor
    if (track1Camelot === track2Camelot) return 'perfect'
    if (track1Num === track2Num && track1Mode !== track2Mode) return 'perfect'

    // Good matches - adjacent keys (±1 on wheel)
    const adjacentKeys = [
      ((track1Num % 12) + 1).toString() + track1Mode,
      ((track1Num + 10) % 12 + 1).toString() + track1Mode
    ]
    if (adjacentKeys.includes(track2Camelot)) return 'good'

    // Caution - 2 steps away or mode mismatch with adjacent
    const cautionKeys = [
      ((track1Num % 12) + 1).toString() + (track1Mode === 'A' ? 'B' : 'A'),
      ((track1Num + 10) % 12 + 1).toString() + (track1Mode === 'A' ? 'B' : 'A')
    ]
    if (cautionKeys.includes(track2Camelot)) return 'caution'

    return 'clash'
  }

  // 🎧 BPM MATCHING - Professional Tempo Compatibility
  const getBpmCompatibility = (bpm1: number, bpm2: number): 'perfect' | 'good' | 'stretch' | 'difficult' => {
    if (!bpm1 || !bpm2) return 'difficult'

    const ratio = Math.max(bpm1, bpm2) / Math.min(bpm1, bpm2)

    if (ratio <= 1.02) return 'perfect' // Within 2%
    if (ratio <= 1.06) return 'good'    // Within 6%
    if (ratio <= 1.12) return 'stretch' // Within 12% - pitch riding needed
    return 'difficult'                  // Requires major tempo adjustment
  }

  // 🎧 ENERGY PROGRESSION - Smart Energy Flow Analysis
  // const getEnergyProgression = (currentEnergy: number, nextEnergy: number): 'perfect' | 'build' | 'drop' | 'clash' => {
  //   if (!currentEnergy || !nextEnergy) return 'clash'
  //   const diff = nextEnergy - currentEnergy
  //   if (Math.abs(diff) <= 5) return 'perfect'  // Smooth flow
  //   if (diff > 5 && diff <= 15) return 'build' // Energy building
  //   if (diff < -5 && diff >= -15) return 'drop' // Controlled drop
  //   return 'clash'                              // Too dramatic
  // }

  const keyToCamelot = (key: string): string => {
    if (!key) return ''

    const keyMap: { [key: string]: string } = {
      // Major keys
      'C': '8B', 'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B', 'B': '1B',
      'F#': '2B', 'Gb': '2B', 'C#': '3B', 'Db': '3B', 'G#': '4B', 'Ab': '4B',
      'D#': '5B', 'Eb': '5B', 'A#': '6B', 'Bb': '6B', 'F': '7B',

      // Minor keys
      'Am': '8A', 'Em': '9A', 'Bm': '10A', 'F#m': '11A', 'Gbm': '11A',
      'C#m': '12A', 'Dbm': '12A', 'G#m': '1A', 'Abm': '1A',
      'D#m': '2A', 'Ebm': '2A', 'A#m': '3A', 'Bbm': '3A', 'Fm': '4A',
      'Cm': '5A', 'Gm': '6A', 'Dm': '7A'
    }

    // Clean up the key string and try different formats
    const cleanKey = key.trim()

    // Try exact match first
    if (keyMap[cleanKey]) {
      return keyMap[cleanKey]
    }

    // Try with different case variations
    const variations = [
      cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1).toLowerCase(),
      cleanKey.toLowerCase(),
      cleanKey.toUpperCase()
    ]

    for (const variation of variations) {
      if (keyMap[variation]) {
        return keyMap[variation]
      }
    }

    // Try to parse complex key signatures like "C major" or "A minor"
    const majorMatch = cleanKey.match(/([A-G][#b]?)\s*(?:maj|major)/i)
    if (majorMatch) {
      const baseKey = majorMatch[1].charAt(0).toUpperCase() + majorMatch[1].slice(1)
      if (keyMap[baseKey]) return keyMap[baseKey]
    }

    const minorMatch = cleanKey.match(/([A-G][#b]?)\s*(?:min|minor)/i)
    if (minorMatch) {
      const baseKey = minorMatch[1].charAt(0).toUpperCase() + minorMatch[1].slice(1) + 'm'
      if (keyMap[baseKey]) return keyMap[baseKey]
    }

    return ''
  }

  const getBpmColor = (bpm: number) => {
    if (bpm >= 140) return 'text-red-400' // High energy
    if (bpm >= 120) return 'text-orange-400' // House/Dance
    if (bpm >= 100) return 'text-yellow-400' // Medium tempo
    if (bpm >= 80) return 'text-green-400' // Hip-hop/R&B
    return 'text-blue-400' // Slow/Ballad
  }

  const getMetadataQuality = (track: Track) => {
    // Check if track has rich metadata (likely from file tags)
    const hasRichMetadata = !!(track.album || track.genre || track.year || track.albumArtist)
    const hasBasicMetadata = !!(track.title && track.artist)

    if (hasRichMetadata) {
      return { quality: 'high', label: 'Tagged', color: 'bg-green-900/30 text-green-400 border-green-700' }
    } else if (hasBasicMetadata) {
      return { quality: 'medium', label: 'Basic', color: 'bg-blue-900/30 text-blue-400 border-blue-700' }
    } else {
      return { quality: 'low', label: 'Filename', color: 'bg-gray-700 text-gray-400 border-gray-600' }
    }
  }

  const handleDeleteClick = () => {
    if (selectedTracks.length > 0) {
      setShowDeleteDialog(true)
    }
  }

  const handleDeleteConfirm = async (deleteFiles: boolean) => {
    try {
      if (window.electronAPI) {
        // Desktop app - call Electron IPC
        await window.electronAPI.deleteTracks(selectedTracks, deleteFiles)
      } else {
        // Web app - call HTTP API
        console.log(`Would delete ${selectedTracks.length} tracks with deleteFiles=${deleteFiles}`)
      }

      // Reload tracks from database to reflect changes
      await loadTracks()

      // Clear selection after successful delete
      if (onSelectionChange) {
        onSelectionChange([])
      }
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete tracks:', error)
      // Keep dialog open on error so user can retry
    }
  }

  const handlePlayTrack = (track: Track) => {
    const trackIndex = filteredTracks.findIndex(t => t.id === track.id)
    // Use simple approach - call parent callback
    if (onPlayTrack) {
      onPlayTrack(filteredTracks, trackIndex)
    }
  }

  const toggleKeyDisplayMode = () => {
    const newMode = keyDisplayMode === 'musical' ? 'camelot' : 'musical'
    setKeyDisplayMode(newMode)
    localStorage.setItem('keyDisplayMode', newMode)
  }


  // Smart Mix functionality moved to dedicated SmartMix component

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Music Library</h2>
          <p className="text-gray-400">
            {loading ? 'Loading...' : (
              <>
                {filteredTracks.length === tracks.length
                  ? `${tracks.length} tracks`
                  : `${filteredTracks.length} of ${tracks.length} tracks`}
                {tracks.length > 0 && (
                  <span className="ml-4 text-sm">
                    • {tracks.filter(t => t.bpm || t.key).length} analyzed (BPM/Key/Energy)
                    • {tracks.filter(t => !t.bpm && !t.key).length} pending analysis
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* DJ Analysis Stats */}
          <div className="hidden lg:flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>{tracks.filter(t => t.bpm && t.key && t.energy).length} DJ Ready</span>
            </div>
            <div className="flex items-center space-x-1 text-yellow-400">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              <span>{tracks.filter(t => (t.bpm || t.key) && !(t.bpm && t.key && t.energy)).length} Partial</span>
            </div>
            <div className="flex items-center space-x-1 text-red-400">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              <span>{tracks.filter(t => !t.bpm && !t.key).length} Unanalyzed</span>
            </div>
          </div>

          {/* Key Display Mode Toggle */}
          <div className="flex bg-gray-700 rounded-md p-1">
            <button
              onClick={toggleKeyDisplayMode}
              className="px-3 py-1 rounded text-xs font-medium transition-colors bg-purple-600 hover:bg-purple-700 text-white"
              title={`Switch to ${keyDisplayMode === 'musical' ? 'Camelot' : 'Musical'} keys`}
            >
              {keyDisplayMode === 'musical' ? '♭♯' : '8A'}
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-700 rounded-md p-1">
            <button
              onClick={() => setViewMode('compact')}
              className={clsx(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                viewMode === 'compact'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
              title="Compact List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
              title="Grid View"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSelectAll}
              disabled={filteredTracks.length === 0}
              className={clsx(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                filteredTracks.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              {selectedTracks.length === filteredTracks.length && filteredTracks.length > 0 ? (
                <CheckSquare className="h-4 w-4 inline mr-1" />
              ) : (
                <Square className="h-4 w-4 inline mr-1" />
              )}
              {selectedTracks.length === filteredTracks.length && filteredTracks.length > 0 ? 'Deselect' : 'Select All'}
            </button>

            {selectedTracks.length > 0 && (
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <Trash2 className="h-4 w-4 inline mr-2" />
                Delete ({selectedTracks.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tracks, artists, or genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

      </div>

      {/* Track Display - Conditional View */}
      {viewMode === 'compact' ? (
        /* Compact List View */
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div
              className="flex gap-3 px-4 py-2 bg-gray-700 text-xs font-medium text-gray-300 min-w-[800px]"
              style={{ userSelect: isResizing ? 'none' : 'auto' }}
            >
              <div style={{ width: columnWidths.checkbox }} className="flex-shrink-0">✓</div>
              <div
                style={{ width: columnWidths.play }}
                className="flex-shrink-0 relative group"
              >
                <span>▶</span>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => handleResizeStart('play', e)}
                />
              </div>
              <div style={{ width: columnWidths.expand }} className="flex-shrink-0"></div>
              <div
                style={{ width: columnWidths.track }}
                className="flex-shrink-0 relative group"
              >
                <span>Track</span>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => handleResizeStart('track', e)}
                />
              </div>
              <div
                style={{ width: columnWidths.artist }}
                className="flex-shrink-0 relative group"
              >
                <span>Artist</span>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => handleResizeStart('artist', e)}
                />
              </div>
              <div
                style={{ width: columnWidths.bpm }}
                className="flex-shrink-0 relative group"
              >
                <span>BPM</span>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => handleResizeStart('bpm', e)}
                />
              </div>
              <div
                style={{ width: columnWidths.key }}
                className="flex-shrink-0 relative group"
              >
                <span>Key</span>
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => handleResizeStart('key', e)}
                />
              </div>
              <div style={{ width: columnWidths.energy }} className="flex-shrink-0">⚡</div>
          </div>

            <div className="divide-y divide-gray-700">
              {loading ? (
                <div className="text-center py-8 text-gray-400">
                  <Music className="h-8 w-8 mx-auto mb-2 opacity-50 animate-spin" />
                  <p className="text-sm">Loading tracks...</p>
                </div>
              ) : filteredTracks.map((track) => (
              <React.Fragment key={track.id}>
                {/* Main Track Row */}
                <div
                  className={clsx(
                    'flex gap-3 px-4 py-2 hover:bg-gray-700 transition-colors text-sm min-w-[800px]',
                    selectedTracks.includes(track.id) && 'bg-primary-900/20'
                  )}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                >
                  <div className="flex items-center flex-shrink-0" style={{ width: columnWidths.checkbox }}>
                    <input
                      type="checkbox"
                      checked={selectedTracks.includes(track.id)}
                      onChange={() => toggleTrackSelection(track.id)}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500 w-3 h-3"
                    />
                  </div>

                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: columnWidths.play }}>
                    <button
                      onClick={() => handlePlayTrack(track)}
                      className="p-1 text-gray-400 hover:text-primary-400 transition-colors"
                      title="Play track"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center flex-shrink-0" style={{ width: columnWidths.expand }}>
                    {track.stemSeparation && track.stemSeparation.stems && track.stemSeparation.stems.length > 0 ? (
                      <button
                        onClick={() => toggleTrackExpansion(track.id)}
                        className="p-1 text-gray-400 hover:text-primary-400 transition-colors"
                        title={expandedTracks.includes(track.id) ? "Hide stem files (vocals, drums, bass, etc.)" : "Show available stem files (vocals, drums, bass, etc.)"}
                      >
                        {expandedTracks.includes(track.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                    ) : track.stemSeparation && track.stemSeparation.status === 'processing' ? (
                      <div className="flex items-center" title="Stem separation in progress - extracting vocals, drums, bass, and other instruments">
                        <Layers className="h-3 w-3 text-yellow-400 animate-pulse" />
                      </div>
                    ) : track.stemSeparation && track.stemSeparation.status === 'pending' ? (
                      <div className="flex items-center" title="Stem separation queued - will extract vocals, drums, bass, and other instruments">
                        <Layers className="h-3 w-3 text-gray-500" />
                      </div>
                    ) : (
                      <div className="w-3"></div>
                    )}
                  </div>

                  <div className="flex items-center min-w-0 flex-shrink-0" style={{ width: columnWidths.track }}>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-sm flex items-center gap-2">
                        {track.title}

                        {/* Metadata Quality Badge */}
                        {(() => {
                          const quality = getMetadataQuality(track)
                          return (
                            <span className={`px-1.5 py-0.5 text-xs rounded border ${quality.color} flex-shrink-0`}>
                              {quality.label}
                            </span>
                          )
                        })()}

                        {/* 🎧 DJ READINESS INDICATORS */}
                        {track.bpm && track.key && track.energy && (
                          <span
                            className="ml-2 px-1 py-0.5 bg-green-900/30 border border-green-600 rounded text-xs font-bold text-green-300"
                            title="DJ Ready: BPM, Key, and Energy analyzed"
                          >
                            ★ DJ READY
                          </span>
                        )}
                        {track.stemSeparation && track.stemSeparation.stems && track.stemSeparation.stems.length > 0 && (
                          <span
                            className="ml-2 px-1 py-0.5 bg-purple-900/30 border border-purple-600 rounded text-xs font-bold text-purple-300"
                            title={`${track.stemSeparation.stems.length} stems available: ${track.stemSeparation.stems.map(s => s.type).join(', ')}`}
                          >
                            {track.stemSeparation.stems.length} STEMS
                          </span>
                        )}
                        {/* Harmonic Series Indicator */}
                        {track.key && track.camelotKey && (
                          <span
                            className="ml-2 text-xs text-purple-400"
                            title={`Harmonic series: ${track.camelotKey} family`}
                          >
                            ♫
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate flex items-center">
                        {track.album && `${track.album} • `}{track.genre || 'Unknown Genre'}
                        {track.stemSeparation && track.stemSeparation.status === 'processing' && (
                          <span className="ml-2 text-yellow-400">
                            • Processing stems {track.stemSeparation.progress}%
                          </span>
                        )}
                        {/* Duration with DJ time format */}
                        {track.duration && (
                          <span className="ml-2 text-gray-500">
                            • {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                        {/* DJ Suitability Score */}
                        {track.bpm && track.bpm > 60 && track.energy !== undefined && track.energy !== null && track.energy >= 1 && (
                          <span
                            className={clsx('ml-2 text-xs',
                              track.energy >= 70 && track.bpm >= 120 ? 'text-green-400' :
                              track.energy >= 50 && track.bpm >= 100 ? 'text-yellow-400' : 'text-blue-400'
                            )}
                            title={`DJ Suitability: ${track.energy >= 70 && track.bpm >= 120 ? 'High Energy' : track.energy >= 50 && track.bpm >= 100 ? 'Medium Energy' : 'Low Energy'}`}
                          >
                            • {track.energy >= 70 && track.bpm >= 120 ? '🔥 Peak Time' : track.energy >= 50 && track.bpm >= 100 ? '🎆 Main Floor' : '🎵 Ambient'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-300 truncate text-sm flex-shrink-0" style={{ width: columnWidths.artist }}>{track.artist}</div>

                  <div className="flex items-center flex-shrink-0" style={{ width: columnWidths.bpm }}>
                    {track.bpm && (
                      <div className="flex items-center space-x-1">
                        <span className={clsx('font-medium text-xs', getBpmColor(track.bpm))}>{track.bpm}</span>
                        {/* BPM Compatibility Indicator */}
                        {selectedTracks?.length === 1 && selectedTracks?.[0] !== track.id && (() => {
                          const selectedTrack = tracks.find(t => t.id === selectedTracks?.[0])
                          if (selectedTrack?.bpm && track.bpm) {
                            const compatibility = getBpmCompatibility(selectedTrack.bpm, track.bpm)
                            const compatColors = {
                              perfect: 'text-green-400',
                              good: 'text-yellow-400',
                              stretch: 'text-orange-400',
                              difficult: 'text-red-400'
                            }
                            return (
                              <span
                                className={clsx('text-xs', compatColors[compatibility])}
                                title={`BPM compatibility: ${compatibility} (${Math.abs(selectedTrack.bpm - track.bpm)} BPM diff)`}
                              >
                                {compatibility === 'perfect' ? '★' : compatibility === 'good' ? '◐' : compatibility === 'stretch' ? '◯' : '✕'}
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-shrink-0" style={{ width: columnWidths.key }}>
                    {(keyDisplayMode === 'camelot' ? track.camelotKey : track.key) && (
                      <div className="flex items-center space-x-1">
                        <span className="px-1 py-0.5 bg-purple-900/30 border border-purple-600 rounded text-xs font-bold text-purple-300">
                          {keyDisplayMode === 'camelot' ? track.camelotKey : track.key}
                        </span>
                        {/* Harmonic Mixing Indicator - shows if compatible with previously selected track */}
                        {selectedTracks?.length === 1 && selectedTracks?.[0] !== track.id && (() => {
                          const selectedTrack = tracks.find(t => t.id === selectedTracks?.[0])
                          if (selectedTrack?.key && track.key) {
                            const compatibility = getHarmonicCompatibility(selectedTrack.key, track.key)
                            const compatColors = {
                              perfect: 'text-green-400',
                              good: 'text-yellow-400',
                              caution: 'text-orange-400',
                              clash: 'text-red-400'
                            }
                            return (
                              <span
                                className={clsx('text-xs', compatColors[compatibility])}
                                title={`Harmonic compatibility with selected track: ${compatibility}`}
                              >
                                {compatibility === 'perfect' ? '★' : compatibility === 'good' ? '◐' : compatibility === 'caution' ? '◯' : '✕'}
                              </span>
                            )
                          }
                          return null
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-shrink-0" style={{ width: columnWidths.energy }}>
                    {track.energy ? (
                      <div className="flex items-center space-x-1" title={`Energy Level: ${track.energy}/100`}>
                        <div className="w-6 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all',
                              track.energy >= 80 ? 'bg-red-400' :
                              track.energy >= 60 ? 'bg-yellow-400' : 'bg-green-400'
                            )}
                            style={{ width: `${track.energy}%` }}
                          />
                        </div>
                        <span className={clsx('font-medium text-xs', getEnergyColor(track.energy))}>{track.energy}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-xs">-</span>
                    )}
                  </div>
                </div>

                {/* Expanded Stems Section */}
                {expandedTracks.includes(track.id) && track.stemSeparation && track.stemSeparation.stems && (
                  <div className="bg-gray-900 border-l-4 border-purple-500">
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-2 flex items-center">
                        <Layers className="h-3 w-3 mr-1" />
                        Separated Stems ({track.stemSeparation.stems.length})
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {track.stemSeparation.stems.map((stem, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 p-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors cursor-pointer"
                            title={`Play ${stem.type} stem`}
                          >
                            <span className="text-sm">{getStemTypeIcon(stem.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className={clsx('text-xs font-medium capitalize', getStemTypeColor(stem.type))}>
                                {stem.type}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {stem.status === 'completed' ? 'Ready' : stem.status}
                              </div>
                            </div>
                            <button
                              className="p-1 text-gray-400 hover:text-primary-400 transition-colors"
                              title={`Play ${stem.type} stem`}
                            >
                              <Play className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {!loading && filteredTracks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No tracks found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try adjusting your search query</p>
              )}
            </div>
          )}
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-700 text-sm font-medium text-gray-300">
            <div className="col-span-1">Select</div>
            <div className="col-span-1">Play</div>
            <div className="col-span-4">Track</div>
            <div className="col-span-3">Artist</div>
            <div className="col-span-1">BPM</div>
            <div className="col-span-1">Key</div>
            <div className="col-span-1">Energy</div>
          </div>

          <div className="divide-y divide-gray-700">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Loading tracks...</p>
              </div>
            ) : filteredTracks.map((track) => (
              <div
                key={track.id}
                className={clsx(
                  'grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-700 transition-colors',
                  selectedTracks.includes(track.id) && 'bg-primary-900/20'
                )}
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedTracks.includes(track.id)}
                    onChange={() => toggleTrackSelection(track.id)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                  />
                </div>

                <div className="col-span-1">
                  <button
                    onClick={() => handlePlayTrack(track)}
                    className="p-2 text-gray-400 hover:text-primary-400 transition-colors"
                    title="Play track"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                </div>

                <div className="col-span-4">
                  <div className="flex items-center space-x-3">
                    <Music className="h-4 w-4 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{track.title}</div>
                      {track.album && (
                        <div className="text-sm text-gray-400 truncate">{track.album}</div>
                      )}
                      {track.genre && (
                        <div className="text-xs text-gray-500 truncate">{track.genre}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-3 text-gray-300 truncate">{track.artist}</div>

                <div className="col-span-1">
                  {track.bpm && (
                    <div className="flex items-center space-x-1">
                      <span className={clsx('font-medium', getBpmColor(track.bpm))}>{track.bpm}</span>
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  {(keyDisplayMode === 'camelot' ? track.camelotKey : track.key) && (
                    <div className="flex items-center space-x-1">
                      <Key className="h-3 w-3 text-purple-400" />
                      <span className="text-xs font-medium">
                        {keyDisplayMode === 'camelot' ? track.camelotKey : track.key}
                      </span>
                    </div>
                  )}
                </div>

                <div className="col-span-1">
                  {track.energy ? (
                    <div className="flex items-center space-x-1">
                      <Zap className={clsx('h-3 w-3', getEnergyColor(track.energy))} />
                      <span className={clsx('font-medium text-xs', getEnergyColor(track.energy))}>{track.energy}</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs">-</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!loading && filteredTracks.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tracks found</p>
              {searchQuery && (
                <p className="text-sm mt-2">Try adjusting your search query</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Trash2 className="h-5 w-5 mr-2 text-red-400" />
                Delete Tracks
              </h3>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              You are about to delete {selectedTracks.length} track{selectedTracks.length > 1 ? 's' : ''}.
              Choose how you want to proceed:
            </p>

            <div className="space-y-4 mb-6">
              <button
                onClick={() => handleDeleteConfirm(false)}
                className="w-full p-4 bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-600 rounded-lg text-left transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <FolderMinus className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-200">Remove from Library</div>
                    <div className="text-sm text-yellow-300/80">
                      Remove tracks from CleanCue but keep files on disk
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleDeleteConfirm(true)}
                className="w-full p-4 bg-red-900/20 hover:bg-red-900/30 border border-red-600 rounded-lg text-left transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <Trash2 className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-200">Delete Files Permanently</div>
                    <div className="text-sm text-red-300/80">
                      Remove from library AND delete files from disk (cannot be undone)
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEM Separation Dialog - Disabled: not implemented in simple engine
      {showStemSeparationDialog && (
        <StemSeparationDialog
          isOpen={showStemSeparationDialog}
          onClose={() => setShowStemSeparationDialog(false)}
          selectedTracks={filteredTracks.filter(track => selectedTracks.includes(track.id))}
        />
      )}
      */}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded-md shadow-lg py-2 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 text-sm border-b border-gray-700">
            <div className="font-medium text-white mb-1">{contextMenu.track.title}</div>
            <div className="text-xs text-gray-400">{contextMenu.track.artist}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-gray-400 mb-1">File Path:</div>
            <div className="text-xs text-white font-mono break-all max-w-md">
              {contextMenu.track.path}
            </div>
          </div>
          <div className="border-t border-gray-700"></div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.track.path)
              setContextMenu(null)
            }}
            className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 flex items-center"
          >
            <Info className="h-4 w-4 mr-2" />
            Copy File Path
          </button>
        </div>
      )}

    </div>
  )
}