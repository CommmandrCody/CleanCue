import { useState } from 'react'
import { Settings as SettingsIcon, Music, Folder, X, Save, RotateCcw, Workflow, Volume2, FileText, Layers } from 'lucide-react'
import { LogViewer } from './LogViewer'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

interface AppSettings {
  library: {
    autoScan: boolean
    scanOnStartup: boolean
    watchFolders: boolean
    extensions: string[]
  }
  workflow: {
    enableNormalization: boolean
    normalizationMode: 'metadata' | 'export' | 'both'
    normalizationPreset: 'dj' | 'broadcast' | 'streaming' | 'custom'
    customTargetLufs: number
    customTargetPeak: number
    customLra: number
    useLimiter: boolean
    exportDirectory: string
    normalizedSuffix: string
    outputFormat: 'wav' | 'flac' | 'aiff'
  }
  analysis: {
    autoAnalyze: boolean
    analyzeOnImport: boolean
    writeTagsToFiles: boolean
    bpmRange: { min: number; max: number }
    keyNotation: 'sharp' | 'flat'
    engine: 'auto' | 'librosa' | 'keyfinder' | 'essentia'
    engineFallback: boolean
    showEngineInfo: boolean
  }
  stems: {
    enabled: boolean
    outputPath: string
    tempPath: string
    defaultModel: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s' | 'mdx_extra'
    defaultQuality: 'low' | 'medium' | 'high'
    defaultFormat: 'wav' | 'flac' | 'mp3'
    autoSeparateOnImport: boolean
    segments: number
    overlap: number
    clipMode: 'rescale' | 'clamp'
    maxConcurrentJobs: number
  }
  ui: {
    theme: 'dark' | 'light' | 'auto'
    showAlbumArt: boolean
    compactView: boolean
    showLogViewer: boolean
    logViewerHeight: number
    gridCols: 'auto' | '2' | '3' | '4' | '5'
    showTooltips: boolean
    animateTransitions: boolean
    autoColorTheme: boolean
    keyDisplayMode: 'musical' | 'camelot'
  }
}

