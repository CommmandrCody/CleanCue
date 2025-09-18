import { useState, useRef } from 'react'
import { X, Download, FileText, Music, Settings, CheckCircle } from 'lucide-react'
import clsx from 'clsx'

interface ExportDialogProps {
  onClose: () => void
}

interface ExportFormat {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  extension: string
  features: string[]
}

const exportFormats: ExportFormat[] = [
  {
    id: 'm3u',
    name: 'Universal M3U',
    description: 'Compatible with all DJ software and media players',
    icon: <Music className="h-5 w-5" />,
    extension: '.m3u',
    features: ['Universal compatibility', 'Metadata preservation', 'Playlist organization']
  },
  {
    id: 'serato',
    name: 'Serato DJ',
    description: 'Native crate format for Serato DJ Pro/Lite',
    icon: <FileText className="h-5 w-5" />,
    extension: '.crate',
    features: ['Cue points', 'Beatgrids', 'Hot cues', 'Loop rolls']
  },
  {
    id: 'engine',
    name: 'Engine DJ',
    description: 'Denon/InMusic collection format',
    icon: <Settings className="h-5 w-5" />,
    extension: '.xml',
    features: ['Full metadata', 'Cue points', 'Loops', 'Beatgrids']
  },
  {
    id: 'rekordbox',
    name: 'Rekordbox',
    description: 'Pioneer DJ collection format',
    icon: <Music className="h-5 w-5" />,
    extension: '.xml',
    features: ['Memory cues', 'Hot cues', 'Loops', 'Waveforms']
  },
  {
    id: 'traktor',
    name: 'Traktor Pro',
    description: 'Native Instruments format',
    icon: <FileText className="h-5 w-5" />,
    extension: '.nml',
    features: ['Cue points', 'Loops', 'Beatgrids', 'Track preparation']
  }
]

export function ExportDialog({ onClose }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('m3u')
  const [exportPath, setExportPath] = useState('')
  const [playlistName, setPlaylistName] = useState('CleanCue Export')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeCues, setIncludeCues] = useState(true)
  const [useRelativePaths, setUseRelativePaths] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const selectedFormatData = exportFormats.find(f => f.id === selectedFormat)

  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      try {
        const folderPath = await window.electronAPI.selectFolder()
        if (folderPath) {
          setExportPath(folderPath)
        }
      } catch (error) {
        console.error('Failed to select folder:', error)
      }
    } else {
      // In web mode, trigger the hidden file input
      folderInputRef.current?.click()
    }
  }

  const handleFolderInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      // Get the folder path from the first file's path
      const firstFile = files[0]
      const pathParts = firstFile.webkitRelativePath.split('/')
      if (pathParts.length > 1) {
        // Remove the filename to get just the folder path
        pathParts.pop()
        setExportPath(pathParts.join('/'))
      }
    }
  }

  const handleExport = async () => {
    if (!selectedFormat || !exportPath) return

    setExporting(true)

    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))

    setExporting(false)
    setExportComplete(true)

    // Auto-close after success
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  if (exportComplete) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Export Complete!</h2>
          <p className="text-gray-400 mb-4">
            Your {selectedFormatData?.name} playlist has been exported successfully.
          </p>
          <div className="text-sm text-gray-500">
            {exportPath}/{playlistName}{selectedFormatData?.extension}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Export Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Format Selection */}
          <div>
            <h3 className="font-medium mb-4">Choose Export Format</h3>
            <div className="space-y-3">
              {exportFormats.map((format) => (
                <div
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={clsx(
                    'p-4 border rounded-lg cursor-pointer transition-colors',
                    selectedFormat === format.id
                      ? 'border-primary-500 bg-primary-900/20'
                      : 'border-gray-600 hover:border-gray-500'
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className={clsx(
                      'p-2 rounded-lg',
                      selectedFormat === format.id ? 'bg-primary-600' : 'bg-gray-700'
                    )}>
                      {format.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{format.name}</h4>
                        <span className="text-xs text-gray-400">{format.extension}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{format.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {format.features.map((feature, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-700 text-xs rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-4">Export Settings</h3>

              {/* Playlist Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Playlist Name</label>
                <input
                  type="text"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Export Path */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Export Location</label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={exportPath}
                    onChange={(e) => setExportPath(e.target.value)}
                    placeholder="Choose export location..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-md transition-colors"
                  >
                    Browse
                  </button>
                  {/* Hidden file input for web folder selection */}
                  <input
                    ref={folderInputRef}
                    type="file"
                    {...({ webkitdirectory: '' } as any)}
                    multiple
                    onChange={handleFolderInputChange}
                    style={{ display: 'none' }}
                  />
                </div>
                {!window.electronAPI && (
                  <p className="text-xs text-gray-400 mt-1">
                    💡 Click Browse to select export folder, or type the path manually
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600"
                  />
                  <span className="text-sm">Include metadata (BPM, key, genre)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeCues}
                    onChange={(e) => setIncludeCues(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600"
                  />
                  <span className="text-sm">Include cue points</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={useRelativePaths}
                    onChange={(e) => setUseRelativePaths(e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600"
                  />
                  <span className="text-sm">Use relative paths (portable)</span>
                </label>
              </div>
            </div>

            {/* Format Info */}
            {selectedFormatData && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-2">Format Details</h4>
                <p className="text-sm text-gray-300 mb-3">{selectedFormatData.description}</p>

                <div className="text-sm">
                  <div className="mb-2">
                    <span className="text-gray-400">File extension:</span>
                    <span className="ml-2 font-mono">{selectedFormatData.extension}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Supported features:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedFormatData.features.map((feature, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary-900/30 text-primary-300 text-xs rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Exporting 3 selected tracks
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!selectedFormat || !exportPath || !playlistName || exporting}
              className={clsx(
                'px-6 py-2 rounded-md text-sm font-medium transition-colors',
                selectedFormat && exportPath && playlistName && !exporting
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              {exporting ? (
                <>
                  <Download className="h-4 w-4 inline mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 inline mr-2" />
                  Export Playlist
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}