import React, { useState, useEffect } from 'react'
import { Download, Play, Music, Key, Zap, Trash2, FolderMinus, X, CheckSquare, Square, BarChart3, Music2, List, Grid3X3, ChevronRight, ChevronDown, Layers } from 'lucide-react'
import clsx from 'clsx'
import { ExportDialog } from './ExportDialog'
import { StemSeparationDialog } from './StemSeparationDialog'

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
  genre?: string
  year?: number
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
}

export function LibraryView({ onPlayTrack }: LibraryViewProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showStemSeparationDialog, setShowStemSeparationDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'compact' | 'grid'>('compact')
  const [expandedTracks, setExpandedTracks] = useState<string[]>([])

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      setLoading(true)
      if (window.electronAPI) {
        const dbTracks = await window.electronAPI.getAllTracks()
        console.log(`🔍 UI DEBUG - Received ${dbTracks.length} tracks from database`)

        // Log first track for debugging
        if (dbTracks.length > 0) {
          console.log(`🔍 UI DEBUG - First track from DB:`, {
            id: dbTracks[0].id,
            title: dbTracks[0].title,
            artist: dbTracks[0].artist,
            bpm: dbTracks[0].bpm,
            key: dbTracks[0].key,
            energy: dbTracks[0].energy,
            path: dbTracks[0].path
          })
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

          // Add mock stem data for testing (TODO: Remove when real stem data is implemented)
          if (converted.id && Math.random() > 0.7) {
            converted.stemSeparation = {
              status: 'completed',
              progress: 100,
              stems: [
                { type: 'vocals', path: '/stems/vocals.wav', status: 'completed' },
                { type: 'drums', path: '/stems/drums.wav', status: 'completed' },
                { type: 'bass', path: '/stems/bass.wav', status: 'completed' },
                { type: 'other', path: '/stems/other.wav', status: 'completed' }
              ]
            }
          } else if (converted.id && Math.random() > 0.8) {
            converted.stemSeparation = {
              status: 'processing',
              progress: Math.floor(Math.random() * 80) + 10
            }
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
    setSelectedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedTracks.length === filteredTracks.length) {
      // All tracks are selected, deselect all
      setSelectedTracks([])
    } else {
      // Not all tracks are selected, select all
      setSelectedTracks(filteredTracks.map(track => track.id))
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
      setSelectedTracks([])
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete tracks:', error)
      // Keep dialog open on error so user can retry
    }
  }

  const handlePlayTrack = (track: Track) => {
    if (onPlayTrack) {
      const trackIndex = filteredTracks.findIndex(t => t.id === track.id)
      onPlayTrack(filteredTracks, trackIndex)
    }
  }

  const handleAnalyzeClick = async () => {
    if (selectedTracks.length === 0) return

    console.log('Starting analysis for tracks:', selectedTracks)

    try {
      if (window.electronAPI) {
        console.log('Calling engineAnalyze...')
        const result = await window.electronAPI.engineAnalyze(selectedTracks)
        console.log('Analysis result:', result)
        // Reload tracks to show updated analysis data
        await loadTracks()
        console.log('Tracks reloaded after analysis')
      } else {
        console.error('electronAPI not available')
      }
    } catch (error) {
      console.error('Failed to analyze tracks:', error)
    }
  }

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

          <button
            onClick={toggleSelectAll}
            disabled={filteredTracks.length === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              filteredTracks.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {selectedTracks.length === filteredTracks.length && filteredTracks.length > 0 ? (
              <CheckSquare className="h-4 w-4 inline mr-2" />
            ) : (
              <Square className="h-4 w-4 inline mr-2" />
            )}
            {selectedTracks.length === filteredTracks.length && filteredTracks.length > 0 ? 'Deselect All' : 'Select All'}
          </button>

          <button
            onClick={handleAnalyzeClick}
            disabled={selectedTracks.length === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedTracks.length > 0
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
            title="Analyze selected tracks for BPM, key, and energy"
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Analyze & Update ({selectedTracks.length})
          </button>

          <button
            onClick={() => setShowStemSeparationDialog(true)}
            disabled={selectedTracks.length === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedTracks.length > 0
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
            title="Separate selected tracks into stems (vocals, drums, bass, other)"
          >
            <Music2 className="h-4 w-4 inline mr-2" />
            STEM Separation ({selectedTracks.length})
          </button>

          <button
            onClick={handleDeleteClick}
            disabled={selectedTracks.length === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedTracks.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Delete ({selectedTracks.length})
          </button>

          <button
            onClick={() => setShowExportDialog(true)}
            disabled={selectedTracks.length === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedTracks.length > 0
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            <Download className="h-4 w-4 inline mr-2" />
            Export ({selectedTracks.length})
          </button>
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
          <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-700 text-xs font-medium text-gray-300">
            <div className="col-span-1">✓</div>
            <div className="col-span-1">▶</div>
            <div className="col-span-1"></div>
            <div className="col-span-4">Track</div>
            <div className="col-span-2">Artist</div>
            <div className="col-span-1">BPM</div>
            <div className="col-span-1">Key</div>
            <div className="col-span-1">⚡</div>
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
                    'grid grid-cols-12 gap-4 px-4 py-2 hover:bg-gray-700 transition-colors text-sm',
                    selectedTracks.includes(track.id) && 'bg-primary-900/20'
                  )}
                >
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTracks.includes(track.id)}
                      onChange={() => toggleTrackSelection(track.id)}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500 w-3 h-3"
                    />
                  </div>

                  <div className="col-span-1 flex items-center">
                    <button
                      onClick={() => handlePlayTrack(track)}
                      className="p-1 text-gray-400 hover:text-primary-400 transition-colors"
                      title="Play track"
                    >
                      <Play className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="col-span-1 flex items-center">
                    {track.stemSeparation && track.stemSeparation.stems && track.stemSeparation.stems.length > 0 ? (
                      <button
                        onClick={() => toggleTrackExpansion(track.id)}
                        className="p-1 text-gray-400 hover:text-primary-400 transition-colors"
                        title={expandedTracks.includes(track.id) ? "Hide stems" : "Show stems"}
                      >
                        {expandedTracks.includes(track.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                    ) : track.stemSeparation && track.stemSeparation.status === 'processing' ? (
                      <div className="flex items-center">
                        <Layers className="h-3 w-3 text-yellow-400 animate-pulse" />
                      </div>
                    ) : track.stemSeparation && track.stemSeparation.status === 'pending' ? (
                      <div className="flex items-center">
                        <Layers className="h-3 w-3 text-gray-500" />
                      </div>
                    ) : (
                      <div className="w-3"></div>
                    )}
                  </div>

                  <div className="col-span-4 flex items-center min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-sm flex items-center">
                        {track.title}
                        {track.stemSeparation && track.stemSeparation.stems && track.stemSeparation.stems.length > 0 && (
                          <span className="ml-2 px-1 py-0.5 bg-purple-900/30 border border-purple-600 rounded text-xs font-bold text-purple-300">
                            STEMS
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {track.album && `${track.album} • `}{track.genre || 'Unknown Genre'}
                        {track.stemSeparation && track.stemSeparation.status === 'processing' && (
                          <span className="ml-2 text-yellow-400">
                            • Processing stems {track.stemSeparation.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center text-gray-300 truncate text-sm">{track.artist}</div>

                  <div className="col-span-1 flex items-center">
                    {track.bpm && (
                      <span className={clsx('font-medium text-xs', getBpmColor(track.bpm))}>{track.bpm}</span>
                    )}
                  </div>

                  <div className="col-span-1 flex items-center">
                    {track.camelotKey && (
                      <span className="px-1 py-0.5 bg-purple-900/30 border border-purple-600 rounded text-xs font-bold text-purple-300">
                        {track.camelotKey}
                      </span>
                    )}
                  </div>

                  <div className="col-span-1 flex items-center">
                    {track.energy ? (
                      <span className={clsx('font-medium text-xs', getEnergyColor(track.energy))}>{track.energy}</span>
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
                  {track.key && (
                    <div className="flex items-center space-x-1">
                      <Key className="h-3 w-3 text-purple-400" />
                      <span className="text-xs font-medium">{track.key}</span>
                    </div>
                  )}
                  {track.camelotKey && (
                    <div className="mt-1 px-1 py-0.5 bg-purple-900/30 border border-purple-600 rounded text-xs font-bold text-purple-300 text-center">
                      {track.camelotKey}
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

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          onClose={() => setShowExportDialog(false)}
          selectedTracks={selectedTracks}
        />
      )}

      {/* STEM Separation Dialog */}
      {showStemSeparationDialog && (
        <StemSeparationDialog
          isOpen={showStemSeparationDialog}
          onClose={() => setShowStemSeparationDialog(false)}
          selectedTracks={filteredTracks.filter(track => selectedTracks.includes(track.id))}
        />
      )}

    </div>
  )
}