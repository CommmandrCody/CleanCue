import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils'
import { userEvent } from '@testing-library/user-event'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  const mockOnViewChange = vi.fn()

  it('renders navigation items', () => {
    render(<Sidebar currentView="library" onViewChange={mockOnViewChange} />)

    expect(screen.getByText('Library')).toBeInTheDocument()
    expect(screen.getByText('Analysis')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Duplicates')).toBeInTheDocument()
  })

  it('highlights current view', () => {
    render(<Sidebar currentView="health" onViewChange={mockOnViewChange} />)

    const healthButton = screen.getByText('Health').closest('button')
    expect(healthButton).toHaveClass('bg-primary-600')
  })

  it('calls onViewChange when navigation item clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar currentView="library" onViewChange={mockOnViewChange} />)

    await user.click(screen.getByText('Analysis'))
    expect(mockOnViewChange).toHaveBeenCalledWith('analysis')
  })
})