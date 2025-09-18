import { useState, useEffect } from 'react'
import {
  Waveform,
  Music,
  Mic,
  Drums,
  Guitar,
  Play,
  Pause,
  Download,
  Settings,
  Zap,
  Clock,
  FileAudio,
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  AlertCircle
} from 'lucide-react'
import clsx from 'clsx'

interface StemTrack {
  id: string
  title: string
  artist: string
  path: string
  duration: number
  stemStatus: 'none' | 'processing' | 'completed' | 'error'
  stemProgress?: number
  stems?: {
    vocals: string
    drums: string
    bass: string
    other: string
  }
  processingTime?: number
  lastProcessed?: Date
}

interface StemSettings {
  model: 'demucs-v4-hybrid' | 'demucs-v3' | 'spleeter-4stem' | 'spleeter-2stem'
  outputFormat: 'wav' | 'flac' | 'mp3'
  quality: 'standard' | 'high' | 'ultra'
  autoNormalize: boolean
  outputBitrate?: number
  fileRenaming: {
    enabled: boolean
    namingPattern: 'original-key' | 'original-key-tempo' | 'key-original' | 'key-tempo-original' | 'tempo-key-original'
  }
  keyNotation: {
    primaryNotation: 'camelot' | 'standard' | 'flats' | 'sharps'
    addZeroToSingleDigit: boolean
    extraKeyColumn: 'none' | 'standard' | 'flats' | 'sharps'
    useCamelotInComments: boolean
  }
  djSoftwareIntegration: {
    serato: {
      enabled: boolean
      exportKey: boolean
      exportTitleArtistComment: boolean
      exportCuePoints: boolean
    }
    traktor: {
      enabled: boolean
      exportKey: boolean
      exportTitleArtistComment: boolean
      exportCuePoints: boolean
    }
    rekordbox: {
      enabled: boolean
      exportKey: boolean
      exportTitleArtistComment: boolean
      exportCuePoints: boolean
    }
    overwriteExistingCuePoints: boolean
  }
  stemNaming: {
    includeOriginalName: boolean
    stemSuffix: 'short' | 'long' | 'custom'
    customSuffixes: {
      vocals: string
      drums: string
      bass: string
      other: string
    }
  }
}

const stemModels = [
  {
    id: 'spleeter-2stem',
    name: 'Spleeter 2-Stem',
    description: 'Fast vocals/accompaniment separation',
    stems: ['Vocals', 'Accompaniment'],
    speed: 'Fast',
    quality: 'Good'
  },
  {
    id: 'spleeter-4stem',
    name: 'Spleeter 4-Stem',
    description: 'Vocals, drums, bass, other separation',
    stems: ['Vocals', 'Drums', 'Bass', 'Other'],
    speed: 'Medium',
    quality: 'Good'
  },
  {
    id: 'demucs-v3',
    name: 'Demucs v3',
    description: 'High-quality 4-stem separation',
    stems: ['Vocals', 'Drums', 'Bass', 'Other'],
    speed: 'Slow',
    quality: 'Excellent'
  },
  {
    id: 'demucs-v4',
    name: 'Demucs v4 Hybrid',
    description: 'State-of-the-art quality (requires GPU)',
    stems: ['Vocals', 'Drums', 'Bass', 'Other'],
    speed: 'Very Slow',
    quality: 'Best'
  }
]

const stemIcons = {
  vocals: <Mic className="h-4 w-4" />,
  drums: <Drums className="h-4 w-4" />,
  bass: <Guitar className="h-4 w-4" />,
  other: <Music className="h-4 w-4" />
}

