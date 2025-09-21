import { Disc, Search, Settings, FolderPlus, Youtube, Eye, EyeOff } from 'lucide-react'
import { DownloadStatusIndicator } from './DownloadStatusIndicator'
import { StemQueueIndicator } from './StemQueueIndicator'

interface HeaderProps {
  onScan: () => void
  onSettings: () => void
  onImport: () => void
  onYouTubeDownloader: () => void
  onStemQueue?: () => void
  showLogViewer?: boolean
  onToggleLogViewer?: () => void
}

export function Header({ onScan, onSettings, onImport, onYouTubeDownloader, onStemQueue, showLogViewer, onToggleLogViewer }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 px-6 py-4 shadow-lg drag-region">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 drag-region">
          <div className="relative">
            <Disc className="h-10 w-10 text-blue-400 animate-pulse" />
            <div className="absolute inset-0 h-10 w-10 bg-blue-400/20 rounded-full blur-sm"></div>
          </div>
          <div className="drag-region">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">CleanCue</h1>
            <p className="text-sm text-gray-300">DJ Library Manager</p>
          </div>
        </div>

        {/* Spacer for dragging */}
        <div className="flex-1 min-w-0 drag-region"></div>

        <div className="flex items-center space-x-3 no-drag">
          <button
            onClick={onImport}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 no-drag"
          >
            <FolderPlus className="h-4 w-4 inline mr-2" />
            Add Folder
          </button>

          <button
            onClick={onYouTubeDownloader}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 no-drag"
          >
            <Youtube className="h-4 w-4 inline mr-2" />
            YouTube
          </button>

          <button
            onClick={onScan}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 no-drag"
          >
            <Search className="h-4 w-4 inline mr-2" />
            Scan Library
          </button>

          {/* Download Status Indicator */}
          <DownloadStatusIndicator />

          {/* STEM Queue Indicator */}
          <StemQueueIndicator onClick={onStemQueue} />

          {onToggleLogViewer && (
            <button
              onClick={onToggleLogViewer}
              className={`p-2 transition-all duration-200 hover:bg-gray-700/50 rounded-lg no-drag ${
                showLogViewer ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'
              }`}
              aria-label={showLogViewer ? 'Hide log viewer' : 'Show log viewer'}
              title={showLogViewer ? 'Hide transparency logs' : 'Show transparency logs'}
            >
              {showLogViewer ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            </button>
          )}

          <button
            onClick={onSettings}
            className="p-2 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:bg-gray-700/50 rounded-lg no-drag"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}