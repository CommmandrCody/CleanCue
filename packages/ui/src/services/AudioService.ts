interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  duration?: number
}

interface AudioState {
  currentTrack: Track | null
  currentTime: number
  duration: number
  isPlaying: boolean
  volume: number
  isMuted: boolean
  playlist: Track[]
  currentTrackIndex: number
}

type AudioEventListener = (state: AudioState) => void

class AudioService {
  private audio: HTMLAudioElement
  private state: AudioState = {
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 0.3,
    isMuted: false,
    playlist: [],
    currentTrackIndex: 0
  }
  private listeners: AudioEventListener[] = []

  constructor() {
    this.audio = new Audio()
    this.audio.volume = this.state.volume
    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.audio.addEventListener('timeupdate', () => {
      this.state.currentTime = this.audio.currentTime
      this.notifyListeners()
    })

    this.audio.addEventListener('loadedmetadata', () => {
      this.state.duration = this.audio.duration
      this.notifyListeners()
    })

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded()
    })

    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true
      this.notifyListeners()
    })

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false
      this.notifyListeners()
    })
  }

  private handleTrackEnded() {
    if (this.state.currentTrackIndex < this.state.playlist.length - 1) {
      this.playTrack(this.state.playlist, this.state.currentTrackIndex + 1)
    } else {
      this.state.isPlaying = false
      this.notifyListeners()
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  subscribe(listener: AudioEventListener): () => void {
    this.listeners.push(listener)
    // Immediately call with current state
    listener(this.state)

    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  async playTrack(tracks: Track[], startIndex: number = 0) {
    this.state.playlist = tracks
    this.state.currentTrackIndex = startIndex
    this.state.currentTrack = tracks[startIndex]

    if (this.state.currentTrack) {
      this.audio.src = `file://${this.state.currentTrack.path}`
      this.audio.load()

      try {
        await this.audio.play()
        this.state.isPlaying = true
      } catch (error) {
        console.error('Failed to play track:', error)
        this.state.isPlaying = false
      }
    }

    this.notifyListeners()
  }

  async togglePlayPause() {
    if (this.state.isPlaying) {
      this.audio.pause()
    } else {
      try {
        await this.audio.play()
      } catch (error) {
        console.error('Failed to play:', error)
      }
    }
  }

  previousTrack() {
    if (this.state.currentTrackIndex > 0) {
      this.playTrack(this.state.playlist, this.state.currentTrackIndex - 1)
    }
  }

  nextTrack() {
    if (this.state.currentTrackIndex < this.state.playlist.length - 1) {
      this.playTrack(this.state.playlist, this.state.currentTrackIndex + 1)
    }
  }

  seek(time: number) {
    this.audio.currentTime = time
    this.state.currentTime = time
    this.notifyListeners()
  }

  setVolume(volume: number) {
    this.state.volume = volume
    this.audio.volume = this.state.isMuted ? 0 : volume
    if (volume > 0) {
      this.state.isMuted = false
    }
    this.notifyListeners()
  }

  toggleMute() {
    this.state.isMuted = !this.state.isMuted
    this.audio.volume = this.state.isMuted ? 0 : this.state.volume
    this.notifyListeners()
  }

  stop() {
    this.audio.pause()
    this.audio.currentTime = 0
    this.state.isPlaying = false
    this.state.currentTrack = null
    this.state.playlist = []
    this.state.currentTrackIndex = 0
    this.notifyListeners()
  }

  getState(): AudioState {
    return { ...this.state }
  }
}

// Create singleton instance
export const audioService = new AudioService()
export type { Track, AudioState }