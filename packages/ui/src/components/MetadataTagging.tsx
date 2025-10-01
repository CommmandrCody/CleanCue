import { useState, useEffect } from 'react'
import { Music, Database, Globe, FileText, X, RefreshCw, Save, ArrowRight, Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface ExistingTags {
  title?: string
  artist?: string
  album?: string
  albumArtist?: string
  genre?: string
  year?: number
  trackNumber?: number
  composer?: string
  comment?: string
  label?: string
  isrc?: string
  bpm?: number
  key?: string
  energy?: number
}

interface FilenameData {
  artist?: string
  title?: string
  bpm?: number
  key?: string
  remixer?: string
  confidence: number
  pattern?: string
}

interface MusicBrainzMatch {
  id: string
  score: number
  title: string
  artist: string
  album?: string
  releaseDate?: string
  label?: string
  isrc?: string
  country?: string
  trackNumber?: number
}

interface TrackTaggingInfo {
  id: string
  path: string
  filename: string

  // Three sources of metadata
  fileTags: ExistingTags          // From audio file ID3/Vorbis tags
  filenameData: FilenameData       // Parsed from filename
  matchedData?: MusicBrainzMatch   // From online search

  // Auto-selected "best" metadata
  selectedTags: ExistingTags
  selectionSource: 'file' | 'filename' | 'musicbrainz' | 'manual'
}

interface MetadataTaggingProps {
  isOpen: boolean
  onClose: () => void
  selectedTracks?: string[]
}

export function MetadataTagging({ isOpen, onClose, selectedTracks = [] }: MetadataTaggingProps) {
  const [tracks, setTracks] = useState<TrackTaggingInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchSource, setSearchSource] = useState<'musicbrainz' | 'musicmatch'>('musicbrainz')
  const [autoSelect, setAutoSelect] = useState(true) // Auto-select best source
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(0.85) // 85% confidence threshold
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (isOpen && selectedTracks.length > 0) {
      loadTrackMetadata()
    }
  }, [isOpen, selectedTracks])

  const parseFilename = (filename: string): FilenameData => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim()

    // Try comprehensive DJ filename patterns
    const patterns = [
      // Artist - Title [BPM] (Key)
      { regex: /^(.+?)\s*-\s*(.+?)\s*\[(\d+)\]\s*\(([A-G][#b]?m?)\)/i, groups: { artist: 1, title: 2, bpm: 3, key: 4 }, confidence: 0.95 },
      // Artist - Title [BPM]
      { regex: /^(.+?)\s*-\s*(.+?)\s*\[(\d+)\]/i, groups: { artist: 1, title: 2, bpm: 3 }, confidence: 0.90 },
      // Artist - Title (Key)
      { regex: /^(.+?)\s*-\s*(.+?)\s*\(([A-G][#b]?m?)\)/i, groups: { artist: 1, title: 2, key: 3 }, confidence: 0.85 },
      // Artist - Title (Remixer Remix)
      { regex: /^(.+?)\s*-\s*(.+?)\s*\((.+?)\s+(?:Remix|Mix|Edit)\)/i, groups: { artist: 1, title: 2, remixer: 3 }, confidence: 0.80 },
      // BPM - Artist - Title
      { regex: /^(\d+)\s*-\s*(.+?)\s*-\s*(.+?)$/i, groups: { bpm: 1, artist: 2, title: 3 }, confidence: 0.85 },
      // Artist - Title
      { regex: /^(.+?)\s*-\s*(.+?)$/i, groups: { artist: 1, title: 2 }, confidence: 0.70 }
    ]

    for (const pattern of patterns) {
      const match = nameWithoutExt.match(pattern.regex)
      if (match) {
        const result: FilenameData = {
          confidence: pattern.confidence,
          pattern: pattern.regex.toString()
        }

        if (pattern.groups.artist && match[pattern.groups.artist]) {
          result.artist = match[pattern.groups.artist].trim()
        }
        if (pattern.groups.title && match[pattern.groups.title]) {
          result.title = match[pattern.groups.title].trim()
        }
        if (pattern.groups.bpm && match[pattern.groups.bpm]) {
          const bpm = parseInt(match[pattern.groups.bpm])
          if (bpm >= 60 && bpm <= 200) result.bpm = bpm
        }
        if (pattern.groups.key && match[pattern.groups.key]) {
          result.key = match[pattern.groups.key].trim()
        }
        if (pattern.groups.remixer && match[pattern.groups.remixer]) {
          result.remixer = match[pattern.groups.remixer].trim()
        }

        return result
      }
    }

    return { confidence: 0 }
  }


  const loadTrackMetadata = async () => {
    setLoading(true)
    try {
      const allTracks = await window.electronAPI.getAllTracks()

      // If no tracks selected, use all tracks (or limit to first 50 for performance)
      const tracksToProcess = selectedTracks.length > 0
        ? allTracks.filter(t => selectedTracks.includes(t.id))
        : allTracks.slice(0, 50) // Limit to 50 if showing all

      const tracksWithMetadata: TrackTaggingInfo[] = tracksToProcess
        .map(track => {
          const filename = track.path.split('/').pop() || track.path

          // Source 1: What's currently in the database (could be from file tags OR filename)
          // We use this as "file tags" since it's what was imported
          const fileTags: ExistingTags = {
            title: track.title,
            artist: track.artist,
            album: track.album,
            albumArtist: track.albumArtist,
            genre: track.genre,
            year: track.year,
            trackNumber: track.trackNumber,
            composer: track.composer,
            comment: track.comment,
            bpm: track.bpm,
            key: track.key,
            energy: track.energy
          }

          // Source 2: Re-parse filename to compare/show alternate data
          const filenameData = parseFilename(filename)

          // For selection, use what's already in the database
          // The import process already did the smart selection (file tags > filename)
          const selectedTags = { ...fileTags }

          // Determine source based on data richness
          // If we have album/genre/year, it's likely from file tags
          const hasRichMetadata = !!(track.album || track.genre || track.year)
          const selectionSource: 'file' | 'filename' = hasRichMetadata ? 'file' : 'filename'

          return {
            id: track.id,
            path: track.path,
            filename,
            fileTags,
            filenameData,
            selectedTags,
            selectionSource
          }
        })

      setTracks(tracksWithMetadata)
      console.log(`📋 Loaded ${tracksWithMetadata.length} tracks for metadata tagging`, {
        selectedTracksCount: selectedTracks.length,
        totalTracksInDb: allTracks.length,
        showingAll: selectedTracks.length === 0
      })

    } catch (error) {
      console.error('Failed to load track metadata:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchMusicBrainz = async () => {
    setSearching(true)
    try {
      // Mock MusicBrainz search - in production this would call actual API
      const updatedTracks = tracks.map(track => {
        const mockMatch: MusicBrainzMatch = {
          id: `mb-${track.id}`,
          score: 85 + Math.random() * 15,
          title: track.selectedTags.title || 'Enhanced Title',
          artist: track.selectedTags.artist || 'Enhanced Artist',
          album: 'Studio Album',
          releaseDate: '2023-01-15',
          label: 'Independent',
          isrc: `US${Math.random().toString().slice(2, 12)}`,
          country: 'US',
          trackNumber: 1
        }

        return {
          ...track,
          matchedData: mockMatch
        }
      })

      setTracks(updatedTracks)

    } catch (error) {
      console.error('MusicBrainz search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const applySource = (trackId: string, source: 'file' | 'filename' | 'musicbrainz') => {
    setTracks(tracks.map(track => {
      if (track.id !== trackId) return track

      if (source === 'file') {
        return {
          ...track,
          selectedTags: { ...track.fileTags },
          selectionSource: 'file'
        }
      } else if (source === 'filename') {
        return {
          ...track,
          selectedTags: {
            artist: track.filenameData.artist,
            title: track.filenameData.title,
            bpm: track.filenameData.bpm,
            key: track.filenameData.key
          },
          selectionSource: 'filename'
        }
      } else if (source === 'musicbrainz' && track.matchedData) {
        return {
          ...track,
          selectedTags: {
            title: track.matchedData.title,
            artist: track.matchedData.artist,
            album: track.matchedData.album,
            year: track.matchedData.releaseDate ? parseInt(track.matchedData.releaseDate.split('-')[0]) : undefined,
            trackNumber: track.matchedData.trackNumber
          },
          selectionSource: 'musicbrainz'
        }
      }

      return track
    }))
  }

  const updateSelectedTag = (trackId: string, field: keyof ExistingTags, value: any) => {
    setTracks(tracks.map(track => {
      if (track.id === trackId) {
        return {
          ...track,
          selectedTags: {
            ...track.selectedTags,
            [field]: value
          },
          selectionSource: 'manual'
        }
      }
      return track
    }))
  }

  const saveTags = async () => {
    setSaving(true)
    try {
      for (const track of tracks) {
        console.log(`Saving tags for ${track.filename}:`, track.selectedTags)
        // TODO: Implement actual tag saving
        // await window.electronAPI.updateTrackMetadata(track.id, track.selectedTags)
      }

      await loadTrackMetadata()

    } catch (error) {
      console.error('Failed to save tags:', error)
    } finally {
      setSaving(false)
    }
  }

  const batchApplyHighConfidence = async () => {
    setProcessing(true)
    try {
      let applied = 0

      const updatedTracks = tracks.map(track => {
        // Check if filename data has high confidence and no file tags
        const hasFileTags = !!(track.fileTags.title || track.fileTags.artist)
        const highConfidenceFilename = track.filenameData.confidence >= autoApplyThreshold

        if (!hasFileTags && highConfidenceFilename && track.selectionSource !== 'file') {
          applied++
          return {
            ...track,
            selectedTags: {
              artist: track.filenameData.artist,
              title: track.filenameData.title,
              bpm: track.filenameData.bpm,
              key: track.filenameData.key
            },
            selectionSource: 'filename' as const
          }
        }

        // Check if MusicBrainz has high confidence match
        if (track.matchedData && track.matchedData.score >= (autoApplyThreshold * 100)) {
          applied++
          return {
            ...track,
            selectedTags: {
              ...track.selectedTags,
              title: track.matchedData.title,
              artist: track.matchedData.artist,
              album: track.matchedData.album,
              year: track.matchedData.releaseDate ? parseInt(track.matchedData.releaseDate.split('-')[0]) : undefined,
              trackNumber: track.matchedData.trackNumber
            },
            selectionSource: 'musicbrainz' as const
          }
        }

        return track
      })

      setTracks(updatedTracks)
      console.log(`Auto-applied ${applied} high-confidence matches (threshold: ${autoApplyThreshold * 100}%)`)

    } catch (error) {
      console.error('Failed to batch apply:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getHighConfidenceCount = () => {
    return tracks.filter(track => {
      const hasFileTags = !!(track.fileTags.title || track.fileTags.artist)
      const highConfidenceFilename = track.filenameData.confidence >= autoApplyThreshold
      const highConfidenceMusicBrainz = track.matchedData && track.matchedData.score >= (autoApplyThreshold * 100)

      return (!hasFileTags && highConfidenceFilename) || highConfidenceMusicBrainz
    }).length
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'file': return 'text-green-400'
      case 'filename': return 'text-blue-400'
      case 'musicbrainz': return 'text-purple-400'
      case 'manual': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'file': return <Music className="h-4 w-4" />
      case 'filename': return <FileText className="h-4 w-4" />
      case 'musicbrainz': return <Database className="h-4 w-4" />
      case 'manual': return <Sparkles className="h-4 w-4" />
      default: return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-7xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">Metadata Tagging</h2>
            <p className="text-gray-400">
              {selectedTracks.length > 0
                ? `Working with ${selectedTracks.length} selected tracks`
                : 'Showing first 50 tracks (select tracks in library for specific files)'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Configuration Panel */}
          <div className="w-1/3 p-6 border-r border-gray-700 overflow-y-auto">
            <h3 className="font-medium mb-4">Tagging Options</h3>

            {/* Auto-select best source */}
            <div className="mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={autoSelect}
                  onChange={(e) => setAutoSelect(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-600"
                />
                <span>Auto-select best source (File tags → Filename)</span>
              </label>
            </div>

            {/* Auto-apply threshold */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Auto-apply Threshold ({(autoApplyThreshold * 100).toFixed(0)}% confidence)
              </label>
              <input
                type="range"
                min="50"
                max="100"
                value={autoApplyThreshold * 100}
                onChange={(e) => setAutoApplyThreshold(parseInt(e.target.value) / 100)}
                className="w-full"
              />
              <div className="text-xs text-gray-400 mt-1">
                Automatically apply matches above this confidence level
              </div>
            </div>

            {/* Batch apply button */}
            {getHighConfidenceCount() > 0 && (
              <button
                onClick={batchApplyHighConfidence}
                disabled={processing}
                className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors flex items-center justify-center mb-4"
              >
                <Sparkles className={clsx('h-4 w-4 mr-2', processing && 'animate-pulse')} />
                {processing ? 'Processing...' : `Auto-Apply ${getHighConfidenceCount()} High-Confidence Matches`}
              </button>
            )}

            {/* Search Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Online Search Source</label>
              <select
                value={searchSource}
                onChange={(e) => setSearchSource(e.target.value as 'musicbrainz' | 'musicmatch')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="musicbrainz">MusicBrainz (Open Database)</option>
                <option value="musicmatch">MusicMatch (Commercial)</option>
              </select>
            </div>

            <button
              onClick={searchMusicBrainz}
              disabled={searching || tracks.length === 0}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors flex items-center justify-center"
            >
              <Globe className={clsx('h-4 w-4 mr-2', searching && 'animate-pulse')} />
              {searching ? 'Searching...' : `Search ${searchSource === 'musicbrainz' ? 'MusicBrainz' : 'MusicMatch'}`}
            </button>

            {/* Actions */}
            <div className="space-y-3 mt-6">
              <button
                onClick={loadTrackMetadata}
                disabled={loading || selectedTracks.length === 0}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors flex items-center justify-center"
              >
                <RefreshCw className={clsx('h-4 w-4 mr-2', loading && 'animate-spin')} />
                {loading ? 'Reloading...' : 'Reload Metadata'}
              </button>

              <button
                onClick={saveTags}
                disabled={saving || tracks.length === 0}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors flex items-center justify-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : `Save Tags to ${tracks.length} Files`}
              </button>
            </div>

            {/* Summary Stats */}
            {tracks.length > 0 && (
              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h4 className="font-medium mb-3">Source Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">From File Tags:</span>
                    <span className="text-green-400">{tracks.filter(t => t.selectionSource === 'file').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">From Filename:</span>
                    <span className="text-blue-400">{tracks.filter(t => t.selectionSource === 'filename').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">From MusicBrainz:</span>
                    <span className="text-purple-400">{tracks.filter(t => t.selectionSource === 'musicbrainz').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Manual Edits:</span>
                    <span className="text-yellow-400">{tracks.filter(t => t.selectionSource === 'manual').length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Track List */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="font-medium mb-4">Tracks ({tracks.length})</h3>

            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
                <p>Loading track metadata...</p>
              </div>
            ) : tracks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tracks in library</p>
                <p className="text-sm mt-2">Scan a folder (Cmd+F) to import tracks first</p>
                <p className="text-xs mt-1 text-gray-500">The scan will read file tags and parse filenames automatically</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tracks.map(track => (
                  <div key={track.id} className="p-4 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                    {/* Track Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{track.filename}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={clsx('text-xs flex items-center space-x-1', getSourceColor(track.selectionSource))}>
                            {getSourceIcon(track.selectionSource)}
                            <span className="capitalize">{track.selectionSource}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Three-way metadata comparison */}
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {/* File Tags (Gold!) */}
                      <div className={clsx('p-3 rounded border transition-colors', track.selectionSource === 'file' ? 'border-green-500 bg-green-900/20' : 'border-gray-600')}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1 text-xs font-medium text-green-400">
                            <Music className="h-3 w-3" />
                            <span>File Tags</span>
                          </div>
                          {track.selectionSource !== 'file' && (track.fileTags.title || track.fileTags.artist) && (
                            <button
                              onClick={() => applySource(track.id, 'file')}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Use <ArrowRight className="h-3 w-3 inline" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-1 text-xs">
                          {track.fileTags.artist ? (
                            <div><span className="text-gray-500">Artist:</span> {track.fileTags.artist}</div>
                          ) : (
                            <div className="text-gray-600">No artist</div>
                          )}
                          {track.fileTags.title ? (
                            <div><span className="text-gray-500">Title:</span> {track.fileTags.title}</div>
                          ) : (
                            <div className="text-gray-600">No title</div>
                          )}
                          {track.fileTags.album && <div><span className="text-gray-500">Album:</span> {track.fileTags.album}</div>}
                          {track.fileTags.genre && <div><span className="text-gray-500">Genre:</span> {track.fileTags.genre}</div>}
                          {track.fileTags.year && <div><span className="text-gray-500">Year:</span> {track.fileTags.year}</div>}
                          {track.fileTags.bpm && <div><span className="text-gray-500">BPM:</span> <strong className="text-orange-400">{track.fileTags.bpm}</strong></div>}
                          {track.fileTags.key && <div><span className="text-gray-500">Key:</span> <strong className="text-purple-400">{track.fileTags.key}</strong></div>}
                          {track.fileTags.energy && <div><span className="text-gray-500">Energy:</span> <strong className="text-green-400">{track.fileTags.energy}</strong></div>}
                          {track.fileTags.composer && <div><span className="text-gray-500">Composer:</span> {track.fileTags.composer}</div>}
                        </div>
                      </div>

                      {/* Filename Parsing */}
                      <div className={clsx('p-3 rounded border transition-colors', track.selectionSource === 'filename' ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600')}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1 text-xs font-medium text-blue-400">
                            <FileText className="h-3 w-3" />
                            <span>Filename ({(track.filenameData.confidence * 100).toFixed(0)}%)</span>
                          </div>
                          {track.selectionSource !== 'filename' && track.filenameData.confidence > 0.5 && (
                            <button
                              onClick={() => applySource(track.id, 'filename')}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Use <ArrowRight className="h-3 w-3 inline" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="text-gray-500 mb-1">Confidence: <span className="text-blue-400">{(track.filenameData.confidence * 100).toFixed(0)}%</span></div>
                          {track.filenameData.artist ? (
                            <div><span className="text-gray-500">Artist:</span> {track.filenameData.artist}</div>
                          ) : (
                            <div className="text-gray-600">No artist</div>
                          )}
                          {track.filenameData.title ? (
                            <div><span className="text-gray-500">Title:</span> {track.filenameData.title}</div>
                          ) : (
                            <div className="text-gray-600">No title</div>
                          )}
                          {track.filenameData.bpm && <div><span className="text-gray-500">BPM:</span> <strong className="text-orange-400">{track.filenameData.bpm}</strong></div>}
                          {track.filenameData.key && <div><span className="text-gray-500">Key:</span> <strong className="text-purple-400">{track.filenameData.key}</strong></div>}
                          {track.filenameData.remixer && <div><span className="text-gray-500">Remixer:</span> {track.filenameData.remixer}</div>}
                        </div>
                      </div>

                      {/* MusicBrainz */}
                      <div className={clsx('p-3 rounded border transition-colors', track.selectionSource === 'musicbrainz' ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600')}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1 text-xs font-medium text-purple-400">
                            <Database className="h-3 w-3" />
                            <span>MusicBrainz</span>
                          </div>
                          {track.matchedData && track.selectionSource !== 'musicbrainz' && (
                            <button
                              onClick={() => applySource(track.id, 'musicbrainz')}
                              className="text-xs text-purple-400 hover:text-purple-300"
                            >
                              Use <ArrowRight className="h-3 w-3 inline" />
                            </button>
                          )}
                        </div>
                        {track.matchedData ? (
                          <div className="space-y-1 text-xs">
                            <div><span className="text-gray-500">Artist:</span> {track.matchedData.artist}</div>
                            <div><span className="text-gray-500">Title:</span> {track.matchedData.title}</div>
                            <div><span className="text-gray-500">Album:</span> {track.matchedData.album}</div>
                            <div><span className="text-gray-500">Match:</span> {track.matchedData.score.toFixed(0)}%</div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">Click Search above</div>
                        )}
                      </div>
                    </div>

                    {/* Selected/Final Tags (editable) */}
                    <div className="pt-3 border-t border-gray-700">
                      <div className="text-xs font-medium text-gray-400 mb-2">Final Tags (will be written to file)</div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Artist"
                          value={track.selectedTags.artist || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'artist', e.target.value)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Title"
                          value={track.selectedTags.title || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'title', e.target.value)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Album"
                          value={track.selectedTags.album || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'album', e.target.value)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Genre"
                          value={track.selectedTags.genre || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'genre', e.target.value)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Year"
                          value={track.selectedTags.year || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'year', parseInt(e.target.value))}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="BPM"
                          value={track.selectedTags.bpm || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'bpm', parseInt(e.target.value))}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Key"
                          value={track.selectedTags.key || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'key', e.target.value)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Energy (0-1)"
                          value={track.selectedTags.energy || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'energy', parseFloat(e.target.value))}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Composer"
                          value={track.selectedTags.composer || ''}
                          onChange={(e) => updateSelectedTag(track.id, 'composer', e.target.value)}
                          className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
