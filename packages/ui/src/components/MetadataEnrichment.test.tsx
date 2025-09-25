import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test/utils'
import { MetadataEnrichment } from './MetadataEnrichment'

describe('MetadataEnrichment', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    selectedTracks: []
  }

  it('renders the metadata enrichment view', () => {
    render(<MetadataEnrichment {...mockProps} />)
    expect(screen.getByText('Metadata Enrichment')).toBeInTheDocument()
  })

  it('shows empty state when no jobs exist', () => {
    render(<MetadataEnrichment {...mockProps} />)
    expect(screen.getByText('No enrichment jobs found')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<MetadataEnrichment {...mockProps} isOpen={false} />)
    expect(screen.queryByText('Metadata Enrichment')).not.toBeInTheDocument()
  })
})