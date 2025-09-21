import { useState, useEffect } from 'react'
import { LibraryView } from './components/LibraryView'
import { ScanDialog } from './components/ScanDialog'
import { AnalysisProgress } from './components/AnalysisProgress'
import { HealthDashboard } from './components/HealthDashboard'
import { DuplicateDetection } from './components/DuplicateDetection'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Settings } from './components/Settings'
import { LibraryImport } from './components/LibraryImport'
import { YouTubeDownloader } from './components/YouTubeDownloader'
import { AudioPlayer } from './components/AudioPlayer'
import { LogViewer } from './components/LogViewer'
import { StemQueueDialog } from './components/StemQueueDialog'
import { YouTubeDownloadProvider } from './contexts/YouTubeDownloadContext'
import { StemSeparationProvider } from './contexts/StemSeparationContext'

type ViewType = 'library' | 'health' | 'duplicates' | 'analysis'

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  duration?: number
}

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('library')
  const [showScanDialog, setShowScanDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showYouTubeDownloader, setShowYouTubeDownloader] = useState(false)
  const [showStemQueue, setShowStemQueue] = useState(false)
  const [showLogViewer, setShowLogViewer] = useState(true)
  const [logViewerHeight] = useState(200)
  const [showHelp, setShowHelp] = useState(false)
  const [appReady, setAppReady] = useState(false)

  // Audio player state
  const [currentPlaylist, setCurrentPlaylist] = useState<Track[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [showPlayer, setShowPlayer] = useState(false)

  const handlePlayTrack = (tracks: Track[], startIndex: number = 0) => {
    setCurrentPlaylist(tracks)
    setCurrentTrackIndex(startIndex)
    setShowPlayer(true)
  }

  const handleTrackChange = (newIndex: number) => {
    setCurrentTrackIndex(newIndex)
  }

  const handleClosePlayer = () => {
    setShowPlayer(false)
    setCurrentPlaylist([])
    setCurrentTrackIndex(0)
  }

  // Initialize app and ensure engine is ready
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (window.electronAPI) {
          console.log('[App] 🚀 Initializing application...')
          // Wait a bit for the main process to fully initialize
          await new Promise(resolve => setTimeout(resolve, 1000))
          console.log('[App] ✅ Application ready')
          setAppReady(true)
        } else {
          // For web mode, set ready immediately
          setAppReady(true)
        }
      } catch (error) {
        console.error('[App] ❌ Failed to initialize:', error)
        // Set ready anyway to not block the UI
        setAppReady(true)
      }
    }

    initializeApp()
  }, [])

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Prevent shortcuts when user is typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Cmd/Ctrl + shortcuts
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case ',':
            e.preventDefault()
            setShowSettings(true)
            break
          case 'f':
            e.preventDefault()
            setShowScanDialog(true)
            break
          case 'i':
            e.preventDefault()
            setShowImport(true)
            break
          case 'l':
            e.preventDefault()
            setShowLogViewer(!showLogViewer)
            break
        }
      }

      // Number keys for view switching
      if (e.key >= '1' && e.key <= '4' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        const views: ViewType[] = ['library', 'health', 'duplicates', 'analysis']
        const viewIndex = parseInt(e.key) - 1
        if (views[viewIndex]) {
          setCurrentView(views[viewIndex])
        }
      }

      // Help shortcut
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setShowHelp(!showHelp)
      }

      // Escape to close dialogs
      if (e.key === 'Escape') {
        if (showHelp) setShowHelp(false)
        else if (showScanDialog) setShowScanDialog(false)
        else if (showSettings) setShowSettings(false)
        else if (showImport) setShowImport(false)
        else if (showYouTubeDownloader) setShowYouTubeDownloader(false)
        else if (showStemQueue) setShowStemQueue(false)
        else if (showPlayer) handleClosePlayer()
      }
    }

    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [showLogViewer, showScanDialog, showSettings, showImport, showYouTubeDownloader, showStemQueue, showPlayer, showHelp])


  const renderView = () => {
    if (!appReady) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Initializing CleanCue...</p>
          </div>
        </div>
      )
    }

    switch (currentView) {
      case 'library':
        return <LibraryView onPlayTrack={handlePlayTrack} />
      case 'health':
        return <HealthDashboard />
      case 'duplicates':
        return <DuplicateDetection />
      case 'analysis':
        return <AnalysisProgress />
      default:
        return <LibraryView onPlayTrack={handlePlayTrack} />
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <Header
        onScan={() => setShowScanDialog(true)}
        onSettings={() => setShowSettings(true)}
        onImport={() => setShowImport(true)}
        onYouTubeDownloader={() => setShowYouTubeDownloader(true)}
        onStemQueue={() => setShowStemQueue(true)}
        showLogViewer={showLogViewer}
        onToggleLogViewer={() => setShowLogViewer(!showLogViewer)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => setCurrentView(view as ViewType)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 p-6 overflow-auto">
            {renderView()}
          </main>

          {/* Log Viewer at bottom of each screen */}
          {showLogViewer && (
            <div className="border-t border-gray-700" style={{ height: `${logViewerHeight}px`, minHeight: `${logViewerHeight}px` }}>
              <LogViewer />
            </div>
          )}
        </div>
      </div>

      {showScanDialog && (
        <ScanDialog onClose={() => setShowScanDialog(false)} />
      )}

      {showSettings && (
        <Settings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showImport && (
        <LibraryImport
          isOpen={showImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showYouTubeDownloader && (
        <YouTubeDownloader
          isOpen={showYouTubeDownloader}
          onClose={() => setShowYouTubeDownloader(false)}
        />
      )}

      {showStemQueue && (
        <StemQueueDialog
          isOpen={showStemQueue}
          onClose={() => setShowStemQueue(false)}
        />
      )}

      {/* Audio Player */}
      {showPlayer && currentPlaylist.length > 0 && (
        <AudioPlayer
          tracks={currentPlaylist}
          currentTrackIndex={currentTrackIndex}
          onTrackChange={handleTrackChange}
          onClose={handleClosePlayer}
        />
      )}

      {/* Help Overlay */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">⌨️ Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowHelp(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">🎧 DJ Workflow Shortcuts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Find tracks</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Add folder</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘I</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Settings</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘,</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Toggle logs</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">⌘L</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">📱 Navigation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Library view</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Health dashboard</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">2</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Duplicates</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">3</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Analysis progress</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">4</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">🔧 General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Show this help</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">?</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Close dialogs</span>
                    <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Esc</kbd>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <h4 className="text-md font-medium text-blue-300 mb-2">💡 Pro Tips</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Use compact view (default) to see more tracks at once</li>
                  <li>• Keep the log viewer open for full transparency</li>
                  <li>• Analyze tracks for BPM/key detection before DJing</li>
                  <li>• Use keyboard shortcuts for faster workflow</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function App() {
  return (
    <YouTubeDownloadProvider>
      <StemSeparationProvider>
        <AppContent />
      </StemSeparationProvider>
    </YouTubeDownloadProvider>
  )
}

export default App