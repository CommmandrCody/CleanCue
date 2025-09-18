import { useState, useEffect } from 'react'
import {
  Copy,
  Search,
  Trash2,
  Music,
  HardDrive,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react'
import clsx from 'clsx'

interface DuplicateGroup {
  id: string
  confidence: number
  reason: string
  tracks: DuplicateTrack[]
}

interface DuplicateTrack {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  fileSize: number
  duration: number
  bitrate: number
  dateAdded: string
  selected?: boolean
}


export function DuplicateDetection() {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDuplicates()
  }, [])

  const loadDuplicates = async () => {
    try {
      setLoading(true)
      if (window.electronAPI) {
        const duplicates = await window.electronAPI.getDuplicateGroups()
        setDuplicateGroups(duplicates || [])
      }
    } catch (error) {
      console.error('Failed to load duplicates:', error)
      setDuplicateGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleScanDuplicates = async () => {
    try {
      setScanning(true)
      if (window.electronAPI) {
        const duplicates = await window.electronAPI.scanForDuplicates()
        setDuplicateGroups(duplicates || [])
      }
    } catch (error) {
      console.error('Failed to scan for duplicates:', error)
    } finally {
      setScanning(false)
    }
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSelectTrack = (groupId: string, trackId: string) => {
    setDuplicateGroups(prev =>
      prev.map(group =>
        group.id === groupId
          ? {
              ...group,
              tracks: group.tracks.map(track =>
                track.id === trackId
                  ? { ...track, selected: !track.selected }
                  : track
              )
            }
          : group
      )
    )
  }

  const handleRemoveSelected = async () => {
    const selectedTracks = duplicateGroups
      .filter(group => selectedGroups.includes(group.id))
      .flatMap(group => group.tracks.filter(track => track.selected))

    if (selectedTracks.length === 0) return

    try {
      if (window.electronAPI) {
        const trackIds = selectedTracks.map(track => track.id)
        await window.electronAPI.deleteTracks(trackIds, true) // Delete files permanently

        // Reload duplicates to reflect changes
        await loadDuplicates()
      }
    } catch (error) {
      console.error('Failed to remove tracks:', error)
    }

    setSelectedGroups([])
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-red-400 bg-red-900/20'
    if (confidence >= 70) return 'text-yellow-400 bg-yellow-900/20'
    return 'text-blue-400 bg-blue-900/20'
  }

  const selectedTracksCount = duplicateGroups
    .filter(group => selectedGroups.includes(group.id))
    .reduce((count, group) => count + group.tracks.filter(track => track.selected).length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Duplicate Detection</h2>
          <p className="text-gray-400">Find and remove duplicate tracks from your library</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Settings
          </button>

          <button
            onClick={handleScanDuplicates}
            disabled={scanning}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {scanning ? (
              <>
                <Search className="h-4 w-4 inline mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 inline mr-2" />
                Scan for Duplicates
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-primary-400">
            {loading ? '...' : duplicateGroups.length}
          </div>
          <div className="text-sm text-gray-400">Duplicate Groups</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-400">
            {loading ? '...' : duplicateGroups.reduce((sum, group) => sum + group.tracks.length, 0)}
          </div>
          <div className="text-sm text-gray-400">Total Duplicates</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{selectedTracksCount}</div>
          <div className="text-sm text-gray-400">Selected for Removal</div>
        </div>
      </div>

      {/* Actions */}
      {selectedGroups.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-red-300">Ready to Remove Duplicates</h3>
              <p className="text-sm text-red-200 mt-1">
                {selectedTracksCount} tracks selected for removal from {selectedGroups.length} groups
              </p>
            </div>
            <button
              onClick={handleRemoveSelected}
              disabled={selectedTracksCount === 0}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4 inline mr-2" />
              Remove Selected
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Groups */}
      <div className="space-y-6">
        {duplicateGroups.map((group) => (
          <div key={group.id} className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={() => handleSelectGroup(group.id)}
                    className="rounded border-gray-600 bg-gray-700 text-primary-600"
                  />
                  <div>
                    <h3 className="font-medium">Duplicate Group #{group.id}</h3>
                    <p className="text-sm text-gray-400">{group.reason}</p>
                  </div>
                </div>

                <div className={clsx(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  getConfidenceColor(group.confidence)
                )}>
                  {group.confidence}% match
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-700">
              {group.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className={clsx(
                    'p-6 transition-colors',
                    track.selected ? 'bg-red-900/10' : 'hover:bg-gray-700'
                  )}
                >
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={track.selected || false}
                      onChange={() => handleSelectTrack(group.id, track.id)}
                      disabled={!selectedGroups.includes(group.id)}
                      className="mt-1 rounded border-gray-600 bg-gray-700 text-red-600"
                    />

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Track Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Music className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{track.title}</div>
                            <div className="text-sm text-gray-400">{track.artist}</div>
                            {track.album && (
                              <div className="text-xs text-gray-500">{track.album}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div>{formatFileSize(track.fileSize)}</div>
                            <div className="text-gray-400">{track.bitrate}kbps</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">{formatDuration(track.duration)}</div>
                        </div>
                      </div>

                      {/* Path Info */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div className="font-mono text-xs text-gray-400 break-all">
                              {track.path}
                            </div>
                            <div className="text-gray-500 mt-1">
                              Added: {track.dateAdded}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recommended Action */}
                    <div className="text-right">
                      {index === 0 ? (
                        <div className="flex items-center space-x-1 text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Keep</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-red-400">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Remove</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg">
          <Copy className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
          <p className="font-medium">Loading duplicates...</p>
        </div>
      ) : duplicateGroups.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg">
          <Copy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No duplicates found</p>
          <p className="text-sm mt-2">Your library looks clean! Run a scan to check for new duplicates.</p>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Detection Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Minimum Confidence</label>
                <input
                  type="range"
                  min="50"
                  max="100"
                  defaultValue="70"
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">70% - Only show high confidence matches</div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-primary-600" />
                  <span className="text-sm">Compare file hashes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-primary-600" />
                  <span className="text-sm">Compare metadata</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-gray-700 text-primary-600" />
                  <span className="text-sm">Compare audio fingerprints</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-600 bg-gray-700 text-primary-600" />
                  <span className="text-sm">Ignore different quality versions</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md text-sm font-medium transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}