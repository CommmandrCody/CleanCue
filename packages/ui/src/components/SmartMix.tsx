import { useState, useEffect } from 'react'
import { Music, Zap, RefreshCw, FileAudio, X, Plus } from 'lucide-react'
import clsx from 'clsx'

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  duration?: number
  bpm?: number
  key?: string
  camelotKey?: string
  energy?: number
}

interface MixTrack {
  track: Track
  order: number
  harmonicCompatibility?: 'perfect' | 'good' | 'fair' | 'poor'
  bpmCompatibility?: 'perfect' | 'good' | 'fair' | 'poor'
  transitionScore?: number
}

interface SmartMixResult {
  id: string
  name: string
  tracks: MixTrack[]
  totalCompatibility: number
  harmonicMatches: number
  bpmMatches: number
  createdAt: number
}

export function SmartMix() {
  const [availableTracks, setAvailableTracks] = useState<Track[]>([])
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [generatedMixes, setGeneratedMixes] = useState<SmartMixResult[]>([])
  const [showTrackSelection, setShowTrackSelection] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Load available tracks from library
  const loadTracks = async () => {
    setLoadingTracks(true)
    try {
      if (window.electronAPI) {
        const tracks = await window.electronAPI.getAllTracks()
        if (Array.isArray(tracks)) {
          // Filter tracks that have analysis data
          const analyzedTracks = tracks.filter(track => track.bpm && track.key && track.energy)
          setAvailableTracks(analyzedTracks)
        } else {
          console.log('[UI] SmartMix: Failed to load tracks - not an array:', tracks)
          setAvailableTracks([])
        }
      }
    } catch (error) {
      console.error('[UI] SmartMix: Failed to load tracks:', error)
    } finally {
      setLoadingTracks(false)
    }
  }

  // Handle track selection
  const handleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(trackId)) {
        newSelection.delete(trackId)
      } else {
        newSelection.add(trackId)
      }
      return newSelection
    })
  }

  // Harmonic compatibility calculation
  const getHarmonicCompatibility = (key1: string, key2: string): 'perfect' | 'good' | 'fair' | 'poor' => {
    // Simplified harmonic mixing - in real app would use Camelot wheel
    const harmonicKeys = {
      'C': ['C', 'G', 'F', 'Am', 'Em', 'Dm'],
      'G': ['G', 'D', 'C', 'Em', 'Bm', 'Am'],
      'D': ['D', 'A', 'G', 'Bm', 'F#m', 'Em'],
      'A': ['A', 'E', 'D', 'F#m', 'C#m', 'Bm'],
      'E': ['E', 'B', 'A', 'C#m', 'G#m', 'F#m'],
      'B': ['B', 'F#', 'E', 'G#m', 'D#m', 'C#m'],
      'F#': ['F#', 'C#', 'B', 'D#m', 'A#m', 'G#m'],
      'C#': ['C#', 'G#', 'F#', 'A#m', 'Fm', 'D#m'],
      'F': ['F', 'C', 'Bb', 'Dm', 'Am', 'Gm'],
      'Bb': ['Bb', 'F', 'Eb', 'Gm', 'Dm', 'Cm'],
      'Eb': ['Eb', 'Bb', 'Ab', 'Cm', 'Gm', 'Fm'],
      'Ab': ['Ab', 'Eb', 'Db', 'Fm', 'Cm', 'Bbm']
    }

    const key1Clean = key1.replace('m', '')

    if (key1 === key2) return 'perfect'
    if (harmonicKeys[key1Clean as keyof typeof harmonicKeys]?.includes(key2)) return 'good'
    return 'fair'
  }

  // BPM compatibility calculation
  const getBpmCompatibility = (bpm1: number, bpm2: number): 'perfect' | 'good' | 'fair' | 'poor' => {
    const diff = Math.abs(bpm1 - bpm2)
    if (diff === 0) return 'perfect'
    if (diff <= 3) return 'good'
    if (diff <= 6) return 'fair'
    return 'poor'
  }

  // Generate smart mix
  const generateSmartMix = async () => {
    if (selectedTracks.size < 2) {
      alert('Select at least 2 tracks to generate a smart mix')
      return
    }

    setIsGenerating(true)
    try {
      const selectedTrackObjects = availableTracks.filter(track => selectedTracks.has(track.id))

      // Sort tracks by energy and BPM for optimal flow
      const sortedTracks = [...selectedTrackObjects].sort((a, b) => {
        const energyDiff = a.energy! - b.energy!
        if (Math.abs(energyDiff) > 5) return energyDiff
        return a.bpm! - b.bpm!
      })

      // Calculate transition scores
      const mixTracks: MixTrack[] = sortedTracks.map((track, index) => {
        let harmonicCompatibility: 'perfect' | 'good' | 'fair' | 'poor' | undefined
        let bpmCompatibility: 'perfect' | 'good' | 'fair' | 'poor' | undefined
        let transitionScore = 0

        if (index < sortedTracks.length - 1) {
          const nextTrack = sortedTracks[index + 1]
          harmonicCompatibility = getHarmonicCompatibility(track.key!, nextTrack.key!)
          bpmCompatibility = getBpmCompatibility(track.bpm!, nextTrack.bpm!)

          // Calculate transition score (0-100)
          const harmonicScore = harmonicCompatibility === 'perfect' ? 50 :
                               harmonicCompatibility === 'good' ? 35 :
                               harmonicCompatibility === 'fair' ? 20 : 10
          const bpmScore = bpmCompatibility === 'perfect' ? 50 :
                          bpmCompatibility === 'good' ? 35 :
                          bpmCompatibility === 'fair' ? 20 : 10
          transitionScore = harmonicScore + bpmScore
        }

        return {
          track,
          order: index + 1,
          harmonicCompatibility,
          bpmCompatibility,
          transitionScore
        }
      })

      // Calculate overall stats
      let harmonicMatches = 0
      let bpmMatches = 0

      for (let i = 0; i < mixTracks.length - 1; i++) {
        const mixTrack = mixTracks[i]
        if (mixTrack.harmonicCompatibility === 'perfect' || mixTrack.harmonicCompatibility === 'good') {
          harmonicMatches++
        }
        if (mixTrack.bpmCompatibility === 'perfect' || mixTrack.bpmCompatibility === 'good') {
          bpmMatches++
        }
      }

      const totalCompatibility = mixTracks.length > 1 ?
        ((harmonicMatches + bpmMatches) / ((mixTracks.length - 1) * 2)) * 100 : 100

      const newMix: SmartMixResult = {
        id: `mix-${Date.now()}`,
        name: `Smart Mix ${generatedMixes.length + 1}`,
        tracks: mixTracks,
        totalCompatibility: Math.round(totalCompatibility),
        harmonicMatches,
        bpmMatches,
        createdAt: Date.now()
      }

      setGeneratedMixes(prev => [newMix, ...prev])
      setSelectedTracks(new Set())
      setShowTrackSelection(false)
    } catch (error) {
      console.error('[UI] SmartMix: Failed to generate mix:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Load tracks on component mount
  useEffect(() => {
    loadTracks()
  }, [])

  const handleAddTracks = () => {
    setShowTrackSelection(true)
  }

  const deleteMix = (mixId: string) => {
    setGeneratedMixes(prev => prev.filter(mix => mix.id !== mixId))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Smart Mix Generator</h2>
          <p className="text-gray-400">Create professional DJ mixes with harmonic and BPM analysis</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAddTracks}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Add Tracks
          </button>

          <button
            onClick={() => loadTracks()}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{availableTracks.length}</div>
          <div className="text-sm text-gray-400">Analyzed Tracks</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{generatedMixes.length}</div>
          <div className="text-sm text-gray-400">Generated Mixes</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">
            {generatedMixes.length > 0 ? Math.round(generatedMixes.reduce((acc, mix) => acc + mix.totalCompatibility, 0) / generatedMixes.length) : 0}%
          </div>
          <div className="text-sm text-gray-400">Avg Compatibility</div>
        </div>
      </div>

      {/* Generated Mixes */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h3 className="font-medium">Generated Mixes ({generatedMixes.length})</h3>
        </div>

        <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
          {generatedMixes.map((mix) => (
            <div key={mix.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-yellow-400" />
                  <div>
                    <div className="font-medium">{mix.name}</div>
                    <div className="text-sm text-gray-400">
                      {mix.tracks.length} tracks • {mix.totalCompatibility}% compatibility
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-400">
                    {new Date(mix.createdAt).toLocaleTimeString()}
                  </div>
                  <button
                    onClick={() => deleteMix(mix.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mix Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="bg-gray-900 rounded p-2 text-center">
                  <div className="text-green-400 font-semibold">{mix.harmonicMatches}/{mix.tracks.length - 1}</div>
                  <div className="text-gray-400">Harmonic</div>
                </div>
                <div className="bg-gray-900 rounded p-2 text-center">
                  <div className="text-blue-400 font-semibold">{mix.bpmMatches}/{mix.tracks.length - 1}</div>
                  <div className="text-gray-400">BPM</div>
                </div>
                <div className="bg-gray-900 rounded p-2 text-center">
                  <div className="text-purple-400 font-semibold">{mix.totalCompatibility}%</div>
                  <div className="text-gray-400">Overall</div>
                </div>
              </div>

              {/* Track List */}
              <div className="space-y-2">
                {mix.tracks.map((mixTrack, index) => (
                  <div key={mixTrack.track.id} className="bg-gray-900 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                          {mixTrack.order}
                        </div>
                        <Music className="h-4 w-4 text-purple-400" />
                        <div>
                          <div className="font-medium">{mixTrack.track.title}</div>
                          <div className="text-sm text-gray-400">{mixTrack.track.artist}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <div className="text-gray-300">{mixTrack.track.bpm} BPM</div>
                        <div className="text-gray-300">{mixTrack.track.key}</div>
                        <div className="text-gray-300">E:{mixTrack.track.energy}</div>
                        {mixTrack.transitionScore !== undefined && (
                          <div className={clsx(
                            'px-2 py-1 rounded text-xs font-semibold',
                            mixTrack.transitionScore >= 80 ? 'bg-green-600' :
                            mixTrack.transitionScore >= 60 ? 'bg-yellow-600' :
                            'bg-red-600'
                          )}>
                            {mixTrack.transitionScore}%
                          </div>
                        )}
                      </div>
                    </div>

                    {index < mix.tracks.length - 1 && (
                      <div className="mt-2 ml-9 text-xs text-gray-500">
                        → Transition: {mixTrack.harmonicCompatibility} harmonic, {mixTrack.bpmCompatibility} BPM
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {generatedMixes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No smart mixes generated</p>
            <p className="text-sm mt-2">Click "Add Tracks" to create your first smart mix</p>
          </div>
        )}
      </div>

      {/* Track Selection Dialog */}
      {showTrackSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Select Tracks for Smart Mix</h3>
              <button
                onClick={() => setShowTrackSelection(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-hidden">
              {loadingTracks ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
                  <span className="ml-3 text-gray-300">Loading analyzed tracks...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-300">
                      {availableTracks.length} analyzed tracks available • {selectedTracks.size} selected
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedTracks(new Set(availableTracks.map(t => t.id)))}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedTracks(new Set())}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-lg max-h-96 overflow-y-auto">
                    {availableTracks.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => handleTrackSelection(track.id)}
                        className={clsx(
                          'p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-700',
                          selectedTracks.has(track.id) ? 'bg-blue-900/30 border-blue-600' : ''
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={clsx(
                            'w-4 h-4 rounded border-2 flex items-center justify-center',
                            selectedTracks.has(track.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-500'
                          )}>
                            {selectedTracks.has(track.id) && (
                              <div className="w-2 h-2 bg-white rounded-sm" />
                            )}
                          </div>
                          <FileAudio className="h-4 w-4 text-purple-400" />
                          <div className="flex-1">
                            <div className="font-medium">{track.title}</div>
                            <div className="text-sm text-gray-400">
                              {track.artist} {track.album && `• ${track.album}`}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <div>{track.bpm} BPM</div>
                            <div>{track.key}</div>
                            <div>E:{track.energy}</div>
                            {track.duration && (
                              <div>
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {availableTracks.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No analyzed tracks found</p>
                        <p className="text-sm mt-2">Run analysis on your tracks first</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                {selectedTracks.size > 0 && `${selectedTracks.size} track${selectedTracks.size === 1 ? '' : 's'} selected`}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTrackSelection(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateSmartMix}
                  disabled={selectedTracks.size < 2 || isGenerating}
                  className={clsx(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    selectedTracks.size >= 2 && !isGenerating
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 inline mr-2" />
                      Generate Smart Mix ({selectedTracks.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}