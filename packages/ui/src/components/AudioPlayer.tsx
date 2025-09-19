import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Eye, EyeOff } from 'lucide-react'
// import { AudioVisualizer, VisualizerControls } from './AudioVisualizer'

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  duration?: number
}

interface AudioPlayerProps {
  tracks: Track[]
  currentTrackIndex: number
  onTrackChange: (index: number) => void
  onClose: () => void
}

export function AudioPlayer({ tracks, currentTrackIndex, onTrackChange, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showVisualizer, setShowVisualizer] = useState(true)
  // const [visualizerType, setVisualizerType] = useState<'bars' | 'wave' | 'circular' | 'waveform'>('bars')
  // const [visualizerColor, setVisualizerColor] = useState('#3b82f6')

  const currentTrack = tracks[currentTrackIndex]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      if (currentTrackIndex < tracks.length - 1) {
        onTrackChange(currentTrackIndex + 1)
      } else {
        setIsPlaying(false)
      }
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    // Load new track - use proper file path for Electron
    audio.src = currentTrack.path
    audio.load()

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentTrack, currentTrackIndex, tracks.length, onTrackChange])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch(console.error)
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      onTrackChange(currentTrackIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentTrackIndex < tracks.length - 1) {
      onTrackChange(currentTrackIndex + 1)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const time = (parseFloat(e.target.value) / 100) * duration
    audio.currentTime = time
    setCurrentTime(time)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value) / 100
    setVolume(newVolume)
    if (newVolume > 0) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!currentTrack) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 z-50">
      <audio ref={audioRef} />

      {/* Visualizer Section - Temporarily disabled for build */}
      {showVisualizer && (
        <div className="border-b border-gray-700 p-4">
          <div className="max-w-screen-xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-300">Audio Visualizer</h3>
              <button
                onClick={() => setShowVisualizer(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Hide visualizer"
              >
                <EyeOff className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-center h-32 bg-gray-800 rounded-lg">
              <span className="text-gray-500">Visualizer temporarily disabled</span>
            </div>
          </div>
        </div>
      )}

      {/* Player Controls */}
      <div className="p-4">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Track Info */}
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white truncate">{currentTrack.title}</div>
                <div className="text-sm text-gray-400 truncate">{currentTrack.artist}</div>
                {currentTrack.album && (
                  <div className="text-xs text-gray-500 truncate">{currentTrack.album}</div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrevious}
                disabled={currentTrackIndex === 0}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SkipBack className="h-5 w-5" />
              </button>

              <button
                onClick={togglePlayPause}
                className="p-3 bg-primary-600 hover:bg-primary-700 rounded-full text-white transition-colors"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>

              <button
                onClick={handleNext}
                disabled={currentTrackIndex === tracks.length - 1}
                className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <span className="text-sm text-gray-400 tabular-nums">
                {formatTime(currentTime)}
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
                {formatTime(duration)}
              </span>
            </div>

            {/* Volume and Controls */}
            <div className="flex items-center space-x-2">
              {/* Visualizer Toggle */}
              <button
                onClick={() => setShowVisualizer(!showVisualizer)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title={showVisualizer ? "Hide visualizer" : "Show visualizer"}
              >
                {showVisualizer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>

              {/* Volume */}
              <button
                onClick={toggleMute}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume * 100}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${isMuted ? 0 : volume * 100}%, #374151 ${isMuted ? 0 : volume * 100}%, #374151 100%)`
                }}
              />

              {/* Close Button */}
              <button
                onClick={onClose}
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