import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Search, Repeat, Lock } from 'lucide-react'

interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
  duration?: number
  bpm?: number
  key?: string
}

interface DeckState {
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  gain: number          // Track gain/trim (CC 22)
  volume: number        // Channel fader (CC 28)
  pitch: number
  eqHigh: number
  eqMid: number
  eqLow: number
  filter: number        // Filter knob (CC 26)
  cuePoint: number | null
  hotCues: (number | null)[]  // 8 hot cue points
  effectiveBPM: number | null
  keyLock: boolean
  loop: { start: number, end: number } | null
}

// Rotary Knob Component (Serato-style)
interface RotaryKnobProps {
  value: number  // 0 to 1
  onChange: (value: number) => void
  label: string
  size?: number
  centerDetent?: boolean
}

function RotaryKnob({ value, onChange, label, size = 48, centerDetent = false }: RotaryKnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const knobRef = useRef<SVGSVGElement>(null)

  // Map value 0-1 to angle -135deg to +135deg (270deg total range)
  const valueToAngle = (v: number) => {
    return (v - 0.5) * 270
  }

  const angle = valueToAngle(value)

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!knobRef.current) return

      const rect = knobRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      // Calculate angle from center
      const deltaX = e.clientX - centerX
      const deltaY = e.clientY - centerY
      let mouseAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI)

      // Convert to our coordinate system (0deg at top, clockwise)
      mouseAngle = mouseAngle + 90
      if (mouseAngle < 0) mouseAngle += 360

      // Map angle to value (clamp to -135 to +135 range)
      // -135 to +135 = 0 to 270
      let clampedAngle = mouseAngle

      // Handle wraparound
      if (clampedAngle > 180) {
        clampedAngle = clampedAngle - 360
      }

      // Clamp to -135 to +135
      clampedAngle = Math.max(-135, Math.min(135, clampedAngle))

      // Convert angle to value (0 to 1)
      const newValue = (clampedAngle / 270) + 0.5
      onChange(Math.max(0, Math.min(1, newValue)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onChange])

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        ref={knobRef}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="cursor-pointer select-none"
        onMouseDown={handleMouseDown}
      >
        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="2"
        />

        {/* Center detent indicator (for EQ) */}
        {centerDetent && (
          <line
            x1="50"
            y1="8"
            x2="50"
            y2="15"
            stroke="#555"
            strokeWidth="2"
          />
        )}

        {/* Value range arc (shows active range) */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#00d9ff"
          strokeWidth="3"
          strokeDasharray={`${((value) * 240)} ${240}`}
          strokeDashoffset="-120"
          transform="rotate(-90 50 50)"
          opacity="0.3"
        />

        {/* Knob body with gradient */}
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="url(#knobGradient)"
          stroke="#444"
          strokeWidth="1"
        />

        {/* Indicator line */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="20"
          stroke="#00d9ff"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${angle} 50 50)`}
        />

        {/* Center dot */}
        <circle
          cx="50"
          cy="50"
          r="4"
          fill="#00d9ff"
        />

        {/* Define gradient */}
        <defs>
          <radialGradient id="knobGradient">
            <stop offset="0%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </radialGradient>
        </defs>
      </svg>

      <div className="text-[9px] text-gray-500 font-medium">{label}</div>
      <div className="text-[10px] text-[#00d9ff] font-mono">
        {centerDetent ? (value - 0.5).toFixed(2) : value.toFixed(2)}
      </div>
    </div>
  )
}

// Ultra High-Resolution DJ Waveform (Serato/Rekordbox-style)
interface UltraHighResWaveformProps {
  audioPath: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  hotCues: (number | null)[]
  onSeek: (time: number) => void
  deck: 'A' | 'B'
  bpm?: number
}

interface UltraHighResWaveformPropsExtended extends UltraHighResWaveformProps {
  waveformData?: {
    low: number[]    // Bass frequencies - rendered in red/orange
    mid: number[]    // Mid frequencies - rendered in yellow
    high: number[]   // High frequencies - rendered in blue/cyan
  }
}

function UltraHighResWaveform({ isPlaying, currentTime, duration, hotCues, onSeek, deck, bpm, waveformData }: UltraHighResWaveformPropsExtended) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null)
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const waveformRef = useRef<{ low: number[]; mid: number[]; high: number[] } | null>(null)
  const [waveformLoaded, setWaveformLoaded] = useState(false)

  // Deck-specific colors (Serato/Engine DJ style)
  const deckColors = {
    A: {
      played: '#00d9ff',      // Cyan for played
      unplayed: '#004455',    // Dark cyan for unplayed
    },
    B: {
      played: '#ff6b00',      // Orange for played
      unplayed: '#553300',    // Dark orange for unplayed
    }
  }

  const playedColor = deckColors[deck].played
  const unplayedColor = deckColors[deck].unplayed

  // Load pre-rendered frequency-analyzed waveform data from database
  useEffect(() => {
    if (waveformData && waveformData.low && waveformData.low.length > 0) {
      console.log(`[Waveform ${deck}] Using pre-rendered frequency-analyzed waveform:`, waveformData.low.length, 'samples')
      waveformRef.current = waveformData
      setWaveformLoaded(true)
    } else {
      console.log(`[Waveform ${deck}] No pre-rendered waveform available, generating fallback...`)
      // Generate a simple fallback waveform with frequency bands
      const fallbackSamples = 1000
      const low: number[] = new Array(fallbackSamples)
      const mid: number[] = new Array(fallbackSamples)
      const high: number[] = new Array(fallbackSamples)

      for (let i = 0; i < fallbackSamples; i++) {
        const progress = i / fallbackSamples
        // Create a somewhat realistic pattern
        let envelope = 1.0
        if (progress < 0.05) envelope = progress / 0.05
        else if (progress > 0.95) envelope = (1 - progress) / 0.05
        const variation = Math.sin(progress * Math.PI * 20) * 0.2 + 0.8
        const randomness = Math.random() * 0.3 + 0.7
        const baseAmplitude = envelope * variation * randomness

        // Low frequencies (bass) - strongest, consistent
        low[i] = baseAmplitude * 0.9
        // Mid frequencies - moderate
        mid[i] = baseAmplitude * 0.7
        // High frequencies - weakest, most variation
        high[i] = baseAmplitude * 0.5 * (Math.random() * 0.5 + 0.5)
      }

      waveformRef.current = { low, mid, high }
      setWaveformLoaded(true)
    }
  }, [waveformData, deck])

  // Handle click to seek
  const handleMainClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mainCanvasRef.current || duration === 0) return

    const rect = mainCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickProgress = x / rect.width

    // Calculate time based on zoom window (±2 seconds from current time)
    const zoomWindow = 4 // seconds
    const startTime = Math.max(0, currentTime - zoomWindow / 2)
    const endTime = Math.min(duration, currentTime + zoomWindow / 2)
    const newTime = startTime + (endTime - startTime) * clickProgress

    onSeek(newTime)
  }

  const handleOverviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!overviewCanvasRef.current || duration === 0) return

    const rect = overviewCanvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickProgress = x / rect.width
    const newTime = duration * clickProgress

    onSeek(newTime)
  }

  // Draw main zoomed waveform
  useEffect(() => {
    if (!mainCanvasRef.current) return

    const canvas = mainCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const centerY = canvas.height / 2
      const barWidth = 2  // 2px bars for smooth but fast rendering
      const totalBars = Math.floor(canvas.width / barWidth)

      // Zoom window: show ±2 seconds from current position (4 seconds total - tight zoom like Serato)
      const zoomWindow = 4 // seconds
      const startTime = Math.max(0, currentTime - zoomWindow / 2)
      const endTime = Math.min(duration, currentTime + zoomWindow / 2)

      // Draw waveform by layering all three frequency bands
      // This creates natural color blending like Serato
      for (let i = 0; i < totalBars; i++) {
        const x = i * barWidth
        const barTime = startTime + (endTime - startTime) * (i / totalBars)
        const barProgress = duration > 0 ? barTime / duration : 0

        // Get frequency-band amplitudes from pre-rendered waveform data
        let lowAmp = 0, midAmp = 0, highAmp = 0
        if (waveformRef.current && waveformLoaded) {
          const dataIndex = Math.floor(barProgress * waveformRef.current.low.length)
          lowAmp = Math.min(1, (waveformRef.current.low[dataIndex] || 0) * 2.0)
          midAmp = Math.min(1, (waveformRef.current.mid[dataIndex] || 0) * 2.0)
          highAmp = Math.min(1, (waveformRef.current.high[dataIndex] || 0) * 2.0)
        }

        const isPassed = barTime < currentTime
        const maxHeight = canvas.height * 0.48

        // Draw each frequency band as a separate layer with alpha
        // Bass (low) - widest, red/orange
        const lowHeight = lowAmp * maxHeight
        if (lowHeight > 0) {
          ctx.fillStyle = isPassed ? 'rgba(255, 107, 53, 0.8)' : 'rgba(77, 36, 25, 0.8)'
          ctx.fillRect(x, centerY - lowHeight, barWidth, lowHeight)
          ctx.fillRect(x, centerY, barWidth, lowHeight)
        }

        // Mids - medium, yellow
        const midHeight = midAmp * maxHeight
        if (midHeight > 0) {
          ctx.fillStyle = isPassed ? 'rgba(247, 208, 96, 0.7)' : 'rgba(77, 61, 25, 0.7)'
          ctx.fillRect(x, centerY - midHeight, barWidth, midHeight)
          ctx.fillRect(x, centerY, barWidth, midHeight)
        }

        // Highs - thinnest, cyan/blue
        const highHeight = highAmp * maxHeight
        if (highHeight > 0) {
          ctx.fillStyle = isPassed ? 'rgba(78, 205, 196, 0.6)' : 'rgba(26, 61, 58, 0.6)'
          ctx.fillRect(x, centerY - highHeight, barWidth, highHeight)
          ctx.fillRect(x, centerY, barWidth, highHeight)
        }
      }

      // Draw beat grid markers (if BPM is available)
      if (bpm && bpm > 0) {
        const beatDuration = 60 / bpm  // Seconds per beat
        const barDuration = 60 / bpm * 4  // Seconds per bar (4 beats)

        // Draw bar markers (every 4 beats) - brighter
        for (let time = 0; time <= duration; time += barDuration) {
          if (time >= startTime && time <= endTime) {
            const x = ((time - startTime) / (endTime - startTime)) * canvas.width
            ctx.strokeStyle = '#ffffff40'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, canvas.height)
            ctx.stroke()
          }
        }

        // Draw beat markers - dimmer
        for (let time = 0; time <= duration; time += beatDuration) {
          // Skip if this is also a bar marker
          if (time % barDuration !== 0) {
            if (time >= startTime && time <= endTime) {
              const x = ((time - startTime) / (endTime - startTime)) * canvas.width
              ctx.strokeStyle = '#ffffff15'
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(x, 0)
              ctx.lineTo(x, canvas.height)
              ctx.stroke()
            }
          }
        }
      }

      // Draw hot cue markers with distinct colors
      hotCues.forEach((cueTime, index) => {
        if (cueTime !== null && cueTime >= startTime && cueTime <= endTime) {
          const cueX = ((cueTime - startTime) / (endTime - startTime)) * canvas.width
          const cueColor = HOT_CUE_COLORS[index]

          // Draw colored marker line
          ctx.fillStyle = cueColor
          ctx.shadowColor = cueColor
          ctx.shadowBlur = 8
          ctx.fillRect(cueX - 2, 0, 4, canvas.height)
          ctx.shadowBlur = 0

          // Cue number label with background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
          ctx.fillRect(cueX + 4, 2, 16, 12)
          ctx.fillStyle = cueColor
          ctx.font = 'bold 10px monospace'
          ctx.fillText(`${index + 1}`, cueX + 6, 11)
        }
      })

      // Draw center playhead (always at center since we're zoomed around it)
      ctx.fillStyle = '#fff'
      ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height)

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentTime, duration, isPlaying, playedColor, unplayedColor, hotCues, waveformLoaded])

  // Draw overview waveform
  useEffect(() => {
    if (!overviewCanvasRef.current) return

    const canvas = overviewCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const progress = duration > 0 ? currentTime / duration : 0
      const centerY = canvas.height / 2
      const barWidth = 2
      const totalBars = Math.floor(canvas.width / barWidth)

      // Draw layered frequency bands (same as main waveform)
      for (let i = 0; i < totalBars; i++) {
        const x = i * barWidth
        const barProgress = i / totalBars

        // Get frequency-band amplitudes from pre-rendered waveform data
        let lowAmp = 0, midAmp = 0, highAmp = 0
        if (waveformRef.current && waveformLoaded) {
          const dataIndex = Math.floor(barProgress * waveformRef.current.low.length)
          lowAmp = Math.min(1, (waveformRef.current.low[dataIndex] || 0) * 2.0)
          midAmp = Math.min(1, (waveformRef.current.mid[dataIndex] || 0) * 2.0)
          highAmp = Math.min(1, (waveformRef.current.high[dataIndex] || 0) * 2.0)
        }

        const isPassed = barProgress < progress
        const maxHeight = canvas.height * 0.45

        // Layer the frequencies with transparency
        const lowHeight = lowAmp * maxHeight
        if (lowHeight > 0) {
          ctx.fillStyle = isPassed ? 'rgba(255, 107, 53, 0.8)' : 'rgba(77, 36, 25, 0.8)'
          ctx.fillRect(x, centerY - lowHeight, barWidth, lowHeight)
          ctx.fillRect(x, centerY, barWidth, lowHeight)
        }

        const midHeight = midAmp * maxHeight
        if (midHeight > 0) {
          ctx.fillStyle = isPassed ? 'rgba(247, 208, 96, 0.7)' : 'rgba(77, 61, 25, 0.7)'
          ctx.fillRect(x, centerY - midHeight, barWidth, midHeight)
          ctx.fillRect(x, centerY, barWidth, midHeight)
        }

        const highHeight = highAmp * maxHeight
        if (highHeight > 0) {
          ctx.fillStyle = isPassed ? 'rgba(78, 205, 196, 0.6)' : 'rgba(26, 61, 58, 0.6)'
          ctx.fillRect(x, centerY - highHeight, barWidth, highHeight)
          ctx.fillRect(x, centerY, barWidth, highHeight)
        }
      }

      // Draw hot cue markers on overview with distinct colors
      hotCues.forEach((cueTime, index) => {
        if (cueTime !== null && duration > 0) {
          const cueX = (cueTime / duration) * canvas.width
          const cueColor = HOT_CUE_COLORS[index]
          ctx.fillStyle = cueColor
          ctx.fillRect(cueX - 1, 0, 2, canvas.height)
        }
      })

      // Draw playhead position on overview
      ctx.fillStyle = '#fff'
      ctx.fillRect(progress * canvas.width - 1, 0, 2, canvas.height)

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentTime, duration, playedColor, hotCues, waveformLoaded])

  return (
    <div className="flex flex-col h-full">
      {/* Main zoomed waveform - Higher resolution */}
      <canvas
        ref={mainCanvasRef}
        width={2000}
        height={150}
        className="w-full flex-1 bg-black cursor-pointer"
        onClick={handleMainClick}
      />
      {/* Overview waveform */}
      <canvas
        ref={overviewCanvasRef}
        width={2000}
        height={30}
        className="w-full bg-black border-t border-gray-800 cursor-pointer"
        onClick={handleOverviewClick}
      />
    </div>
  )
}

// Hot Cue Colors (Serato-style color palette)
const HOT_CUE_COLORS = [
  '#cc0000', // Red - Cue 1
  '#cc7700', // Orange - Cue 2
  '#ccaa00', // Yellow - Cue 3
  '#00cc00', // Green - Cue 4
  '#00cccc', // Cyan - Cue 5
  '#0066cc', // Blue - Cue 6
  '#7700cc', // Purple - Cue 7
  '#cc0099', // Pink - Cue 8
]

export function DJDeck() {
  // Deck states
  const [deckA, setDeckA] = useState<DeckState>({
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    gain: 0.75,        // Track gain at 75%
    volume: 0.85,      // Channel fader at 85%
    pitch: 0,
    eqHigh: 0.5,       // EQ centered (0.5 = no boost/cut)
    eqMid: 0.5,
    eqLow: 0.5,
    filter: 0.5,       // Filter centered
    cuePoint: null,
    hotCues: [null, null, null, null, null, null, null, null],  // 8 hot cue slots
    effectiveBPM: null,
    keyLock: false,
    loop: null
  })

  const [deckB, setDeckB] = useState<DeckState>({
    track: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    gain: 0.75,
    volume: 0.85,
    pitch: 0,
    eqHigh: 0.5,
    eqMid: 0.5,
    eqLow: 0.5,
    filter: 0.5,
    cuePoint: null,
    hotCues: [null, null, null, null, null, null, null, null],  // 8 hot cue slots
    effectiveBPM: null,
    keyLock: false,
    loop: null
  })

  const [crossfader, setCrossfader] = useState(0.5)
  const [midiDevices, setMidiDevices] = useState<MIDIInput[]>([])
  const [midiOutputs, setMidiOutputs] = useState<MIDIOutput[]>([])
  const [selectedMidiDevice, setSelectedMidiDevice] = useState<string | null>(null)
  const [midiLogs, setMidiLogs] = useState<string[]>([])
  const [showMidiLog, setShowMidiLog] = useState(true)

  // Library state
  const [tracks, setTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, track: Track } | null>(null)
  const [loading, setLoading] = useState(true)

  // Audio references
  const audioRefA = useRef<HTMLAudioElement>(null)
  const audioRefB = useRef<HTMLAudioElement>(null)

  // Audio context for effects
  const audioContextRef = useRef<AudioContext>()
  const sourceRefA = useRef<MediaElementAudioSourceNode>()
  const sourceRefB = useRef<MediaElementAudioSourceNode>()
  const analyserRefA = useRef<AnalyserNode>()  // For waveform visualization
  const analyserRefB = useRef<AnalyserNode>()
  const filterRefA = useRef<BiquadFilterNode>()  // Filter (CC 26)
  const filterRefB = useRef<BiquadFilterNode>()
  const trackGainRefA = useRef<GainNode>()  // Track gain/trim (CC 22)
  const trackGainRefB = useRef<GainNode>()
  const volumeRefA = useRef<GainNode>()     // Channel fader (CC 28)
  const volumeRefB = useRef<GainNode>()
  const eqRefA = useRef<{ high: BiquadFilterNode, mid: BiquadFilterNode, low: BiquadFilterNode }>()
  const eqRefB = useRef<{ high: BiquadFilterNode, mid: BiquadFilterNode, low: BiquadFilterNode }>()

  // Calculate effective BPM with pitch adjustment
  const calculateEffectiveBPM = (baseBPM: number | undefined, pitch: number): number | null => {
    if (!baseBPM) return null
    return Math.round(baseBPM * (1 + pitch / 100))
  }

  // Update effective BPM when pitch or track changes
  useEffect(() => {
    const effectiveBPM = calculateEffectiveBPM(deckA.track?.bpm, deckA.pitch)
    setDeckA(prev => ({ ...prev, effectiveBPM }))
  }, [deckA.track?.bpm, deckA.pitch])

  useEffect(() => {
    const effectiveBPM = calculateEffectiveBPM(deckB.track?.bpm, deckB.pitch)
    setDeckB(prev => ({ ...prev, effectiveBPM }))
  }, [deckB.track?.bpm, deckB.pitch])

  // Load library
  useEffect(() => {
    const loadTracks = async () => {
      try {
        setLoading(true)
        if (window.electronAPI) {
          const dbTracks = await window.electronAPI.getAllTracks()
          setTracks(dbTracks)
          setFilteredTracks(dbTracks)
        }
      } catch (error) {
        console.error('Failed to load tracks:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTracks()
  }, [])

  // Filter tracks by search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(tracks)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredTracks(tracks.filter(track =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        (track.album?.toLowerCase().includes(query))
      ))
    }
  }, [searchQuery, tracks])

  // Initialize audio context and effects chain
  useEffect(() => {
    const initAudio = async () => {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      audioContextRef.current = new AudioContext()
      const ctx = audioContextRef.current

      if (audioRefA.current && audioRefB.current) {
        // Deck A chain: source -> analyser -> filter -> EQ -> trackGain -> volume -> destination
        sourceRefA.current = ctx.createMediaElementSource(audioRefA.current)

        // Analyser for waveform visualization
        analyserRefA.current = ctx.createAnalyser()
        analyserRefA.current.fftSize = 2048
        analyserRefA.current.smoothingTimeConstant = 0.8

        // DJ-style filter (sweepable high-pass/low-pass)
        filterRefA.current = ctx.createBiquadFilter()
        filterRefA.current.type = 'lowpass'
        filterRefA.current.frequency.value = 22000  // Default to full range

        trackGainRefA.current = ctx.createGain()
        volumeRefA.current = ctx.createGain()

        const highA = ctx.createBiquadFilter()
        highA.type = 'highshelf'
        highA.frequency.value = 3000

        const midA = ctx.createBiquadFilter()
        midA.type = 'peaking'
        midA.frequency.value = 1000
        midA.Q.value = 1

        const lowA = ctx.createBiquadFilter()
        lowA.type = 'lowshelf'
        lowA.frequency.value = 300

        eqRefA.current = { high: highA, mid: midA, low: lowA }

        sourceRefA.current
          .connect(analyserRefA.current)
          .connect(filterRefA.current)
          .connect(lowA)
          .connect(midA)
          .connect(highA)
          .connect(trackGainRefA.current)
          .connect(volumeRefA.current)
          .connect(ctx.destination)

        // Deck B chain: source -> analyser -> filter -> EQ -> trackGain -> volume -> destination
        sourceRefB.current = ctx.createMediaElementSource(audioRefB.current)

        // Analyser for waveform visualization
        analyserRefB.current = ctx.createAnalyser()
        analyserRefB.current.fftSize = 2048
        analyserRefB.current.smoothingTimeConstant = 0.8

        // DJ-style filter (sweepable high-pass/low-pass)
        filterRefB.current = ctx.createBiquadFilter()
        filterRefB.current.type = 'lowpass'
        filterRefB.current.frequency.value = 22000  // Default to full range

        trackGainRefB.current = ctx.createGain()
        volumeRefB.current = ctx.createGain()

        const highB = ctx.createBiquadFilter()
        highB.type = 'highshelf'
        highB.frequency.value = 3000

        const midB = ctx.createBiquadFilter()
        midB.type = 'peaking'
        midB.frequency.value = 1000
        midB.Q.value = 1

        const lowB = ctx.createBiquadFilter()
        lowB.type = 'lowshelf'
        lowB.frequency.value = 300

        eqRefB.current = { high: highB, mid: midB, low: lowB }

        sourceRefB.current
          .connect(analyserRefB.current)
          .connect(filterRefB.current)
          .connect(lowB)
          .connect(midB)
          .connect(highB)
          .connect(trackGainRefB.current)
          .connect(volumeRefB.current)
          .connect(ctx.destination)
      }
    }

    initAudio()

    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close()
      }
    }
  }, [])

  // Initialize Web MIDI API
  useEffect(() => {
    const initMIDI = async () => {
      if (navigator.requestMIDIAccess) {
        try {
          const midiAccess = await navigator.requestMIDIAccess()
          const inputs = Array.from(midiAccess.inputs.values())
          const outputs = Array.from(midiAccess.outputs.values())
          setMidiDevices(inputs)
          setMidiOutputs(outputs)
          if (inputs.length > 0) {
            setSelectedMidiDevice(inputs[0].id)
          }
        } catch (error) {
          console.warn('MIDI access denied or not available:', error)
        }
      }
    }
    initMIDI()
  }, [])

  // Helper function to log MIDI messages
  const logMidi = async (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`

    setMidiLogs(prev => {
      const newLogs = [logEntry, ...prev]
      return newLogs.slice(0, 50) // Keep last 50 messages
    })

    // Also write to file for interactive mapping
    if (window.electronAPI?.appendLog) {
      try {
        await window.electronAPI.appendLog('midi-mapping.log', logEntry + '\n')
      } catch (error) {
        // Silently fail if file logging not available
      }
    }
  }

  // Helper function to send MIDI messages TO the controller (for LED feedback)
  const sendMIDI = (status: number, data1: number, data2: number) => {
    if (!selectedMidiDevice) return

    const output = midiOutputs.find(o => o.id === selectedMidiDevice)
    if (!output) return

    try {
      output.send([status, data1, data2])
      logMidi(`Sent MIDI: Status=0x${status.toString(16).padStart(2, '0')} Data1=${data1} Data2=${data2}`)
    } catch (error) {
      console.error('Failed to send MIDI:', error)
    }
  }

  // Set pad LED color (Reloop Ready specific)
  const setPadColor = (padNumber: number, channel: number, color: 'off' | 'red' | 'green' | 'blue' | 'yellow' | 'cyan' | 'magenta' | 'white') => {
    const note = padNumber + 19 // Pads are notes 20-27
    const colorMap = {
      off: 0,
      red: 1,
      green: 16,
      blue: 32,
      yellow: 17,
      cyan: 48,
      magenta: 33,
      white: 127
    }

    // Send Note On message with velocity as color
    const status = 0x90 | channel // Note On + channel
    sendMIDI(status, note, colorMap[color])
  }

  // MIDI message handler
  useEffect(() => {
    if (!selectedMidiDevice) return

    const device = midiDevices.find(d => d.id === selectedMidiDevice)
    if (!device) return

    const handleMIDIMessage = (event: MIDIMessageEvent) => {
      if (!event.data || event.data.length < 3) return
      const status = event.data[0]
      const control = event.data[1]
      const value = event.data[2]
      const channel = status & 0x0f
      const command = status & 0xf0

      // Log raw MIDI message
      logMidi(`Raw: Status=0x${status.toString(16).padStart(2, '0')} Control=0x${control.toString(16).padStart(2, '0')} (${control}) Value=${value} Channel=${channel}`)

      if (command === 0xB0) {
        // Control Change message
        logMidi(`CC: Control ${control} = ${value} (normalized: ${(value/127).toFixed(2)}) on Channel ${channel}`)
        handleMIDIControl(control, value, channel)
      } else if (command === 0x90) {
        // Note On message (button press)
        logMidi(`Note On: Note ${control} Velocity ${value} Channel ${channel}`)
        if (value > 0) {
          handleMIDINote(control, channel, true)
        }
      } else if (command === 0x80) {
        // Note Off message (button release)
        logMidi(`Note Off: Note ${control} Velocity ${value} Channel ${channel}`)
        handleMIDINote(control, channel, false)
      } else if (command === 0xE0) {
        // Pitch Bend message (jog wheel scrubbing)
        // Combine data bytes for 14-bit resolution
        const pitchBendValue = (value << 7) | control
        const normalizedPitch = (pitchBendValue - 8192) / 8192 // -1 to +1
        logMidi(`Jog Wheel: Pitch Bend ${pitchBendValue} (${normalizedPitch.toFixed(3)}) Channel ${channel}`)
        handleJogWheel(channel, normalizedPitch)
      } else {
        logMidi(`Unknown command: 0x${command.toString(16)}`)
      }
    }

    device.addEventListener('midimessage', handleMIDIMessage as any)
    return () => device.removeEventListener('midimessage', handleMIDIMessage as any)
  }, [selectedMidiDevice, midiDevices])

  // Jog wheel handler (for scrubbing/nudging)
  const handleJogWheel = (channel: number, normalizedValue: number) => {
    const deck = channel === 0 ? 'A' : 'B'
    const audioRef = deck === 'A' ? audioRefA : audioRefB
    const state = deck === 'A' ? deckA : deckB

    if (!audioRef.current || !state.track) return

    // Scrub: move playhead based on jog wheel movement
    // Sensitivity: 0.1 seconds per unit of normalized value
    const scrubAmount = normalizedValue * 0.1
    const newTime = state.currentTime + scrubAmount

    seekTo(deck, newTime)
  }

  const handleMIDIControl = (control: number, value: number, channel: number) => {
    const normalizedValue = value / 127
    const deck = channel === 0 ? 'A' : 'B'

    // Reloop Ready MIDI Mapping
    switch (control) {
      // Channel Faders - CC 28 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 28:
        updateDeck(deck, { volume: normalizedValue })
        break

      // Track Gain/Trim - CC 22 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 22:
        updateDeck(deck, { gain: normalizedValue })
        break

      // Crossfader - CC 8 on Channel 14
      case 8:
        if (channel === 14) {
          setCrossfader(normalizedValue)
        }
        break

      // Filter knobs - CC 26 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 26:
        updateDeck(deck, { filter: normalizedValue })
        break

      // Low EQ - CC 25 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 25:
        updateDeck(deck, { eqLow: normalizedValue })
        break

      // High EQ - CC 23 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 23:
        updateDeck(deck, { eqHigh: normalizedValue })
        break

      // Pitch/Tempo slider - CC 9 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 9:
        // Convert 0-127 to -8% to +8% pitch range
        const pitch = (normalizedValue - 0.5) * 16
        updateDeck(deck, { pitch })
        break

      // Jog Wheel - Relative Encoder (Common: CC 21, 48, 54)
      // Values typically: 1-64 = forward, 65-127 = backward
      case 21:
      case 48:
      case 54:
        // Relative encoder mode: 1-63 = clockwise, 65-127 = counter-clockwise
        const isClockwise = value <= 64
        const speed = isClockwise ? value : (128 - value)
        const direction = isClockwise ? 1 : -1
        const jogSensitivity = 0.05 // seconds per tick
        const jogAmount = direction * speed * jogSensitivity

        const audioRef = deck === 'A' ? audioRefA : audioRefB
        const state = deck === 'A' ? deckA : deckB
        if (audioRef.current && state.track) {
          const newTime = Math.max(0, Math.min(state.duration, state.currentTime + jogAmount))
          seekTo(deck, newTime)
        }
        logMidi(`Jog Wheel CC ${control}: ${isClockwise ? 'CW' : 'CCW'} speed=${speed} amount=${jogAmount.toFixed(3)}s`)
        break
    }
  }

  const handleMIDINote = (note: number, channel: number, isPressed: boolean) => {
    const deck = channel === 0 ? 'A' : 'B'

    logMidi(`handleMIDINote called: Note ${note}, Channel ${channel}, Pressed: ${isPressed}, Deck: ${deck}`)

    // Only respond to button presses (Note On), not releases
    if (!isPressed) {
      logMidi(`Ignoring button release`)
      return
    }

    // Reloop Ready Button Mapping
    switch (note) {
      // Play button - Note 0 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 0:
        logMidi(`Play button pressed - calling togglePlay('${deck}')`)
        togglePlay(deck)
        break

      // Cue button - Note 1 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 1:
        jumpToCue(deck)
        break

      // Sync button - Note 2 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 2:
        syncTempo(deck)
        break

      // Mode button - Note 32 (Ch 0 = Deck A, Ch 1 = Deck B)
      case 32:
        logMidi(`Mode button pressed on Deck ${deck}`)
        // Could be used to toggle between modes in the future
        break

      // Performance Pads - Notes 20-27 (Ch 0 = Deck A, Ch 1 = Deck B)
      // Top to bottom: 20, 21, 22, 23, 24, 25, 26, 27
      case 20:
      case 21:
      case 22:
      case 23:
      case 24:
      case 25:
      case 26:
      case 27:
        const padIndex = note - 20  // 0-7 for hot cues 1-8
        const deckState = deck === 'A' ? deckA : deckB

        logMidi(`Hot Cue Pad ${padIndex + 1} pressed on Deck ${deck}`)

        // If hot cue is set, jump to it. Otherwise, set it.
        if (deckState.hotCues[padIndex] !== null) {
          jumpToHotCue(deck, padIndex)
          setPadColor(note, channel, 'green')  // Green = cue set and triggered
        } else if (deckState.track) {
          setHotCue(deck, padIndex)
          setPadColor(note, channel, 'red')  // Red = newly set cue
        }
        break
    }
  }

  const updateDeck = (deck: 'A' | 'B', updates: Partial<DeckState>) => {
    const setter = deck === 'A' ? setDeckA : setDeckB
    setter(prev => ({ ...prev, ...updates }))
  }

  // Update audio effects when deck state changes
  useEffect(() => {
    if (filterRefA.current && trackGainRefA.current && volumeRefA.current && eqRefA.current) {
      // DJ-style filter (CC 26)
      // 0.5 = center/neutral (full range), <0.5 = low-pass, >0.5 = high-pass
      if (deckA.filter < 0.5) {
        // Low-pass mode: cut highs
        filterRefA.current.type = 'lowpass'
        filterRefA.current.frequency.value = 200 + (deckA.filter * 2) * 21800  // 200Hz to 22000Hz
      } else if (deckA.filter > 0.5) {
        // High-pass mode: cut lows
        filterRefA.current.type = 'highpass'
        filterRefA.current.frequency.value = ((deckA.filter - 0.5) * 2) * 10000  // 0Hz to 10000Hz
      } else {
        // Neutral: full range
        filterRefA.current.type = 'lowpass'
        filterRefA.current.frequency.value = 22000
      }

      // Track gain/trim (CC 22) - independent of crossfader
      trackGainRefA.current.gain.value = deckA.gain

      // Channel fader (CC 28) - affected by crossfader
      const cfVolume = 1 - crossfader
      volumeRefA.current.gain.value = deckA.volume * cfVolume

      eqRefA.current.high.gain.value = (deckA.eqHigh - 0.5) * 24
      eqRefA.current.mid.gain.value = (deckA.eqMid - 0.5) * 24
      eqRefA.current.low.gain.value = (deckA.eqLow - 0.5) * 24
    }

    if (audioRefA.current) {
      audioRefA.current.playbackRate = 1 + (deckA.pitch / 100)
    }
  }, [deckA.filter, deckA.gain, deckA.volume, deckA.eqHigh, deckA.eqMid, deckA.eqLow, deckA.pitch, crossfader])

  useEffect(() => {
    if (filterRefB.current && trackGainRefB.current && volumeRefB.current && eqRefB.current) {
      // DJ-style filter (CC 26)
      // 0.5 = center/neutral (full range), <0.5 = low-pass, >0.5 = high-pass
      if (deckB.filter < 0.5) {
        // Low-pass mode: cut highs
        filterRefB.current.type = 'lowpass'
        filterRefB.current.frequency.value = 200 + (deckB.filter * 2) * 21800  // 200Hz to 22000Hz
      } else if (deckB.filter > 0.5) {
        // High-pass mode: cut lows
        filterRefB.current.type = 'highpass'
        filterRefB.current.frequency.value = ((deckB.filter - 0.5) * 2) * 10000  // 0Hz to 10000Hz
      } else {
        // Neutral: full range
        filterRefB.current.type = 'lowpass'
        filterRefB.current.frequency.value = 22000
      }

      // Track gain/trim (CC 22) - independent of crossfader
      trackGainRefB.current.gain.value = deckB.gain

      // Channel fader (CC 28) - affected by crossfader
      const cfVolume = crossfader
      volumeRefB.current.gain.value = deckB.volume * cfVolume

      eqRefB.current.high.gain.value = (deckB.eqHigh - 0.5) * 24
      eqRefB.current.mid.gain.value = (deckB.eqMid - 0.5) * 24
      eqRefB.current.low.gain.value = (deckB.eqLow - 0.5) * 24
    }

    if (audioRefB.current) {
      audioRefB.current.playbackRate = 1 + (deckB.pitch / 100)
    }
  }, [deckB.filter, deckB.gain, deckB.volume, deckB.eqHigh, deckB.eqMid, deckB.eqLow, deckB.pitch, crossfader])

  const togglePlay = async (deck: 'A' | 'B') => {
    logMidi(`togglePlay called for Deck ${deck}`)

    const audioRef = deck === 'A' ? audioRefA : audioRefB
    const state = deck === 'A' ? deckA : deckB
    const setter = deck === 'A' ? setDeckA : setDeckB

    logMidi(`Audio element exists: ${!!audioRef.current}, Track loaded: ${!!state.track}, State isPlaying: ${state.isPlaying}`)

    if (!audioRef.current) {
      logMidi(`ERROR: No audio element for Deck ${deck}`)
      return
    }

    if (!state.track) {
      logMidi(`ERROR: No track loaded on Deck ${deck}`)
      return
    }

    // Check actual audio element state
    const isPaused = audioRef.current.paused
    logMidi(`Audio element paused property: ${isPaused}`)

    // Resume audio context if suspended (required by browser autoplay policy)
    if (audioContextRef.current?.state === 'suspended') {
      logMidi(`Audio context suspended, resuming...`)
      try {
        await audioContextRef.current.resume()
        logMidi(`Audio context resumed successfully`)
      } catch (error) {
        logMidi(`ERROR resuming audio context: ${error}`)
      }
    }

    try {
      // Use audio element's actual state instead of our state
      if (!isPaused) {
        logMidi(`Pausing Deck ${deck} (audio element is playing)`)
        audioRef.current.pause()
        setter(prev => ({ ...prev, isPlaying: false }))
        logMidi(`Pause successful, isPlaying set to false`)
      } else {
        logMidi(`Playing Deck ${deck} (audio element is paused)`)
        await audioRef.current.play()
        setter(prev => ({ ...prev, isPlaying: true }))
        logMidi(`Play successful, isPlaying set to true`)
      }
    } catch (error) {
      logMidi(`ERROR toggling play/pause for Deck ${deck}: ${error}`)
    }
  }

  const setCue = (deck: 'A' | 'B') => {
    const state = deck === 'A' ? deckA : deckB
    updateDeck(deck, { cuePoint: state.currentTime })
  }

  const jumpToCue = (deck: 'A' | 'B') => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB
    const state = deck === 'A' ? deckA : deckB

    if (audioRef.current && state.cuePoint !== null) {
      audioRef.current.currentTime = state.cuePoint
      // Pause when jumping to cue (Serato behavior)
      if (state.isPlaying) {
        audioRef.current.pause()
        updateDeck(deck, { isPlaying: false })
      }
    }
  }

  // Hot Cue Functions
  const setHotCue = (deck: 'A' | 'B', padNumber: number) => {
    const state = deck === 'A' ? deckA : deckB
    const newHotCues = [...state.hotCues]
    newHotCues[padNumber] = state.currentTime
    updateDeck(deck, { hotCues: newHotCues })
    logMidi(`Set hot cue ${padNumber + 1} at ${state.currentTime.toFixed(2)}s`)
  }

  const jumpToHotCue = (deck: 'A' | 'B', padNumber: number) => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB
    const state = deck === 'A' ? deckA : deckB

    const hotCueTime = state.hotCues[padNumber]
    if (audioRef.current && hotCueTime !== null) {
      audioRef.current.currentTime = hotCueTime
      // If not playing, start playing when hitting a hot cue (Serato behavior)
      if (!state.isPlaying) {
        audioRef.current.play()
        updateDeck(deck, { isPlaying: true })
      }
      logMidi(`Jumped to hot cue ${padNumber + 1} at ${hotCueTime.toFixed(2)}s`)
    }
  }

  // Clear hot cue (right-click or shift+pad)
  const clearHotCue = (deck: 'A' | 'B', padNumber: number) => {
    const state = deck === 'A' ? deckA : deckB
    const newHotCues = [...state.hotCues]
    newHotCues[padNumber] = null
    updateDeck(deck, { hotCues: newHotCues })
    logMidi(`Cleared hot cue ${padNumber + 1}`)
  }

  // Seek to specific time (for waveform clicking/jog wheel)
  const seekTo = (deck: 'A' | 'B', time: number) => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(time, audioRef.current.duration || 0))
    }
  }

  const syncTempo = (thisDeck: 'A' | 'B') => {
    // This deck syncs TO the other deck (like Serato) with BEAT ALIGNMENT
    const otherDeck = thisDeck === 'A' ? deckB : deckA
    const thisState = thisDeck === 'A' ? deckA : deckB
    const audioRef = thisDeck === 'A' ? audioRefA : audioRefB

    if (!otherDeck.track?.bpm || !thisState.track?.bpm) {
      console.log('Sync failed: Missing BPM data')
      return
    }

    // Match this deck's BPM to the other deck's effective BPM
    const targetBPM = otherDeck.effectiveBPM || otherDeck.track.bpm
    const currentBPM = thisState.track.bpm
    const pitchAdjustment = ((targetBPM / currentBPM) - 1) * 100
    const clampedPitch = Math.max(-8, Math.min(8, pitchAdjustment))

    // BEAT PHASE ALIGNMENT
    // Calculate beat duration in seconds for each deck
    const otherBeatDuration = 60 / (otherDeck.effectiveBPM || otherDeck.track.bpm)
    const thisBeatDuration = 60 / (thisState.track.bpm * (1 + clampedPitch / 100))

    // Calculate current beat phase (position within the current beat, 0-1)
    const otherBeatPhase = (otherDeck.currentTime % otherBeatDuration) / otherBeatDuration
    const thisBeatPhase = (thisState.currentTime % thisBeatDuration) / thisBeatDuration

    // Calculate the time adjustment needed to align beats
    let phaseDiff = otherBeatPhase - thisBeatPhase

    // Choose the shortest path to alignment (forward or backward)
    if (phaseDiff > 0.5) phaseDiff -= 1
    if (phaseDiff < -0.5) phaseDiff += 1

    // Convert phase difference to time offset
    const timeAdjustment = phaseDiff * thisBeatDuration

    // Only adjust if we're playing (otherwise it's just tempo sync)
    if (thisState.isPlaying && audioRef.current) {
      const newTime = Math.max(0, Math.min(thisState.duration, thisState.currentTime + timeAdjustment))
      audioRef.current.currentTime = newTime
      logMidi(`Beat Sync: Adjusted playhead by ${(timeAdjustment * 1000).toFixed(0)}ms to align beats`)
    }

    console.log(`Syncing Deck ${thisDeck} to ${targetBPM} BPM (pitch: ${clampedPitch.toFixed(1)}%)`)
    logMidi(`Phase alignment: ${(phaseDiff * 100).toFixed(1)}% beat offset`)
    updateDeck(thisDeck, { pitch: clampedPitch })
  }

  const loadTrack = (track: Track, deck: 'A' | 'B') => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB
    const setter = deck === 'A' ? setDeckA : setDeckB

    if (audioRef.current) {
      audioRef.current.src = `file://${track.path}`
      audioRef.current.load()
    }

    setter(prev => ({
      ...prev,
      track,
      isPlaying: false,
      currentTime: 0,
      cuePoint: null,
      hotCues: [null, null, null, null, null, null, null, null]  // Reset hot cues
    }))
  }

  const handleTrackDoubleClick = (track: Track) => {
    if (!deckA.track) {
      loadTrack(track, 'A')
    } else if (!deckB.track) {
      loadTrack(track, 'B')
    } else {
      if (!deckA.isPlaying && deckB.isPlaying) {
        loadTrack(track, 'A')
      } else {
        loadTrack(track, 'B')
      }
    }
  }

  const handleTrackRightClick = (e: React.MouseEvent, track: Track) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, track })
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const renderDeck = (deck: 'A' | 'B', state: DeckState, audioRef: React.RefObject<HTMLAudioElement>) => {
    const otherDeck = deck === 'A' ? deckB : deckA

    return (
      <div className="flex-1 bg-[#1a1a1a] rounded-sm">
        {/* Deck Container */}
        <div className="flex p-2 gap-2">
          {/* Left Side - Platter & Track Info */}
          <div className="w-48 flex flex-col">
            {/* Virtual Platter */}
            <div className="relative w-40 h-40 mx-auto mb-2">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-4 ${
                state.isPlaying ? 'border-[#00d9ff]' : 'border-gray-600'
              } ${state.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }}>
                <div className="absolute inset-4 rounded-full bg-black flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#00d9ff]">{state.effectiveBPM || '--'}</div>
                    <div className="text-[10px] text-gray-400">BPM</div>
                  </div>
                </div>
              </div>
              {/* Pitch indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-500 mt-12">
                {state.pitch > 0 ? '+' : ''}{state.pitch.toFixed(1)}%
              </div>
            </div>

            {/* Track Info */}
            <div className="bg-black/50 rounded px-2 py-2 min-h-[60px]">
              {state.track ? (
                <>
                  <div className="text-xs font-bold text-white truncate">{state.track.title}</div>
                  <div className="text-[10px] text-gray-400 truncate">{state.track.artist}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-[#00d9ff]">{state.track.key || '--'}</span>
                    <span className="text-[10px] text-gray-500">{formatTime(state.duration)}</span>
                  </div>
                </>
              ) : (
                <div className="text-[10px] text-gray-600 text-center">No track loaded</div>
              )}
            </div>
          </div>

          {/* Right Side - Controls & Waveform */}
          <div className="flex-1 flex flex-col">
            {/* Transport Controls */}
            <div className="flex items-center gap-1 mb-2">
              <button
                onClick={() => jumpToCue(deck)}
                disabled={state.cuePoint === null}
                className="px-3 py-1 bg-[#ff6b00] hover:bg-[#ff8533] disabled:bg-gray-700 disabled:opacity-30 rounded text-xs font-bold transition-colors"
              >
                CUE
              </button>
              <button
                onClick={() => togglePlay(deck)}
                disabled={!state.track}
                className="px-4 py-1 bg-[#00d9ff] hover:bg-[#33e0ff] disabled:bg-gray-700 disabled:opacity-30 rounded text-xs font-bold text-black transition-colors"
              >
                {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setCue(deck)}
                disabled={!state.track}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded text-xs transition-colors"
                title="Set Cue Point"
              >
                SET
              </button>
              <button
                onClick={() => syncTempo(deck)}
                disabled={!state.track?.bpm || !otherDeck.track?.bpm}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 rounded text-xs font-bold transition-colors"
                title={`Sync this deck to Deck ${deck === 'A' ? 'B' : 'A'}`}
              >
                SYNC
              </button>
              <button
                onClick={() => updateDeck(deck, { keyLock: !state.keyLock })}
                className={`p-1 rounded ${state.keyLock ? 'bg-[#00d9ff] text-black' : 'bg-gray-700'}`}
                title="Key Lock"
              >
                <Lock className="h-3 w-3" />
              </button>
              <button
                className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                title="Loop"
              >
                <Repeat className="h-3 w-3" />
              </button>
            </div>

            {/* Waveform Display */}
            <div className="flex-1 bg-black rounded relative overflow-hidden" style={{ minHeight: '100px' }}>
              {state.track ? (
                <>
                  <div className="absolute inset-0 flex flex-col">
                    {/* Time & Key Display */}
                    <div className="absolute top-1 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                      <div className="text-xs font-mono text-[#00d9ff] bg-black/80 px-2 py-0.5 rounded">
                        {formatTime(state.currentTime)}
                      </div>
                      {state.track?.key && (
                        <div className="text-xs font-bold text-white bg-black/80 px-2 py-0.5 rounded">
                          {state.track.key}
                        </div>
                      )}
                      <div className="text-xs font-mono text-gray-400 bg-black/80 px-2 py-0.5 rounded">
                        -{formatTime(state.duration - state.currentTime)}
                      </div>
                    </div>

                    {/* Ultra High-Res Waveform with Pre-rendered Data */}
                    <UltraHighResWaveform
                      isPlaying={state.isPlaying}
                      currentTime={state.currentTime}
                      duration={state.duration}
                      hotCues={state.hotCues}
                      onSeek={(time) => seekTo(deck, time)}
                      deck={deck}
                      bpm={state.effectiveBPM || state.track?.bpm}
                      waveformData={(state.track as any)?.waveformData}
                      audioPath={null}
                    />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs">
                  NO TRACK LOADED
                </div>
              )}
            </div>

            {/* Controls: Gain, Filter, EQ, Tempo, Volume */}
            <div className="flex gap-2 mt-2 items-end">
              {/* Gain/Trim Rotary Knob */}
              <RotaryKnob
                value={state.gain}
                onChange={(v) => updateDeck(deck, { gain: v })}
                label="GAIN"
                size={44}
                centerDetent={false}
              />

              {/* Filter Rotary Knob */}
              <RotaryKnob
                value={state.filter}
                onChange={(v) => updateDeck(deck, { filter: v })}
                label="FILTER"
                size={44}
                centerDetent={true}
              />

              {/* EQ Rotary Knobs */}
              <div className="flex gap-2">
                <RotaryKnob
                  value={state.eqHigh}
                  onChange={(v) => updateDeck(deck, { eqHigh: v })}
                  label="HI"
                  size={44}
                  centerDetent={true}
                />
                <RotaryKnob
                  value={state.eqMid}
                  onChange={(v) => updateDeck(deck, { eqMid: v })}
                  label="MD"
                  size={44}
                  centerDetent={true}
                />
                <RotaryKnob
                  value={state.eqLow}
                  onChange={(v) => updateDeck(deck, { eqLow: v })}
                  label="LO"
                  size={44}
                  centerDetent={true}
                />
              </div>

              {/* Pitch Slider - Vertical */}
              <div className="flex flex-col items-center flex-1">
                <input
                  type="range"
                  min="-8"
                  max="8"
                  step="0.1"
                  value={state.pitch}
                  onChange={(e) => updateDeck(deck, { pitch: parseFloat(e.target.value) })}
                  className="h-20 accent-[#00d9ff]"
                  style={{ transform: 'rotate(-90deg)', width: '80px' }}
                />
                <span className="text-[9px] text-gray-500">TEMPO</span>
              </div>

              {/* Volume Fader */}
              <div className="flex flex-col items-center">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={state.volume}
                  onChange={(e) => updateDeck(deck, { volume: parseFloat(e.target.value) })}
                  className="h-20 accent-[#00d9ff]"
                  style={{ transform: 'rotate(-90deg)', width: '80px' }}
                />
                <span className="text-[9px] text-gray-500">VOL</span>
              </div>
            </div>

            {/* Hot Cue Pads - 2 rows of 4 */}
            <div className="mt-2 px-2">
              <div className="text-[9px] text-gray-400 mb-1 text-center">HOT CUES</div>
              <div className="grid grid-cols-4 gap-1">
                {state.hotCues.map((cueTime, index) => {
                  const isSet = cueTime !== null
                  const cueColor = HOT_CUE_COLORS[index]

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (isSet) {
                          jumpToHotCue(deck, index)
                        } else if (state.track) {
                          setHotCue(deck, index)
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (isSet) {
                          clearHotCue(deck, index)
                        }
                      }}
                      disabled={!state.track}
                      className={`
                        relative h-10 rounded font-bold text-xs transition-all
                        ${isSet
                          ? 'text-white shadow-lg hover:shadow-xl hover:scale-105'
                          : 'bg-gray-800 text-gray-600 hover:bg-gray-700'
                        }
                        disabled:opacity-30 disabled:cursor-not-allowed
                      `}
                      style={isSet ? {
                        backgroundColor: cueColor,
                        boxShadow: `0 0 15px ${cueColor}80`
                      } : {}}
                      title={isSet ? `Hot Cue ${index + 1}: ${cueTime?.toFixed(2)}s\nRight-click to clear` : `Set Hot Cue ${index + 1}`}
                    >
                      <span className="absolute top-0.5 right-1.5 text-[9px] font-bold opacity-80">{index + 1}</span>
                      {isSet && (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="text-[10px] font-mono font-bold">{Math.floor(cueTime / 60)}:{(cueTime % 60).toFixed(0).padStart(2, '0')}</div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              <div className="text-[8px] text-gray-600 text-center mt-1">Right-click to clear</div>
            </div>
          </div>
        </div>

        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => updateDeck(deck, { currentTime: e.currentTarget.currentTime })}
          onLoadedMetadata={(e) => updateDeck(deck, { duration: e.currentTarget.duration })}
          onPlay={() => updateDeck(deck, { isPlaying: true })}
          onPause={() => updateDeck(deck, { isPlaying: false })}
          onEnded={() => updateDeck(deck, { isPlaying: false })}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] text-white">
      {/* Serato-style Header */}
      <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="text-sm font-bold text-[#00d9ff]">CLEANCUE DJ</div>

        {/* MIDI Controller Section */}
        <div className="flex items-center gap-3">
          {midiDevices.length > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-400">MIDI Connected:</span>
                <select
                  value={selectedMidiDevice || ''}
                  onChange={(e) => setSelectedMidiDevice(e.target.value)}
                  className="bg-black border border-gray-700 rounded px-2 py-1 text-xs text-[#00d9ff] focus:outline-none focus:border-[#00d9ff]"
                >
                  {midiDevices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2 h-2 bg-gray-600 rounded-full" />
              <span>No MIDI Controller (Plug in USB MIDI device)</span>
            </div>
          )}
        </div>
      </div>

      {/* Decks Section */}
      <div className="flex gap-2 p-2 border-b border-gray-800">
        {renderDeck('A', deckA, audioRefA)}

        {/* Virtual Mixer in the Middle */}
        <div className="w-72 bg-[#1a1a1a] rounded-sm p-3 flex flex-col items-center gap-3">
          <div className="text-[10px] font-bold text-[#00d9ff] tracking-wider">MIXER</div>

          {/* Transport Controls for Both Decks */}
          <div className="w-full grid grid-cols-2 gap-2">
            {/* Deck A Controls */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] text-[#00d9ff] font-bold text-center tracking-wide">DECK A</span>
              <button
                onClick={() => togglePlay('A')}
                disabled={!deckA.track}
                className={`px-2 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center ${
                  deckA.isPlaying
                    ? 'bg-[#00d9ff] text-black hover:bg-[#33e0ff]'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                } disabled:opacity-20 disabled:cursor-not-allowed`}
              >
                {deckA.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <button
                onClick={() => jumpToCue('A')}
                disabled={deckA.cuePoint === null}
                className="px-2 py-1 bg-[#ff6b00] hover:bg-[#ff8533] disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-40 rounded text-[10px] font-bold transition-colors disabled:cursor-not-allowed"
              >
                CUE
              </button>
              <button
                onClick={() => syncTempo('A')}
                disabled={!deckA.track?.bpm || !deckB.track?.bpm}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-40 rounded text-[10px] font-bold transition-colors disabled:cursor-not-allowed"
                title="Sync to Deck B"
              >
                SYNC
              </button>
            </div>

            {/* Deck B Controls */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] text-[#ff6b00] font-bold text-center tracking-wide">DECK B</span>
              <button
                onClick={() => togglePlay('B')}
                disabled={!deckB.track}
                className={`px-2 py-1.5 rounded text-xs font-bold transition-colors flex items-center justify-center ${
                  deckB.isPlaying
                    ? 'bg-[#ff6b00] text-white hover:bg-[#ff8533]'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                } disabled:opacity-20 disabled:cursor-not-allowed`}
              >
                {deckB.isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <button
                onClick={() => jumpToCue('B')}
                disabled={deckB.cuePoint === null}
                className="px-2 py-1 bg-[#ff6b00] hover:bg-[#ff8533] disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-40 rounded text-[10px] font-bold transition-colors disabled:cursor-not-allowed"
              >
                CUE
              </button>
              <button
                onClick={() => syncTempo('B')}
                disabled={!deckB.track?.bpm || !deckA.track?.bpm}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:opacity-40 rounded text-[10px] font-bold transition-colors disabled:cursor-not-allowed"
                title="Sync to Deck A"
              >
                SYNC
              </button>
            </div>
          </div>

          {/* VU Meters */}
          <div className="flex gap-2">
            <div className="flex flex-col items-center">
              <div className="w-4 h-24 bg-black rounded relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all"
                  style={{ height: `${deckA.isPlaying ? deckA.volume * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-500 mt-1">A</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-4 h-24 bg-black rounded relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all"
                  style={{ height: `${deckB.isPlaying ? deckB.volume * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-500 mt-1">B</span>
            </div>
          </div>

          {/* Crossfader */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[9px] text-gray-400 mb-2">CROSSFADER</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={crossfader}
              onChange={(e) => setCrossfader(parseFloat(e.target.value))}
              className="w-full h-2 accent-[#00d9ff]"
            />
            <div className="flex justify-between w-full mt-1">
              <span className="text-[9px] text-[#00d9ff] font-bold">A</span>
              <span className="text-[9px] text-gray-500">{Math.round((1-crossfader)*100)}% / {Math.round(crossfader*100)}%</span>
              <span className="text-[9px] text-[#ff6b00] font-bold">B</span>
            </div>
          </div>

          {/* Master Volume */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[9px] text-gray-400 mb-1">MASTER</span>
            <div className="text-lg font-bold text-white">100%</div>
            <span className="text-[8px] text-gray-600">Ready</span>
          </div>
        </div>

        {renderDeck('B', deckB, audioRefB)}
      </div>

      {/* Library Section */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
        {/* Library Header */}
        <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#00d9ff]">LIBRARY</h3>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-600" />
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black border border-gray-800 rounded px-3 py-1 text-xs w-64 focus:outline-none focus:border-[#00d9ff]"
              />
              <span className="text-xs text-gray-600">{filteredTracks.length}</span>
            </div>
          </div>
        </div>

        {/* Library Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d9ff]"></div>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800">
                <tr className="text-gray-500 text-left">
                  <th className="px-3 py-2 font-medium">TRACK</th>
                  <th className="px-3 py-2 font-medium">ARTIST</th>
                  <th className="px-3 py-2 font-medium">ALBUM</th>
                  <th className="px-3 py-2 font-medium">BPM</th>
                  <th className="px-3 py-2 font-medium">KEY</th>
                  <th className="px-3 py-2 font-medium">TIME</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map((track, index) => (
                  <tr
                    key={track.id}
                    onDoubleClick={() => handleTrackDoubleClick(track)}
                    onContextMenu={(e) => handleTrackRightClick(e, track)}
                    className={`
                      ${index % 2 === 0 ? 'bg-[#0a0a0a]' : 'bg-[#121212]'}
                      hover:bg-[#00d9ff]/10 cursor-pointer transition-colors
                      ${deckA.track?.id === track.id ? 'bg-[#00d9ff]/20' : ''}
                      ${deckB.track?.id === track.id ? 'bg-[#ff6b00]/20' : ''}
                    `}
                  >
                    <td className="px-3 py-1.5 text-white">{track.title}</td>
                    <td className="px-3 py-1.5 text-gray-400">{track.artist}</td>
                    <td className="px-3 py-1.5 text-gray-500">{track.album || '-'}</td>
                    <td className="px-3 py-1.5 text-[#00d9ff]">{track.bpm || '-'}</td>
                    <td className="px-3 py-1.5 text-[#00d9ff]">{track.key || '-'}</td>
                    <td className="px-3 py-1.5 text-gray-500">{track.duration ? formatTime(track.duration) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MIDI Debug Log */}
      {showMidiLog && (
        <div className="border-t border-gray-800 bg-[#0a0a0a] h-32 flex flex-col">
          <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#00d9ff]">MIDI LOG</span>
              <span className="text-[9px] text-gray-600">{midiLogs.length} messages</span>
            </div>
            <button
              onClick={() => setShowMidiLog(false)}
              className="text-xs text-gray-500 hover:text-white"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 overflow-auto p-2 font-mono text-[10px]">
            {midiLogs.length === 0 ? (
              <div className="text-gray-600 text-center py-4">
                Move a control on your MIDI controller to see debug messages...
              </div>
            ) : (
              <div className="space-y-0.5">
                {midiLogs.map((log, idx) => (
                  <div key={idx} className="text-gray-400">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-[#1a1a1a] border-t border-gray-800 px-4 py-1 flex items-center justify-between">
            <span className="text-[9px] text-gray-600">
              Tip: This shows all MIDI messages from your controller. Use it to find the correct CC numbers.
            </span>
            <button
              onClick={() => setMidiLogs([])}
              className="text-xs text-gray-500 hover:text-[#00d9ff]"
            >
              Clear Log
            </button>
          </div>
        </div>
      )}

      {/* Show MIDI Log Button (when hidden) */}
      {!showMidiLog && (
        <div className="border-t border-gray-800 bg-[#1a1a1a] px-4 py-2">
          <button
            onClick={() => setShowMidiLog(true)}
            className="text-xs text-[#00d9ff] hover:text-white"
          >
            Show MIDI Log ({midiLogs.length} messages)
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl min-w-[150px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                loadTrack(contextMenu.track, 'A')
                setContextMenu(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-[#00d9ff]/20 text-sm transition-colors"
            >
              Load to Deck A
            </button>
            <button
              onClick={() => {
                loadTrack(contextMenu.track, 'B')
                setContextMenu(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-[#ff6b00]/20 text-sm transition-colors"
            >
              Load to Deck B
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default DJDeck
