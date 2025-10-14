import React, { useRef, useEffect, useState } from 'react'

interface AudioVisualizerProps {
  audioElement?: HTMLAudioElement | null
  width?: number
  height?: number
  className?: string
  type?: 'bars' | 'wave' | 'circular' | 'waveform'
  color?: string
  backgroundColor?: string
  isPlaying?: boolean
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioElement,
  width = 400,
  height = 200,
  className = '',
  type = 'bars',
  color = '#3b82f6',
  backgroundColor = 'transparent',
  isPlaying = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const audioContextRef = useRef<AudioContext>()
  const analyserRef = useRef<AnalyserNode>()
  const sourceRef = useRef<MediaElementAudioSourceNode>()
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer>>()
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize audio context and analyser
  useEffect(() => {
    if (!audioElement || isInitialized) return

    const initializeAudio = async () => {
      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioContext = audioContextRef.current

        // Resume context if suspended (required by Chrome's autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }

        // Create analyser node
        analyserRef.current = audioContext.createAnalyser()
        analyserRef.current.fftSize = 512 // Better resolution
        analyserRef.current.smoothingTimeConstant = 0.85
        analyserRef.current.minDecibels = -90
        analyserRef.current.maxDecibels = -10

        // Create source from audio element (only if not already connected)
        if (!sourceRef.current) {
          sourceRef.current = audioContext.createMediaElementSource(audioElement)
          sourceRef.current.connect(analyserRef.current)
          analyserRef.current.connect(audioContext.destination)
        }

        // Create data array
        const bufferLength = analyserRef.current.frequencyBinCount
        dataArrayRef.current = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>

        setIsInitialized(true)
      } catch (error) {
        console.warn('Failed to initialize audio visualization:', error)
        // Don't retry to avoid infinite loops
      }
    }

    initializeAudio()
  }, [audioElement, isInitialized])

  // Animation loop
  useEffect(() => {
    if (!isInitialized) {
      return
    }

    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
      // Draw static visualization when not playing
      drawVisualization()
      return
    }

    const animate = () => {
      if (isPlaying && isInitialized) {
        drawVisualization()
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    // Start animation
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
    }
  }, [isInitialized, isPlaying, type, color, backgroundColor])

  const drawVisualization = () => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    const dataArray = dataArrayRef.current

    if (!canvas || !analyser || !dataArray) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Get frequency data
    if (isPlaying && audioContextRef.current?.state === 'running') {
      analyser.getByteFrequencyData(dataArray)
    } else {
      // Fill with zeros when not playing
      dataArray.fill(0)
    }

    // Clear canvas
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, width, height)

    switch (type) {
      case 'bars':
        drawBars(ctx, dataArray)
        break
      case 'wave':
        drawWave(ctx, dataArray)
        break
      case 'circular':
        drawCircular(ctx, dataArray)
        break
      case 'waveform':
        drawWaveform(ctx, dataArray)
        break
    }
  }

  const drawBars = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    if (!dataArray || dataArray.length === 0) return

    const barCount = Math.min(dataArray.length, 64) // Limit bars for performance
    const barWidth = (width / barCount) * 0.8
    const barSpacing = (width / barCount) * 0.2

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * dataArray.length)
      const barHeight = Math.max(2, (dataArray[dataIndex] / 255) * height * 0.8)
      const x = i * (barWidth + barSpacing)

      // Create gradient
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight)
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, color + '40')

      ctx.fillStyle = gradient
      ctx.fillRect(x, height - barHeight, barWidth, barHeight)
    }
  }

  const drawWave = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.beginPath()

    const sliceWidth = width / dataArray.length
    let x = 0

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 255
      const y = v * height / 2 + height / 4

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.stroke()
  }

  const drawCircular = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 4

    ctx.strokeStyle = color
    ctx.lineWidth = 2

    for (let i = 0; i < dataArray.length; i++) {
      const angle = (i / dataArray.length) * Math.PI * 2
      const amplitude = (dataArray[i] / 255) * radius

      const x1 = centerX + Math.cos(angle) * radius
      const y1 = centerY + Math.sin(angle) * radius
      const x2 = centerX + Math.cos(angle) * (radius + amplitude)
      const y2 = centerY + Math.sin(angle) * (radius + amplitude)

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
    }
  }

  const drawWaveform = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()

    const sliceWidth = width / dataArray.length
    let x = 0

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 255
      const y = height / 2 + (v - 0.5) * height * 0.8

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.stroke()

    // Add reflection
    ctx.save()
    ctx.globalAlpha = 0.3
    ctx.scale(1, -1)
    ctx.translate(0, -height)
    ctx.stroke()
    ctx.restore()
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = undefined
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect()
        } catch (e) {
          // Ignore disconnect errors
        }
        sourceRef.current = undefined
      }
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect()
        } catch (e) {
          // Ignore disconnect errors
        }
        analyserRef.current = undefined
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
        audioContextRef.current = undefined
      }
      setIsInitialized(false)
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg"
        style={{
          background: backgroundColor,
          width: `${width}px`,
          height: `${height}px`
        }}
      />
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
          Audio visualization ready
        </div>
      )}
    </div>
  )
}

// Visualizer controls component
interface VisualizerControlsProps {
  type: 'bars' | 'wave' | 'circular' | 'waveform'
  onTypeChange: (type: 'bars' | 'wave' | 'circular' | 'waveform') => void
  color: string
  onColorChange: (color: string) => void
}

export const VisualizerControls: React.FC<VisualizerControlsProps> = ({
  type,
  onTypeChange,
  color,
  onColorChange
}) => {
  const visualizerTypes = [
    { value: 'bars', label: 'Bars', icon: '📊' },
    { value: 'wave', label: 'Wave', icon: '〰️' },
    { value: 'circular', label: 'Circular', icon: '🔵' },
    { value: 'waveform', label: 'Waveform', icon: '📈' }
  ] as const

  const colorPresets = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899'  // Pink
  ]

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-300">Type:</span>
        <div className="flex gap-1">
          {visualizerTypes.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => onTypeChange(value)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                type === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-300">Color:</span>
        <div className="flex gap-1">
          {colorPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => onColorChange(preset)}
              className={`w-6 h-6 rounded border-2 transition-all ${
                color === preset ? 'border-white scale-110' : 'border-gray-600'
              }`}
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ))}
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-6 h-6 rounded border border-gray-600 bg-transparent"
        />
      </div>
    </div>
  )
}