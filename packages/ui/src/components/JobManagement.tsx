import { useState, useEffect, useRef } from 'react'
import {
  Play, RotateCcw, BarChart3, Clock,
  RefreshCw, Database, FileText, Download,
  CheckCircle, XCircle, Loader, Calendar, User, Settings,
  PlayCircle, PauseCircle, StopCircle
} from 'lucide-react'
import clsx from 'clsx'

// Background job types for DJ operations
interface BackgroundJob {
  id: string
  type: 'scan' | 'file_stage' | 'batch_analyze' | 'analyze' | 'batch_export' | 'export' | 'cleanup'
  status: 'created' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
  priority: number
  payload: Record<string, any>
  progress: number
  result?: Record<string, any>
  error?: string
  attempts: number
  maxAttempts: number
  parentJobId?: string
  userInitiated: boolean
  timeoutSeconds: number
  createdAt: Date
  queuedAt?: Date
  startedAt?: Date
  completedAt?: Date
  timeoutAt?: Date
}

interface JobStats {
  total: number
  created: number
  queued: number
  running: number
  completed: number
  failed: number
  cancelled: number
  timeout: number
}

interface JobLogEntry {
  id: string
  timestamp: number
  jobId: string
  jobType: string
  message: string
  type: 'info' | 'success' | 'error' | 'warning'
}

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  duration?: number
}

interface JobManagementProps {
  onPlayTrack?: (tracks: Track[], startIndex?: number) => void
}

