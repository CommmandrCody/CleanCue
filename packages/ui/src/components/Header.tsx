import { Disc, Search, Settings, FolderPlus, Youtube } from 'lucide-react'

interface HeaderProps {
  onScan: () => void
  onSettings: () => void
  onImport: () => void
  onYouTubeDownloader: () => void
}

export function Header({ onScan, onSettings, onImport, onYouTubeDownloader }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-6 drag-region">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 drag-region">
          <Disc className="h-10 w-10 text-primary-500" />
          <div className="drag-region">
            <h1 className="text-2xl font-bold">CleanCue</h1>
            <p className="text-sm text-gray-400">DJ Library Manager</p>
          </div>
        </div>

        {/* Spacer for dragging */}
        <div className="flex-1 min-w-0 drag-region"></div>

        <div className="flex items-center space-x-4 no-drag">
          <button
            onClick={onImport}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors no-drag"
          >
            <FolderPlus className="h-4 w-4 inline mr-2" />
            Add Folder
          </button>

          <button
            onClick={onYouTubeDownloader}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors no-drag"
          >
            <Youtube className="h-4 w-4 inline mr-2" />
            YouTube
          </button>

          <button
            onClick={onScan}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md text-sm font-medium transition-colors no-drag"
          >
            <Search className="h-4 w-4 inline mr-2" />
            Scan Library
          </button>


          <button
            onClick={onSettings}
            className="p-2 text-gray-400 hover:text-white transition-colors no-drag"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}