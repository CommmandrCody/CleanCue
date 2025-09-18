import { useState, useRef } from 'react'
import { X, Folder, Search, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import clsx from 'clsx'

interface ScanDialogProps {
  onClose: () => void
}

interface ScanProgress {
  phase: 'selecting' | 'scanning' | 'analyzing' | 'complete'
  currentFile?: string
  processed: number
  total: number
  errors: string[]
  newTracks: number
  duplicates: number
}

export function ScanDialog({ onClose }: ScanDialogProps) {
  const [selectedPath, setSelectedPath] = useState('')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress>({
    phase: 'selecting',
    processed: 0,
    total: 0,
    errors: [],
    newTracks: 0,
    duplicates: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      try {
        const folderPath = await window.electronAPI.selectFolder()
        if (folderPath) {
          setSelectedPath(folderPath)
        }
      } catch (error) {
        console.error('Failed to select folder:', error)
      }
    } else {
      // In web mode, trigger the hidden file input
      fileInputRef.current?.click()
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      // Get the folder path from the first file's path
      const firstFile = files[0]
      const pathParts = firstFile.webkitRelativePath.split('/')
      if (pathParts.length > 1) {
        // Remove the filename to get just the folder path
        pathParts.pop()
        setSelectedPath(pathParts.join('/'))
      }
    }
  }

  const handleStartScan = async () => {
    if (!selectedPath) return

    setScanning(true)
    setProgress({
      phase: 'scanning',
      processed: 0,
      total: 0,
      errors: [],
      newTracks: 0,
      duplicates: 0
    })

    // Simulate scanning process
    const simulateScan = async () => {
      // Phase 1: File discovery
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProgress(prev => ({ ...prev, total: 156 }))

      // Phase 2: File processing
      for (let i = 1; i <= 156; i++) {
        await new Promise(resolve => setTimeout(resolve, 50))
        setProgress(prev => ({
          ...prev,
          processed: i,
          currentFile: `Track ${i}.mp3`,
          newTracks: Math.floor(i * 0.8),
          duplicates: Math.floor(i * 0.1)
        }))
      }

      // Phase 3: Analysis
      setProgress(prev => ({ ...prev, phase: 'analyzing' }))
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Complete
      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        currentFile: undefined,
        errors: ['Could not read metadata from 3 files']
      }))
    }

    await simulateScan()
  }

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'scanning':
        return <Search className="h-5 w-5 text-blue-400 animate-spin" />
      case 'analyzing':
        return <Clock className="h-5 w-5 text-yellow-400 animate-pulse" />
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-400" />
      default:
        return <Folder className="h-5 w-5 text-gray-400" />
    }
  }

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case 'scanning':
        return 'Scanning files...'
      case 'analyzing':
        return 'Analyzing audio...'
      case 'complete':
        return 'Scan complete!'
      default:
        return 'Select folder to scan'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Scan Music Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Select Library Folder</label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="Type path or click Browse... (e.g. /Users/dj/Music)"
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSelectFolder}
                disabled={scanning}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors disabled:opacity-50"
              >
                <Folder className="h-4 w-4" />
              </button>
              {/* Hidden file input for web folder selection */}
              <input
                ref={fileInputRef}
                type="file"
                {...({ webkitdirectory: '' } as any)}
                multiple
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
                accept="audio/*"
              />
            </div>
            {!window.electronAPI && (
              <p className="text-xs text-gray-400 mt-2">
                💡 Click Browse to select a folder containing music files, or type the path manually
              </p>
            )}
          </div>

          {/* Scan Progress */}
          {scanning && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {getPhaseIcon(progress.phase)}
                <span className="font-medium">{getPhaseText(progress.phase)}</span>
              </div>

              {progress.total > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{progress.processed} / {progress.total}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {progress.currentFile && (
                <div className="text-sm text-gray-400">
                  Processing: {progress.currentFile}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="text-lg font-bold text-green-400">{progress.newTracks}</div>
                  <div className="text-xs text-gray-400">New Tracks</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="text-lg font-bold text-yellow-400">{progress.duplicates}</div>
                  <div className="text-xs text-gray-400">Duplicates</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="text-lg font-bold text-red-400">{progress.errors.length}</div>
                  <div className="text-xs text-gray-400">Errors</div>
                </div>
              </div>
            </div>
          )}

          {/* Scan Options */}
          {!scanning && (
            <div className="space-y-3">
              <h3 className="font-medium">Scan Options</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-primary-600" />
                  <span className="text-sm">Include subdirectories</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-primary-600" />
                  <span className="text-sm">Skip duplicate detection</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-primary-600" />
                  <span className="text-sm">Auto-analyze BPM and key</span>
                </label>
              </div>
            </div>
          )}

          {/* Errors */}
          {progress.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">Scan Issues</span>
              </div>
              <div className="text-sm text-red-300 space-y-1">
                {progress.errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={scanning && progress.phase !== 'complete'}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {progress.phase === 'complete' ? 'Close' : 'Cancel'}
          </button>
          {progress.phase !== 'complete' && (
            <button
              onClick={handleStartScan}
              disabled={!selectedPath || scanning}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                selectedPath && !scanning
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              {scanning ? 'Scanning...' : 'Start Scan'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}