const defaultSettings: AppSettings = {
  library: {
    autoScan: false,
    scanOnStartup: false,
    watchFolders: false,
    extensions: ['mp3', 'flac', 'wav', 'm4a', 'aif', 'aiff', 'ogg']
  },
  workflow: {
    enableNormalization: true,
    normalizationMode: 'metadata',
    normalizationPreset: 'dj',
    customTargetLufs: -14,
    customTargetPeak: -1.5,
    customLra: 11,
    useLimiter: false,
    exportDirectory: '/Users/wagner/Music/CleanCue Normalized',
    normalizedSuffix: ' (Norm)',
    outputFormat: 'flac'
  },
  analysis: {
    autoAnalyze: false,
    analyzeOnImport: false,
    writeTagsToFiles: true,
    bpmRange: { min: 60, max: 200 },
    keyNotation: 'sharp' as 'sharp' | 'flat',
    engine: 'auto' as 'auto' | 'librosa' | 'keyfinder' | 'essentia',
    engineFallback: true,
    showEngineInfo: true
  },
  stems: {
    enabled: true,
    outputPath: '~/Music/CleanCue Stems',
    tempPath: '~/.cleancue/temp',
    defaultModel: 'htdemucs',
    defaultQuality: 'medium',
    defaultFormat: 'wav',
    autoSeparateOnImport: false,
    segments: 4,
    overlap: 0.25,
    clipMode: 'rescale',
    maxConcurrentJobs: 1
  },
  ui: {
    theme: 'dark',
    showAlbumArt: true,
    compactView: true,
    showLogViewer: true,
    logViewerHeight: 200,
    gridCols: 'auto',
    showTooltips: true,
    animateTransitions: true,
    autoColorTheme: false,
    keyDisplayMode: 'camelot'
  }
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [activeTab, setActiveTab] = useState<'library' | 'workflow' | 'analysis' | 'stems' | 'ui' | 'logs'>('workflow')

  if (!isOpen) return null

  const handleSave = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveSettings(settings)
        if (result.success) {
          console.log('Settings saved successfully')

          // Update key notation in the engine
          await window.electronAPI.setKeyNotation(settings.analysis.keyNotation)

          onClose()
        } else {
          console.error('Failed to save settings:', result.error)
        }
      } else {
        console.log('Web mode: Settings would be saved locally')
        onClose()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const handleReset = () => {
    setSettings(defaultSettings)
  }

  const updateSettings = (section: keyof AppSettings, updates: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], ...updates }
    }))
  }

  const tabs = [
    { id: 'workflow', label: 'DJ Workflow', icon: Workflow },
    { id: 'library', label: 'Library', icon: Music },
    { id: 'stems', label: 'STEM Separation', icon: Layers },
    { id: 'analysis', label: 'Analysis', icon: SettingsIcon },
    { id: 'ui', label: 'Interface', icon: Folder },
    { id: 'logs', label: 'Logs', icon: FileText }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-primary-400" />
            <h2 className="text-xl font-bold">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-gray-900 border-r border-gray-700 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'workflow' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">DJ Workflow Settings</h3>
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Workflow className="h-5 w-5 text-primary-400" />
                    <span className="font-medium text-primary-400">Discover → Normalize → Analyze → Review → Export</span>
                  </div>
                  <p className="text-sm text-gray-300">Configure your professional DJ workflow pipeline for optimal track preparation.</p>
                </div>

                <div className="space-y-6">
                  {/* Normalization Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="h-5 w-5 text-primary-400" />
                      <h4 className="text-md font-medium">Audio Normalization</h4>
                    </div>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.workflow.enableNormalization}
                        onChange={(e) => updateSettings('workflow', { enableNormalization: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex flex-col">
                        <span>Enable audio normalization</span>
                        <span className="text-xs text-gray-400">Automatically analyze and normalize track loudness</span>
                      </div>
                    </label>

                    {settings.workflow.enableNormalization && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-2">Normalization Mode</label>
                          <select
                            value={settings.workflow.normalizationMode}
                            onChange={(e) => updateSettings('workflow', { normalizationMode: e.target.value })}
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="metadata">Metadata Only (ReplayGain tags) - Non-destructive</option>
                            <option value="export">Export Mode (Create normalized copies)</option>
                            <option value="both">Both - Apply ReplayGain tags and create copies</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Normalization Preset</label>
                          <select
                            value={settings.workflow.normalizationPreset}
                            onChange={(e) => updateSettings('workflow', { normalizationPreset: e.target.value })}
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="dj">DJ (-14 LUFS) - EBU R128 standard for DJs</option>
                            <option value="streaming">Streaming (-14 LUFS) - Spotify/Apple Music</option>
                            <option value="broadcast">Broadcast (-23 LUFS) - EBU R128 broadcast</option>
                            <option value="custom">Custom - Set your own targets</option>
                          </select>
                        </div>

                        {settings.workflow.normalizationPreset === 'custom' && (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Target LUFS</label>
                              <input
                                type="number"
                                min="-30"
                                max="-6"
                                step="0.1"
                                value={settings.workflow.customTargetLufs}
                                onChange={(e) => updateSettings('workflow', { customTargetLufs: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Target Peak (dB)</label>
                              <input
                                type="number"
                                min="-6"
                                max="0"
                                step="0.1"
                                value={settings.workflow.customTargetPeak}
                                onChange={(e) => updateSettings('workflow', { customTargetPeak: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">LRA</label>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                step="0.1"
                                value={settings.workflow.customLra}
                                onChange={(e) => updateSettings('workflow', { customLra: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        )}

                        {(settings.workflow.normalizationMode === 'export' || settings.workflow.normalizationMode === 'both') && (
                          <>
                            <div>
                              <label className="block text-sm font-medium mb-2">Export Directory</label>
                              <input
                                type="text"
                                value={settings.workflow.exportDirectory}
                                onChange={(e) => updateSettings('workflow', { exportDirectory: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="/Users/wagner/Music/CleanCue Normalized"
                              />
                            </div>

                            <div className="space-y-3">
                              <label className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={settings.workflow.useLimiter}
                                  onChange={(e) => updateSettings('workflow', { useLimiter: e.target.checked })}
                                  className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                                />
                                <div className="flex flex-col">
                                  <span>Use additional limiter (two-pass)</span>
                                  <span className="text-xs text-gray-400">Adds peak limiting after loudness normalization for hot tracks</span>
                                </div>
                              </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Normalized File Suffix</label>
                                <input
                                  type="text"
                                  value={settings.workflow.normalizedSuffix}
                                  onChange={(e) => updateSettings('workflow', { normalizedSuffix: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder=" (Norm)"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-2">Output Format</label>
                                <select
                                  value={settings.workflow.outputFormat}
                                  onChange={(e) => updateSettings('workflow', { outputFormat: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  <option value="flac">FLAC (Recommended - Lossless)</option>
                                  <option value="wav">WAV (Uncompressed)</option>
                                  <option value="aiff">AIFF (Uncompressed)</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}

                        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 mt-4">
                          <div className="text-sm text-blue-200">
                            <span className="font-medium">💡 Normalization Info:</span>
                            {settings.workflow.normalizationMode === 'metadata' && (
                              <span> Writes ReplayGain tags to your original files. Compatible with all professional DJ software.</span>
                            )}
                            {settings.workflow.normalizationMode === 'export' && (
                              <span> Creates normalized copies in the export directory while preserving your originals.</span>
                            )}
                            {settings.workflow.normalizationMode === 'both' && (
                              <span> Applies ReplayGain tags to originals AND creates normalized export copies.</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'library' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">Library Settings</h3>

                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.library.autoScan}
                      onChange={(e) => updateSettings('library', { autoScan: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Auto-scan library for changes</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.library.scanOnStartup}
                      onChange={(e) => updateSettings('library', { scanOnStartup: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Scan library on startup</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.library.watchFolders}
                      onChange={(e) => updateSettings('library', { watchFolders: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Watch folders for file changes</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Supported File Extensions</label>
                  <input
                    type="text"
                    value={settings.library.extensions.join(', ')}
                    onChange={(e) => updateSettings('library', {
                      extensions: e.target.value.split(',').map(ext => ext.trim())
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-sm text-gray-400 mt-1">Comma-separated list of file extensions</p>
                </div>

                {/* Library Management */}
                <div>
                  <h4 className="text-md font-medium mb-3 text-red-400">Library Management</h4>
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                    <p className="text-sm text-red-300 mb-4">
                      ⚠️ Danger Zone: These actions cannot be undone
                    </p>

                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to clear the entire library? This will remove all tracks and analysis data. This action cannot be undone.')) {
                          try {
                            const result = await window.electronAPI?.engineClearLibrary();
                            if (result?.success) {
                              alert(result.message || `Library cleared successfully (${result.removedCount || 0} tracks removed)`);
                              // Optionally reload the page to reflect the changes
                              window.location.reload();
                            } else {
                              alert('Failed to clear library: ' + (result?.error || 'Unknown error'));
                            }
                          } catch (error) {
                            alert('Error clearing library: ' + error);
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors"
                    >
                      Clear Entire Library
                    </button>
                    <p className="text-xs text-red-400 mt-2">
                      This will remove all tracks, analysis data, and metadata from the library
                    </p>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'analysis' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">Analysis Settings</h3>

                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.analysis.autoAnalyze}
                      onChange={(e) => updateSettings('analysis', { autoAnalyze: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Auto-analyze tracks after scanning</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.analysis.analyzeOnImport}
                      onChange={(e) => updateSettings('analysis', { analyzeOnImport: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Analyze tracks immediately on import</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.analysis.writeTagsToFiles}
                      onChange={(e) => updateSettings('analysis', { writeTagsToFiles: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex flex-col">
                      <span>Write tags to audio files</span>
                      <span className="text-xs text-gray-400">Write BPM, key, and energy data to file metadata tags</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-4">BPM Detection Range</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Minimum BPM</label>
                      <input
                        type="number"
                        min="30"
                        max="300"
                        value={settings.analysis.bpmRange.min}
                        onChange={(e) => updateSettings('analysis', {
                          bpmRange: { ...settings.analysis.bpmRange, min: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Maximum BPM</label>
                      <input
                        type="number"
                        min="30"
                        max="300"
                        value={settings.analysis.bpmRange.max}
                        onChange={(e) => updateSettings('analysis', {
                          bpmRange: { ...settings.analysis.bpmRange, max: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Analysis Engine</label>
                  <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Volume2 className="h-5 w-5 text-primary-400" />
                      <span className="font-medium text-primary-400">Professional Audio Analysis</span>
                    </div>
                    <p className="text-sm text-gray-300 mb-4">Choose the analysis engine for BPM, key detection, and energy analysis.</p>

                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="analysisEngine"
                          value="auto"
                          checked={settings.analysis.engine === 'auto'}
                          onChange={(e) => updateSettings('analysis', { engine: e.target.value as any })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="font-medium">Auto (Recommended)</span>
                          <p className="text-sm text-gray-400">Try all engines in order: Librosa → KeyFinder → Essentia</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="analysisEngine"
                          value="librosa"
                          checked={settings.analysis.engine === 'librosa'}
                          onChange={(e) => updateSettings('analysis', { engine: e.target.value as any })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="font-medium">Librosa</span>
                          <p className="text-sm text-gray-400">Python-based scientific audio analysis library</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="analysisEngine"
                          value="keyfinder"
                          checked={settings.analysis.engine === 'keyfinder'}
                          onChange={(e) => updateSettings('analysis', { engine: e.target.value as any })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="font-medium">KeyFinder</span>
                          <p className="text-sm text-gray-400">DJ-focused key detection with Circle of Fifths algorithm</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="analysisEngine"
                          value="essentia"
                          checked={settings.analysis.engine === 'essentia'}
                          onChange={(e) => updateSettings('analysis', { engine: e.target.value as any })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="font-medium">Essentia.js (Experimental)</span>
                          <p className="text-sm text-gray-400">Research-grade MIR library from MTG Barcelona</p>
                        </div>
                      </label>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.analysis.engineFallback}
                          onChange={(e) => updateSettings('analysis', { engineFallback: e.target.checked })}
                          className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm">Enable fallback to other engines if primary fails</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.analysis.showEngineInfo}
                          onChange={(e) => updateSettings('analysis', { showEngineInfo: e.target.checked })}
                          className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm">Show analysis engine info in results</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Key Notation</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="keyNotation"
                        value="sharp"
                        checked={settings.analysis.keyNotation === 'sharp'}
                        onChange={(e) => updateSettings('analysis', { keyNotation: e.target.value as 'sharp' | 'flat' })}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span>Sharp (C#, D#, F#, G#, A#)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="keyNotation"
                        value="flat"
                        checked={settings.analysis.keyNotation === 'flat'}
                        onChange={(e) => updateSettings('analysis', { keyNotation: e.target.value as 'sharp' | 'flat' })}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span>Flat (Db, Eb, Gb, Ab, Bb)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stems' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">STEM Separation Settings</h3>
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Layers className="h-5 w-5 text-primary-400" />
                    <span className="font-medium text-primary-400">AI-Powered Audio Source Separation</span>
                  </div>
                  <p className="text-sm text-gray-300">Separate tracks into individual stems (vocals, drums, bass, other) using advanced machine learning models.</p>
                </div>

                <div className="space-y-6">
                  {/* Enable/Disable STEM Separation */}
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.stems.enabled}
                      onChange={(e) => updateSettings('stems', { enabled: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex flex-col">
                      <span>Enable STEM separation</span>
                      <span className="text-xs text-gray-400">Unlock advanced remix and DJ functionality</span>
                    </div>
                  </label>

                  {settings.stems.enabled && (
                    <>
                      {/* Output Paths */}
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Storage Locations</h4>

                        <div>
                          <label className="block text-sm font-medium mb-2">Stems Output Directory</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={settings.stems.outputPath}
                              onChange={(e) => updateSettings('stems', { outputPath: e.target.value })}
                              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="~/Music/CleanCue Stems"
                            />
                            <button className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
                              Browse
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Where separated stem files will be stored</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Temporary Processing Directory</label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={settings.stems.tempPath}
                              onChange={(e) => updateSettings('stems', { tempPath: e.target.value })}
                              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="~/.cleancue/temp"
                            />
                            <button className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
                              Browse
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Temporary files during processing (can be cleaned up)</p>
                        </div>
                      </div>

                      {/* Default Model Settings */}
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Default Processing Settings</h4>

                        <div>
                          <label className="block text-sm font-medium mb-2">AI Model</label>
                          <select
                            value={settings.stems.defaultModel}
                            onChange={(e) => updateSettings('stems', { defaultModel: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="htdemucs">HTDemucs - Best overall quality</option>
                            <option value="htdemucs_ft">HTDemucs Fine-tuned - Enhanced for specific genres</option>
                            <option value="htdemucs_6s">HTDemucs 6-source - Separates guitar and piano too</option>
                            <option value="mdx_extra">MDX Extra - Faster processing</option>
                          </select>
                          <p className="text-xs text-gray-400 mt-1">Different models offer various trade-offs between quality and speed</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Quality</label>
                            <select
                              value={settings.stems.defaultQuality}
                              onChange={(e) => updateSettings('stems', { defaultQuality: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="low">Low - Fastest processing</option>
                              <option value="medium">Medium - Balanced quality/speed</option>
                              <option value="high">High - Best quality</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Output Format</label>
                            <select
                              value={settings.stems.defaultFormat}
                              onChange={(e) => updateSettings('stems', { defaultFormat: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="wav">WAV - Uncompressed</option>
                              <option value="flac">FLAC - Lossless compression</option>
                              <option value="mp3">MP3 - Smaller files</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Advanced Settings */}
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Advanced Settings</h4>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Segments</label>
                            <input
                              type="number"
                              min="1"
                              max="16"
                              value={settings.stems.segments}
                              onChange={(e) => updateSettings('stems', { segments: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">Higher = less memory usage</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Overlap</label>
                            <input
                              type="number"
                              min="0"
                              max="1"
                              step="0.05"
                              value={settings.stems.overlap}
                              onChange={(e) => updateSettings('stems', { overlap: parseFloat(e.target.value) })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">Segment overlap (0.25 recommended)</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Clip Mode</label>
                            <select
                              value={settings.stems.clipMode}
                              onChange={(e) => updateSettings('stems', { clipMode: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="rescale">Rescale - Prevent clipping</option>
                              <option value="clamp">Clamp - Hard limit</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Workflow Settings */}
                      <div className="space-y-4">
                        <h4 className="text-md font-medium">Workflow Integration</h4>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={settings.stems.autoSeparateOnImport}
                            onChange={(e) => updateSettings('stems', { autoSeparateOnImport: e.target.checked })}
                            className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                          />
                          <div className="flex flex-col">
                            <span>Auto-separate stems on import</span>
                            <span className="text-xs text-gray-400">Automatically create stems for new tracks</span>
                          </div>
                        </label>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Maximum Concurrent Jobs: {settings.stems.maxConcurrentJobs}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="4"
                            value={settings.stems.maxConcurrentJobs}
                            onChange={(e) => updateSettings('stems', { maxConcurrentJobs: parseInt(e.target.value) })}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>1 (Conservative)</span>
                            <span>4 (Maximum)</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">Higher values use more CPU/GPU but process multiple tracks simultaneously</p>
                        </div>
                      </div>

                      {/* Performance Info */}
                      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                        <h4 className="text-md font-medium text-blue-300 mb-3">🎛️ Performance Notes</h4>
                        <div className="text-sm text-gray-300 space-y-2">
                          <p>• STEM separation is computationally intensive and may take several minutes per track</p>
                          <p>• HTDemucs models provide the best quality but require more processing time</p>
                          <p>• Consider your system's capabilities when adjusting concurrent jobs</p>
                          <p>• Temp directory should have sufficient free space (2-3x track size)</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ui' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">Interface Settings</h3>

                {/* Theme Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Theme</label>
                    <select
                      value={settings.ui.theme}
                      onChange={(e) => updateSettings('ui', { theme: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto (System)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Grid Columns</label>
                    <select
                      value={settings.ui.gridCols}
                      onChange={(e) => updateSettings('ui', { gridCols: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="auto">Auto</option>
                      <option value="2">2 Columns</option>
                      <option value="3">3 Columns</option>
                      <option value="4">4 Columns</option>
                      <option value="5">5 Columns</option>
                    </select>
                  </div>
                </div>

                {/* View Options */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">View Options</h4>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.ui.compactView}
                      onChange={(e) => updateSettings('ui', { compactView: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Default to compact list view</span>
                    <span className="text-xs text-gray-400">(Recommended for DJs)</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.ui.showAlbumArt}
                      onChange={(e) => updateSettings('ui', { showAlbumArt: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Show album artwork</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.ui.showTooltips}
                      onChange={(e) => updateSettings('ui', { showTooltips: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Show helpful tooltips</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.ui.animateTransitions}
                      onChange={(e) => updateSettings('ui', { animateTransitions: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Smooth animations</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.ui.autoColorTheme}
                      onChange={(e) => updateSettings('ui', { autoColorTheme: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Auto-color theme based on music</span>
                    <span className="text-xs text-gray-400">(Experimental)</span>
                  </label>
                </div>

                {/* Log Viewer Settings */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-300">Transparency & Logging</h4>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.ui.showLogViewer}
                      onChange={(e) => updateSettings('ui', { showLogViewer: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Show log viewer at bottom of screens</span>
                    <span className="text-xs text-gray-400">(For transparency)</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Log Viewer Height: {settings.ui.logViewerHeight}px
                    </label>
                    <input
                      type="range"
                      min="150"
                      max="400"
                      step="25"
                      value={settings.ui.logViewerHeight}
                      onChange={(e) => updateSettings('ui', { logViewerHeight: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Compact (150px)</span>
                      <span>Large (400px)</span>
                    </div>
                  </div>
                </div>

                {/* DJ Workflow Enhancements */}
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                  <h4 className="text-md font-medium text-blue-300 mb-3">🎧 DJ Workflow Enhancements</h4>
                  <p className="text-sm text-gray-300 mb-3">
                    These settings optimize CleanCue for professional DJ use with better track management and faster workflow.
                  </p>

                  <div className="space-y-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-blue-300">Key Display Mode</label>
                      <select
                        value={settings.ui.keyDisplayMode}
                        onChange={(e) => updateSettings('ui', { keyDisplayMode: e.target.value as 'musical' | 'camelot' })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="musical">Musical Keys (Am, C#, Dm)</option>
                        <option value="camelot">Camelot Wheel (8A, 12B, 7A)</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        {settings.ui.keyDisplayMode === 'camelot'
                          ? 'Perfect for harmonic mixing - adjacent numbers mix perfectly'
                          : 'Traditional musical notation - shows actual key signatures'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    • Compact view shows more tracks per screen<br/>
                    • BPM and key info prominently displayed<br/>
                    • Quick selection and analysis tools<br/>
                    • Real-time logging for transparency
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="h-[600px]">
                <LogViewer />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings