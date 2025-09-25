import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils'
import { DuplicateDetection } from './DuplicateDetection'

describe('DuplicateDetection', () => {
  it('renders the duplicate detection view', () => {
    render(<DuplicateDetection />)
    expect(screen.getByText('Duplicate Detection')).toBeInTheDocument()
  })

  it('shows scan for duplicates button', () => {
    render(<DuplicateDetection />)
    expect(screen.getByRole('button', { name: /scan for duplicates/i })).toBeInTheDocument()
  })

  it('displays empty state initially', () => {
    render(<DuplicateDetection />)
    expect(screen.getByText('No duplicate groups found')).toBeInTheDocument()
  })
})