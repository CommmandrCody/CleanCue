import { useState } from 'react'
import { Download, CheckCircle, AlertTriangle, Clock, X, Pause, Play } from 'lucide-react'
import { useYouTubeDownload } from '../contexts/YouTubeDownloadContext'

export function DownloadStatusIndicator() {
  const { state, stopProcessing, startProcessing, clearCompleted } = useYouTubeDownload()
  const [showDetails, setShowDetails] = useState(false)

  const activeDownloads = state.items.filter(item => item.status === 'downloading')
  const pendingDownloads = state.items.filter(item => item.status === 'pending')
  const completedDownloads = state.items.filter(item => item.status === 'completed')
  const erroredDownloads = state.items.filter(item => item.status === 'error')

  const totalActive = activeDownloads.length + pendingDownloads.length

  if (state.items.length === 0) {
    return null
  }

  const getStatusIcon = () => {
    if (activeDownloads.length > 0) {
      return <Download className="h-4 w-4 animate-bounce text-blue-400" />
    }
    if (pendingDownloads.length > 0) {
      return <Clock className="h-4 w-4 text-yellow-400" />
    }
    if (erroredDownloads.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-red-400" />
    }
    if (completedDownloads.length > 0) {
      return <CheckCircle className="h-4 w-4 text-green-400" />
    }
    return <Download className="h-4 w-4 text-gray-400" />
  }

  const getStatusText = () => {
    if (activeDownloads.length > 0) {
      return `Downloading ${activeDownloads.length}/${state.items.length}`
    }
    if (pendingDownloads.length > 0) {
      return `${pendingDownloads.length} pending`
    }
    if (erroredDownloads.length > 0) {
      return `${erroredDownloads.length} failed`
    }
    if (completedDownloads.length > 0) {
      return `${completedDownloads.length} completed`
    }
    return 'No downloads'
  }

  const handleToggleProcessing = () => {
    if (state.isProcessing) {
      stopProcessing()
    } else if (pendingDownloads.length > 0) {
      startProcessing()
    }
  }

  return (
    <div className="relative">
      {/* Status Indicator Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
      >
        {getStatusIcon()}
        <span className="text-sm">{getStatusText()}</span>
        {totalActive > 0 && (
          <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {totalActive}
          </span>
        )}
      </button>

      {/* Details Panel */}
      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Download Queue</h3>
              <div className="flex items-center space-x-2">
                {pendingDownloads.length > 0 && (
                  <button
                    onClick={handleToggleProcessing}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title={state.isProcessing ? 'Pause downloads' : 'Start downloads'}
                  >
                    {state.isProcessing ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                )}
                {completedDownloads.length > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Clear completed"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Download Items */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {state.items.slice(0, 10).map((item) => (
                <div key={item.id} className="p-2 bg-gray-700 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {item.status === 'pending' && <Clock className="h-3 w-3 text-yellow-400 flex-shrink-0" />}
                      {item.status === 'downloading' && <Download className="h-3 w-3 text-blue-400 animate-pulse flex-shrink-0" />}
                      {item.status === 'completed' && <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />}
                      {item.status === 'error' && <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />}

                      <span className="truncate text-xs">{item.title}</span>
                    </div>
                  </div>

                  {item.status === 'downloading' && item.progress && (
                    <div className="mt-1">
                      <div className="w-full bg-gray-600 rounded-full h-1">
                        <div
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${item.progress.percentage || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{item.progress.percentage?.toFixed(1)}%</span>
                        <span>{item.progress.speed}</span>
                      </div>
                    </div>
                  )}

                  {item.status === 'error' && item.error && (
                    <div className="mt-1 text-xs text-red-400 truncate">
                      {item.error}
                    </div>
                  )}
                </div>
              ))}

              {state.items.length > 10 && (
                <div className="text-center text-xs text-gray-400 py-2">
                  ...and {state.items.length - 10} more items
                </div>
              )}

              {state.items.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  <Download className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No downloads in queue</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}