import { Disc, Search, Settings, FolderPlus, Youtube, Eye, EyeOff, ChevronDown, Music, Zap } from 'lucide-react'
import { useState } from 'react'
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
  const [showLibraryMenu, setShowLibraryMenu] = useState(false)
  const [showToolsMenu, setShowToolsMenu] = useState(false)

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
            <p className="text-sm text-gray-300">Professional DJ Library</p>
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

          {/* DJ Tools Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg no-drag"
            >
              <Zap className="h-4 w-4 mr-2" />
              DJ Tools
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {showToolsMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                <button
                  onClick={() => { onYouTubeDownloader(); setShowToolsMenu(false) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 rounded-t-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Youtube className="h-4 w-4 mr-3 text-red-400" />
                  YouTube Downloader
                </button>
                {onStemQueue && (
                  <button
                    onClick={() => { onStemQueue(); setShowToolsMenu(false) }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 text-sm font-medium transition-colors flex items-center"
                  >
                    <Music className="h-4 w-4 mr-3 text-purple-400" />
                    STEM Separation
                  </button>
                )}
                {onToggleLogViewer && (
                  <button
                    onClick={() => { onToggleLogViewer(); setShowToolsMenu(false) }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-700 rounded-b-lg text-sm font-medium transition-colors flex items-center"
                  >
                    {showLogViewer ? <EyeOff className="h-4 w-4 mr-3 text-orange-400" /> : <Eye className="h-4 w-4 mr-3 text-green-400" />}
                    {showLogViewer ? 'Hide' : 'Show'} Activity Log
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 🎧 PROFESSIONAL STATUS INDICATORS - Clean & Compact */}
          <div className="flex items-center space-x-3">
            <DownloadStatusIndicator />
            <StemQueueIndicator onClick={onStemQueue} />
          </div>

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