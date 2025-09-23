import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, BarChart3, Key, RefreshCw, Shuffle } from 'lucide-react'
import clsx from 'clsx'

interface AnalysisJob {
  id: string
  trackTitle: string
  trackArtist: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  currentTask?: string
  results?: {
    bpm?: number
    key?: string
    camelotKey?: string
    energy?: number
    duration?: number
    errors?: string[]
  }
}

interface ProgressLogEntry {
  id: string
  timestamp: number
  trackTitle: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

interface KeyMixSuggestion {
  targetKey: string
  targetCamelotKey: string
  compatibleTracks: {
    id: string
    title: string
    artist: string
    key: string
    camelotKey: string
    bpm: number
    mixType: 'perfect' | 'energy-boost' | 'energy-drop' | 'harmonic'
  }[]
}

export function AnalysisProgress() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([])
  const [isRunning, setIsRunning] = useState(true)
  const [progressLog, setProgressLog] = useState<ProgressLogEntry[]>([])
  const [mixSuggestions, setMixSuggestions] = useState<KeyMixSuggestion[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showLiveLog, setShowLiveLog] = useState(true)
  const [showMixSuggestions, setShowMixSuggestions] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // Calculate stats from actual jobs
  const stats = {
    total: jobs.length,
    completed: jobs.filter(job => job.status === 'completed').length,
    failed: jobs.filter(job => job.status === 'failed').length,
    remaining: jobs.filter(job => job.status === 'pending' || job.status === 'running').length
  }

  // Helper functions
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const addProgressLogEntry = (trackTitle: string, message: string, type: ProgressLogEntry['type'] = 'info') => {
    const entry: ProgressLogEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      trackTitle,
      message,
      type
    }
    setProgressLog(prev => [...prev.slice(-49), entry]) // Keep last 50 entries

