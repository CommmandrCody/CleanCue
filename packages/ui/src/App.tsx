import { useState } from 'react'
import { LibraryView } from './components/LibraryView'
import { ScanDialog } from './components/ScanDialog'
import { AnalysisProgress } from './components/AnalysisProgress'
import { HealthDashboard } from './components/HealthDashboard'
import { DuplicateDetection } from './components/DuplicateDetection'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { Settings } from './components/Settings'

type ViewType = 'library' | 'health' | 'duplicates' | 'analysis'

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('library')
  const [showScanDialog, setShowScanDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const renderView = () => {
    switch (currentView) {
      case 'library':
        return <LibraryView />
      case 'health':
        return <HealthDashboard />
      case 'duplicates':
        return <DuplicateDetection />
      case 'analysis':
        return <AnalysisProgress />
      default:
        return <LibraryView />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header
        onScan={() => setShowScanDialog(true)}
        onSettings={() => setShowSettings(true)}
      />

      <div className="flex">
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => setCurrentView(view as ViewType)}
        />

        <main className="flex-1 p-6">
          {renderView()}
        </main>
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

    </div>
  )
}

export default App