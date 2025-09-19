import { useState } from 'react'
import { Settings as SettingsIcon, Database, Music, Folder, X, Save, RotateCcw, Workflow, Volume2 } from 'lucide-react'

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
}

interface AppSettings {
  database: {
    path: string
    autoBackup: boolean
    backupFrequency: 'daily' | 'weekly' | 'monthly'
  }
  library: {
    autoScan: boolean
    scanOnStartup: boolean
    watchFolders: boolean
    extensions: string[]
  }
  workflow: {
    enableNormalization: boolean
    normalizationPreset: 'dj' | 'broadcast' | 'streaming' | 'custom'
    customTargetLufs: number
    customTargetPeak: number
    autoNormalizeOnImport: boolean
    createBackups: boolean
    normalizedSuffix: string
    outputFormat: 'wav' | 'flac' | 'aiff'
  }
  analysis: {
    autoAnalyze: boolean
    analyzeOnImport: boolean
    writeTagsToFiles: boolean
    bpmRange: { min: number; max: number }
  }
  ui: {
    theme: 'dark' | 'light' | 'auto'
    showAlbumArt: boolean
    compactView: boolean
  }
}

const defaultSettings: AppSettings = {
  database: {
    path: '~/Library/Application Support/CleanCue/library.db',
    autoBackup: true,
    backupFrequency: 'weekly'
  },
  library: {
    autoScan: false,
    scanOnStartup: false,
    watchFolders: false,
    extensions: ['mp3', 'flac', 'wav', 'm4a', 'aif', 'aiff', 'ogg']
  },
  workflow: {
    enableNormalization: true,
    normalizationPreset: 'dj',
    customTargetLufs: -12,
    customTargetPeak: -1,
    autoNormalizeOnImport: false,
    createBackups: true,
    normalizedSuffix: '_normalized',
    outputFormat: 'wav'
  },
  analysis: {
    autoAnalyze: false,
    analyzeOnImport: false,
    writeTagsToFiles: true,
    bpmRange: { min: 60, max: 200 }
  },
  ui: {
    theme: 'dark',
    showAlbumArt: true,
    compactView: false
  }
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [activeTab, setActiveTab] = useState<'database' | 'library' | 'workflow' | 'analysis' | 'ui'>('workflow')

  if (!isOpen) return null

  const handleSave = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveSettings(settings)
        if (result.success) {
          console.log('Settings saved successfully')
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
    { id: 'database', label: 'Database', icon: Database },
    { id: 'analysis', label: 'Analysis', icon: SettingsIcon },
    { id: 'ui', label: 'Interface', icon: Folder }
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
                          <label className="block text-sm font-medium mb-2">Normalization Preset</label>
                          <select
                            value={settings.workflow.normalizationPreset}
                            onChange={(e) => updateSettings('workflow', { normalizationPreset: e.target.value })}
                            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="dj">DJ (-12 LUFS) - Optimized for club play</option>
                            <option value="streaming">Streaming (-14 LUFS) - Spotify/Apple Music</option>
                            <option value="broadcast">Broadcast (-23 LUFS) - EBU R128 standard</option>
                            <option value="custom">Custom - Set your own targets</option>
                          </select>
                        </div>

                        {settings.workflow.normalizationPreset === 'custom' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Target LUFS</label>
                              <input
                                type="number"
                                min="-30"
                                max="-6"
                                value={settings.workflow.customTargetLufs}
                                onChange={(e) => updateSettings('workflow', { customTargetLufs: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Target Peak (dB)</label>
                              <input
                                type="number"
                                min="-6"
                                max="0"
                                value={settings.workflow.customTargetPeak}
                                onChange={(e) => updateSettings('workflow', { customTargetPeak: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={settings.workflow.autoNormalizeOnImport}
                              onChange={(e) => updateSettings('workflow', { autoNormalizeOnImport: e.target.checked })}
                              className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Auto-normalize on import</span>
                          </label>

                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={settings.workflow.createBackups}
                              onChange={(e) => updateSettings('workflow', { createBackups: e.target.checked })}
                              className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Create backup files</span>
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
                              placeholder="_normalized"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Output Format</label>
                            <select
                              value={settings.workflow.outputFormat}
                              onChange={(e) => updateSettings('workflow', { outputFormat: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="wav">WAV (Uncompressed)</option>
                              <option value="flac">FLAC (Lossless)</option>
                              <option value="aiff">AIFF (Uncompressed)</option>
                            </select>
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
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">Database Settings</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">Database Path</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={settings.database.path}
                      onChange={(e) => updateSettings('database', { path: e.target.value })}
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-md transition-colors">
                      Browse
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={settings.database.autoBackup}
                      onChange={(e) => updateSettings('database', { autoBackup: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Automatic backups</span>
                  </label>

                  {settings.database.autoBackup && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Backup Frequency</label>
                      <select
                        value={settings.database.backupFrequency}
                        onChange={(e) => updateSettings('database', { backupFrequency: e.target.value })}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  )}
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
              </div>
            )}

            {activeTab === 'ui' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium mb-4">Interface Settings</h3>

                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <select
                    value={settings.ui.theme}
                    onChange={(e) => updateSettings('ui', { theme: e.target.value })}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div className="space-y-4">
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
                      checked={settings.ui.compactView}
                      onChange={(e) => updateSettings('ui', { compactView: e.target.checked })}
                      className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                    />
                    <span>Compact list view</span>
                  </label>
                </div>
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