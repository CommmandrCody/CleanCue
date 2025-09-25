import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils'
import { AnalysisProgress } from './AnalysisProgress'

describe('AnalysisProgress', () => {
  it('renders the analysis progress view', () => {
    render(<AnalysisProgress />)
    expect(screen.getByText('Analysis Progress')).toBeInTheDocument()
  })

  it('shows job list container', () => {
    render(<AnalysisProgress />)
    expect(screen.getByText('Analysis Jobs')).toBeInTheDocument()
  })
})