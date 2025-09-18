import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, BarChart3, Key, Clock, Zap, AlertTriangle } from 'lucide-react'
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
    energy?: number
    duration?: number
    errors?: string[]
  }
}

export function AnalysisProgress() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([])
  const [isRunning, setIsRunning] = useState(true)
  // Calculate stats from actual jobs
  const stats = {
    total: jobs.length,
    completed: jobs.filter(job => job.status === 'completed').length,
    failed: jobs.filter(job => job.status === 'failed').length,
    remaining: jobs.filter(job => job.status === 'pending' || job.status === 'running').length
  }

  // Load real analysis jobs from backend
  useEffect(() => {
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
      }
    }

    loadJobs()

    // Poll for updates every 2 seconds if jobs are running
    const interval = setInterval(() => {
      if (jobs.some(job => job.status === 'running')) {
        loadJobs()
      }
    }, 2000)

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <BarChart3 className="h-4 w-4 text-green-400" />
      case 'running':
        return <BarChart3 className="h-4 w-4 text-blue-400 animate-pulse" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
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
      default:
        return 'text-gray-400'
    }
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

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-primary-400">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Tracks</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          <div className="text-sm text-gray-400">Failed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">{stats.remaining}</div>
          <div className="text-sm text-gray-400">Remaining</div>
        </div>
      </div>

      {/* Analysis Queue */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h3 className="font-medium">Analysis Queue</h3>
        </div>

        <div className="divide-y divide-gray-700">
          {jobs.map((job) => (
            <div key={job.id} className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <div className="font-medium">{job.trackTitle}</div>
                    <div className="text-sm text-gray-400">{job.trackArtist}</div>
                  </div>
                </div>

                <div className={clsx('text-sm font-medium', getStatusColor(job.status))}>
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{job.currentTask || 'Waiting...'}</span>
                  <span>{Math.round(job.progress)}%</span>
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

              {/* Results */}
              {job.results && (
                <div className="space-y-2">
                  {job.results.errors ? (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                      <div className="text-sm text-red-300">
                        {job.results.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      {job.results.bpm && (
                        <div className="flex items-center space-x-2">
                          <Play className="h-4 w-4 text-blue-400" />
                          <span className="text-sm">
                            <span className="text-gray-400">BPM:</span> {job.results.bpm}
                          </span>
                        </div>
                      )}
                      {job.results.key && (
                        <div className="flex items-center space-x-2">
                          <Key className="h-4 w-4 text-purple-400" />
                          <span className="text-sm">
                            <span className="text-gray-400">Key:</span> {job.results.key}
                          </span>
                        </div>
                      )}
                      {job.results.energy && (
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm">
                            <span className="text-gray-400">Energy:</span> {job.results.energy}
                          </span>
                        </div>
                      )}
                      {job.results.duration && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-green-400" />
                          <span className="text-sm">
                            <span className="text-gray-400">Duration:</span> {Math.floor(job.results.duration / 60)}:{(job.results.duration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tracks in analysis queue</p>
            <p className="text-sm mt-2">Scan your library to add tracks for analysis</p>
          </div>
        )}
      </div>
    </div>
  )
}