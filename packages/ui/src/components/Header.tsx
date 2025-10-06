import { Disc, Search, Settings, FolderPlus, Eye, EyeOff, Music, ChevronDown } from 'lucide-react'
import { useState } from 'react'
// import { StemQueueIndicator } from './StemQueueIndicator' // Disabled: not implemented in simple engine

interface HeaderProps {
  onScan: () => void
  onSettings: () => void
  onImport: () => void
  showLogViewer?: boolean
  onToggleLogViewer?: () => void
}

export function Header({ onScan, onSettings, onImport, showLogViewer, onToggleLogViewer }: HeaderProps) {
  const [showLibraryMenu, setShowLibraryMenu] = useState(false)

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 py-3 shadow-lg drag-region pt-8 px-6">
      <div className="flex items-center justify-between">
        {/* 🎧 DJ BRANDING - Professional & Clean */}
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

        {/* 🎧 DJ WORKFLOW CENTER - Revolutionary Design */}
        <div className="flex items-center space-x-4 no-drag">

          {/* Library Management Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLibraryMenu(!showLibraryMenu)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg no-drag"
            >
              <Music className="h-4 w-4 mr-2" />
              Library
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {showLibraryMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                <button
                  onClick={() => { onImport(); setShowLibraryMenu(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 rounded-t-lg text-sm font-medium transition-colors flex items-center"
                >
                  <FolderPlus className="h-4 w-4 mr-3 text-emerald-400" />
                  Add Music Folder
                </button>
                <button
                  onClick={() => { onScan(); setShowLibraryMenu(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 rounded-b-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Search className="h-4 w-4 mr-3 text-blue-400" />
                  Scan Library
                </button>
              </div>
            )}
          </div>

          {/* Activity Log Toggle */}
          {onToggleLogViewer && (
            <button
              onClick={onToggleLogViewer}
              className="p-2 text-gray-400 hover:text-blue-400 transition-all duration-200 hover:bg-gray-700/50 rounded-lg no-drag"
              title={showLogViewer ? 'Hide Activity Log' : 'Show Activity Log'}
            >
              {showLogViewer ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          )}

          {/* Settings - Single Clean Button */}
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