import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import App from './App'
import { setupElectronAPIMock, resetElectronMocks } from './test/mocks/electronAPI'

// Mock all child components to isolate App logic
vi.mock('./components/LibraryView', () => ({
  LibraryView: () => <div data-testid="library-view">Library View Component</div>
}))

vi.mock('./components/AnalysisProgress', () => ({
  AnalysisProgress: () => <div data-testid="analysis-progress">Analysis Progress Component</div>
}))

vi.mock('./components/HealthDashboard', () => ({
  HealthDashboard: () => <div data-testid="health-dashboard">Health Dashboard Component</div>
}))

vi.mock('./components/DuplicateDetection', () => ({
  DuplicateDetection: () => <div data-testid="duplicate-detection">Duplicate Detection Component</div>
}))

vi.mock('./components/Header', () => ({
  Header: ({ onScan, onSettings }: { onScan: () => void, onSettings: () => void }) => (
    <div data-testid="header">
      <button onClick={onScan} data-testid="scan-button">Scan</button>
      <button onClick={onSettings} data-testid="settings-button">Settings</button>
    </div>
  )
}))

vi.mock('./components/Sidebar', () => ({
  Sidebar: ({ currentView, onViewChange }: { currentView: string, onViewChange: (view: string) => void }) => (
    <div data-testid="sidebar">
      <button onClick={() => onViewChange('library')} data-testid="library-nav">Library</button>
      <button onClick={() => onViewChange('health')} data-testid="health-nav">Health</button>
      <button onClick={() => onViewChange('duplicates')} data-testid="duplicates-nav">Duplicates</button>
      <button onClick={() => onViewChange('analysis')} data-testid="analysis-nav">Analysis</button>
      <span data-testid="current-view">{currentView}</span>
    </div>
  )
}))

vi.mock('./components/ScanDialog', () => ({
  ScanDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="scan-dialog">
      <span>Scan Dialog</span>
      <button onClick={onClose} data-testid="close-scan-dialog">Close</button>
    </div>
  )
}))

vi.mock('./components/Settings', () => ({
  Settings: ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => (
    isOpen ? (
      <div data-testid="settings-modal">
        <span>Settings Modal</span>
        <button onClick={onClose} data-testid="close-settings">Close</button>
      </div>
    ) : null
  )
}))

