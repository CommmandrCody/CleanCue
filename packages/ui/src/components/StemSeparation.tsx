import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Music, Activity, Scissors, RefreshCw, Plus, FileAudio, X } from 'lucide-react'
import clsx from 'clsx'

interface StemSeparationJob {
  id: string
  trackId: string
  trackTitle: string
  trackArtist: string
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'
  progress: number
  errorMessage?: string
  startedAt?: number
  completedAt?: number
  addedAt: number
  processingTimeMs?: number
  settings: {
    model: string
    outputFormat: string
    quality: string
  }
  results?: {
    vocalsPath?: string
    drumsPath?: string
    bassPath?: string
    otherPath?: string
  }
}

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  duration?: number
}

export function StemSeparation() {
  const [jobs, setJobs] = useState<StemSeparationJob[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showTrackSelection, setShowTrackSelection] = useState(false)
  const [availableTracks, setAvailableTracks] = useState<Track[]>([])
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())
  const [loadingTracks, setLoadingTracks] = useState(false)

  // Calculate stats from jobs
  const stats = {
    processing: jobs.filter(job => job.status === 'processing').length,
    pending: jobs.filter(job => job.status === 'pending').length,
    completed: jobs.filter(job => job.status === 'completed').length,
    failed: jobs.filter(job => job.status === 'error').length,
    total: jobs.length
  }

  // Load stem separation jobs from backend
  const loadJobs = async () => {
    try {
      console.log('[UI] StemSeparation: loadJobs() called')
      if (window.electronAPI) {
        console.log('[UI] StemSeparation: electronAPI available, calling stemGetAll()')
        const response = await window.electronAPI.stemGetAll()
        console.log('[UI] StemSeparation: stemGetAll response:', response)
        if (response && response.success) {
          // Convert separations to jobs format for display
          const jobs: StemSeparationJob[] = response.separations.map((sep: any) => ({
            id: sep.id,
            trackId: sep.trackId,
            trackTitle: sep.trackTitle || 'Unknown Track',
            trackArtist: sep.trackArtist || 'Unknown Artist',
            status: sep.status,
            progress: sep.progress || 0,
            addedAt: new Date(sep.createdAt).getTime(),
            startedAt: sep.startedAt ? new Date(sep.startedAt).getTime() : undefined,
            completedAt: sep.completedAt ? new Date(sep.completedAt).getTime() : undefined,
            processingTimeMs: sep.processingTimeMs,
            errorMessage: sep.error,
            settings: {
              model: sep.model || 'ffmpeg-basic',
              outputFormat: sep.outputFormat || 'wav',
              quality: sep.quality || 'standard'
            },
            results: sep.status === 'completed' ? {
              vocalsPath: sep.vocalsPath,
              drumsPath: sep.drumsPath,
              bassPath: sep.bassPath,
              otherPath: sep.otherPath
            } : undefined
          }))
          setJobs(jobs)
        } else {
          console.log('[UI] StemSeparation: stemGetAll failed:', response)
          setJobs([])
        }
      } else {
        console.log('[UI] StemSeparation: electronAPI not available')
      }
    } catch (error) {
      console.error('[UI] StemSeparation: Failed to load stem separation jobs:', error)
    }
  }

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadJobs()
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Start processing queue - placeholder for now
  const handleStartProcessing = async () => {
    try {
      console.log('[UI] StemSeparation: Start processing not yet implemented in simple-engine')
      // For now, just update the UI state
      setIsProcessing(true)
      setTimeout(() => setIsProcessing(false), 3000) // Mock processing for 3 seconds
    } catch (error) {
      console.error('Failed to start stem separation processing:', error)
    }
  }

  // Stop processing - placeholder for now
  const handleStopProcessing = async () => {
    try {
      console.log('[UI] StemSeparation: Stop processing not yet implemented in simple-engine')
      setIsProcessing(false)
    } catch (error) {
      console.error('Failed to stop stem separation processing:', error)
    }
  }

  // Clear completed jobs - placeholder for now
  const handleClearCompleted = async () => {
    try {
      console.log('[UI] StemSeparation: Clear completed not yet implemented in simple-engine')
      // For now, just clear the local jobs list
      setJobs([])
    } catch (error) {
      console.error('Failed to clear completed jobs:', error)
    }
  }

  // Load available tracks from library
  const loadTracks = async () => {
    setLoadingTracks(true)
    try {
      if (window.electronAPI) {
        const tracks = await window.electronAPI.getAllTracks()
        if (Array.isArray(tracks)) {
          setAvailableTracks(tracks)
        } else {
          console.log('[UI] StemSeparation: Failed to load tracks - not an array:', tracks)
          setAvailableTracks([])
        }
      }
    } catch (error) {
      console.error('[UI] StemSeparation: Failed to load tracks:', error)
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

  // Submit selected tracks for stem separation
  const handleSubmitTracks = async () => {
    if (selectedTracks.size === 0) return

    try {
      const tracksToSubmit = availableTracks.filter(track => selectedTracks.has(track.id))

      for (const track of tracksToSubmit) {
        if (window.electronAPI) {
          console.log('[UI] StemSeparation: Submitting track for separation:', track.title)
          await window.electronAPI.stemStartSeparation(track.id, {
            model: 'ffmpeg-basic',
            outputFormat: 'wav',
            quality: 'standard'
          })
        }
      }

      // Clear selection and close dialog
      setSelectedTracks(new Set())
      setShowTrackSelection(false)

      // Refresh jobs list
      await loadJobs()
    } catch (error) {
      console.error('[UI] StemSeparation: Failed to submit tracks:', error)
    }
  }

  // Open track selection dialog
  const handleAddTracks = async () => {
    setShowTrackSelection(true)
    await loadTracks()
  }

  // Load jobs on component mount
  useEffect(() => {
    console.log('[UI] StemSeparation: useEffect triggered, component mounted')
    loadJobs()

    // Set up real-time event listeners for stem separation updates
    if (window.electronAPI) {
      const handleStemSeparationStarted = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Stem separation started event received:', data)

        setJobs(prevJobs => {
          const existingJobIndex = prevJobs.findIndex(job => job.trackId === data.trackId)
          if (existingJobIndex >= 0) {
            return prevJobs.map(job =>
              job.trackId === data.trackId ? { ...job, status: 'processing' as const, startedAt: Date.now() } : job
            )
          } else {
            return [...prevJobs, {
              id: `job-${Date.now()}`,
              trackId: data.trackId || '',
              trackTitle: data.trackTitle || 'Unknown Track',
              trackArtist: data.trackArtist || 'Unknown Artist',
              status: 'processing' as const,
              progress: 0,
              addedAt: Date.now(),
              startedAt: Date.now(),
              settings: {
                model: 'ffmpeg-basic',
                outputFormat: 'wav',
                quality: 'standard'
              }
            }]
          }
        })
      }

      const handleStemSeparationProgress = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Stem separation progress event received:', data)

        setJobs(prevJobs => prevJobs.map(job =>
          job.trackId === data.trackId ? { ...job, progress: data.progress || 0 } : job
        ))
      }

      const handleStemSeparationCompleted = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Stem separation completed event received:', data)

        setJobs(prevJobs => prevJobs.map(job =>
          job.trackId === data.trackId ? {
            ...job,
            status: data.error ? 'error' as const : 'completed' as const,
            progress: 100,
            completedAt: Date.now(),
            processingTimeMs: job.startedAt ? Date.now() - job.startedAt : undefined,
            results: data.results,
            errorMessage: data.error
          } : job
        ))
      }

      // Add event listeners using the correct event names from simple-engine
      window.electronAPI.on('stemSeparation:started', handleStemSeparationStarted)
      window.electronAPI.on('stemSeparation:progress', handleStemSeparationProgress)
      window.electronAPI.on('stemSeparation:completed', handleStemSeparationCompleted)

      // Cleanup event listeners
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeListener('stemSeparation:started', handleStemSeparationStarted)
          window.electronAPI.removeListener('stemSeparation:progress', handleStemSeparationProgress)
          window.electronAPI.removeListener('stemSeparation:completed', handleStemSeparationCompleted)
        }
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stem Separation</h2>
          <p className="text-gray-400">Separate audio tracks into vocals, drums, bass, and other components</p>
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
            onClick={handleStartProcessing}
            disabled={isProcessing || stats.pending === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              !isProcessing && stats.pending > 0
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <>
                <Activity className="h-4 w-4 inline mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 inline mr-2" />
                Start Queue ({stats.pending})
              </>
            )}
          </button>

          <button
            onClick={handleClearCompleted}
            disabled={stats.completed === 0}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            <RotateCcw className="h-4 w-4 inline mr-2" />
            Clear Completed
          </button>

          <button
            onClick={handleStopProcessing}
            disabled={!isProcessing}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            <Pause className="h-4 w-4 inline mr-2" />
            Stop Processing
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className={clsx('h-4 w-4 inline mr-2', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{stats.processing}</div>
          <div className="text-sm text-gray-400">Processing</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-sm text-gray-400">Pending</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          <div className="text-sm text-gray-400">Failed</div>
        </div>
      </div>

      {/* Stem Separation Queue */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h3 className="font-medium">Stem Separation Queue ({stats.total} jobs)</h3>
        </div>

        <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
          {jobs.map((job) => (
            <div key={job.id} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Music className="h-4 w-4 text-purple-400" />
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    job.status === 'processing' ? 'bg-blue-400 animate-pulse' :
                    job.status === 'pending' ? 'bg-yellow-400' :
                    job.status === 'completed' ? 'bg-green-400' :
                    job.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                  )} />
                  <div>
                    <div className="font-medium">{job.trackTitle}</div>
                    <div className="text-sm text-gray-400">{job.trackArtist}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={clsx('text-sm font-medium', {
                    'text-blue-400': job.status === 'processing',
                    'text-yellow-400': job.status === 'pending',
                    'text-green-400': job.status === 'completed',
                    'text-red-400': job.status === 'error',
                    'text-gray-400': job.status === 'cancelled'
                  })}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </div>
                  {job.processingTimeMs && (
                    <div className="text-xs text-gray-500">
                      {Math.round(job.processingTimeMs / 1000)}s
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={clsx(
                      'h-2 rounded-full transition-all duration-300',
                      job.status === 'error' ? 'bg-red-600' :
                      job.status === 'completed' ? 'bg-green-600' :
                      job.status === 'cancelled' ? 'bg-orange-600' :
                      'bg-blue-600'
                    )}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {job.errorMessage && (
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 mb-3">
                  <div className="text-sm text-red-300">{job.errorMessage}</div>
                </div>
              )}

              {/* Model Settings */}
              <div className="bg-gray-900 rounded-lg p-3 mb-3">
                <div className="text-xs text-gray-400 mb-2">Settings:</div>
                <div className="text-xs text-gray-300 font-mono">
                  Model: {job.settings.model} | Format: {job.settings.outputFormat} | Quality: {job.settings.quality}
                </div>
              </div>

              {/* Results */}
              {job.results && (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                  <div className="text-xs text-green-400 mb-2">Stem Files:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {job.results.vocalsPath && (
                      <div className="text-green-300">Vocals: ✓</div>
                    )}
                    {job.results.drumsPath && (
                      <div className="text-green-300">Drums: ✓</div>
                    )}
                    {job.results.bassPath && (
                      <div className="text-green-300">Bass: ✓</div>
                    )}
                    {job.results.otherPath && (
                      <div className="text-green-300">Other: ✓</div>
                    )}
                  </div>
                </div>
              )}

              {/* Timing Information */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-400 mt-3">
                <div>Added: {new Date(job.addedAt).toLocaleTimeString()}</div>
                {job.startedAt && (
                  <div>Started: {new Date(job.startedAt).toLocaleTimeString()}</div>
                )}
                {job.completedAt && (
                  <div>Completed: {new Date(job.completedAt).toLocaleTimeString()}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No stem separation jobs</p>
            <p className="text-sm mt-2">Click "Add Tracks" to select tracks for stem separation</p>
          </div>
        )}
      </div>

      {/* Track Selection Dialog */}
      {showTrackSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Select Tracks for Stem Separation</h3>
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
                  <span className="ml-3 text-gray-300">Loading tracks...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-gray-300">
                      {availableTracks.length} tracks available • {selectedTracks.size} selected
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
                          {track.duration && (
                            <div className="text-sm text-gray-500">
                              {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {availableTracks.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No tracks found in library</p>
                        <p className="text-sm mt-2">Add music to your library first</p>
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
                  onClick={handleSubmitTracks}
                  disabled={selectedTracks.size === 0}
                  className={clsx(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    selectedTracks.size > 0
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  )}
                >
                  Add to Queue ({selectedTracks.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}