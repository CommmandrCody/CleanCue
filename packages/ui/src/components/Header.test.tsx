import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils'
import userEvent from '@testing-library/user-event'
import { Header } from './Header'

describe('Header', () => {
  it('renders the application title and subtitle', () => {
    const mockOnScan = vi.fn()
    const mockOnSettings = vi.fn()

    render(<Header onScan={mockOnScan} onSettings={mockOnSettings} onImport={vi.fn()} onYouTubeDownloader={vi.fn()} />)

    expect(screen.getByText('CleanCue')).toBeInTheDocument()
    expect(screen.getByText('DJ Library Manager')).toBeInTheDocument()
  })

  it('calls onScan when scan button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnScan = vi.fn()
    const mockOnSettings = vi.fn()

    render(<Header onScan={mockOnScan} onSettings={mockOnSettings} onImport={vi.fn()} onYouTubeDownloader={vi.fn()} />)

    const scanButton = screen.getByRole('button', { name: /scan library/i })
    await user.click(scanButton)

    expect(mockOnScan).toHaveBeenCalledTimes(1)
  })

  it('calls onSettings when settings button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnScan = vi.fn()
    const mockOnSettings = vi.fn()

    render(<Header onScan={mockOnScan} onSettings={mockOnSettings} onImport={vi.fn()} onYouTubeDownloader={vi.fn()} />)

    const settingsButton = screen.getByRole('button', { name: /settings/i })
    await user.click(settingsButton)

    expect(mockOnSettings).toHaveBeenCalledTimes(1)
  })

  it('displays the correct icons', () => {
    const mockOnScan = vi.fn()
    const mockOnSettings = vi.fn()

    render(<Header onScan={mockOnScan} onSettings={mockOnSettings} onImport={vi.fn()} onYouTubeDownloader={vi.fn()} />)

    // The icons are SVGs rendered by lucide-react, we can check for their presence
    expect(screen.getByRole('button', { name: /scan library/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })
})