export function StemSeparation() {
  const [tracks, setTracks] = useState<StemTrack[]>([])
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [playingStems, setPlayingStems] = useState<{[key: string]: string}>({})
  const [settings, setSettings] = useState<StemSettings | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.stemGetDefaultSettings()
        if (response.success) {
          setSettings(response.settings)
        } else {
          throw new Error(response.error || 'Failed to load settings')
        }
      }
    } catch (error) {
      console.error('Failed to load STEM settings:', error)
      // Set minimal defaults only if backend fails
      setSettings({
        model: 'htdemucs',
        outputFormat: 'wav',
        quality: 'high',
        autoNormalize: true,
        fileRenaming: { enabled: false, namingPattern: 'original-key' },
        keyNotation: { primaryNotation: 'camelot', addZeroToSingleDigit: false, extraKeyColumn: 'none', useCamelotInComments: false },
        djSoftwareIntegration: {
          serato: { enabled: false, exportKey: false, exportTitleArtistComment: false, exportCuePoints: false },
          traktor: { enabled: false, exportKey: false, exportTitleArtistComment: false, exportCuePoints: false },
          rekordbox: { enabled: false, exportKey: false, exportTitleArtistComment: false, exportCuePoints: false },
          overwriteExistingCuePoints: false
        },
        stemNaming: { includeOriginalName: true, stemSuffix: 'long', customSuffixes: { vocals: 'vocals', drums: 'drums', bass: 'bass', other: 'other' } }
      })
    }
  }

  useEffect(() => {
    loadTracks()
  }, [])

  const loadTracks = async () => {
    try {
      setLoading(true)
      if (window.electronAPI) {
        const tracksResponse = await window.electronAPI.engineGetTracks()
        if (tracksResponse.success) {
          const separationsResponse = await window.electronAPI.stemGetAll()
          const separations = separationsResponse.success ? separationsResponse.separations : []

          const stemTracks: StemTrack[] = tracksResponse.tracks.map((track: any) => {
            const separation = separations.find((sep: any) => sep.trackId === track.id)
            return {
              id: track.id,
              title: track.title || 'Unknown Title',
              artist: track.artist || 'Unknown Artist',
              path: track.path,
              duration: track.durationMs ? Math.floor(track.durationMs / 1000) : 0,
              stemStatus: separation ? separation.status : 'none',
              stemProgress: separation ? separation.progress : undefined,
              stems: separation && separation.status === 'completed' ? {
                vocals: separation.vocalsPath,
                drums: separation.drumsPath,
                bass: separation.bassPath,
                other: separation.otherPath
              } : undefined,
              processingTime: separation ? separation.processingTimeMs : undefined,
              lastProcessed: separation ? new Date(separation.createdAt) : undefined
            }
          })
          setTracks(stemTracks)
        } else {
          throw new Error(tracksResponse.error || 'Failed to load tracks')
        }
      }
    } catch (error) {
      console.error('Failed to load tracks:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const handleProcessStems = async () => {
    if (selectedTracks.length === 0 || !settings) return

    setProcessing(true)
    try {
      if (window.electronAPI) {
        // Start STEM separation for each selected track
        for (const trackId of selectedTracks) {
          const response = await window.electronAPI.stemStartSeparation(trackId, settings)
          if (!response.success) {
            console.error(`Failed to start separation for track ${trackId}:`, response.error)
          }
        }
        await loadTracks() // Reload to get updated status
      }
    } catch (error) {
      console.error('Failed to process stems:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handlePlayStem = (trackId: string, stemType: string) => {
    const currentPlaying = playingStems[trackId]
    if (currentPlaying === stemType) {
      // Stop playing
      setPlayingStems(prev => ({ ...prev, [trackId]: '' }))
    } else {
      // Start playing
      setPlayingStems(prev => ({ ...prev, [trackId]: stemType }))
    }
  }

  const handleDownloadStems = async (trackId: string) => {
    try {
      if (window.electronAPI) {
        // Get the stem separation data for this track
        const response = await window.electronAPI.stemGetByTrack(trackId)
        if (response.success && response.result) {
          // Show the stems folder in file explorer
          const stemPaths = [
            response.result.vocalsPath,
            response.result.drumsPath,
            response.result.bassPath,
            response.result.otherPath
          ].filter(Boolean)

          if (stemPaths.length > 0) {
            await window.electronAPI.showItemInFolder(stemPaths[0])
          }
        }
      }
    } catch (error) {
      console.error('Failed to show stems folder:', error)
    }
  }

  const handleDeleteStems = async (trackId: string) => {
    try {
      if (window.electronAPI) {
        // Get the separation ID for this track first
        const response = await window.electronAPI.stemGetByTrack(trackId)
        if (response.success && response.result) {
          const deleteResponse = await window.electronAPI.stemDelete(response.result.id)
          if (deleteResponse.success) {
            await loadTracks()
          } else {
            console.error('Failed to delete stems:', deleteResponse.error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete stems:', error)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatProcessingTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'processing': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getQualityBadge = (quality: string) => {
    const colors = {
      standard: 'bg-blue-900/20 text-blue-300',
      high: 'bg-purple-900/20 text-purple-300',
      ultra: 'bg-gold-900/20 text-gold-300'
    }
    return colors[quality as keyof typeof colors] || colors.standard
  }

  const completedTracks = tracks.filter(track => track.stemStatus === 'completed')
  const processingTracks = tracks.filter(track => track.stemStatus === 'processing')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">STEM Separation</h2>
          <p className="text-gray-400">
            Extract vocals, drums, bass, and other elements from your tracks
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Settings
          </button>

          <button
            onClick={handleProcessStems}
            disabled={selectedTracks.length === 0 || processing}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedTracks.length > 0 && !processing
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            {processing ? (
              <>
                <Zap className="h-4 w-4 inline mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Waveform className="h-4 w-4 inline mr-2" />
                Process ({selectedTracks.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-primary-400">
            {loading ? '...' : tracks.length}
          </div>
          <div className="text-sm text-gray-400">Total Tracks</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {loading ? '...' : completedTracks.length}
          </div>
          <div className="text-sm text-gray-400">Processed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {loading ? '...' : processingTracks.length}
          </div>
          <div className="text-sm text-gray-400">Processing</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{selectedTracks.length}</div>
          <div className="text-sm text-gray-400">Selected</div>
        </div>
      </div>

      {/* Track List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-700 text-sm font-medium text-gray-300">
          <div className="col-span-1">Select</div>
          <div className="col-span-3">Track</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2">Stems</div>
          <div className="col-span-2">Actions</div>
        </div>

        <div className="divide-y divide-gray-700">
          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <Waveform className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
              <p>Loading tracks...</p>
            </div>
          ) : tracks.map((track) => (
            <div
              key={track.id}
              className={clsx(
                'grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-700 transition-colors',
                selectedTracks.includes(track.id) && 'bg-primary-900/20'
              )}
            >
              {/* Selection */}
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedTracks.includes(track.id)}
                  onChange={() => toggleTrackSelection(track.id)}
                  disabled={track.stemStatus === 'processing'}
                  className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                />
              </div>

              {/* Track Info */}
              <div className="col-span-3">
                <div className="flex items-center space-x-3">
                  <FileAudio className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{track.title}</div>
                    <div className="text-sm text-gray-400">{track.artist}</div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <div className={clsx('w-2 h-2 rounded-full', {
                    'bg-gray-400': track.stemStatus === 'none',
                    'bg-yellow-400 animate-pulse': track.stemStatus === 'processing',
                    'bg-green-400': track.stemStatus === 'completed',
                    'bg-red-400': track.stemStatus === 'error'
                  })} />
                  <span className={clsx('text-sm capitalize', getStatusColor(track.stemStatus))}>
                    {track.stemStatus === 'none' ? 'Not Processed' : track.stemStatus}
                  </span>
                </div>
                {track.processingTime && (
                  <div className="text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatProcessingTime(track.processingTime)}
                  </div>
                )}
              </div>

              {/* Progress */}
              <div className="col-span-2">
                {track.stemStatus === 'processing' && track.stemProgress !== undefined ? (
                  <div className="space-y-1">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${track.stemProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-400">{track.stemProgress}%</div>
                  </div>
                ) : track.stemStatus === 'completed' ? (
                  <div className="text-sm text-green-400">✓ Complete</div>
                ) : track.stemStatus === 'error' ? (
                  <div className="text-sm text-red-400">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Failed
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">-</div>
                )}
              </div>

              {/* Stems */}
              <div className="col-span-2">
                {track.stems ? (
                  <div className="flex space-x-1">
                    {Object.entries(track.stems).map(([type, path]) => (
                      <button
                        key={type}
                        onClick={() => handlePlayStem(track.id, type)}
                        className={clsx(
                          'p-1 rounded text-xs transition-colors',
                          playingStems[track.id] === type
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        )}
                        title={`Play ${type}`}
                      >
                        {playingStems[track.id] === type ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          stemIcons[type as keyof typeof stemIcons] || <Play className="h-3 w-3" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">-</div>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-2">
                <div className="flex space-x-2">
                  {track.stemStatus === 'completed' && (
                    <>
                      <button
                        onClick={() => handleDownloadStems(track.id)}
                        className="p-1 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
                        title="Download stems"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteStems(track.id)}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
                        title="Delete stems"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {track.stemStatus === 'error' && (
                    <button
                      onClick={() => toggleTrackSelection(track.id)}
                      className="p-1 bg-yellow-600 hover:bg-yellow-700 rounded text-white transition-colors"
                      title="Retry processing"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && tracks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Waveform className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tracks found</p>
            <p className="text-sm mt-2">Import some music to get started with STEM separation</p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">STEM Separation Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Model Selection */}
              <div>
                <h3 className="font-medium mb-4">AI Model</h3>
                <div className="space-y-3">
                  {stemModels.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => setSettings(prev => ({ ...prev, model: model.id as any }))}
                      className={clsx(
                        'p-4 border rounded-lg cursor-pointer transition-colors',
                        settings.model === model.id
                          ? 'border-primary-500 bg-primary-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{model.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{model.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {model.stems.map((stem, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-700 text-xs rounded"
                              >
                                {stem}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-400">Speed: {model.speed}</div>
                          <div className="text-gray-400">Quality: {model.quality}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Output Settings */}
              <div>
                <h3 className="font-medium mb-4">Output Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Format</label>
                    <select
                      value={settings.outputFormat}
                      onChange={(e) => setSettings(prev => ({ ...prev, outputFormat: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
                    >
                      <option value="wav">WAV (Lossless)</option>
                      <option value="flac">FLAC (Compressed Lossless)</option>
                      <option value="mp3">MP3 (Lossy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Quality</label>
                    <select
                      value={settings.quality}
                      onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
                    >
                      <option value="standard">Standard (Faster)</option>
                      <option value="high">High Quality</option>
                      <option value="ultra">Ultra Quality (Slower)</option>
                    </select>
                  </div>
                </div>

                {settings.outputFormat === 'mp3' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2">Bitrate (kbps)</label>
                    <select
                      value={settings.outputBitrate}
                      onChange={(e) => setSettings(prev => ({ ...prev, outputBitrate: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
                    >
                      <option value={128}>128 kbps</option>
                      <option value={192}>192 kbps</option>
                      <option value={256}>256 kbps</option>
                      <option value={320}>320 kbps</option>
                    </select>
                  </div>
                )}

                <div className="mt-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.autoNormalize}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoNormalize: e.target.checked }))}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600"
                    />
                    <span className="text-sm">Auto-normalize output levels</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md text-sm font-medium transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}