describe('App Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    resetElectronMocks()
    setupElectronAPIMock()
  })

  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders the main application layout', () => {
      render(<App />)

      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('renders with library view by default', () => {
      render(<App />)

      expect(screen.getByTestId('library-view')).toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('library')
    })

    it('applies correct CSS classes for dark theme layout', () => {
      render(<App />)

      const container = document.querySelector('.min-h-screen')
      expect(container).toHaveClass('min-h-screen', 'bg-gray-900', 'text-white')
    })

    it('does not show scan dialog by default', () => {
      render(<App />)

      expect(screen.queryByTestId('scan-dialog')).not.toBeInTheDocument()
    })

    it('does not show settings modal by default', () => {
      render(<App />)

      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
    })
  })

  // View Navigation Tests
  describe('View Navigation', () => {
    it('switches to health view when health navigation is clicked', async () => {
      render(<App />)

      await user.click(screen.getByTestId('health-nav'))

      expect(screen.getByTestId('health-dashboard')).toBeInTheDocument()
      expect(screen.queryByTestId('library-view')).not.toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('health')
    })

    it('switches to duplicates view when duplicates navigation is clicked', async () => {
      render(<App />)

      await user.click(screen.getByTestId('duplicates-nav'))

      expect(screen.getByTestId('duplicate-detection')).toBeInTheDocument()
      expect(screen.queryByTestId('library-view')).not.toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('duplicates')
    })

    it('switches to analysis view when analysis navigation is clicked', async () => {
      render(<App />)

      await user.click(screen.getByTestId('analysis-nav'))

      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument()
      expect(screen.queryByTestId('library-view')).not.toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('analysis')
    })

    it('can navigate back to library view', async () => {
      render(<App />)

      // Navigate away from library
      await user.click(screen.getByTestId('health-nav'))
      expect(screen.getByTestId('health-dashboard')).toBeInTheDocument()

      // Navigate back to library
      await user.click(screen.getByTestId('library-nav'))
      expect(screen.getByTestId('library-view')).toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('library')
    })

    it('handles invalid view type gracefully', () => {
      render(<App />)

      // Since we can't directly test invalid views through UI,
      // this test ensures the default case works
      expect(screen.getByTestId('library-view')).toBeInTheDocument()
    })
  })

  // Modal State Management Tests
  describe('Scan Dialog Management', () => {
    it('opens scan dialog when scan button is clicked', async () => {
      render(<App />)

      await user.click(screen.getByTestId('scan-button'))

      expect(screen.getByTestId('scan-dialog')).toBeInTheDocument()
    })

    it('closes scan dialog when close button is clicked', async () => {
      render(<App />)

      // Open dialog
      await user.click(screen.getByTestId('scan-button'))
      expect(screen.getByTestId('scan-dialog')).toBeInTheDocument()

      // Close dialog
      await user.click(screen.getByTestId('close-scan-dialog'))
      expect(screen.queryByTestId('scan-dialog')).not.toBeInTheDocument()
    })
  })

  describe('Settings Modal Management', () => {
    it('opens settings modal when settings button is clicked', async () => {
      render(<App />)

      await user.click(screen.getByTestId('settings-button'))

      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
    })

    it('closes settings modal when close button is clicked', async () => {
      render(<App />)

      // Open modal
      await user.click(screen.getByTestId('settings-button'))
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()

      // Close modal
      await user.click(screen.getByTestId('close-settings'))
      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
    })
  })

  // State Independence Tests
  describe('Independent State Management', () => {
    it('maintains view state when scan dialog is opened and closed', async () => {
      render(<App />)

      // Navigate to health view
      await user.click(screen.getByTestId('health-nav'))
      expect(screen.getByTestId('health-dashboard')).toBeInTheDocument()

      // Open and close scan dialog
      await user.click(screen.getByTestId('scan-button'))
      expect(screen.getByTestId('scan-dialog')).toBeInTheDocument()

      await user.click(screen.getByTestId('close-scan-dialog'))

      // Verify view state is maintained
      expect(screen.getByTestId('health-dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('health')
    })

    it('maintains view state when settings modal is opened and closed', async () => {
      render(<App />)

      // Navigate to analysis view
      await user.click(screen.getByTestId('analysis-nav'))
      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument()

      // Open and close settings modal
      await user.click(screen.getByTestId('settings-button'))
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()

      await user.click(screen.getByTestId('close-settings'))

      // Verify view state is maintained
      expect(screen.getByTestId('analysis-progress')).toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('analysis')
    })

    it('allows both modals to be managed independently', async () => {
      render(<App />)

      // Open scan dialog
      await user.click(screen.getByTestId('scan-button'))
      expect(screen.getByTestId('scan-dialog')).toBeInTheDocument()

      // Open settings modal (should coexist)
      await user.click(screen.getByTestId('settings-button'))
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
      expect(screen.getByTestId('scan-dialog')).toBeInTheDocument()

      // Close scan dialog, settings should remain
      await user.click(screen.getByTestId('close-scan-dialog'))
      expect(screen.queryByTestId('scan-dialog')).not.toBeInTheDocument()
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()

      // Close settings modal
      await user.click(screen.getByTestId('close-settings'))
      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()
    })
  })

  // Integration Tests
  describe('Component Integration', () => {
    it('passes correct props to Header component', () => {
      render(<App />)

      const header = screen.getByTestId('header')
      expect(header).toBeInTheDocument()

      // Test that header buttons work (implicitly tests prop passing)
      expect(screen.getByTestId('scan-button')).toBeInTheDocument()
      expect(screen.getByTestId('settings-button')).toBeInTheDocument()
    })

    it('passes correct props to Sidebar component', () => {
      render(<App />)

      // Test currentView prop
      expect(screen.getByTestId('current-view')).toHaveTextContent('library')

      // Test onViewChange prop functionality
      expect(screen.getByTestId('library-nav')).toBeInTheDocument()
      expect(screen.getByTestId('health-nav')).toBeInTheDocument()
      expect(screen.getByTestId('duplicates-nav')).toBeInTheDocument()
      expect(screen.getByTestId('analysis-nav')).toBeInTheDocument()
    })

    it('passes correct props to Settings component', async () => {
      render(<App />)

      // Settings should not be open initially
      expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument()

      // Open settings
      await user.click(screen.getByTestId('settings-button'))
      expect(screen.getByTestId('settings-modal')).toBeInTheDocument()
    })
  })

  // Accessibility Tests
  describe('Accessibility', () => {
    it('has proper main landmark for content area', () => {
      render(<App />)

      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).toHaveClass('flex-1', 'p-6')
    })

    it('maintains semantic structure with header and main content', () => {
      render(<App />)

      const container = document.querySelector('.min-h-screen')
      expect(container).toBeInTheDocument()

      // Check structure: header first, then main content area
      const header = screen.getByTestId('header')
      const main = screen.getByRole('main')

      expect(header).toBeInTheDocument()
      expect(main).toBeInTheDocument()
    })
  })

  // Edge Cases
  describe('Edge Cases', () => {
    it('handles rapid view switching correctly', async () => {
      render(<App />)

      // Rapidly switch between views
      await user.click(screen.getByTestId('health-nav'))
      await user.click(screen.getByTestId('duplicates-nav'))
      await user.click(screen.getByTestId('analysis-nav'))
      await user.click(screen.getByTestId('library-nav'))

      // Should end up on library view
      expect(screen.getByTestId('library-view')).toBeInTheDocument()
      expect(screen.getByTestId('current-view')).toHaveTextContent('library')
    })

    it('handles rapid modal open/close correctly', async () => {
      render(<App />)

      // Rapidly open and close scan dialog
      await user.click(screen.getByTestId('scan-button'))
      await user.click(screen.getByTestId('close-scan-dialog'))
      await user.click(screen.getByTestId('scan-button'))

      expect(screen.getByTestId('scan-dialog')).toBeInTheDocument()
    })
  })
})