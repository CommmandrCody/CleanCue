import { useState } from 'react'
import { LibraryView } from './components/LibraryView'
import { ScanDialog } from './components/ScanDialog'
import { ExportDialog } from './components/ExportDialog'
import { AnalysisProgress } from './components/AnalysisProgress'
import { HealthDashboard } from './components/HealthDashboard'
import { DuplicateDetection } from './components/DuplicateDetection'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

type ViewType = 'library' | 'health' | 'duplicates' | 'analysis'

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('library')
  const [showScanDialog, setShowScanDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

  const renderView = () => {
    switch (currentView) {
      case 'library':
        return <LibraryView onExport={() => setShowExportDialog(true)} />
      case 'health':
        return <HealthDashboard />
      case 'duplicates':
        return <DuplicateDetection />
      case 'analysis':
        return <AnalysisProgress />
      default:
        return <LibraryView onExport={() => setShowExportDialog(true)} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header onScan={() => setShowScanDialog(true)} />

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

      {showExportDialog && (
        <ExportDialog onClose={() => setShowExportDialog(false)} />
      )}
    </div>
  )
}

export default App