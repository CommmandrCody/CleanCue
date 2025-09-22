import { useState, useRef, useEffect } from 'react'
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
  scanStartTime?: number
  scanEndTime?: number
}

interface ScanSummary {
  tracksScanned: number
  tracksAdded: number
  tracksUpdated: number
  errors: string[]
  duration: number
  path: string
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
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [scanLogs, setScanLogs] = useState<string[]>([])
  const [includeSubdirectories, setIncludeSubdirectories] = useState(true)
  const [skipDuplicateDetection, setSkipDuplicateDetection] = useState(true)
  const [autoAnalyzeBpmKey, setAutoAnalyzeBpmKey] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scanInProgressRef = useRef(false)

  // Set up event listeners for scan progress
  useEffect(() => {
    if (!window.electronAPI) {
      console.log('[UI] No electronAPI available');
      return;
    }

    console.log('[UI] Setting up scan event listeners...');

    const handleScanStarted = (...args: any[]) => {
      const data = args.length > 1 ? args[1] : args[0];
      console.log('[UI] Scan started event received:', data);
      const logMessage = `🚀 Scan started for: ${data?.paths?.join(', ') || 'unknown path'}`;
      setScanLogs(prev => [...prev, logMessage]);
      setProgress(prev => ({
        ...prev,
        phase: 'scanning',
        processed: 0,
        total: 0,
        scanStartTime: Date.now()
      }));
    };

    const handleScanProgress = (...args: any[]) => {
      const data = args.length > 1 ? args[1] : args[0];
      console.log('[UI] Scan progress event received:', data);
      if (data) {
        const logMessage = `📁 Processing: ${data.currentFile || `File ${data.current || 0}`}`;
        setScanLogs(prev => [...prev.slice(-20), logMessage]); // Keep last 20 logs
        setProgress(prev => ({
          ...prev,
          phase: 'scanning',
          processed: data.current || prev.processed,
          total: data.total || prev.total,
          currentFile: data.currentFile
        }));
      }
    };

    const handleScanCompleted = (...args: any[]) => {
      const data = args.length > 1 ? args[1] : args[0];
      console.log('[UI] Scan completed event received:', data);
      const endTime = Date.now();
      const logMessage = `✅ Scan completed! Found ${data?.tracksAdded || 0} new tracks, updated ${data?.tracksUpdated || 0} existing tracks`;
      setScanLogs(prev => [...prev, logMessage]);

      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        processed: data?.tracksScanned || prev.processed,
        total: data?.tracksScanned || prev.total,
        newTracks: data?.tracksAdded || 0,
        duplicates: data?.tracksUpdated || 0,
        scanEndTime: endTime
      }));

      setScanSummary(() => ({
        tracksScanned: data?.tracksScanned || 0,
        tracksAdded: data?.tracksAdded || 0,
        tracksUpdated: data?.tracksUpdated || 0,
        errors: data?.errors || [],
        duration: endTime - (progress.scanStartTime || endTime),
        path: selectedPath
      }));

