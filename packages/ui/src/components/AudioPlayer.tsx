import { useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { audioService, type Track, type AudioState } from '../services/AudioService'

interface AudioPlayerProps {
  tracks: Track[]
  currentTrackIndex: number
  onTrackChange: (index: number) => void
  onClose: () => void
}

export function AudioPlayer({ tracks, currentTrackIndex, onTrackChange, onClose }: AudioPlayerProps) {
  const [audioState, setAudioState] = useState<AudioState>(audioService.getState())

  useEffect(() => {
    const unsubscribe = audioService.subscribe(setAudioState)
    return unsubscribe
  }, [])

  // Sync with external track changes
  useEffect(() => {
    if (tracks.length > 0 && currentTrackIndex >= 0) {
      const currentTrack = tracks[currentTrackIndex]
      if (!audioState.currentTrack || audioState.currentTrack.id !== currentTrack.id) {
        audioService.playTrack(tracks, currentTrackIndex)
      }
    }
  }, [tracks, currentTrackIndex])

  // Notify parent of track changes from audio service
  useEffect(() => {
    if (audioState.currentTrackIndex !== currentTrackIndex) {
      onTrackChange(audioState.currentTrackIndex)
    }
  }, [audioState.currentTrackIndex, currentTrackIndex, onTrackChange])

  const togglePlayPause = () => {
    audioService.togglePlayPause()
  }

  const handlePrevious = () => {
    audioService.previousTrack()
  }

  const handleNext = () => {
    audioService.nextTrack()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * audioState.duration
    audioService.seek(time)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100
    audioService.setVolume(newVolume)
  }

  const toggleMute = () => {
    audioService.toggleMute()
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = audioState.duration > 0 ? (audioState.currentTime / audioState.duration) * 100 : 0

  if (!audioState.currentTrack) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      {/* Player Controls */}
      <div className="p-4">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Track Info */}
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white truncate">{audioState.currentTrack.title}</div>
                <div className="text-sm text-gray-400 truncate">{audioState.currentTrack.artist}</div>
                {audioState.currentTrack.album && (
                  <div className="text-xs text-gray-500 truncate">{audioState.currentTrack.album}</div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrevious}
                disabled={audioState.currentTrackIndex === 0}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={togglePlayPause}
                className="p-4 bg-primary-600 hover:bg-primary-700 rounded-full text-white transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {audioState.isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
              </button>

              <button
                onClick={handleNext}
                disabled={audioState.currentTrackIndex === audioState.playlist.length - 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <span className="text-sm text-gray-400 tabular-nums">
                {formatTime(audioState.currentTime)}
              </span>

              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${progress}%, #374151 ${progress}%, #374151 100%)`
                  }}
                />
              </div>

              <span className="text-sm text-gray-400 tabular-nums">
                {formatTime(audioState.duration)}
              </span>
            </div>

            {/* Volume and Controls */}
            <div className="flex items-center space-x-2">
              {/* Volume */}
              <button
                onClick={toggleMute}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {audioState.isMuted || audioState.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={audioState.isMuted ? 0 : audioState.volume * 100}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${audioState.isMuted ? 0 : audioState.volume * 100}%, #374151 ${audioState.isMuted ? 0 : audioState.volume * 100}%, #374151 100%)`
                }}
              />

              {/* Close Button */}
              <button
                onClick={() => {
                  audioService.stop()
                  onClose()
                }}
                className="p-2 text-gray-400 hover:text-white transition-colors ml-4"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AudioPlayer