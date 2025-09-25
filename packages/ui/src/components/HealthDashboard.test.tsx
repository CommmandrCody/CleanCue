import { describe, it, expect } from 'vitest'
import { render, screen } from '../test/utils'
import { HealthDashboard } from './HealthDashboard'

describe('HealthDashboard', () => {
  it('renders the health dashboard', () => {
    render(<HealthDashboard />)
    expect(screen.getByText('Library Health')).toBeInTheDocument()
  })

  it('shows scan button', () => {
    render(<HealthDashboard />)
    expect(screen.getByRole('button', { name: /scan for issues/i })).toBeInTheDocument()
  })

  it('displays health metrics section', () => {
    render(<HealthDashboard />)
    expect(screen.getByText('Health Metrics')).toBeInTheDocument()
  })
})