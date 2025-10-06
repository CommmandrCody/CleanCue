import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Music, Activity, Scissors, RefreshCw, Plus, X, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { useProcessing } from '../contexts/ProcessingContext'

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

interface StemSeparationProps {
  selectedTracks?: string[]
}

export function StemSeparation({ selectedTracks = [] }: StemSeparationProps) {
  const processing = useProcessing()
  const [jobs, setJobs] = useState<StemSeparationJob[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)

  // Calculate stats from jobs
  const stats = {
    processing: jobs.filter(job => job.status === 'processing').length,
    pending: jobs.filter(job => job.status === 'pending').length,
    completed: jobs.filter(job => job.status === 'completed').length,
    failed: jobs.filter(job => job.status === 'error').length,
    total: jobs.length
  }

  // Load stem separation jobs from backend (not implemented yet, using local state)
  const loadJobs = async () => {
    // Backend not implemented yet - jobs are managed in local state
    console.log('[UI] StemSeparation: Using local state for stem queue')
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

  // Start processing queue
  const handleStartProcessing = async () => {
    if (jobs.length === 0 || jobs.filter(j => j.status === 'pending').length === 0) return

    setIsProcessing(true)

    // Process jobs one at a time
    const pendingJobs = jobs.filter(j => j.status === 'pending')

    for (const job of pendingJobs) {
      if (!isProcessing) break // Stop if user clicked stop

      // Update job to processing
      setJobs(prev => prev.map(j =>
        j.id === job.id
          ? { ...j, status: 'processing', startedAt: Date.now(), progress: 0 }
          : j
      ))

      // Simulate processing with progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        if (!isProcessing) break

        await new Promise(resolve => setTimeout(resolve, 300))

        setJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, progress } : j
        ))
      }

      // Mark as completed
      setJobs(prev => prev.map(j =>
        j.id === job.id
          ? {
              ...j,
              status: 'completed',
              progress: 100,
              completedAt: Date.now(),
              processingTimeMs: Date.now() - (j.startedAt || Date.now()),
              results: {
                vocalsPath: `/stems/${job.trackId}/vocals.wav`,
                drumsPath: `/stems/${job.trackId}/drums.wav`,
                bassPath: `/stems/${job.trackId}/bass.wav`,
                otherPath: `/stems/${job.trackId}/other.wav`
              }
            }
          : j
      ))

      // Unregister track from processing
      processing.unregisterProcessing([job.trackId], 'stems')
    }

    setIsProcessing(false)
  }

  // Stop processing
  const handleStopProcessing = async () => {
    setIsProcessing(false)

    // Reset any processing jobs back to pending
    setJobs(prev => prev.map(j =>
      j.status === 'processing'
        ? { ...j, status: 'pending', progress: 0, startedAt: undefined }
        : j
    ))
  }

  // Clear completed jobs
  const handleClearCompleted = async () => {
    const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'error')
    const trackIds = completedJobs.map(j => j.trackId)
    processing.unregisterProcessing(trackIds, 'stems')
    setJobs(prev => prev.filter(j => j.status !== 'completed' && j.status !== 'error'))
  }

  // Remove specific job from queue
  const handleRemoveJob = (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      processing.unregisterProcessing([job.trackId], 'stems')
    }
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }


  // Submit selected tracks for stem separation
  const handleAddSelectedTracks = async () => {
    if (selectedTracks.length === 0) return

    try {
      // Get track details from database
      const allTracks = await window.electronAPI.getAllTracks()
      const tracksToSubmit = allTracks.filter((track: Track) => selectedTracks.includes(track.id))

      // Check for conflicts and register tracks
      const { allowed, blocked } = processing.registerProcessing(selectedTracks, 'stems')

      if (blocked.length > 0) {
        const screens = blocked.map(id => processing.getProcessingScreen(id)).filter(Boolean)
        setConflictMessage(
          `${blocked.length} track(s) already being processed in ${screens.join(', ')}. Only ${allowed.length} added.`
        )
        setTimeout(() => setConflictMessage(null), 5000)
      }

      // Only add jobs for allowed tracks
      const allowedTracks = tracksToSubmit.filter((t: Track) => allowed.includes(t.id))
      const newJobs: StemSeparationJob[] = allowedTracks.map((track: Track) => ({
        id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        trackId: track.id,
        trackTitle: track.title,
        trackArtist: track.artist,
        status: 'pending' as const,
        progress: 0,
        addedAt: Date.now(),
        settings: {
          model: 'ffmpeg-basic',
          outputFormat: 'wav',
          quality: 'standard'
        }
      }))

      setJobs(prev => [...prev, ...newJobs])
    } catch (error) {
      console.error('Failed to add tracks to stem separation queue:', error)
    }
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
          {selectedTracks.length > 0 && (
            <button
              onClick={handleAddSelectedTracks}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Selected ({selectedTracks.length})
            </button>
          )}

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

      {/* Conflict Warning */}
      {conflictMessage && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-200">{conflictMessage}</p>
        </div>
      )}

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
                  <button
                    onClick={() => handleRemoveJob(job.id)}
                    disabled={job.status === 'processing'}
                    className="p-1 text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                    title={job.status === 'processing' ? 'Cannot remove while processing' : 'Remove from queue'}
                  >
                    <X className="h-4 w-4" />
                  </button>
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
            <p className="text-sm mt-2">Select tracks in Library and click "Add Selected" to queue them for separation</p>
          </div>
        )}
      </div>
    </div>
  )
}