    // Auto-scroll to bottom
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight
      }
    }, 100)
  }


  const generateMixSuggestions = async () => {
    try {
      if (window.electronAPI) {
        const tracksResponse = await window.electronAPI.getAllTracks()
        if (tracksResponse && tracksResponse.length > 0) {
          const completedTracks = tracksResponse.filter((track: any) =>
            track.analysis?.key && track.analysis?.bpm
          )

          // Group tracks by key for mix suggestions
          const keyGroups = completedTracks.reduce((acc: any, track: any) => {
            const key = track.analysis.key
            if (!acc[key]) acc[key] = []
            acc[key].push(track)
            return acc
          }, {})

          const suggestions: KeyMixSuggestion[] = Object.entries(keyGroups).map(([key, tracks]: [string, any]) => ({
            targetKey: key,
            targetCamelotKey: convertToCamelot(key),
            compatibleTracks: (tracks as any[]).map(track => ({
              id: track.id,
              title: track.title,
              artist: track.artist,
              key: track.analysis.key,
              camelotKey: convertToCamelot(track.analysis.key),
              bpm: track.analysis.bpm,
              mixType: 'perfect' as const
            }))
          }))

          setMixSuggestions(suggestions)
        }
      }
    } catch (error) {
      console.error('Failed to generate mix suggestions:', error)
    }
  }

  const convertToCamelot = (key: string): string => {
    const camelotMap: { [key: string]: string } = {
      'C': '8B', 'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B', 'B': '1B', 'F#': '2B', 'Db': '3B', 'Ab': '4B', 'Eb': '5B', 'Bb': '6B', 'F': '7B',
      'Am': '8A', 'Em': '9A', 'Bm': '10A', 'F#m': '11A', 'C#m': '12A', 'G#m': '1A', 'D#m': '2A', 'Bbm': '3A', 'Fm': '4A', 'Cm': '5A', 'Gm': '6A', 'Dm': '7A'
    }
    return camelotMap[key] || key
  }

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true)
    addProgressLogEntry('System', 'Refreshing analysis status...', 'info')

    try {
      await loadJobs()
      if (showMixSuggestions) {
        await generateMixSuggestions()
      }
      addProgressLogEntry('System', 'Status refreshed successfully', 'success')
    } catch (error) {
      addProgressLogEntry('System', `Refresh failed: ${error}`, 'error')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Load real analysis jobs from backend
  const loadJobs = async () => {
    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.getAnalysisJobs()
        if (response.success) {
          setJobs(response.jobs || [])
        }
      }
    } catch (error) {
      console.error('Failed to load analysis jobs:', error)
      addProgressLogEntry('System', `Failed to load jobs: ${error}`, 'error')
    }
  }

  // Load real analysis jobs from backend
  useEffect(() => {

    loadJobs()

    // Set up real-time event listeners
    if (window.electronAPI) {
      const handleAnalysisStarted = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Analysis started event received:', data)
        addProgressLogEntry(data.trackTitle || 'Track', `Started analysis: ${data.currentTask || 'BPM/Key detection'}`, 'info')
        loadJobs() // Refresh jobs when analysis starts
      }

      const handleAnalysisProgress = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Analysis progress event received:', data)
        if (data.trackTitle && data.progress) {
          addProgressLogEntry(data.trackTitle, `Progress: ${Math.round(data.progress)}% - ${data.currentTask || 'Processing'}`, 'info')
        }
        loadJobs() // Refresh jobs on progress
      }

      const handleAnalysisCompleted = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Analysis completed event received:', data)
        if (data.results?.errors?.length) {
          addProgressLogEntry(data.trackTitle || 'Track', `Analysis failed: ${data.results.errors[0]}`, 'error')
        } else if (data.results) {
          const bpm = data.results.bpm ? ` BPM: ${data.results.bpm}` : ''
          const key = data.results.key ? ` Key: ${data.results.key} (${convertToCamelot(data.results.key)})` : ''
          addProgressLogEntry(data.trackTitle || 'Track', `Analysis complete!${bpm}${key}`, 'success')
        }
        loadJobs() // Refresh jobs when analysis completes

        // Auto-generate mix suggestions if enabled
        if (showMixSuggestions) {
          generateMixSuggestions()
        }
      }

      // Add event listeners
      window.electronAPI.on('analysis:started', handleAnalysisStarted)
      window.electronAPI.on('analysis:progress', handleAnalysisProgress)
      window.electronAPI.on('analysis:completed', handleAnalysisCompleted)

      // Cleanup event listeners
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeListener('analysis:started', handleAnalysisStarted)
          window.electronAPI.removeListener('analysis:progress', handleAnalysisProgress)
          window.electronAPI.removeListener('analysis:completed', handleAnalysisCompleted)
        }
      }
    }

    // Poll for updates every 5 seconds as backup if jobs are running
    const interval = setInterval(() => {
      if (jobs.some(job => job.status === 'running')) {
        loadJobs()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [jobs, isRunning])

  const handleToggleAnalysis = () => {
    setIsRunning(!isRunning)
  }

  const handleRestartFailed = () => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.status === 'failed'
          ? { ...job, status: 'pending', progress: 0, results: undefined }
          : job
      )
    )
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audio Analysis</h2>
          <p className="text-gray-400">Processing tracks for BPM, key, and energy detection</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLiveLog(!showLiveLog)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              showLiveLog ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
            )}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            {showLiveLog ? 'Hide Log' : 'Show Log'}
          </button>

          <button
            onClick={() => setShowMixSuggestions(!showMixSuggestions)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              showMixSuggestions ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'
            )}
          >
            <Shuffle className="h-4 w-4 inline mr-2" />
            {showMixSuggestions ? 'Hide Mixes' : 'Show Mixes'}
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className={clsx('h-4 w-4 inline mr-2', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>

          <button
            onClick={handleRestartFailed}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm font-medium transition-colors"
          >
            <RotateCcw className="h-4 w-4 inline mr-2" />
            Retry Failed
          </button>

          <button
            onClick={handleToggleAnalysis}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              isRunning
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            )}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 inline mr-2" />
                Pause Analysis
              </>
            ) : (
              <>
                <Play className="h-4 w-4 inline mr-2" />
                Resume Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Simple Progress Overview */}
      {stats.total > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-medium">Analyzing Tracks</span>
            <span className="text-sm text-gray-400">
              {stats.completed} of {stats.total} completed
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            />
          </div>
          {stats.failed > 0 && (
            <div className="text-xs text-red-400 mt-1">
              {stats.failed} tracks had analysis issues
            </div>
          )}
        </div>
      )}

      {/* Analysis Queue */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h3 className="font-medium">Analysis Queue</h3>
        </div>

        <div className="divide-y divide-gray-700">
          {jobs.filter(job => job.status === 'running' || job.status === 'pending').map((job) => (
            <div key={job.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={clsx(
                    'w-2 h-2 rounded-full',
                    job.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'
                  )} />
                  <div>
                    <div className="font-medium">{job.trackTitle}</div>
                    <div className="text-xs text-gray-400">{job.trackArtist}</div>
                  </div>
                </div>
                {job.status === 'running' && (
                  <div className="text-xs text-gray-400">
                    {Math.round(job.progress)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Show completed/failed results in a simplified way */}
        {jobs.some(job => job.status === 'completed' && job.results) && (
          <div className="p-4 border-t border-gray-600">
            <div className="text-sm text-gray-400 mb-2">Recently Analyzed</div>
            <div className="grid gap-2">
              {jobs.filter(job => job.status === 'completed' && job.results).slice(0, 3).map((job) => (
                <div key={job.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 truncate">{job.trackTitle}</span>
                  <div className="flex space-x-3 text-xs">
                    {job.results?.bpm && <span className="text-blue-400">{job.results.bpm} BPM</span>}
                    {job.results?.key && <span className="text-purple-400">{job.results.key}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tracks in analysis queue</p>
            <p className="text-sm mt-2">Scan your library to add tracks for analysis</p>
          </div>
        )}
      </div>

      {/* Live Progress Log */}
      {showLiveLog && progressLog.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-green-400" />
            Live Progress Log
          </h3>
          <div
            ref={logRef}
            className="bg-gray-900 rounded-md p-3 h-64 overflow-y-auto font-mono text-xs space-y-1"
          >
            {progressLog.map(entry => (
              <div key={entry.id} className="flex items-start space-x-2">
                <span className="text-gray-500 shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
                <span className={clsx(
                  'shrink-0',
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'success' ? 'text-green-400' : 'text-blue-400'
                )}>
                  [{entry.trackTitle}]
                </span>
                <span className="text-gray-300">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mix Suggestions */}
      {showMixSuggestions && mixSuggestions.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Key className="h-5 w-5 mr-2 text-purple-400" />
            Key-Compatible Mix Suggestions
          </h3>
          <div className="grid gap-4">
            {mixSuggestions.slice(0, 6).map(suggestion => (
              <div key={suggestion.targetKey} className="bg-gray-900 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-purple-300">
                    Key: {suggestion.targetKey} ({suggestion.targetCamelotKey})
                  </h4>
                  <span className="text-sm text-gray-400">
                    {suggestion.compatibleTracks.length} tracks
                  </span>
                </div>
                <div className="grid gap-2">
                  {suggestion.compatibleTracks.slice(0, 3).map(track => (
                    <div key={track.id} className="flex items-center justify-between bg-gray-800 rounded-md p-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {track.artist}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                        <span>{track.bpm} BPM</span>
                        <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded">
                          {track.camelotKey}
                        </span>
                      </div>
                    </div>
                  ))}
                  {suggestion.compatibleTracks.length > 3 && (
                    <p className="text-xs text-gray-500 text-center py-1">
                      +{suggestion.compatibleTracks.length - 3} more tracks
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}