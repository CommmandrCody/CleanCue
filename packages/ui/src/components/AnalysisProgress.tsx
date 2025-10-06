import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, BarChart3, Key, RefreshCw, Shuffle, Activity, Grid3X3, Target, Settings, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { JobManagement } from './JobManagement'
import { useProcessing } from '../contexts/ProcessingContext'
// import { useStemSeparation } from '../contexts/StemSeparationContext' // Disabled: not implemented in simple engine

interface AnalysisJob {
  id: string
  trackId?: string
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

interface GridCalculationJob {
  id: string
  trackId: string
  trackTitle: string
  trackArtist: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  currentPhase?: string
  results?: {
    beatGrid?: {
      bpm: number
      firstBeat: number
      confidence: number
      gridPoints: { time: number; beat: number }[]
    }
    downbeats?: { time: number; confidence: number }[]
    phrases?: { start: number; end: number; type: string }[]
  }
  errorMessage?: string
  startedAt?: number
  completedAt?: number
}

interface HotCue {
  id: string
  name: string
  position: number // in seconds
  type: 'cue' | 'loop' | 'hot' | 'memory'
  color?: string
  loopLength?: number
}

interface HotCueJob {
  id: string
  trackId: string
  trackTitle: string
  trackArtist: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  type: 'auto-detect' | 'manual-set' | 'export'
  results?: {
    hotCues: HotCue[]
    autoDetectedCues?: {
      intro: number
      outro: number
      drops: number[]
      breaks: number[]
    }
  }
  errorMessage?: string
  startedAt?: number
  completedAt?: number
}

interface AnalysisProgressProps {
  selectedTracks?: string[]
}

export function AnalysisProgress({ selectedTracks = [] }: AnalysisProgressProps) {
  const processing = useProcessing()
  const [activeTab, setActiveTab] = useState<'analysis' | 'grid' | 'jobs'>('analysis')
  const [jobs, setJobs] = useState<AnalysisJob[]>([])
  const [gridJobs, setGridJobs] = useState<GridCalculationJob[]>([])
  const [hotCueJobs, setHotCueJobs] = useState<HotCueJob[]>([])
  const [isRunning, setIsRunning] = useState(true)
  const [progressLog, setProgressLog] = useState<ProgressLogEntry[]>([])
  const [mixSuggestions, setMixSuggestions] = useState<KeyMixSuggestion[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showLiveLog, setShowLiveLog] = useState(true)
  const [showMixSuggestions, setShowMixSuggestions] = useState(false)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  // const stemSeparation = useStemSeparation() // Disabled: not implemented in simple engine

  // Calculate stats from actual jobs - but show track-level thinking
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
    setProgressLog(prev => [...prev.slice(-19), entry]) // Keep last 20 entries

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
      console.log('[UI] AnalysisProgress: loadJobs() called')
      if (window.electronAPI) {
        console.log('[UI] AnalysisProgress: electronAPI available, calling getAnalysisJobs()')
        const response = await window.electronAPI.getAnalysisJobs()
        console.log('[UI] AnalysisProgress: getAnalysisJobs response:', response)
        if (response.success) {
          console.log('[UI] AnalysisProgress: Setting jobs:', response.jobs?.length || 0)
          setJobs(response.jobs || [])
          addProgressLogEntry('System', `Loaded ${response.jobs?.length || 0} analysis jobs`, 'success')
        } else {
          console.log('[UI] AnalysisProgress: getAnalysisJobs failed:', response)
          addProgressLogEntry('System', `Failed to load jobs: ${response}`, 'error')
        }
      } else {
        console.log('[UI] AnalysisProgress: electronAPI not available')
      }
    } catch (error) {
      console.error('[UI] AnalysisProgress: Failed to load analysis jobs:', error)
      addProgressLogEntry('System', `Failed to load jobs: ${error}`, 'error')
    }
  }

  // Load real analysis jobs from backend
  useEffect(() => {
    console.log('[UI] AnalysisProgress: useEffect triggered, component mounted')
    loadJobs()

    // Set up real-time event listeners
    if (window.electronAPI) {
      const handleAnalysisStarted = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Analysis started event received:', data)
        addProgressLogEntry(data.trackTitle || 'Track', `Started analysis: ${data.currentTask || 'BPM/Key detection'}`, 'info')
        // Add or update job state directly instead of reloading all jobs
        setJobs(prevJobs => {
          const existingJobIndex = prevJobs.findIndex(job => job.id === data.id)
          if (existingJobIndex >= 0) {
            // Update existing job
            return prevJobs.map(job =>
              job.id === data.id ? { ...job, status: 'running' as const, currentTask: data.currentTask } : job
            )
          } else {
            // Add new job if not found
            return [...prevJobs, {
              id: data.id,
              trackTitle: data.trackTitle || 'Unknown Track',
              trackArtist: data.trackArtist || 'Unknown Artist',
              status: 'running' as const,
              progress: 0,
              currentTask: data.currentTask || 'Starting analysis...'
            }]
          }
        })
      }

      const handleAnalysisProgress = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Analysis progress event received:', data)
        // Only log progress at major milestones (0%, 33%, 66%, 100%) to reduce spam
        if (data.trackTitle && data.progress && [0, 33, 66, 100].includes(Math.round(data.progress))) {
          addProgressLogEntry(data.trackTitle, `${Math.round(data.progress)}% - ${data.currentTask || 'Processing'}`, 'info')
        }
        // Update job progress directly instead of reloading all jobs
        setJobs(prevJobs => prevJobs.map(job =>
          job.id === data.id ? { ...job, progress: data.progress, currentTask: data.currentTask } : job
        ))
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
        // Update job to completed status directly instead of reloading all jobs
        setJobs(prevJobs => prevJobs.map(job =>
          job.id === data.id ? {
            ...job,
            status: data.error ? 'failed' as const : 'completed' as const,
            progress: 100,
            results: data.results,
            currentTask: data.error ? 'Analysis failed' : 'Complete'
          } : job
        ))

        // Unregister track from processing
        if (data.trackId) {
          processing.unregisterProcessing([data.trackId], 'analysis')
        }

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
  }, [])

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

  const handleAnalyzeSelected = async () => {
    if (selectedTracks.length === 0) return

    console.log('Creating analysis jobs for selected tracks:', selectedTracks)

    // Check for conflicts and register tracks
    const { allowed, blocked } = processing.registerProcessing(selectedTracks, 'analysis')

    if (blocked.length > 0) {
      const screens = blocked.map(id => processing.getProcessingScreen(id)).filter(Boolean)
      setConflictMessage(
        `${blocked.length} track(s) already being processed in ${screens.join(', ')}. Only ${allowed.length} will be analyzed.`
      )
      setTimeout(() => setConflictMessage(null), 5000)

      if (allowed.length === 0) {
        addProgressLogEntry('System', '❌ All selected tracks are already being processed', 'error')
        return
      }
    }

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.createAnalysisJobs(allowed)
        console.log('Analysis jobs created:', result)

        if (typeof result === 'object' && result && 'success' in result && (result as any).success) {
          const jobsCreated = (result as any).jobsCreated || allowed.length
          addProgressLogEntry('System', `✅ Submitted ${allowed.length} tracks to analysis queue (${jobsCreated} jobs created)`, 'success')
          // Refresh to show new jobs
          await handleRefresh()
        } else {
          addProgressLogEntry('System', '❌ Failed to create analysis jobs', 'error')
          // Unregister on failure
          processing.unregisterProcessing(allowed, 'analysis')
        }
      }
    } catch (error) {
      console.error('Failed to create analysis jobs:', error)
      addProgressLogEntry('System', `❌ Error creating analysis jobs: ${error}`, 'error')
      // Unregister on error
      processing.unregisterProcessing(allowed, 'analysis')
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analysis':
        return renderAnalysisContent()
      case 'grid':
        return renderGridHotCueContent()
      case 'jobs':
        return <JobManagement />
      default:
        return renderAnalysisContent()
    }
  }

  const renderAnalysisContent = () => (
    <>
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
          {/* Show active jobs first (running/pending) */}
          {jobs.filter(job => job.status === 'running' || job.status === 'pending').map((job) => (
            <div key={job.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={clsx(
                    'w-3 h-3 rounded-full',
                    job.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-gray-500'
                  )} />
                  <div>
                    <div className="font-medium">{job.trackTitle}</div>
                    <div className="text-xs text-gray-400">{job.trackArtist}</div>
                  </div>
                </div>
                <div className="text-right">
                  {job.status === 'running' && (
                    <div className="text-sm font-medium text-blue-400">
                      {Math.round(job.progress || 0)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {job.status === 'running' ? (job.currentTask || 'Processing...') : 'Queued'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {job.status === 'running' && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${job.progress || 0}%` }}
                    />
                  </div>

                  {/* Results Preview */}
                  {job.results && (
                    <div className="flex space-x-4 text-xs text-gray-400">
                      {job.results.bpm && (
                        <span className="text-blue-400">BPM: {job.results.bpm}</span>
                      )}
                      {job.results.key && (
                        <span className="text-purple-400">Key: {job.results.key}</span>
                      )}
                      {job.results.energy && (
                        <span className="text-green-400">Energy: {Math.round(job.results.energy * 100)}%</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Show completed and failed jobs (one per track) */}
          {(() => {
            const completedAndFailedJobs = jobs.filter(job => job.status === 'completed' || job.status === 'failed');

            // Group by trackId first, then by track title as fallback
            const groupedByTrack = completedAndFailedJobs.reduce((acc: { [key: string]: AnalysisJob[] }, job) => {
              // Use trackId if available, otherwise use title+artist combination
              const key = job.trackId || `${job.trackTitle || 'Unknown'}-${job.trackArtist || 'Unknown'}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(job);
              return acc;
            }, {});

            // Only show tracks with valid titles (filter out empty entries)
            return Object.entries(groupedByTrack)
              .filter(([_, trackJobs]) => {
                const job = trackJobs[0];
                return job.trackTitle && job.trackTitle.trim() !== '' && job.trackTitle !== 'Unknown Track';
              })
              // Show all entries - no performance issues with static job displays
              .map(([trackKey, trackJobs]) => {
                const representativeJob = trackJobs[0];
                const completedJobs = trackJobs.filter(job => job.status === 'completed');
                const failedJobs = trackJobs.filter(job => job.status === 'failed');

                // Determine overall status
                let overallStatus: 'completed' | 'partial' | 'failed';
                if (completedJobs.length > 0 && failedJobs.length === 0) {
                  overallStatus = 'completed';
                } else if (completedJobs.length > 0 && failedJobs.length > 0) {
                  overallStatus = 'partial';
                } else {
                  overallStatus = 'failed';
                }

                return (
                  <div key={`track-${trackKey}`} className="p-4 bg-gray-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={clsx(
                          'w-3 h-3 rounded-full',
                          overallStatus === 'completed' ? 'bg-green-500' :
                          overallStatus === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                        )} />
                        <div>
                          <div className="font-medium">{representativeJob.trackTitle}</div>
                          <div className="text-xs text-gray-400">{representativeJob.trackArtist}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={clsx(
                          'text-sm font-medium',
                          overallStatus === 'completed' ? 'text-green-400' :
                          overallStatus === 'partial' ? 'text-yellow-400' : 'text-red-400'
                        )}>
                          {overallStatus === 'completed' ? 'Complete' :
                           overallStatus === 'partial' ? 'Partial' : 'Failed'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {completedJobs.length > 0 && failedJobs.length > 0
                            ? `${completedJobs.length} ok, ${failedJobs.length} failed`
                            : trackJobs.length === 1 ? 'Single analysis' : `${trackJobs.length} analysis jobs`
                          }
                        </div>
                      </div>
                    </div>

                    {/* Results Preview for completed jobs */}
                    {(() => {
                      const completedJob = completedJobs.find(job => job.results);
                      return completedJob?.results && (
                        <div className="flex space-x-4 text-xs text-gray-400 mt-2">
                          {completedJob.results.bpm && (
                            <span className="text-blue-400">BPM: {completedJob.results.bpm}</span>
                          )}
                          {completedJob.results.key && (
                            <span className="text-purple-400">Key: {completedJob.results.key}</span>
                          )}
                          {completedJob.results.energy && (
                            <span className="text-green-400">Energy: {Math.round(completedJob.results.energy * 100)}%</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              });
          })()}
        </div>

        {/* Show total count */}
        {(() => {
          const completedAndFailedJobs = jobs.filter(job => job.status === 'completed' || job.status === 'failed');
          const groupedByTrack = completedAndFailedJobs.reduce((acc: { [key: string]: AnalysisJob[] }, job) => {
            const key = job.trackId || `${job.trackTitle || 'Unknown'}-${job.trackArtist || 'Unknown'}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(job);
            return acc;
          }, {});

          const validTracks = Object.entries(groupedByTrack).filter(([_, trackJobs]) => {
            const job = trackJobs[0];
            return job.trackTitle && job.trackTitle.trim() !== '' && job.trackTitle !== 'Unknown Track';
          });
          const uniqueTracks = validTracks.length;

          return uniqueTracks > 0 && (
            <div className="p-4 border-t border-gray-600 text-center text-sm text-gray-400">
              {uniqueTracks} analyzed tracks ({jobs.length} total jobs)
            </div>
          );
        })()}

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
            className="bg-gray-900 rounded-md p-3 h-32 overflow-y-auto font-mono text-xs space-y-1"
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
    </>
  )


  const renderGridHotCueContent = () => {
    const activeGridJobs = gridJobs.filter(job => job.status === 'running')
    const pendingGridJobs = gridJobs.filter(job => job.status === 'pending')
    const completedGridJobs = gridJobs.filter(job => job.status === 'completed')
    const failedGridJobs = gridJobs.filter(job => job.status === 'failed')

    const activeHotCueJobs = hotCueJobs.filter(job => job.status === 'running')
    const pendingHotCueJobs = hotCueJobs.filter(job => job.status === 'pending')
    const completedHotCueJobs = hotCueJobs.filter(job => job.status === 'completed')
    const failedHotCueJobs = hotCueJobs.filter(job => job.status === 'failed')

    return (
      <>
        {/* Grid & HotCue Stats */}
        <div className="grid grid-cols-2 gap-6">
          {/* Grid Calculation Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Grid3X3 className="h-5 w-5 mr-2 text-blue-400" />
              Beat Grid Calculation
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-400">{activeGridJobs.length}</div>
                <div className="text-xs text-gray-400">Processing</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-yellow-400">{pendingGridJobs.length}</div>
                <div className="text-xs text-gray-400">Pending</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-green-400">{completedGridJobs.length}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-red-400">{failedGridJobs.length}</div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
            </div>
          </div>

          {/* HotCue Management Stats */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Target className="h-5 w-5 mr-2 text-purple-400" />
              HotCue Management
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-400">{activeHotCueJobs.length}</div>
                <div className="text-xs text-gray-400">Processing</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-yellow-400">{pendingHotCueJobs.length}</div>
                <div className="text-xs text-gray-400">Pending</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-green-400">{completedHotCueJobs.length}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="text-xl font-bold text-red-400">{failedHotCueJobs.length}</div>
                <div className="text-xs text-gray-400">Failed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Calculation Queue */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
            <h3 className="font-medium flex items-center">
              <Grid3X3 className="h-4 w-4 mr-2 text-blue-400" />
              Beat Grid Calculation Queue ({gridJobs.length} jobs)
            </h3>
          </div>

          <div className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
            {gridJobs.map((job) => (
              <div key={job.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Grid3X3 className="h-4 w-4 text-blue-400" />
                    <div className={clsx(
                      'w-2 h-2 rounded-full',
                      job.status === 'running' ? 'bg-blue-400 animate-pulse' :
                      job.status === 'pending' ? 'bg-yellow-400' :
                      job.status === 'completed' ? 'bg-green-400' :
                      'bg-red-400'
                    )} />
                    <div>
                      <div className="font-medium">{job.trackTitle}</div>
                      <div className="text-sm text-gray-400">{job.trackArtist}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className={clsx('text-sm font-medium', {
                      'text-blue-400': job.status === 'running',
                      'text-yellow-400': job.status === 'pending',
                      'text-green-400': job.status === 'completed',
                      'text-red-400': job.status === 'failed'
                    })}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </div>
                    {job.completedAt && job.startedAt && (
                      <div className="text-xs text-gray-500">
                        {Math.round((job.completedAt - job.startedAt) / 1000)}s
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{job.currentPhase || 'Progress'}</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={clsx(
                        'h-2 rounded-full transition-all duration-300',
                        job.status === 'failed' ? 'bg-red-600' :
                        job.status === 'completed' ? 'bg-green-600' :
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

                {/* Results */}
                {job.results && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                    <div className="text-xs text-green-400 mb-2">Grid Results:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {job.results.beatGrid && (
                        <>
                          <div className="text-green-300">BPM: {job.results.beatGrid.bpm}</div>
                          <div className="text-green-300">Confidence: {Math.round(job.results.beatGrid.confidence * 100)}%</div>
                          <div className="text-green-300">Grid Points: {job.results.beatGrid.gridPoints.length}</div>
                          <div className="text-green-300">First Beat: {job.results.beatGrid.firstBeat.toFixed(2)}s</div>
                        </>
                      )}
                      {job.results.downbeats && (
                        <div className="text-green-300">Downbeats: {job.results.downbeats.length}</div>
                      )}
                      {job.results.phrases && (
                        <div className="text-green-300">Phrases: {job.results.phrases.length}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {gridJobs.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No grid calculation jobs</p>
              <p className="text-xs mt-1">Start beat grid analysis for precise track timing</p>
            </div>
          )}
        </div>

        {/* HotCue Management Queue */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
            <h3 className="font-medium flex items-center">
              <Target className="h-4 w-4 mr-2 text-purple-400" />
              HotCue Management Queue ({hotCueJobs.length} jobs)
            </h3>
          </div>

          <div className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
            {hotCueJobs.map((job) => (
              <div key={job.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Target className="h-4 w-4 text-purple-400" />
                    <div className={clsx(
                      'w-2 h-2 rounded-full',
                      job.status === 'running' ? 'bg-blue-400 animate-pulse' :
                      job.status === 'pending' ? 'bg-yellow-400' :
                      job.status === 'completed' ? 'bg-green-400' :
                      'bg-red-400'
                    )} />
                    <div>
                      <div className="font-medium">{job.trackTitle}</div>
                      <div className="text-sm text-gray-400">{job.trackArtist} • {job.type}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className={clsx('text-sm font-medium', {
                      'text-blue-400': job.status === 'running',
                      'text-yellow-400': job.status === 'pending',
                      'text-green-400': job.status === 'completed',
                      'text-red-400': job.status === 'failed'
                    })}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </div>
                    {job.completedAt && job.startedAt && (
                      <div className="text-xs text-gray-500">
                        {Math.round((job.completedAt - job.startedAt) / 1000)}s
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
                        job.status === 'failed' ? 'bg-red-600' :
                        job.status === 'completed' ? 'bg-green-600' :
                        'bg-purple-600'
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

                {/* Results */}
                {job.results && (
                  <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
                    <div className="text-xs text-purple-400 mb-2">HotCue Results:</div>
                    <div className="space-y-2">
                      {job.results.hotCues.length > 0 && (
                        <div className="text-xs text-purple-300">
                          HotCues: {job.results.hotCues.length} set
                        </div>
                      )}
                      {job.results.autoDetectedCues && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-purple-300">Intro: {job.results.autoDetectedCues.intro.toFixed(1)}s</div>
                          <div className="text-purple-300">Outro: {job.results.autoDetectedCues.outro.toFixed(1)}s</div>
                          <div className="text-purple-300">Drops: {job.results.autoDetectedCues.drops.length}</div>
                          <div className="text-purple-300">Breaks: {job.results.autoDetectedCues.breaks.length}</div>
                        </div>
                      )}
                      {job.results.hotCues.slice(0, 4).map((cue, index) => (
                        <div key={cue.id} className="flex items-center space-x-2 text-xs">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cue.color || '#8B5CF6' }}
                          />
                          <span className="text-purple-300">{cue.name || `Cue ${index + 1}`}</span>
                          <span className="text-gray-400">{cue.position.toFixed(1)}s</span>
                          <span className="text-gray-500 text-xs">{cue.type}</span>
                        </div>
                      ))}
                      {job.results.hotCues.length > 4 && (
                        <div className="text-xs text-gray-500">
                          +{job.results.hotCues.length - 4} more cues
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {hotCueJobs.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No HotCue jobs</p>
              <p className="text-xs mt-1">Auto-detect cue points or manage existing cues</p>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analysis & Processing</h2>
          <p className="text-gray-400">Track analysis, beat grids, hot cues, and background jobs</p>
        </div>

        {/* Tab-specific controls */}
        {activeTab === 'analysis' && (
          <div className="flex items-center space-x-3">
            {selectedTracks.length > 0 && (
              <button
                onClick={handleAnalyzeSelected}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors"
                title="Analyze selected tracks for BPM, key, and energy"
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Analyze ({selectedTracks.length})
              </button>
            )}

            <button
              onClick={() => setShowLiveLog(!showLiveLog)}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                showLiveLog ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
              )}
            >
              <Activity className="h-4 w-4 inline mr-2" />
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
        )}


        {activeTab === 'grid' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                // TODO: Start grid calculation for selected tracks
                console.log('Start grid calculation')
              }}
              disabled={gridJobs.filter(job => job.status === 'pending').length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
            >
              <Grid3X3 className="h-4 w-4 inline mr-2" />
              Calculate Grids ({gridJobs.filter(job => job.status === 'pending').length})
            </button>

            <button
              onClick={() => {
                // TODO: Auto-detect hotcues for selected tracks
                console.log('Auto-detect hotcues')
              }}
              disabled={hotCueJobs.filter(job => job.status === 'pending').length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
            >
              <Target className="h-4 w-4 inline mr-2" />
              Auto-Detect Cues ({hotCueJobs.filter(job => job.status === 'pending').length})
            </button>

            <button
              onClick={() => {
                // TODO: Clear completed grid/hotcue jobs
                setGridJobs(prev => prev.filter(job => job.status !== 'completed'))
                setHotCueJobs(prev => prev.filter(job => job.status !== 'completed'))
              }}
              disabled={gridJobs.filter(job => job.status === 'completed').length === 0 && hotCueJobs.filter(job => job.status === 'completed').length === 0}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
            >
              <RotateCcw className="h-4 w-4 inline mr-2" />
              Clear Completed
            </button>

            <button
              onClick={() => {
                // TODO: Open grid/hotcue settings
                console.log('Open grid/hotcue settings')
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Settings
            </button>
          </div>
        )}
      </div>

      {/* Conflict Warning */}
      {conflictMessage && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-200">{conflictMessage}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('analysis')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            )}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Audio Analysis ({stats.total})
          </button>
          <button
            onClick={() => setActiveTab('grid')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'grid'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            )}
          >
            <Grid3X3 className="h-4 w-4 inline mr-2" />
            Grid & HotCues ({gridJobs.length + hotCueJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={clsx(
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'jobs'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            )}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Background Jobs
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}