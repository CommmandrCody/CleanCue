import { useState } from 'react'
import { Settings, Music, Clock, FileText, Disc, X, Check, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

interface AnalysisSettings {
  tempo: {
    restrictRange: boolean
    lowestBPM: number
    highestBPM: number
    decimalPlaces: 'none' | 'one' | 'two'
  }
  keyNotation: {
    primaryNotation: 'camelot' | 'standard' | 'flats' | 'sharps'
    addZeroToSingleDigit: boolean
    extraKeyColumn: 'none' | 'standard' | 'flats' | 'sharps'
    useCamelotInComments: boolean
  }
  fileRenaming: {
    enabled: boolean
    namingPattern: 'original-key' | 'original-key-tempo' | 'key-original' | 'key-tempo-original' | 'tempo-key-original'
  }
  djSoftwareIntegration: {
    serato: {
      enabled: boolean
      exportKey: boolean
      exportTitleArtistComment: boolean
      exportCuePoints: boolean
      installationPath?: string
    }
    traktor: {
      enabled: boolean
      exportKey: boolean
      exportTitleArtistComment: boolean
      exportCuePoints: boolean
      installationPath?: string
    }
    rekordbox: {
      enabled: boolean
      exportKey: boolean
      exportTitleArtistComment: boolean
      exportCuePoints: boolean
      xmlPath?: string
    }
    overwriteExistingCuePoints: boolean
  }
  advanced: {
    analysisQuality: 'fast' | 'standard' | 'high' | 'ultra'
    enableHarmonicMixing: boolean
    energyDetection: boolean
    automaticGainNormalization: boolean
    preserveOriginalTimestamps: boolean
  }
}

interface AnalysisSettingsProps {
  isOpen: boolean
  onClose: () => void
  settings: AnalysisSettings
  onSettingsChange: (settings: AnalysisSettings) => void
}

const keyNotationExamples = {
  camelot: { example: '3A', description: 'Camelot Wheel notation' },
  standard: { example: 'Bbm', description: 'Standard musical notation' },
  flats: { example: 'Bbm', description: 'Prefer flat notation' },
  sharps: { example: 'A#m', description: 'Prefer sharp notation' }
}

const namingPatternExamples = {
  'original-key': 'Artist - Title - 3A',
  'original-key-tempo': 'Artist - Title - 3A - 128',
  'key-original': '3A - Artist - Title',
  'key-tempo-original': '3A - 128 - Artist - Title',
  'tempo-key-original': '128 - 3A - Artist - Title'
}

export function AnalysisSettings({ isOpen, onClose, settings, onSettingsChange }: AnalysisSettingsProps) {
  const [activeTab, setActiveTab] = useState<'tempo' | 'key' | 'renaming' | 'integration' | 'advanced'>('tempo')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const updateSettings = (newSettings: Partial<AnalysisSettings>) => {
    const updated = { ...settings, ...newSettings }
    onSettingsChange(updated)
    setHasUnsavedChanges(true)
  }

  const updateTempoSettings = (tempoUpdates: Partial<AnalysisSettings['tempo']>) => {
    updateSettings({
      tempo: { ...settings.tempo, ...tempoUpdates }
    })
  }

  const updateKeySettings = (keyUpdates: Partial<AnalysisSettings['keyNotation']>) => {
    updateSettings({
      keyNotation: { ...settings.keyNotation, ...keyUpdates }
    })
  }

  const updateRenamingSettings = (renamingUpdates: Partial<AnalysisSettings['fileRenaming']>) => {
    updateSettings({
      fileRenaming: { ...settings.fileRenaming, ...renamingUpdates }
    })
  }

  const updateDJSoftwareSettings = (djUpdates: Partial<AnalysisSettings['djSoftwareIntegration']>) => {
    updateSettings({
      djSoftwareIntegration: { ...settings.djSoftwareIntegration, ...djUpdates }
    })
  }

  const updateAdvancedSettings = (advancedUpdates: Partial<AnalysisSettings['advanced']>) => {
    updateSettings({
      advanced: { ...settings.advanced, ...advancedUpdates }
    })
  }

  const handleSave = async () => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.saveAnalysisSettings(settings)
      }
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  const detectDJSoftware = async () => {
    try {
      if (window.electronAPI) {
        const detected = await window.electronAPI.detectDJSoftware()
        if (detected.serato) {
          updateDJSoftwareSettings({
            serato: { ...settings.djSoftwareIntegration.serato, installationPath: detected.serato }
          })
        }
        if (detected.traktor) {
          updateDJSoftwareSettings({
            traktor: { ...settings.djSoftwareIntegration.traktor, installationPath: detected.traktor }
          })
        }
        if (detected.rekordbox) {
          updateDJSoftwareSettings({
            rekordbox: { ...settings.djSoftwareIntegration.rekordbox, xmlPath: detected.rekordbox }
          })
        }
      }
    } catch (error) {
      console.error('Failed to detect DJ software:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-primary-400" />
            <div>
              <h2 className="text-xl font-bold">Analysis Settings</h2>
              <p className="text-sm text-gray-400">Configure audio analysis behavior</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2 text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Unsaved changes</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-gray-900 border-r border-gray-700">
            <div className="p-4 space-y-1">
              {[
                { id: 'tempo', label: 'Tempo', icon: Clock },
                { id: 'key', label: 'Key Notation', icon: Music },
                { id: 'renaming', label: 'File Renaming', icon: FileText },
                { id: 'integration', label: 'DJ Software', icon: Disc },
                { id: 'advanced', label: 'Advanced', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors',
                    activeTab === id
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {/* Tempo Tab */}
              {activeTab === 'tempo' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Tempo Settings</h3>

                    {/* Range Restriction */}
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.tempo.restrictRange}
                          onChange={(e) => updateTempoSettings({ restrictRange: e.target.checked })}
                          className="mt-1 rounded border-gray-600 bg-gray-700 text-primary-600"
                        />
                        <div>
                          <div className="font-medium">Restrict displayed tempo</div>
                          <div className="text-sm text-gray-400">Values outside this range will be doubled or halved.</div>
                        </div>
                      </div>

                      {settings.tempo.restrictRange && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div>
                            <label className="block text-sm font-medium mb-2">Lowest BPM</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={settings.tempo.lowestBPM}
                                onChange={(e) => updateTempoSettings({ lowestBPM: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
                                min="60"
                                max="200"
                              />
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col">
                                <button
                                  onClick={() => updateTempoSettings({ lowestBPM: settings.tempo.lowestBPM + 1 })}
                                  className="text-gray-400 hover:text-white text-xs leading-none"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => updateTempoSettings({ lowestBPM: Math.max(60, settings.tempo.lowestBPM - 1) })}
                                  className="text-gray-400 hover:text-white text-xs leading-none"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Highest BPM</label>
                            <div className="relative">
                              <input
                                type="number"
                                value={settings.tempo.highestBPM}
                                onChange={(e) => updateTempoSettings({ highestBPM: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md"
                                min="100"
                                max="300"
                              />
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col">
                                <button
                                  onClick={() => updateTempoSettings({ highestBPM: Math.min(300, settings.tempo.highestBPM + 1) })}
                                  className="text-gray-400 hover:text-white text-xs leading-none"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => updateTempoSettings({ highestBPM: settings.tempo.highestBPM - 1 })}
                                  className="text-gray-400 hover:text-white text-xs leading-none"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Decimal Places */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Decimal places</h4>
                      {[
                        { id: 'none', label: 'Round the result, do not show decimal places', example: '128' },
                        { id: 'one', label: 'Show one decimal place', example: '128.1' },
                        { id: 'two', label: 'Show two decimal places', example: '128.14' }
                      ].map(({ id, label, example }) => (
                        <label key={id} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="decimalPlaces"
                            value={id}
                            checked={settings.tempo.decimalPlaces === id}
                            onChange={(e) => updateTempoSettings({ decimalPlaces: e.target.value as any })}
                            className="mt-1 border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-sm text-gray-400">Example: "{example}"</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Key Notation Tab */}
              {activeTab === 'key' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Key Notation</h3>

                    {/* Primary Notation */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Primary notation</h4>
                      <p className="text-sm text-gray-400">Key notation used throughout CleanCue.</p>

                      {Object.entries(keyNotationExamples).map(([id, { example, description: _description }]) => (
                        <label key={id} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="primaryNotation"
                            value={id}
                            checked={settings.keyNotation.primaryNotation === id}
                            onChange={(e) => updateKeySettings({ primaryNotation: e.target.value as any })}
                            className="mt-1 border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <div>
                            <div className="font-medium capitalize">{id}</div>
                            <div className="text-sm text-gray-400">Example: "{example}"</div>
                          </div>
                        </label>
                      ))}

                      {/* Zero Padding */}
                      <div className="flex items-start space-x-3 mt-4">
                        <input
                          type="checkbox"
                          checked={settings.keyNotation.addZeroToSingleDigit}
                          onChange={(e) => updateKeySettings({ addZeroToSingleDigit: e.target.checked })}
                          className="mt-1 rounded border-gray-600 bg-gray-700 text-primary-600"
                        />
                        <div>
                          <div className="font-medium">Add a zero to single-digit Camelot numbers</div>
                          <div className="text-sm text-gray-400">Example: "03A" vs. "3A"</div>
                        </div>
                      </div>
                    </div>

                    {/* Extra Key Column */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Extra key column</h4>
                      <p className="text-sm text-gray-400">Optionally add a column using non-Camelot notation.</p>

                      {[
                        { id: 'none', label: 'No extra column' },
                        { id: 'standard', label: 'Standard', example: 'Bbm' },
                        { id: 'flats', label: 'Flats', example: 'Bbm' },
                        { id: 'sharps', label: 'Sharps', example: 'A#m' }
                      ].map(({ id, label, example }) => (
                        <label key={id} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="extraKeyColumn"
                            value={id}
                            checked={settings.keyNotation.extraKeyColumn === id}
                            onChange={(e) => updateKeySettings({ extraKeyColumn: e.target.value as any })}
                            className="mt-1 border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <div>
                            <div className="font-medium">{label}</div>
                            {example && <div className="text-sm text-gray-400">Example: "{example}"</div>}
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* Comments */}
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.keyNotation.useCamelotInComments}
                        onChange={(e) => updateKeySettings({ useCamelotInComments: e.target.checked })}
                        className="mt-1 rounded border-gray-600 bg-gray-700 text-primary-600"
                      />
                      <div>
                        <div className="font-medium">Use Camelot key notation in comment tags</div>
                        <div className="text-sm text-gray-400">Overrides the primary key notation setting</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* File Renaming Tab */}
              {activeTab === 'renaming' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">File Renaming</h3>

                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.fileRenaming.enabled}
                          onChange={(e) => updateRenamingSettings({ enabled: e.target.checked })}
                          className="mt-1 rounded border-gray-600 bg-gray-700 text-primary-600"
                        />
                        <div>
                          <div className="font-medium">Automatically rename files after processing</div>
                          <div className="text-sm text-gray-400">Should CleanCue rename files after analysis?</div>
                        </div>
                      </div>

                      {settings.fileRenaming.enabled && (
                        <div className="ml-6 space-y-4">
                          <h4 className="font-medium">What is your naming preference?</h4>

                          {Object.entries(namingPatternExamples).map(([pattern, example]) => (
                            <label key={pattern} className="flex items-start space-x-3 cursor-pointer">
                              <input
                                type="radio"
                                name="namingPattern"
                                value={pattern}
                                checked={settings.fileRenaming.namingPattern === pattern}
                                onChange={(e) => updateRenamingSettings({ namingPattern: e.target.value as any })}
                                className="mt-1 border-gray-600 bg-gray-700 text-primary-600"
                              />
                              <div>
                                <div className="font-medium">{pattern.split('-').join(' - ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                                <div className="text-sm text-gray-400">Example: "{example}"</div>
                                {pattern === 'original-key-tempo' && (
                                  <div className="text-xs text-green-400">(best option)</div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DJ Software Integration Tab */}
              {activeTab === 'integration' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">DJ Software Integration</h3>
                    <button
                      onClick={detectDJSoftware}
                      className="px-3 py-1 bg-primary-600 hover:bg-primary-700 rounded text-sm transition-colors"
                    >
                      Auto-Detect
                    </button>
                  </div>
                  <p className="text-sm text-gray-400">Cue points and other data will be exported to the DJ software you select.</p>

                  {/* Serato */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.djSoftwareIntegration.serato.enabled}
                          onChange={(e) => updateDJSoftwareSettings({
                            serato: { ...settings.djSoftwareIntegration.serato, enabled: e.target.checked }
                          })}
                          className="rounded border-gray-600 bg-gray-700 text-primary-600"
                        />
                        <div className="font-medium">Serato</div>
                      </div>
                      <div className="text-sm text-green-400">✓ Found</div>
                    </div>

                    {settings.djSoftwareIntegration.serato.enabled && (
                      <div className="ml-6 space-y-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.djSoftwareIntegration.serato.exportKey}
                            onChange={(e) => updateDJSoftwareSettings({
                              serato: { ...settings.djSoftwareIntegration.serato, exportKey: e.target.checked }
                            })}
                            className="rounded border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <span className="text-sm">Export key</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.djSoftwareIntegration.serato.exportTitleArtistComment}
                            onChange={(e) => updateDJSoftwareSettings({
                              serato: { ...settings.djSoftwareIntegration.serato, exportTitleArtistComment: e.target.checked }
                            })}
                            className="rounded border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <span className="text-sm">Export title, artist and comment</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.djSoftwareIntegration.serato.exportCuePoints}
                            onChange={(e) => updateDJSoftwareSettings({
                              serato: { ...settings.djSoftwareIntegration.serato, exportCuePoints: e.target.checked }
                            })}
                            className="rounded border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <span className="text-sm">Export cue points</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Traktor */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.djSoftwareIntegration.traktor.enabled}
                          onChange={(e) => updateDJSoftwareSettings({
                            traktor: { ...settings.djSoftwareIntegration.traktor, enabled: e.target.checked }
                          })}
                          className="rounded border-gray-600 bg-gray-700 text-primary-600"
                        />
                        <div className="font-medium">Traktor</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-400">No Traktor installation found</div>
                        <button className="text-primary-400 hover:text-primary-300 text-sm">Change</button>
                      </div>
                    </div>

                    {settings.djSoftwareIntegration.traktor.enabled && (
                      <div className="ml-6 space-y-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.djSoftwareIntegration.traktor.exportKey}
                            onChange={(e) => updateDJSoftwareSettings({
                              traktor: { ...settings.djSoftwareIntegration.traktor, exportKey: e.target.checked }
                            })}
                            className="rounded border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <span className="text-sm">Export key</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.djSoftwareIntegration.traktor.exportTitleArtistComment}
                            onChange={(e) => updateDJSoftwareSettings({
                              traktor: { ...settings.djSoftwareIntegration.traktor, exportTitleArtistComment: e.target.checked }
                            })}
                            className="rounded border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <span className="text-sm">Export title, artist and comment</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={settings.djSoftwareIntegration.traktor.exportCuePoints}
                            onChange={(e) => updateDJSoftwareSettings({
                              traktor: { ...settings.djSoftwareIntegration.traktor, exportCuePoints: e.target.checked }
                            })}
                            className="rounded border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <span className="text-sm">Export cue points</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Rekordbox */}
                  <div className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.djSoftwareIntegration.rekordbox.enabled}
                          onChange={(e) => updateDJSoftwareSettings({
                            rekordbox: { ...settings.djSoftwareIntegration.rekordbox, enabled: e.target.checked }
                          })}
                          className="rounded border-gray-600 bg-gray-700 text-primary-600"
                        />
                        <div className="font-medium">rekordbox</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm text-gray-400">No Rekordbox xml file found</div>
                        <button className="text-primary-400 hover:text-primary-300 text-sm">Change</button>
                      </div>
                    </div>
                  </div>

                  {/* Overwriting */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-medium mb-3">Overwriting</h4>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={settings.djSoftwareIntegration.overwriteExistingCuePoints}
                        onChange={(e) => updateDJSoftwareSettings({ overwriteExistingCuePoints: e.target.checked })}
                        className="rounded border-gray-600 bg-gray-700 text-primary-600"
                      />
                      <span className="font-medium">Overwrite existing cue points in the selected DJ software</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Advanced Tab */}
              {activeTab === 'advanced' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Advanced Settings</h3>

                    {/* Analysis Quality */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Analysis Quality</h4>
                      <p className="text-sm text-gray-400">Higher quality takes more time but provides better accuracy.</p>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'fast', label: 'Fast', description: 'Quick analysis for preview' },
                          { id: 'standard', label: 'Standard', description: 'Balanced speed and accuracy' },
                          { id: 'high', label: 'High', description: 'Better accuracy, slower' },
                          { id: 'ultra', label: 'Ultra', description: 'Maximum accuracy' }
                        ].map(({ id, label, description }) => (
                          <label key={id} className="flex items-start space-x-3 cursor-pointer border border-gray-700 rounded-lg p-3">
                            <input
                              type="radio"
                              name="analysisQuality"
                              value={id}
                              checked={settings.advanced.analysisQuality === id}
                              onChange={(e) => updateAdvancedSettings({ analysisQuality: e.target.value as any })}
                              className="mt-1 border-gray-600 bg-gray-700 text-primary-600"
                            />
                            <div>
                              <div className="font-medium">{label}</div>
                              <div className="text-sm text-gray-400">{description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Feature Toggles */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Features</h4>

                      {[
                        {
                          key: 'enableHarmonicMixing' as keyof AnalysisSettings['advanced'],
                          label: 'Enable harmonic mixing analysis',
                          description: 'Detect harmonic compatibility between tracks'
                        },
                        {
                          key: 'energyDetection' as keyof AnalysisSettings['advanced'],
                          label: 'Energy level detection',
                          description: 'Analyze track energy for better mixing'
                        },
                        {
                          key: 'automaticGainNormalization' as keyof AnalysisSettings['advanced'],
                          label: 'Automatic gain normalization',
                          description: 'Normalize audio levels during analysis'
                        },
                        {
                          key: 'preserveOriginalTimestamps' as keyof AnalysisSettings['advanced'],
                          label: 'Preserve original file timestamps',
                          description: 'Keep original file creation/modification dates'
                        }
                      ].map(({ key, label, description }) => (
                        <label key={key} className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.advanced[key] as boolean}
                            onChange={(e) => updateAdvancedSettings({ [key]: e.target.checked })}
                            className="mt-1 rounded border-gray-600 bg-gray-700 text-primary-600"
                          />
                          <div>
                            <div className="font-medium">{label}</div>
                            <div className="text-sm text-gray-400">{description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                // Reset to defaults
                onSettingsChange({
                  tempo: { restrictRange: true, lowestBPM: 79, highestBPM: 192, decimalPlaces: 'none' },
                  keyNotation: { primaryNotation: 'camelot', addZeroToSingleDigit: false, extraKeyColumn: 'standard', useCamelotInComments: true },
                  fileRenaming: { enabled: true, namingPattern: 'original-key-tempo' },
                  djSoftwareIntegration: {
                    serato: { enabled: true, exportKey: true, exportTitleArtistComment: true, exportCuePoints: true },
                    traktor: { enabled: false, exportKey: true, exportTitleArtistComment: true, exportCuePoints: true },
                    rekordbox: { enabled: false, exportKey: true, exportTitleArtistComment: true, exportCuePoints: true },
                    overwriteExistingCuePoints: true
                  },
                  advanced: { analysisQuality: 'standard', enableHarmonicMixing: true, energyDetection: true, automaticGainNormalization: false, preserveOriginalTimestamps: true }
                })
                setHasUnsavedChanges(false)
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                hasUnsavedChanges
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              <Check className="h-4 w-4 inline mr-2" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}