import { Music2, Clock } from 'lucide-react'
import { useStemSeparation } from '../contexts/StemSeparationContext'

interface StemQueueIndicatorProps {
  onClick?: () => void
}

export function StemQueueIndicator({ onClick }: StemQueueIndicatorProps) {
  const { state, getActiveItems, getPendingItems } = useStemSeparation()

  const activeItems = getActiveItems()
  const pendingItems = getPendingItems()
  const totalInProgress = activeItems.length + pendingItems.length

  if (totalInProgress === 0) {
    return null // Don't show indicator when nothing is processing
  }

  const isProcessing = state.isProcessing
  const currentItem = state.currentItem ? state.items.find(item => item.id === state.currentItem) : null

  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-all duration-200 no-drag"
      title="STEM Separation Queue"
    >
      <div className="relative">
        {isProcessing ? (
          <Music2 className="h-4 w-4 text-purple-400 animate-pulse" />
        ) : (
          <Clock className="h-4 w-4 text-purple-400" />
        )}

        {/* Queue count badge */}
        {totalInProgress > 0 && (
          <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {totalInProgress}
          </div>
        )}
      </div>

      <div className="flex flex-col items-start min-w-0">
        <div className="text-sm font-medium text-purple-300">
          {isProcessing ? 'Processing...' : `${totalInProgress} Queued`}
        </div>
        {currentItem && (
          <div className="text-xs text-purple-400 truncate max-w-24">
            {currentItem.track.title}
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {isProcessing && currentItem && (
        <div className="flex items-center space-x-1">
          <div className="w-12 bg-purple-900/50 rounded-full h-1.5">
            <div
              className="bg-purple-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, currentItem.progress)}%` }}
            />
          </div>
          <span className="text-xs text-purple-400 min-w-max">
            {Math.round(currentItem.progress)}%
          </span>
        </div>
      )}
    </button>
  )
}