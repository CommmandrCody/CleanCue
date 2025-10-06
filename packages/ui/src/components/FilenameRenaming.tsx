import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, CheckCircle, RefreshCw, Download } from 'lucide-react'
import clsx from 'clsx'
import { FilenameHealthChecker, type FilenameHealthIssue as FilenameIssue } from '@cleancue/shared'
import { useProcessing } from '../contexts/ProcessingContext'

interface TrackFilenameHealth {
  id: string
  title: string
  artist: string
  path: string
  currentFilename: string
  healthScore: number
  issues: FilenameIssue[]
  suggestedFilename: string
  engineDjCompatible: boolean
}

interface FilenameRenamingProps {
  selectedTracks?: string[]
}

export function FilenameRenaming({ selectedTracks = [] }: FilenameRenamingProps) {
  const processing = useProcessing()
  const [tracks, setTracks] = useState<TrackFilenameHealth[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [namingTemplate, setNamingTemplate] = useState('{artist} - {title} [{bpm}] ({key})')
  const [selectedForRename, setSelectedForRename] = useState<string[]>([])
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)

  const templates = {
    BASIC: '{artist} - {title}',
    WITH_BPM: '{artist} - {title} [{bpm}]',
    WITH_KEY: '{artist} - {title} ({key})',
    FULL_DJ: '{artist} - {title} [{bpm}] ({key})',
    CLEAN_DJ: '{artist} - {title} [{bpm}] ({key}) [CLEAN]',
    REMIXER: '{artist} - {title} ({remixer} Remix) [{bpm}] ({key})',
  }

  useEffect(() => {
    analyzeFilenames()
  }, [selectedTracks])

  const analyzeFilenames = async () => {
    setAnalyzing(true)
    try {
      // Get all tracks from database
      const allTracks = await window.electronAPI.getAllTracks()

      // Filter to selected tracks and analyze filenames
      const analyzedTracks: TrackFilenameHealth[] = allTracks
        .filter(t => selectedTracks.includes(t.id))
        .map(track => {
          const currentFilename = track.path.split('/').pop() || track.path

          // Generate clean filename from metadata (fresh generation)
          const suggestedFilename = generateCleanFilename(track, namingTemplate)

          // Analyze the SUGGESTED filename for health
          const healthResult = FilenameHealthChecker.analyzeFilename(suggestedFilename, {
            artist: track.artist,
            title: track.title,
            bpm: track.bpm,
            key: track.key
          })

          return {
            id: track.id,
            title: track.title || 'Unknown',
            artist: track.artist || 'Unknown',
            path: track.path,
            currentFilename,
            healthScore: healthResult.score,
            issues: healthResult.issues,
            suggestedFilename,
            engineDjCompatible: healthResult.engineDjCompatible
          }
        })

      setTracks(analyzedTracks)

      // Auto-select tracks that need renaming (where suggested filename differs)
      const tracksNeedingRename = analyzedTracks
        .filter(t => t.currentFilename !== t.suggestedFilename)
        .map(t => t.id)
      setSelectedForRename(tracksNeedingRename)

    } catch (error) {
      console.error('Failed to analyze filenames:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const generateCleanFilename = (track: any, template: string): string => {
    const extension = track.path.split('.').pop()
    const currentFilename = track.path.split('/').pop() || ''

    // Use database metadata, but fall back to parsing from filename if missing
    let bpm = track.bpm
    let key = track.key

    // If BPM/Key not in database, try to extract from current filename
    if (!bpm) {
      // Try new format [BPM]
      const bpmMatch = currentFilename.match(/\[(\d{2,3})\]/)
      if (bpmMatch) {
        bpm = parseInt(bpmMatch[1])
      } else {
        // Try old format - Key - BPM or - BPM - Key
        const oldBpmMatch = currentFilename.match(/\s-\s(?:[0-9]{1,2}[AB]\s-\s)?(\d{2,3})(?:\s-\s[0-9]{1,2}[AB])?\s*$/i)
        if (oldBpmMatch) bpm = parseInt(oldBpmMatch[1])
      }
    }

    if (!key) {
      // Try new format (Key)
      const keyMatch = currentFilename.match(/\(([0-9]{1,2}[AB])\)/)
      if (keyMatch) {
        key = keyMatch[1]
      } else {
        // Try old format - Key - BPM or - BPM - Key at the end
        const oldKeyMatch = currentFilename.match(/\s-\s([0-9]{1,2}[AB])\s-\s(?:\d{2,3})?\s*$/i)
        if (oldKeyMatch) key = oldKeyMatch[1]
      }
    }

    return FilenameHealthChecker.generateCleanFilename(
      {
        artist: track.artist,
        title: track.title,
        bpm: bpm,
        key: key,
        album: track.album,
        genre: track.genre,
      },
      template,
      `.${extension}`
    )
  }

  const handleRename = async () => {
    if (selectedForRename.length === 0) return

    // Check for conflicts and register tracks
    const { allowed, blocked } = processing.registerProcessing(selectedForRename, 'filename')

    if (blocked.length > 0) {
      const screens = blocked.map(id => processing.getProcessingScreen(id)).filter(Boolean)
      setConflictMessage(
        `${blocked.length} track(s) already being processed in ${screens.join(', ')}. Only ${allowed.length} will be renamed.`
      )
      setTimeout(() => setConflictMessage(null), 5000)

      if (allowed.length === 0) return
    }

    setRenaming(true)
    const errors: string[] = []

    try {
      const tracksToRename = tracks.filter(t => allowed.includes(t.id))

      for (const track of tracksToRename) {
        try {
          const result = await window.electronAPI.renameTrackFile(track.id, track.suggestedFilename)
          if (!result.success) {
            errors.push(`${track.currentFilename}: ${result.error}`)
          }
        } catch (error) {
          errors.push(`${track.currentFilename}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        // Unregister track after processing (success or failure)
        processing.unregisterProcessing([track.id], 'filename')
      }

      if (errors.length > 0) {
        console.error('Some files failed to rename:', errors)
        alert(`${errors.length} file(s) failed to rename:\n${errors.join('\n')}`)
      } else {
        alert(`Successfully renamed ${tracksToRename.length} file(s)`)
      }

      // Re-analyze after rename
      await analyzeFilenames()
      setSelectedForRename([])

    } catch (error) {
      console.error('Failed to rename files:', error)
      alert('Failed to rename files: ' + (error instanceof Error ? error.message : 'Unknown error'))
      // Unregister all on error
      processing.unregisterProcessing(allowed, 'filename')
    } finally {
      setRenaming(false)
    }
  }

  const handleExportReport = () => {
    const report = tracks.map(t => ({
      currentFilename: t.currentFilename,
      suggestedFilename: t.suggestedFilename,
      healthScore: t.healthScore,
      issues: t.issues.map(i => i.description).join('; '),
      engineDjCompatible: t.engineDjCompatible
    }))

    const csv = [
      'Current Filename,Suggested Filename,Health Score,Issues,Engine DJ Compatible',
      ...report.map(r =>
        `"${r.currentFilename}","${r.suggestedFilename}",${r.healthScore},"${r.issues}",${r.engineDjCompatible}`
      )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filename-health-report-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Filename Management</h2>
          <p className="text-gray-400">
            {selectedTracks.length > 0
              ? `Working with ${selectedTracks.length} selected tracks`
              : 'Analyze and fix problematic filenames for DJ software compatibility'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={analyzeFilenames}
            disabled={analyzing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            {analyzing ? 'Analyzing...' : 'Analyze Filenames'}
          </button>
          <button
            onClick={handleRename}
            disabled={renaming || selectedForRename.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            {renaming ? 'Renaming...' : `Rename Selected (${selectedForRename.length})`}
          </button>
        </div>
      </div>

      {/* Conflict Warning */}
      {conflictMessage && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-200">{conflictMessage}</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden bg-gray-800 rounded-lg">
        {/* Configuration Panel */}
        <div className="w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
            <h3 className="font-medium mb-4">Naming Template</h3>

            {/* Template Selection */}
            <div className="space-y-2 mb-6">
              {Object.entries(templates).map(([name, template]) => (
                <label key={name} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={namingTemplate === template}
                    onChange={() => setNamingTemplate(template)}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium">{name.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-gray-400 font-mono">{template}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Custom Template */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Custom Template</label>
              <input
                type="text"
                value={namingTemplate}
                onChange={(e) => setNamingTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="{artist} - {title}"
              />
              <div className="text-xs text-gray-400 mt-1">
                Available: {'{artist}'}, {'{title}'}, {'{bpm}'}, {'{key}'}, {'{album}'}, {'{genre}'}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={analyzeFilenames}
                disabled={analyzing || selectedTracks.length === 0}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors flex items-center justify-center"
              >
                <RefreshCw className={clsx('h-4 w-4 mr-2', analyzing && 'animate-spin')} />
                {analyzing ? 'Analyzing...' : 'Re-analyze Filenames'}
              </button>

              <button
                onClick={handleRename}
                disabled={renaming || selectedForRename.length === 0}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                {renaming ? 'Renaming...' : `Rename ${selectedForRename.length} Files`}
              </button>

              <button
                onClick={handleExportReport}
                disabled={tracks.length === 0}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors flex items-center justify-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report (CSV)
              </button>
            </div>

            {/* Summary Stats */}
            {tracks.length > 0 && (
              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-3">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Tracks:</span>
                    <span>{tracks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Healthy:</span>
                    <span className="text-green-400">{tracks.filter(t => t.healthScore === 100).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">With Issues:</span>
                    <span className="text-yellow-400">{tracks.filter(t => t.healthScore < 100).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Engine DJ Safe:</span>
                    <span className={tracks.filter(t => t.engineDjCompatible).length === tracks.length ? 'text-green-400' : 'text-red-400'}>
                      {tracks.filter(t => t.engineDjCompatible).length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Track List */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Filename Analysis Results</h3>
              {tracks.length > 0 && (
                <button
                  onClick={() => {
                    if (selectedForRename.length === tracks.length) {
                      setSelectedForRename([])
                    } else {
                      setSelectedForRename(tracks.map(t => t.id))
                    }
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  {selectedForRename.length === tracks.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {analyzing ? (
              <div className="text-center py-12 text-gray-400">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
                <p>Analyzing filenames...</p>
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tracks selected</p>
                <p className="text-sm mt-2">Select tracks in the library to analyze their filenames</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tracks.map(track => (
                  <div
                    key={track.id}
                    className={clsx(
                      'p-4 rounded-lg border transition-colors',
                      selectedForRename.includes(track.id)
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedForRename.includes(track.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForRename([...selectedForRename, track.id])
                            } else {
                              setSelectedForRename(selectedForRename.filter(id => id !== track.id))
                            }
                          }}
                          className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{track.artist} - {track.title}</div>
                          <div className="text-xs text-gray-400 font-mono truncate mt-1">{track.currentFilename}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 ml-4">
                        {/* Health Score */}
                        <div className={clsx('text-2xl font-bold', getHealthColor(track.healthScore))}>
                          {track.healthScore}
                        </div>

                        {/* Engine DJ Badge */}
                        {track.engineDjCompatible ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-400" />
                        )}
                      </div>
                    </div>

                    {/* Issues */}
                    {track.issues.length > 0 && (
                      <div className="mb-3 space-y-1">
                        {track.issues.map((issue, idx) => (
                          <div key={idx} className={clsx('text-xs flex items-start space-x-2', getSeverityColor(issue.severity))}>
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{issue.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suggested Filename */}
                    {track.suggestedFilename !== track.currentFilename && (
                      <div className="pt-3 border-t border-gray-700">
                        <div className="text-xs text-gray-400 mb-1">Suggested filename:</div>
                        <div className="text-sm font-mono text-green-400">{track.suggestedFilename}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
