import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { YouTubeDownloadProvider } from '../contexts/YouTubeDownloadContext'
import { StemSeparationProvider } from '../contexts/StemSeparationContext'
import { setupElectronAPIMock } from './mocks/electronAPI'

// Setup electron API mock globally
setupElectronAPIMock()

// Create a test wrapper with all required providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <YouTubeDownloadProvider>
        <StemSeparationProvider>
          {children}
        </StemSeparationProvider>
      </YouTubeDownloadProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }