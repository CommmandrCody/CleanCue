import { useState, useEffect } from 'react'
import { X, Music2, AlertCircle, CheckCircle } from 'lucide-react'

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
}

interface StemSeparationSettings {
  model: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s' | 'mdx_extra'
  outputFormat: 'wav' | 'flac' | 'mp3'
  quality: 'low' | 'medium' | 'high'
  segments: number
  overlap: number
  clipMode: 'rescale' | 'clamp'
  mp3Bitrate?: number
  jobs?: number
}

interface StemSeparationResult {
  id: string
  trackId: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  vocalsPath?: string
  drumsPath?: string
  bassPath?: string
  otherPath?: string
  processingTimeMs?: number
  errorMessage?: string
}

interface StemSeparationDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedTracks: Track[]
}

export function StemSeparationDialog({ isOpen, onClose, selectedTracks }: StemSeparationDialogProps) {
  const [currentStep, setCurrentStep] = useState<'settings' | 'processing' | 'results'>('settings')
  const [settings, setSettings] = useState<StemSeparationSettings>({
    model: 'htdemucs',
    outputFormat: 'wav',
    quality: 'medium',
    segments: 4,
    overlap: 0.25,
    clipMode: 'rescale',
    jobs: 1
  })
  const [results, setResults] = useState<StemSeparationResult[]>([])
  const [, setIsProcessing] = useState(false)

  // Cleanup event listeners when component unmounts or dialog closes
  useEffect(() => {
    if (!isOpen && window.electronAPI) {
      window.electronAPI.removeAllListeners('stem:separation:progress')
      window.electronAPI.removeAllListeners('stem:separation:completed')
      window.electronAPI.removeAllListeners('stem:separation:failed')
    }
  }, [isOpen])

  const handleClose = () => {
    // Clean up event listeners when closing
    if (window.electronAPI) {
      window.electronAPI.removeAllListeners('stem:separation:progress')
      window.electronAPI.removeAllListeners('stem:separation:completed')
      window.electronAPI.removeAllListeners('stem:separation:failed')
    }
    onClose()
  }

  const handlePlayStem = async (stemPath: string) => {
    if (window.electronAPI && stemPath) {
      try {
        await window.electronAPI.showItemInFolder(stemPath)
      } catch (error) {
        console.error('Failed to show stem file:', error)
      }
    }
  }

  if (!isOpen) return null

  const handleStartSeparation = async () => {
    setCurrentStep('processing')
    setIsProcessing(true)

    try {
      if (window.electronAPI) {
        const newResults: StemSeparationResult[] = []

        // Start STEM separation for all selected tracks
        for (const track of selectedTracks) {
          try {
            const response = await window.electronAPI.stemStartSeparation(track.id, settings)
            if (response.success) {
              newResults.push({
                id: response.separationId,
                trackId: track.id,
                status: 'processing',
                progress: 0
              })
            } else {
              newResults.push({
                id: `error-${track.id}`,
                trackId: track.id,
                status: 'error',
                progress: 0,
                errorMessage: response.error || 'Failed to start separation'
              })
            }
          } catch (error) {
            newResults.push({
              id: `error-${track.id}`,
              trackId: track.id,
              status: 'error',
              progress: 0,
              errorMessage: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }

        setResults(newResults)

        // Set up event listeners for progress updates
        if (window.electronAPI) {
          window.electronAPI.on('stem:separation:progress', (_, data) => {
            setResults(prev => prev.map(result =>
              result.id === data.separationId
                ? { ...result, progress: data.progress }
                : result
            ))
          })

          window.electronAPI.on('stem:separation:completed', (_, data) => {
            setResults(prev => prev.map(result =>
              result.id === data.separationId
                ? {
                    ...result,
                    status: 'completed',
                    progress: 100,
                    vocalsPath: data.vocalsPath,
                    drumsPath: data.drumsPath,
                    bassPath: data.bassPath,
                    otherPath: data.otherPath,
                    processingTimeMs: data.processingTimeMs
                  }
                : result
            ))
          })

          window.electronAPI.on('stem:separation:failed', (_, data) => {
            setResults(prev => prev.map(result =>
              result.id === data.separationId
                ? {
                    ...result,
                    status: 'error',
                    errorMessage: data.error || 'Separation failed'
                  }
                : result
            ))
          })
        }

        setCurrentStep('processing')
      }
    } catch (error) {
      console.error('Failed to start STEM separation:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSettingChange = (key: keyof StemSeparationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const renderSettingsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">STEM Separation Settings</h3>
        <span className="text-sm text-gray-400">{selectedTracks.length} tracks selected</span>
      </div>

      <div className="space-y-4">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">AI Model</label>
          <select
            value={settings.model}
            onChange={(e) => handleSettingChange('model', e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
          >
            <option value="htdemucs">HTDemucs (Recommended)</option>
            <option value="htdemucs_ft">HTDemucs Fine-tuned</option>
            <option value="htdemucs_6s">HTDemucs 6-stem</option>
            <option value="mdx_extra">MDX Extra</option>
          </select>
        </div>

        {/* Output Format */}
        <div>
          <label className="block text-sm font-medium mb-2">Output Format</label>
          <select
            value={settings.outputFormat}
            onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
          >
            <option value="wav">WAV (Lossless)</option>
            <option value="flac">FLAC (Lossless)</option>
            <option value="mp3">MP3 (Compressed)</option>
          </select>
        </div>

        {/* Quality */}
        <div>
          <label className="block text-sm font-medium mb-2">Quality</label>
          <select
            value={settings.quality}
            onChange={(e) => handleSettingChange('quality', e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
          >
            <option value="low">Low (Faster)</option>
            <option value="medium">Medium (Recommended)</option>
            <option value="high">High (Slower)</option>
          </select>
        </div>

        {/* Segments */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Segments: {settings.segments}
            <span className="text-xs text-gray-400 ml-2">(More segments = less memory usage)</span>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={settings.segments}
            onChange={(e) => handleSettingChange('segments', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Overlap */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Overlap: {(settings.overlap * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            value={settings.overlap}
            onChange={(e) => handleSettingChange('overlap', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Jobs */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Parallel Jobs: {settings.jobs}
          </label>
          <input
            type="range"
            min="1"
            max="4"
            value={settings.jobs}
            onChange={(e) => handleSettingChange('jobs', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleStartSeparation}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Start Separation
        </button>
      </div>
    </div>
  )

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Music2 className="h-16 w-16 mx-auto text-blue-400 animate-pulse mb-4" />
        <h3 className="text-lg font-semibold mb-2">Separating Stems</h3>
        <p className="text-gray-400">This may take several minutes per track...</p>
      </div>

      <div className="space-y-3">
        {selectedTracks.map((track) => {
          const result = results.find(r => r.trackId === track.id)
          const progress = result?.progress || 0

          return (
            <div key={track.id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{track.title}</span>
                <span className="text-sm text-gray-400">{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderResultsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Separation Results</h3>
        <CheckCircle className="h-6 w-6 text-green-400" />
      </div>

      <div className="space-y-4">
        {results.map((result) => {
          const track = selectedTracks.find(t => t.id === result.trackId)
          if (!track) return null

          return (
            <div key={result.id} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">{track.title}</span>
                {result.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : result.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400" />
                )}
              </div>

              {result.status === 'completed' && (
                <div className="grid grid-cols-2 gap-2">
                  {result.vocalsPath && (
                    <button
                      onClick={() => handlePlayStem(result.vocalsPath!)}
                      className="flex items-center justify-center p-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                    >
                      <Music2 className="h-4 w-4 mr-1" />
                      Vocals
                    </button>
                  )}
                  {result.drumsPath && (
                    <button
                      onClick={() => handlePlayStem(result.drumsPath!)}
                      className="flex items-center justify-center p-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                    >
                      <Music2 className="h-4 w-4 mr-1" />
                      Drums
                    </button>
                  )}
                  {result.bassPath && (
                    <button
                      onClick={() => handlePlayStem(result.bassPath!)}
                      className="flex items-center justify-center p-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                    >
                      <Music2 className="h-4 w-4 mr-1" />
                      Bass
                    </button>
                  )}
                  {result.otherPath && (
                    <button
                      onClick={() => handlePlayStem(result.otherPath!)}
                      className="flex items-center justify-center p-2 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors"
                    >
                      <Music2 className="h-4 w-4 mr-1" />
                      Other
                    </button>
                  )}
                </div>
              )}

              {result.status === 'error' && result.errorMessage && (
                <p className="text-red-400 text-sm mt-2">{result.errorMessage}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleClose}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">STEM Separation</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {currentStep === 'settings' && renderSettingsStep()}
          {currentStep === 'processing' && renderProcessingStep()}
          {currentStep === 'results' && renderResultsStep()}
        </div>
      </div>
    </div>
  )
}