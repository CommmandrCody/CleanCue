import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils'
import { Settings } from './Settings'

describe('Settings', () => {
  const mockOnClose = vi.fn()

  it('renders settings modal when open', () => {
    render(<Settings isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<Settings isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
  })

  it('shows close button when open', () => {
    render(<Settings isOpen={true} onClose={mockOnClose} />)
    // The close button is an X icon without text, so we look for the button with the X SVG
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(button =>
      button.querySelector('svg.lucide-x')
    )
    expect(closeButton).toBeInTheDocument()
  })
})