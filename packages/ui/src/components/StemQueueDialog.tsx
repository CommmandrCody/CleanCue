import { useState } from 'react'
import { X, Music2, Clock, CheckCircle, AlertTriangle, Trash2, Play, Pause, Settings, FolderOpen } from 'lucide-react'
import { useStemSeparation } from '../contexts/StemSeparationContext'
import { useElectron } from '../hooks/useElectron'

interface StemQueueDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function StemQueueDialog({ isOpen, onClose }: StemQueueDialogProps) {
  const {
    state,
    removeSeparation,
    cancelSeparation,
    startProcessing,
    stopProcessing,
    clearCompleted,
    updateDefaultSettings
  } = useStemSeparation()
  const { api } = useElectron()
  const [showSettings, setShowSettings] = useState(false)

  if (!isOpen) return null

  const handleRemoveItem = (id: string) => {
    removeSeparation(id)
  }

  const handleCancelItem = async (id: string) => {
    await cancelSeparation(id)
  }

  const handleShowResult = async (path: string) => {
    if (api && path) {
      try {
        await api.showItemInFolder(path)
      } catch (error) {
        console.error('Failed to show file:', error)
      }
    }
  }

  const handleStartQueue = () => {
    startProcessing()
  }

  const handleStopQueue = () => {
    stopProcessing()
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return 'Unknown'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const pendingItems = state.items.filter(item => item.status === 'pending')
  const processingItems = state.items.filter(item => item.status === 'processing')
  const completedItems = state.items.filter(item => item.status === 'completed')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-purple-300">STEM Separation Queue</h2>
            <p className="text-gray-400">
              {state.items.length} total • {pendingItems.length} pending • {processingItems.length} processing
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {state.isProcessing ? (
              <button
                onClick={handleStopQueue}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                <Pause className="h-4 w-4" />
                <span>Stop Queue</span>
              </button>
            ) : (
              <button
                onClick={handleStartQueue}
                disabled={pendingItems.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                <Play className="h-4 w-4" />
                <span>Start Queue</span>
              </button>
            )}

            {completedItems.length > 0 && (
              <button
                onClick={clearCompleted}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Clear Completed</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-gray-700 bg-gray-750">
            <h3 className="font-medium mb-3">Default STEM Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <select
                  value={state.defaultSettings.model}
                  onChange={(e) => updateDefaultSettings({ model: e.target.value as any })}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
                >
                  <option value="htdemucs">HTDemucs (Recommended)</option>
                  <option value="htdemucs_ft">HTDemucs Fine-tuned</option>
                  <option value="htdemucs_6s">HTDemucs 6-stem</option>
                  <option value="mdx_extra">MDX Extra</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Quality</label>
                <select
                  value={state.defaultSettings.quality}
                  onChange={(e) => updateDefaultSettings({ quality: e.target.value as any })}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
                >
                  <option value="low">Low (Faster)</option>
                  <option value="medium">Medium (Recommended)</option>
                  <option value="high">High (Slower)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Queue Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {state.items.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Music2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No STEM separations in queue</p>
              <p className="text-sm">Select tracks in the library and choose "Separate Stems" to add them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.items.map((item) => (
                <div key={item.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Status Icon */}
                      {item.status === 'pending' && <Clock className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                      {item.status === 'processing' && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500 flex-shrink-0"></div>
                      )}
                      {item.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />}
                      {(item.status === 'error' || item.status === 'cancelled') && (
                        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                      )}

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.track.title}</div>
                        <div className="text-sm text-gray-400">
                          {item.track.artist} • {item.settings.model} • {item.settings.quality}
                        </div>

                        {/* Progress Bar */}
                        {item.status === 'processing' && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{Math.round(item.progress)}% complete</span>
                              {item.processingTimeMs && (
                                <span>Processing for {formatDuration(Date.now() - (item.startedAt || item.addedAt))}</span>
                              )}
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(2, item.progress)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Error Message */}
                        {item.status === 'error' && item.errorMessage && (
                          <div className="text-sm text-red-400 mt-1">{item.errorMessage}</div>
                        )}

                        {/* Results */}
                        {item.status === 'completed' && item.results && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.results.vocalsPath && (
                              <button
                                onClick={() => handleShowResult(item.results!.vocalsPath!)}
                                className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors"
                              >
                                <FolderOpen className="h-3 w-3" />
                                <span>Vocals</span>
                              </button>
                            )}
                            {item.results.drumsPath && (
                              <button
                                onClick={() => handleShowResult(item.results!.drumsPath!)}
                                className="flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                              >
                                <FolderOpen className="h-3 w-3" />
                                <span>Drums</span>
                              </button>
                            )}
                            {item.results.bassPath && (
                              <button
                                onClick={() => handleShowResult(item.results!.bassPath!)}
                                className="flex items-center space-x-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                              >
                                <FolderOpen className="h-3 w-3" />
                                <span>Bass</span>
                              </button>
                            )}
                            {item.results.otherPath && (
                              <button
                                onClick={() => handleShowResult(item.results!.otherPath!)}
                                className="flex items-center space-x-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs transition-colors"
                              >
                                <FolderOpen className="h-3 w-3" />
                                <span>Other</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      {item.status === 'processing' && (
                        <button
                          onClick={() => handleCancelItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      {(item.status === 'pending' || item.status === 'error' || item.status === 'cancelled') && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}