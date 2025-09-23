import { useState, useEffect, useRef } from 'react'
import { Play, Pause, X, Download, Music, Image, Volume2, Database, CheckCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

interface EnrichmentJob {
  id: string
  trackIds: string[]
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: {
    total: number
    completed: number
    current?: string
    stage: 'metadata' | 'fingerprinting' | 'album_art' | 'normalization' | 'finalizing'
  }
  options: EnrichmentOptions
  stats?: EnrichmentStats
  error?: string
  createdAt: Date
  completedAt?: Date
}

interface EnrichmentOptions {
  enableFingerprinting: boolean
  enableAlbumArt: boolean
  enableFilenameParser: boolean
  enableNormalization: boolean
  overwriteExisting: boolean
  albumArtQuality: 'thumbnail' | 'medium' | 'large' | 'best'
  normalizationPreset: 'dj' | 'broadcast' | 'streaming' | 'custom'
  batchSize: number
}

interface EnrichmentStats {
  totalTracks: number
  enrichedTracks: number
  fingerprintMatches: number
  albumArtFound: number
  filenameParsed: number
  normalizedTracks: number
  errors: number
  processingTime: number
  apiCalls: {
    lastfm: number
    musicbrainz: number
    spotify: number
    itunes: number
    discogs: number
  }
}

interface MetadataEnrichmentProps {
  isOpen: boolean
  onClose: () => void
  selectedTracks?: string[]
}

export function MetadataEnrichment({ isOpen, onClose, selectedTracks = [] }: MetadataEnrichmentProps) {
  const [jobs, setJobs] = useState<EnrichmentJob[]>([])
  const [activeJob, setActiveJob] = useState<EnrichmentJob | null>(null)
  const [options, setOptions] = useState<EnrichmentOptions>({
    enableFingerprinting: true,
    enableAlbumArt: true,
    enableFilenameParser: true,
    enableNormalization: false,
    overwriteExisting: false,
    albumArtQuality: 'large',
    normalizationPreset: 'dj',
    batchSize: 10
  })
  const [ytDlpStatus, setYtDlpStatus] = useState<{
    installed: boolean
    version?: string
    updating?: boolean
    cookiesConfigured: boolean
  }>({ installed: false, cookiesConfigured: false })

  // Removed conflicting audio player - using global player from App.tsx instead

  // Audio controls removed - using global player

  useEffect(() => {
    if (!isOpen) return

    // Check YouTube downloader status
    checkYtDlpStatus()



    // Mock event listeners - in real implementation these would connect to the backend
    // window.electronAPI?.on('enrichment:jobCreated', handleJobCreated)
    // window.electronAPI?.on('enrichment:jobProgress', handleJobProgress)
    // window.electronAPI?.on('enrichment:jobCompleted', handleJobCompleted)

    return () => {
      // window.electronAPI?.removeListener('enrichment:jobCreated', handleJobCreated)
      // window.electronAPI?.removeListener('enrichment:jobProgress', handleJobProgress)
      // window.electronAPI?.removeListener('enrichment:jobCompleted', handleJobCompleted)
    }
  }, [isOpen, activeJob])

  const checkYtDlpStatus = async () => {
    try {
      // Mock - in real implementation this would call the backend
      setYtDlpStatus({
        installed: true,
        version: '2024.01.01',
        cookiesConfigured: false
      })
    } catch (error) {
      console.error('Error checking yt-dlp status:', error)
    }
  }

  const startEnrichment = async () => {
    if (selectedTracks.length === 0) return

    try {
      // Mock job creation - in real implementation this would call the backend
      const jobId = `job_${Date.now()}`
      const newJob: EnrichmentJob = {
        id: jobId,
        trackIds: selectedTracks,
        status: 'pending',
        progress: {
          total: selectedTracks.length,
          completed: 0,
          stage: 'metadata'
        },
        options,
        createdAt: new Date()
      }

      setJobs(prev => [...prev, newJob])
      setActiveJob(newJob)

      // Simulate progress
      simulateProgress(newJob)
    } catch (error) {
      console.error('Error starting enrichment:', error)
    }
  }

  const simulateProgress = (job: EnrichmentJob) => {
    let progress = 0
    const stages = ['metadata', 'fingerprinting', 'album_art', 'normalization', 'finalizing'] as const
    let stageIndex = 0

    const interval = setInterval(() => {
      progress += Math.random() * 10

      if (progress >= 100) {
        progress = 100
        job.status = 'completed'
        job.completedAt = new Date()
        job.stats = {
          totalTracks: selectedTracks.length,
          enrichedTracks: selectedTracks.length,
          fingerprintMatches: Math.floor(selectedTracks.length * 0.8),
          albumArtFound: Math.floor(selectedTracks.length * 0.9),
          filenameParsed: selectedTracks.length,
          normalizedTracks: options.enableNormalization ? selectedTracks.length : 0,
          errors: Math.floor(Math.random() * 3),
          processingTime: Date.now() - job.createdAt.getTime(),
          apiCalls: {
            lastfm: 15,
            musicbrainz: 8,
            spotify: 12,
            itunes: 5,
            discogs: 3
          }
        }
        clearInterval(interval)
      } else {
        job.status = 'running'
        if (progress > (stageIndex + 1) * 20 && stageIndex < stages.length - 1) {
          stageIndex++
        }
      }

      job.progress = {
        total: selectedTracks.length,
        completed: Math.floor((progress / 100) * selectedTracks.length),
        stage: stages[stageIndex],
        current: `Track ${Math.floor((progress / 100) * selectedTracks.length) + 1}`
      }

      setJobs(prev => prev.map(j => j.id === job.id ? { ...job } : j))
      if (activeJob?.id === job.id) {
        setActiveJob({ ...job })
      }
    }, 500)
  }

  const cancelJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      job.status = 'cancelled'
      job.completedAt = new Date()
      setJobs(prev => prev.map(j => j.id === jobId ? job : j))
      if (activeJob?.id === jobId) {
        setActiveJob(job)
      }
    }
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'metadata':
        return <Music className="h-4 w-4" />
      case 'fingerprinting':
        return <Database className="h-4 w-4" />
      case 'album_art':
        return <Image className="h-4 w-4" />
      case 'normalization':
        return <Volume2 className="h-4 w-4" />
      case 'finalizing':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'cancelled':
        return 'text-yellow-400'
      case 'running':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">Metadata Enrichment</h2>
            <p className="text-gray-400">
              Enhance tracks with fingerprinting, album art, and audio normalization
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Configuration Panel */}
          <div className="w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
            <h3 className="font-medium mb-4">Enrichment Options</h3>

            {/* Basic Options */}
            <div className="space-y-4 mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.enableFilenameParser}
                  onChange={(e) => setOptions(prev => ({ ...prev, enableFilenameParser: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <span>Parse filenames for metadata</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.enableFingerprinting}
                  onChange={(e) => setOptions(prev => ({ ...prev, enableFingerprinting: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <span>Music fingerprinting lookup</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.enableAlbumArt}
                  onChange={(e) => setOptions(prev => ({ ...prev, enableAlbumArt: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <span>Fetch album artwork</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.enableNormalization}
                  onChange={(e) => setOptions(prev => ({ ...prev, enableNormalization: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <span>Audio normalization</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={options.overwriteExisting}
                  onChange={(e) => setOptions(prev => ({ ...prev, overwriteExisting: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <span>Overwrite existing metadata</span>
              </label>
            </div>

            {/* Album Art Quality */}
            {options.enableAlbumArt && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Album Art Quality</label>
                <select
                  value={options.albumArtQuality}
                  onChange={(e) => setOptions(prev => ({ ...prev, albumArtQuality: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="thumbnail">Thumbnail (small)</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="best">Best Available</option>
                </select>
              </div>
            )}

            {/* Normalization Preset */}
            {options.enableNormalization && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Normalization Preset</label>
                <select
                  value={options.normalizationPreset}
                  onChange={(e) => setOptions(prev => ({ ...prev, normalizationPreset: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dj">DJ (-12 LUFS)</option>
                  <option value="streaming">Streaming (-14 LUFS)</option>
                  <option value="broadcast">Broadcast (-23 LUFS)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            )}

            {/* YouTube Status */}
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <Download className="h-4 w-4 mr-2" />
                YouTube Downloader
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Installed:</span>
                  <span className={ytDlpStatus.installed ? 'text-green-400' : 'text-red-400'}>
                    {ytDlpStatus.installed ? 'Yes' : 'No'}
                  </span>
                </div>
                {ytDlpStatus.version && (
                  <div className="flex items-center justify-between">
                    <span>Version:</span>
                    <span className="text-gray-300">{ytDlpStatus.version}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Cookies:</span>
                  <span className={ytDlpStatus.cookiesConfigured ? 'text-green-400' : 'text-yellow-400'}>
                    {ytDlpStatus.cookiesConfigured ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={startEnrichment}
              disabled={selectedTracks.length === 0 || (activeJob?.status === 'running')}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
            >
              {activeJob && activeJob.status === 'running'
                ? 'Enriching...'
                : `Enrich ${selectedTracks.length} Tracks`
              }
            </button>
          </div>

          {/* Progress and Results Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Active Job Progress */}
            {activeJob && (
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Current Job</h3>
                  <div className="flex items-center space-x-2">
                    <span className={clsx('text-sm', getStatusColor(activeJob.status))}>
                      {activeJob.status.charAt(0).toUpperCase() + activeJob.status.slice(1)}
                    </span>
                    {activeJob.status === 'running' && (
                      <button
                        onClick={() => cancelJob(activeJob.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center space-x-2">
                      {getStageIcon(activeJob.progress.stage)}
                      <span className="capitalize">{activeJob.progress.stage.replace('_', ' ')}</span>
                    </div>
                    <span>{activeJob.progress.completed} / {activeJob.progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(activeJob.progress.completed / activeJob.progress.total) * 100}%` }}
                    />
                  </div>
                </div>

                {activeJob.progress.current && (
                  <div className="text-sm text-gray-400">
                    Processing: {activeJob.progress.current}
                  </div>
                )}

                {/* Stats for completed jobs */}
                {activeJob.status === 'completed' && activeJob.stats && (
                  <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Enriched</div>
                      <div className="text-green-400 font-medium">{activeJob.stats.enrichedTracks}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Fingerprints</div>
                      <div className="text-blue-400 font-medium">{activeJob.stats.fingerprintMatches}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Album Art</div>
                      <div className="text-purple-400 font-medium">{activeJob.stats.albumArtFound}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Normalized</div>
                      <div className="text-orange-400 font-medium">{activeJob.stats.normalizedTracks}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Errors</div>
                      <div className="text-red-400 font-medium">{activeJob.stats.errors}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Time</div>
                      <div className="text-gray-300 font-medium">
                        {Math.round(activeJob.stats.processingTime / 1000)}s
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audio Player */}
            {currentTrack && (
              <div className="p-4 border-b border-gray-700 bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={togglePlayback}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <div>
                      <div className="font-medium text-sm">{currentTrack.title || 'Unknown Track'}</div>
                      <div className="text-xs text-gray-400">{currentTrack.artist || 'Unknown Artist'}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Volume2 className="h-4 w-4 text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 slider"
                    />
                  </div>
                </div>
{/* Audio element removed - using global player */}
              </div>
            )}

            {/* Job History */}
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="font-medium mb-4">Job History</h3>
              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No enrichment jobs yet</p>
                    <p className="text-sm">Select tracks and click "Enrich" to get started</p>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      className={clsx(
                        'p-4 rounded-lg border cursor-pointer transition-colors',
                        activeJob?.id === job.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600 hover:border-gray-500'
                      )}
                      onClick={() => setActiveJob(job)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={clsx('w-2 h-2 rounded-full', {
                            'bg-green-400': job.status === 'completed',
                            'bg-red-400': job.status === 'failed',
                            'bg-yellow-400': job.status === 'cancelled',
                            'bg-blue-400': job.status === 'running',
                            'bg-gray-400': job.status === 'pending'
                          })} />
                          <span className="font-medium">
                            {job.trackIds.length} tracks
                          </span>
                          {/* Add play button for track preview */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Mock track data for demo
                              playTrack({
                                path: `/mock/track/${job.id}`,
                                title: `Sample Track ${job.trackIds.length}`,
                                artist: 'Demo Artist'
                              })
                            }}
                            className="p-1 hover:bg-gray-600 rounded transition-colors"
                          >
                            <Play className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-400">
                          {job.createdAt.toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-sm text-gray-400">
                        Status: <span className={getStatusColor(job.status)}>{job.status}</span>
                      </div>

                      {job.stats && (
                        <div className="text-sm text-gray-400 mt-1">
                          {job.stats.enrichedTracks} enriched, {job.stats.fingerprintMatches} fingerprints, {job.stats.albumArtFound} artwork
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}