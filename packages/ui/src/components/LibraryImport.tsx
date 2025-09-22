import { useState, useRef } from 'react'
import { FolderOpen, Copy, Link, Settings, AlertTriangle, CheckCircle, X, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'

interface ImportSource {
  id: string
  path: string
  name: string
  estimatedTracks: number
  status: 'pending' | 'scanning' | 'ready' | 'error'
  error?: string
}

interface ImportSettings {
  mode: 'copy' | 'link'
  organization: 'artist-album' | 'genre-artist' | 'flat' | 'preserve'
  libraryPath: string
  handleDuplicates: 'skip' | 'replace' | 'rename'
  copyFormat: 'original' | 'mp3-320' | 'flac'
  createBackup: boolean
}

interface LibraryImportProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete?: () => void
}

export function LibraryImport({ isOpen, onClose, onImportComplete }: LibraryImportProps) {
  const [sources, setSources] = useState<ImportSource[]>([])
  const [settings, setSettings] = useState<ImportSettings>({
    mode: 'copy',
    organization: 'artist-album',
    libraryPath: '',
    handleDuplicates: 'skip',
    copyFormat: 'original',
    createBackup: true
  })
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentFile: '' })
  const [showSettings, setShowSettings] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const scanInProgressRef = useRef(false)

  if (!isOpen) return null

  const addSourceFolder = async () => {
    try {
      if (window.electronAPI) {
        const selectedPath = await window.electronAPI.selectFolder()
        if (selectedPath) {
          console.log(`[LibraryImport] 🎯 addSourceFolder called for path: ${selectedPath}`)

          // Prevent multiple concurrent scans
          if (scanInProgressRef.current) {
            console.log(`[LibraryImport] ⚠️ Scan already in progress, ignoring duplicate call`)
            return
          }

          scanInProgressRef.current = true
          const newSource: ImportSource = {
            id: Date.now().toString(),
            path: selectedPath,
            name: selectedPath.split('/').pop() || selectedPath,
            estimatedTracks: 0,
            status: 'scanning'
          }

          setSources(prev => [...prev, newSource])

          // Scan folder for tracks
          const callId = Math.random().toString(36).substring(7)
          console.log(`[LibraryImport] 🚀 [${callId}] Calling engineScan with path: ${selectedPath}`)
          const scanResult = await window.electronAPI.engineScan(selectedPath)
          console.log(`[LibraryImport] ✅ [${callId}] engineScan returned:`, scanResult)

          console.log(`[LibraryImport] 📊 [${callId}] Processing scan result:`, {
            success: scanResult.success,
            tracksFound: scanResult.tracksFound,
            tracksAdded: scanResult.tracksAdded,
            tracksUpdated: scanResult.tracksUpdated,
            errors: scanResult.errors
          })

          if (scanResult.success) {
            console.log(`[LibraryImport] ✅ [${callId}] Setting estimatedTracks to: ${scanResult.tracksFound}`)
            setSources(prev => prev.map(source =>
              source.id === newSource.id
                ? { ...source, estimatedTracks: scanResult.tracksFound, status: 'ready' }
                : source
            ))
          } else {
            console.log(`[LibraryImport] ❌ [${callId}] Scan failed, setting error status`)
            setSources(prev => prev.map(source =>
              source.id === newSource.id
                ? { ...source, status: 'error', error: 'Failed to scan folder' }
                : source
            ))
          }

          scanInProgressRef.current = false
        }
      }
    } catch (error) {
      console.error('Failed to add source folder:', error)
      scanInProgressRef.current = false
    }
  }

  const addSourceFiles = () => {
    if (folderInputRef.current) {
      folderInputRef.current.click()
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const filePaths = Array.from(files).map(file => (file as any).path || file.webkitRelativePath || file.name)
    if (filePaths.length > 0) {
      const newSource: ImportSource = {
        id: Date.now().toString(),
        path: 'Selected Files',
        name: `${filePaths.length} selected files`,
        estimatedTracks: filePaths.length,
        status: 'ready'
      }
      setSources(prev => [...prev, newSource])
    }
  }

  const removeSource = (id: string) => {
    setSources(prev => prev.filter(source => source.id !== id))
  }

  const selectLibraryPath = async () => {
    try {
      if (window.electronAPI) {
        const selectedPath = await window.electronAPI.selectFolder()
        if (selectedPath) {
          setSettings(prev => ({ ...prev, libraryPath: selectedPath }))
        }
      }
    } catch (error) {
      console.error('Failed to select library path:', error)
    }
  }

  const startImport = async () => {
    if (sources.length === 0) return
    if (settings.mode === 'copy' && !settings.libraryPath) {
      alert('Please select a library path for copying files')
      return
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: sources.reduce((sum, s) => sum + s.estimatedTracks, 0), currentFile: '' })

    try {
      for (const source of sources) {
        if (window.electronAPI) {
          // Start import for this source
          const importResult = await window.electronAPI.importLibrarySource({
            sourcePath: source.path,
            mode: settings.mode,
            organization: settings.organization,
            libraryPath: settings.libraryPath,
            handleDuplicates: settings.handleDuplicates,
            copyFormat: settings.copyFormat,
            createBackup: settings.createBackup
          })

          if (!importResult.success) {
            console.error(`Import failed for ${source.path}:`, importResult.error)
          }
        }
      }

      // Clear sources and close dialog on success
      setSources([])

      // Trigger library refresh before closing
      if (onImportComplete) {
        console.log('[LibraryImport] Triggering library refresh after successful import')
        // Give the backend a moment to finish updating the database
        await new Promise(resolve => setTimeout(resolve, 500))
        onImportComplete()
      }

      onClose()
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setIsImporting(false)
    }
  }

  const totalTracks = sources.reduce((sum, source) => sum + source.estimatedTracks, 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Import Music Library</h2>
            <p className="text-gray-400">Add music from multiple locations to your library</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Import Mode Selection */}
        <div className="mb-6">
          <h3 className="font-medium mb-3">Import Mode</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSettings(prev => ({ ...prev, mode: 'copy' }))}
              className={clsx(
                'p-4 rounded-lg border-2 transition-colors text-left',
                settings.mode === 'copy'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              )}
            >
              <Copy className="h-5 w-5 mb-2 text-blue-400" />
              <div className="font-medium">Copy to Library</div>
              <div className="text-sm text-gray-400">Copy files to a managed library folder</div>
            </button>
            <button
              onClick={() => setSettings(prev => ({ ...prev, mode: 'link' }))}
              className={clsx(
                'p-4 rounded-lg border-2 transition-colors text-left',
                settings.mode === 'link'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              )}
            >
              <Link className="h-5 w-5 mb-2 text-green-400" />
              <div className="font-medium">Link in Place</div>
              <div className="text-sm text-gray-400">Reference files at their current location</div>
            </button>
          </div>
        </div>

        {/* Library Path Selection (for copy mode) */}
        {settings.mode === 'copy' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Library Location</h3>
            <div className="flex space-x-3">
              <input
                type="text"
                value={settings.libraryPath}
                onChange={(e) => setSettings(prev => ({ ...prev, libraryPath: e.target.value }))}
                placeholder="Select where to store your music library..."
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={selectLibraryPath}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Source Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Music Sources</h3>
            <div className="flex space-x-2">
              <button
                onClick={addSourceFolder}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Folder
              </button>
              <button
                onClick={addSourceFiles}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm transition-colors"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Files
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm transition-colors"
              >
                <Settings className="h-4 w-4 inline mr-1" />
                Settings
              </button>
            </div>
          </div>

          <input
            ref={folderInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            {...({ webkitdirectory: "" } as any)}
          />

          {/* Sources List */}
          <div className="space-y-3">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {source.status === 'scanning' && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
                  {source.status === 'ready' && <CheckCircle className="h-4 w-4 text-green-400" />}
                  {source.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-400" />}
                  <div>
                    <div className="font-medium">{source.name}</div>
                    <div className="text-sm text-gray-400">
                      {source.status === 'scanning' && 'Scanning...'}
                      {source.status === 'ready' && `${source.estimatedTracks} tracks found`}
                      {source.status === 'error' && source.error}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeSource(source.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {sources.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sources added yet</p>
                <p className="text-sm">Add folders or files to import into your library</p>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-3">Advanced Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Organization</label>
                <select
                  value={settings.organization}
                  onChange={(e) => setSettings(prev => ({ ...prev, organization: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="artist-album">Artist/Album</option>
                  <option value="genre-artist">Genre/Artist</option>
                  <option value="flat">Flat (All in one folder)</option>
                  <option value="preserve">Preserve structure</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Handle Duplicates</label>
                <select
                  value={settings.handleDuplicates}
                  onChange={(e) => setSettings(prev => ({ ...prev, handleDuplicates: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="skip">Skip duplicates</option>
                  <option value="replace">Replace existing</option>
                  <option value="rename">Auto-rename</option>
                </select>
              </div>
              {settings.mode === 'copy' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Copy Format</label>
                  <select
                    value={settings.copyFormat}
                    onChange={(e) => setSettings(prev => ({ ...prev, copyFormat: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="original">Keep original format</option>
                    <option value="mp3-320">Convert to MP3 320kbps</option>
                    <option value="flac">Convert to FLAC</option>
                  </select>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="createBackup"
                  checked={settings.createBackup}
                  onChange={(e) => setSettings(prev => ({ ...prev, createBackup: e.target.checked }))}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <label htmlFor="createBackup" className="text-sm">Create backup before import</label>
              </div>
            </div>
          </div>
        )}

        {/* Import Progress */}
        {isImporting && (
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="font-medium mb-3">Import Progress</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing: {importProgress.currentFile}</span>
                <span>{importProgress.current} / {importProgress.total}</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {totalTracks > 0 && `${totalTracks} tracks ready to import`}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={startImport}
              disabled={sources.length === 0 || isImporting || (settings.mode === 'copy' && !settings.libraryPath)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
            >
              {isImporting ? 'Importing...' : `Import ${totalTracks} Tracks`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}