export function JobManagement({ onPlayTrack }: JobManagementProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([])
  const [jobStats, setJobStats] = useState<JobStats>({
    total: 0, created: 0, queued: 0, running: 0,
    completed: 0, failed: 0, cancelled: 0, timeout: 0
  })
  const [jobLog, setJobLog] = useState<JobLogEntry[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showLog, setShowLog] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const logRef = useRef<HTMLDivElement>(null)

  // Helper functions
  const formatTime = (timestamp: number | Date) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return 'N/A'
    const end = endTime || new Date()
    const start = new Date(startTime)
    const diffMs = end.getTime() - start.getTime()
    const seconds = Math.floor(diffMs / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const addJobLogEntry = (jobId: string, jobType: string, message: string, type: JobLogEntry['type'] = 'info') => {
    const entry: JobLogEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      jobId,
      jobType,
      message,
      type
    }
    setJobLog(prev => [...prev.slice(-99), entry]) // Keep last 100 entries

    // Auto-scroll to bottom
    setTimeout(() => {
      if (logRef.current) {
        logRef.current.scrollTop = logRef.current.scrollHeight
      }
    }, 100)
  }

  // Load all jobs from the new job management system
  const loadJobs = async () => {
    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.getAllJobs()
        if (response && Array.isArray(response)) {
          setJobs(response.map((job: any) => ({
            ...job,
            createdAt: new Date(job.createdAt),
            queuedAt: job.queuedAt ? new Date(job.queuedAt) : undefined,
            startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
            completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
            timeoutAt: job.timeoutAt ? new Date(job.timeoutAt) : undefined,
          })))

          // Calculate stats
          const stats = response.reduce((acc: JobStats, job: any) => {
            acc.total++
            acc[job.status as keyof JobStats]++
            return acc
          }, { total: 0, created: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, timeout: 0 })

          setJobStats(stats)
        }
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
      addJobLogEntry('system', 'system', `Failed to load jobs: ${error}`, 'error')
    }
  }

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true)
    addJobLogEntry('system', 'system', 'Refreshing job status...', 'info')

    try {
      await loadJobs()
      addJobLogEntry('system', 'system', 'Job status refreshed successfully', 'success')
    } catch (error) {
      addJobLogEntry('system', 'system', `Refresh failed: ${error}`, 'error')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Job actions
  const handleCancelJob = async (jobId: string) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.cancelJob(jobId)
        if (result) {
          addJobLogEntry(jobId, 'cancel', 'Job cancelled successfully', 'warning')
          await loadJobs()
        }
      }
    } catch (error) {
      addJobLogEntry(jobId, 'cancel', `Failed to cancel job: ${error}`, 'error')
    }
  }

  const handleRetryJob = async (jobId: string) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.retryJob(jobId)
        if (result) {
          addJobLogEntry(jobId, 'retry', 'Job queued for retry', 'info')
          await loadJobs()
        }
      }
    } catch (error) {
      addJobLogEntry(jobId, 'retry', `Failed to retry job: ${error}`, 'error')
    }
  }

  const handleAbortAllJobs = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.abortAllJobs()
        addJobLogEntry('system', 'system', 'All active jobs cancelled', 'warning')
        await loadJobs()
      }
    } catch (error) {
      addJobLogEntry('system', 'system', `Failed to abort jobs: ${error}`, 'error')
    }
  }

  // Initialize and set up event listeners
  useEffect(() => {
    loadJobs()

    // Set up real-time event listeners for new job system
    if (window.electronAPI) {
      const handleJobStarted = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Job started event received:', data)
        addJobLogEntry(data.jobId, data.type, `Job started: ${data.type}`, 'info')
        loadJobs()
      }

      const handleJobProgress = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Job progress event received:', data)
        addJobLogEntry(data.jobId, data.type || 'unknown', `Progress: ${data.progress}%`, 'info')
        loadJobs()
      }

      const handleJobCompleted = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Job completed event received:', data)
        addJobLogEntry(data.jobId, data.type || 'unknown', 'Job completed successfully', 'success')
        loadJobs()
      }

      const handleJobFailed = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Job failed event received:', data)
        addJobLogEntry(data.jobId, data.type || 'unknown', `Job failed: ${data.error || 'Unknown error'}`, 'error')
        loadJobs()
      }

      const handleJobCancelled = (...args: any[]) => {
        const data = args.length > 1 ? args[1] : args[0]
        console.log('[UI] Job cancelled event received:', data)
        addJobLogEntry(data.jobId, data.type || 'unknown', `Job cancelled: ${data.reason || 'User requested'}`, 'warning')
        loadJobs()
      }

      // Add event listeners for new job system
      window.electronAPI.on('job:started', handleJobStarted)
      window.electronAPI.on('job:progress', handleJobProgress)
      window.electronAPI.on('job:completed', handleJobCompleted)
      window.electronAPI.on('job:failed', handleJobFailed)
      window.electronAPI.on('job:cancelled', handleJobCancelled)

      // Also listen to legacy events for backward compatibility
      window.electronAPI.on('analysis:started', handleJobStarted)
      window.electronAPI.on('analysis:progress', handleJobProgress)
      window.electronAPI.on('analysis:completed', handleJobCompleted)

      // Cleanup event listeners
      return () => {
        if (window.electronAPI) {
          window.electronAPI.removeListener('job:started', handleJobStarted)
          window.electronAPI.removeListener('job:progress', handleJobProgress)
          window.electronAPI.removeListener('job:completed', handleJobCompleted)
          window.electronAPI.removeListener('job:failed', handleJobFailed)
          window.electronAPI.removeListener('job:cancelled', handleJobCancelled)
          window.electronAPI.removeListener('analysis:started', handleJobStarted)
          window.electronAPI.removeListener('analysis:progress', handleJobProgress)
          window.electronAPI.removeListener('analysis:completed', handleJobCompleted)
        }
      }
    }

    // Auto-refresh if enabled and there are active jobs
    const interval = setInterval(() => {
      if (autoRefresh && jobs.some(job => job.status === 'running' || job.status === 'queued')) {
        loadJobs()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [autoRefresh, jobs])

  // Filter jobs based on status and type
  const filteredJobs = jobs.filter(job => {
    if (filterStatus !== 'all' && job.status !== filterStatus) return false
    if (filterType !== 'all' && job.type !== filterType) return false
    return true
  })

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'scan':
        return <Database className="h-4 w-4 text-blue-400" />
      case 'file_stage':
        return <FileText className="h-4 w-4 text-green-400" />
      case 'analyze':
      case 'batch_analyze':
        return <BarChart3 className="h-4 w-4 text-purple-400" />
      case 'export':
      case 'batch_export':
        return <Download className="h-4 w-4 text-orange-400" />
      case 'cleanup':
        return <RefreshCw className="h-4 w-4 text-gray-400" />
      default:
        return <Settings className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'running':
        return <Loader className="h-4 w-4 text-blue-400 animate-spin" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />
      case 'cancelled':
        return <StopCircle className="h-4 w-4 text-orange-400" />
      case 'timeout':
        return <Clock className="h-4 w-4 text-yellow-400" />
      case 'queued':
        return <PlayCircle className="h-4 w-4 text-cyan-400" />
      default:
        return <PauseCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'running':
        return 'text-blue-400'
      case 'failed':
        return 'text-red-400'
      case 'cancelled':
        return 'text-orange-400'
      case 'timeout':
        return 'text-yellow-400'
      case 'queued':
        return 'text-cyan-400'
      default:
        return 'text-gray-400'
    }
  }

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'text-red-400 bg-red-900/20' // High priority
    if (priority <= 5) return 'text-yellow-400 bg-yellow-900/20' // Medium priority
    return 'text-green-400 bg-green-900/20' // Low priority
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Background Job Management</h2>
          <p className="text-gray-400">Monitor and control DJ operations and analysis tasks</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
            )}
          >
            <RefreshCw className="h-4 w-4 inline mr-2" />
            Auto-Refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowLog(!showLog)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              showLog ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-700'
            )}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            {showLog ? 'Hide Log' : 'Show Log'}
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className={clsx('h-4 w-4 inline mr-2', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={handleAbortAllJobs}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
          >
            <StopCircle className="h-4 w-4 inline mr-2" />
            Abort All
          </button>
        </div>
      </div>

      {/* Essential Stats Only */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{jobStats.running}</div>
          <div className="text-sm text-gray-400">Running</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{jobStats.completed}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{jobStats.failed}</div>
          <div className="text-sm text-gray-400">Failed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Status Filter</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="timeout">Timeout</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Type Filter</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="scan">Scan</option>
            <option value="file_stage">File Stage</option>
            <option value="analyze">Analyze</option>
            <option value="batch_analyze">Batch Analyze</option>
            <option value="export">Export</option>
            <option value="batch_export">Batch Export</option>
            <option value="cleanup">Cleanup</option>
          </select>
        </div>
      </div>

      {/* Jobs Queue */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h3 className="font-medium">Jobs Queue ({filteredJobs.length} jobs)</h3>
        </div>

        <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
          {filteredJobs.map((job) => (
            <div key={job.id} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getJobTypeIcon(job.type)}
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="font-medium flex items-center space-x-2">
                      <span>{job.type.replace('_', ' ').toUpperCase()}</span>
                      <span className={clsx('text-xs px-2 py-1 rounded', getPriorityColor(job.priority))}>
                        P{job.priority}
                      </span>
                      {job.userInitiated && (
                        <User className="h-3 w-3 text-blue-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      ID: {job.id.substring(0, 8)}...
                      {job.parentJobId && ` | Parent: ${job.parentJobId.substring(0, 8)}...`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={clsx('text-sm font-medium', getStatusColor(job.status))}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(job.startedAt, job.completedAt)}
                  </div>
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
                      job.status === 'cancelled' ? 'bg-orange-600' :
                      job.status === 'timeout' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    )}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              {/* Job Details */}
              <div className="space-y-2">
                {/* Error Message */}
                {job.error && (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                    <div className="text-sm text-red-300">{job.error}</div>
                  </div>
                )}

                {/* Job Payload */}
                {job.payload && Object.keys(job.payload).length > 0 && (
                  <div className="bg-gray-900 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-2">Payload:</div>
                    <div className="text-xs text-gray-300 font-mono">
                      {JSON.stringify(job.payload, null, 2).substring(0, 200)}
                      {JSON.stringify(job.payload).length > 200 && '...'}
                    </div>
                  </div>
                )}

                {/* Job Result */}
                {job.result && Object.keys(job.result).length > 0 && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                    <div className="text-xs text-green-400 mb-2">Result:</div>
                    <div className="text-xs text-green-300 font-mono">
                      {JSON.stringify(job.result, null, 2).substring(0, 200)}
                      {JSON.stringify(job.result).length > 200 && '...'}
                    </div>
                  </div>
                )}

                {/* Timing Information */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-400">
                  <div>
                    <Calendar className="h-3 w-3 inline mr-1" />
                    Created: {formatTime(job.createdAt)}
                  </div>
                  {job.queuedAt && (
                    <div>
                      <PlayCircle className="h-3 w-3 inline mr-1" />
                      Queued: {formatTime(job.queuedAt)}
                    </div>
                  )}
                  {job.startedAt && (
                    <div>
                      <Play className="h-3 w-3 inline mr-1" />
                      Started: {formatTime(job.startedAt)}
                    </div>
                  )}
                  {job.completedAt && (
                    <div>
                      <CheckCircle className="h-3 w-3 inline mr-1" />
                      Completed: {formatTime(job.completedAt)}
                    </div>
                  )}
                </div>

                {/* Job Actions */}
                {(job.status === 'running' || job.status === 'queued') && (
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => handleCancelJob(job.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors"
                    >
                      <StopCircle className="h-3 w-3 inline mr-1" />
                      Cancel
                    </button>
                  </div>
                )}

                {(job.status === 'failed' || job.status === 'timeout') && job.attempts < job.maxAttempts && (
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => handleRetryJob(job.id)}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="h-3 w-3 inline mr-1" />
                      Retry ({job.attempts}/{job.maxAttempts})
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No jobs match current filters</p>
            <p className="text-sm mt-2">Jobs will appear here as they are created</p>
          </div>
        )}
      </div>

      {/* Live Job Log */}
      {showLog && jobLog.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-green-400" />
            Live Job Log
          </h3>
          <div
            ref={logRef}
            className="bg-gray-900 rounded-md p-3 h-64 overflow-y-auto font-mono text-xs space-y-1"
          >
            {jobLog.map(entry => (
              <div key={entry.id} className="flex items-start space-x-2">
                <span className="text-gray-500 shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
                <span className={clsx(
                  'shrink-0',
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'success' ? 'text-green-400' :
                  entry.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                )}>
                  [{entry.jobType}]
                </span>
                <span className="text-gray-300">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}