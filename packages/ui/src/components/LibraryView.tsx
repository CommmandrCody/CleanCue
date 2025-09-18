import { useState } from 'react'
import { Download, Play, Music, Clock, Key, Zap, Trash2, FolderMinus, X } from 'lucide-react'
import clsx from 'clsx'

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  genre?: string
  year?: number
  bpm?: number
  key?: string
  duration?: number
  energy?: number
  path: string
}

interface LibraryViewProps {
  onExport: () => void
}

// Mock data for demo
const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Feel So Close',
    artist: 'Calvin Harris',
    album: 'Motion',
    genre: 'House',
    year: 2012,
    bpm: 128,
    key: 'A minor',
    duration: 245,
    energy: 85,
    path: '/Music/Calvin Harris - Feel So Close.mp3'
  },
  {
    id: '2',
    title: 'Strobe',
    artist: 'Deadmau5',
    album: 'For Lack of a Better Name',
    genre: 'Progressive House',
    year: 2009,
    bpm: 126,
    key: 'C# minor',
    duration: 634,
    energy: 92,
    path: '/Music/Deadmau5 - Strobe.mp3'
  },
  {
    id: '3',
    title: 'In The Name Of Love',
    artist: 'Martin Garrix feat. Bebe Rexha',
    album: 'Seven Lions',
    genre: 'Future House',
    year: 2016,
    bpm: 132,
    key: 'G major',
    duration: 195,
    energy: 78,
    path: '/Music/Martin Garrix - In The Name Of Love.mp3'
  }
]

export function LibraryView({ onExport }: LibraryViewProps) {
  const [selectedTracks, setSelectedTracks] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const filteredTracks = mockTracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev =>
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getEnergyColor = (energy: number) => {
    if (energy >= 80) return 'text-red-400'
    if (energy >= 60) return 'text-yellow-400'
    return 'text-green-400'
  }

  const handleDeleteClick = () => {
    if (selectedTracks.length > 0) {
      setShowDeleteDialog(true)
    }
  }

  const handleDeleteConfirm = async (deleteFiles: boolean) => {
    try {
      if (window.electronAPI) {
        // Desktop app - call Electron IPC
        await window.electronAPI.deleteTracks(selectedTracks, deleteFiles)
      } else {
        // Web app - call HTTP API (mock for now)
        console.log(`Would delete ${selectedTracks.length} tracks with deleteFiles=${deleteFiles}`)
      }

      // Clear selection after successful delete
      setSelectedTracks([])
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete tracks:', error)
      // Keep dialog open on error so user can retry
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Music Library</h2>
          <p className="text-gray-400">{filteredTracks.length} tracks</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDeleteClick}
            disabled={selectedTracks.length === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedTracks.length > 0
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            <Trash2 className="h-4 w-4 inline mr-2" />
            Delete ({selectedTracks.length})
          </button>

          <button
            onClick={onExport}
            disabled={selectedTracks.length === 0}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors',
              selectedTracks.length > 0
                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            )}
          >
            <Download className="h-4 w-4 inline mr-2" />
            Export ({selectedTracks.length})
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search tracks, artists, or genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-700 text-sm font-medium text-gray-300">
          <div className="col-span-1">Select</div>
          <div className="col-span-3">Track</div>
          <div className="col-span-2">Artist</div>
          <div className="col-span-2">Genre</div>
          <div className="col-span-1">BPM</div>
          <div className="col-span-1">Key</div>
          <div className="col-span-1">Duration</div>
          <div className="col-span-1">Energy</div>
        </div>

        <div className="divide-y divide-gray-700">
          {filteredTracks.map((track) => (
            <div
              key={track.id}
              className={clsx(
                'grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-700 transition-colors',
                selectedTracks.includes(track.id) && 'bg-primary-900/20'
              )}
            >
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedTracks.includes(track.id)}
                  onChange={() => toggleTrackSelection(track.id)}
                  className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
                />
              </div>

              <div className="col-span-3">
                <div className="flex items-center space-x-3">
                  <Music className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{track.title}</div>
                    {track.album && (
                      <div className="text-sm text-gray-400">{track.album}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-2 text-gray-300">{track.artist}</div>

              <div className="col-span-2">
                <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                  {track.genre}
                </span>
              </div>

              <div className="col-span-1 text-gray-300">
                {track.bpm && (
                  <div className="flex items-center space-x-1">
                    <Play className="h-3 w-3" />
                    <span>{track.bpm}</span>
                  </div>
                )}
              </div>

              <div className="col-span-1 text-gray-300">
                {track.key && (
                  <div className="flex items-center space-x-1">
                    <Key className="h-3 w-3" />
                    <span className="text-xs">{track.key}</span>
                  </div>
                )}
              </div>

              <div className="col-span-1 text-gray-300">
                {track.duration && (
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                )}
              </div>

              <div className="col-span-1">
                {track.energy && (
                  <div className="flex items-center space-x-1">
                    <Zap className={clsx('h-3 w-3', getEnergyColor(track.energy))} />
                    <span className={getEnergyColor(track.energy)}>{track.energy}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredTracks.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tracks found</p>
            {searchQuery && (
              <p className="text-sm mt-2">Try adjusting your search query</p>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <Trash2 className="h-5 w-5 mr-2 text-red-400" />
                Delete Tracks
              </h3>
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-300 mb-6">
              You are about to delete {selectedTracks.length} track{selectedTracks.length > 1 ? 's' : ''}.
              Choose how you want to proceed:
            </p>

            <div className="space-y-4 mb-6">
              <button
                onClick={() => handleDeleteConfirm(false)}
                className="w-full p-4 bg-yellow-900/20 hover:bg-yellow-900/30 border border-yellow-600 rounded-lg text-left transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <FolderMinus className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-200">Remove from Library</div>
                    <div className="text-sm text-yellow-300/80">
                      Remove tracks from CleanCue but keep files on disk
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleDeleteConfirm(true)}
                className="w-full p-4 bg-red-900/20 hover:bg-red-900/30 border border-red-600 rounded-lg text-left transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <Trash2 className="h-5 w-5 text-red-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-200">Delete Files Permanently</div>
                    <div className="text-sm text-red-300/80">
                      Remove from library AND delete files from disk (cannot be undone)
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}