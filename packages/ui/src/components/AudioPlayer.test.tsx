import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils'
import { AudioPlayer } from './AudioPlayer'

const mockTracks = [
  {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
    path: '/test/track.mp3'
  },
  {
    id: '2',
    title: 'Another Track',
    artist: 'Another Artist',
    path: '/test/track2.mp3'
  }
]

describe('AudioPlayer', () => {
  const mockProps = {
    tracks: mockTracks,
    currentTrackIndex: 0,
    onTrackChange: vi.fn(),
    onClose: vi.fn()
  }

  it('renders without crashing', () => {
    render(<AudioPlayer {...mockProps} />)
    expect(screen.getByText('Test Track')).toBeInTheDocument()
    expect(screen.getByText('Test Artist')).toBeInTheDocument()
  })

  it('shows play button when paused', () => {
    render(<AudioPlayer {...mockProps} />)
    const playButton = screen.getByRole('button', { name: /play/i })
    expect(playButton).toBeInTheDocument()
  })

  it('handles empty tracks array', () => {
    render(<AudioPlayer {...mockProps} tracks={[]} />)
    expect(screen.getByText('No track available')).toBeInTheDocument()
  })
})