      scanInProgressRef.current = false
      setScanning(false);
    };

    // Add event listeners
    console.log('[UI] Adding event listeners for scan events');
    window.electronAPI.on('scan:started', handleScanStarted);
    window.electronAPI.on('scan:progress', handleScanProgress);
    window.electronAPI.on('scan:completed', handleScanCompleted);

    // Cleanup on unmount
    return () => {
      console.log('[UI] Cleaning up scan event listeners');
      if (window.electronAPI) {
        window.electronAPI.removeListener('scan:started', handleScanStarted);
        window.electronAPI.removeListener('scan:progress', handleScanProgress);
        window.electronAPI.removeListener('scan:completed', handleScanCompleted);
      }
    };
  }, [selectedPath]); // Add selectedPath as dependency

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

    console.log(`[UI] 🎯 handleStartScan called for path: ${selectedPath}`)

    // Prevent multiple concurrent scans
    if (scanInProgressRef.current) {
      console.log(`[UI] ⚠️ Scan already in progress, ignoring duplicate call`)
      return
    }

    scanInProgressRef.current = true
    setScanning(true)
    setScanSummary(null)
    setScanLogs([`🚀 Starting scan of: ${selectedPath}`])
    setProgress({
      phase: 'scanning',
      processed: 0,
      total: 0,
      errors: [],
      newTracks: 0,
      duplicates: 0,
      scanStartTime: Date.now()
    })

    try {
      if (window.electronAPI) {
        // Start real scan via Electron API
        const scanOptions = {
          includeSubdirectories,
          skipDuplicateDetection,
          autoAnalyzeBpmKey
        }
        const callId = Math.random().toString(36).substring(7)
        console.log(`[UI] 🚀 [${callId}] Calling engineScan with path: ${selectedPath} and options:`, scanOptions)
        const scanResult = await window.electronAPI.engineScan(selectedPath, scanOptions)
        console.log(`[UI] ✅ [${callId}] engineScan returned:`, scanResult)

        // Only handle errors from direct API call - success results come via events
        if (!scanResult.success) {
          setProgress(prev => ({
            ...prev,
            phase: 'complete',
            errors: [scanResult.error || 'Scan failed']
          }))
        }
        // Note: Success results are handled via scan:completed event listener
      }
    } catch (error) {
      console.error('Scan failed:', error)
      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        errors: ['Failed to scan library']
      }))
    } finally {
      scanInProgressRef.current = false
      setScanning(false)
    }
  }

  const handleRescanLibrary = async () => {
    if (!selectedPath) return

    if (!confirm('This will clear all existing tracks and rescan with improved metadata parsing. Continue?')) {
      return
    }

    setScanning(true)
    setProgress({
      phase: 'scanning',
      processed: 0,
      total: 0,
      errors: [],
      newTracks: 0,
      duplicates: 0
    })

    try {
      if (window.electronAPI) {
        // First clear the library
        await window.electronAPI.engineClearLibrary()

        // Then scan again with improved parsing
        const scanResult = await window.electronAPI.engineScan(selectedPath)

        // Only handle errors from direct API call - success results come via events
        if (!scanResult.success) {
          setProgress(prev => ({
            ...prev,
            phase: 'complete',
            errors: [scanResult.error || 'Rescan failed']
          }))
        }
        // Note: Success results are handled via scan:completed event listener
      }
    } catch (error) {
      console.error('Rescan failed:', error)
      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        errors: ['Failed to rescan library']
      }))
    } finally {
      scanInProgressRef.current = false
      setScanning(false)
    }
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
            aria-label="Close dialog"
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
                aria-label="Browse for folder"
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
                  <input
                    type="checkbox"
                    checked={includeSubdirectories}
                    onChange={(e) => setIncludeSubdirectories(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600"
                  />
                  <span className="text-sm">Include subdirectories</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={skipDuplicateDetection}
                    onChange={(e) => setSkipDuplicateDetection(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600"
                  />
                  <span className="text-sm">Skip duplicate detection</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={autoAnalyzeBpmKey}
                    onChange={(e) => setAutoAnalyzeBpmKey(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600"
                  />
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

          {/* Scan Summary */}
          {scanSummary && progress.phase === 'complete' && (
            <div className="bg-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-green-400">✅ Scan Complete</h3>
                <div className="text-sm text-gray-400">
                  {scanSummary.duration > 0 ? `${(scanSummary.duration / 1000).toFixed(1)}s` : ''}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Path:</span>
                    <span className="text-sm font-mono">{scanSummary.path}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Files Scanned:</span>
                    <span className="text-sm font-bold">{scanSummary.tracksScanned}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">New Tracks:</span>
                    <span className="text-sm font-bold text-green-400">{scanSummary.tracksAdded}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Updated:</span>
                    <span className="text-sm font-bold text-yellow-400">{scanSummary.tracksUpdated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Errors:</span>
                    <span className="text-sm font-bold text-red-400">{scanSummary.errors.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Success Rate:</span>
                    <span className="text-sm font-bold text-green-400">
                      {scanSummary.tracksScanned > 0 ? Math.round(((scanSummary.tracksScanned - scanSummary.errors.length) / scanSummary.tracksScanned) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {scanSummary.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-700 rounded p-3">
                  <div className="text-sm font-medium text-red-400 mb-2">Scan Errors:</div>
                  <div className="text-xs text-red-300 space-y-1">
                    {scanSummary.errors.slice(0, 5).map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                    {scanSummary.errors.length > 5 && (
                      <div className="text-gray-400">... and {scanSummary.errors.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons for completed scan */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {/* Navigate to library view */}}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
                >
                  View Library ({scanSummary.tracksAdded} tracks)
                </button>
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-sm font-medium transition-colors"
                >
                  {showLogs ? 'Hide' : 'Show'} Logs
                </button>
              </div>
            </div>
          )}

          {/* Scan Logs */}
          {showLogs && scanLogs.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Scan Logs</h3>
                <button
                  onClick={() => setScanLogs([])}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="bg-black rounded p-3 h-32 overflow-y-auto">
                <div className="text-xs font-mono text-green-400 space-y-1">
                  {scanLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
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
            <div className="flex space-x-3">
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
              <button
                onClick={handleRescanLibrary}
                disabled={!selectedPath || scanning}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  selectedPath && !scanning
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                )}
              >
                {scanning ? 'Rescanning...' : 'Rescan Library'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}