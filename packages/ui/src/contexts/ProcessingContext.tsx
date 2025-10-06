import { createContext, useContext, useState, ReactNode } from 'react'

export type ProcessingScreen = 'analysis' | 'filename' | 'stems' | 'metadata'

interface ProcessingState {
  trackId: string
  screen: ProcessingScreen
  startedAt: number
}

interface ProcessingContextType {
  // Check if a track is being processed
  isProcessing: (trackId: string) => boolean

  // Check if a track is being processed in a specific screen
  isProcessingIn: (trackId: string, screen: ProcessingScreen) => boolean

  // Get the screen where a track is being processed
  getProcessingScreen: (trackId: string) => ProcessingScreen | null

  // Register tracks as being processed
  registerProcessing: (trackIds: string[], screen: ProcessingScreen) => { allowed: string[], blocked: string[] }

  // Unregister tracks when processing completes
  unregisterProcessing: (trackIds: string[], screen: ProcessingScreen) => void

  // Get all processing state
  getAllProcessing: () => Map<string, ProcessingState>

  // Clear all processing for a specific screen
  clearScreen: (screen: ProcessingScreen) => void
}

const ProcessingContext = createContext<ProcessingContextType | undefined>(undefined)

export function ProcessingProvider({ children }: { children: ReactNode }) {
  const [processing, setProcessing] = useState<Map<string, ProcessingState>>(new Map())

  const isProcessing = (trackId: string): boolean => {
    return processing.has(trackId)
  }

  const isProcessingIn = (trackId: string, screen: ProcessingScreen): boolean => {
    const state = processing.get(trackId)
    return state?.screen === screen
  }

  const getProcessingScreen = (trackId: string): ProcessingScreen | null => {
    return processing.get(trackId)?.screen || null
  }

  const registerProcessing = (trackIds: string[], screen: ProcessingScreen) => {
    const allowed: string[] = []
    const blocked: string[] = []

    trackIds.forEach(trackId => {
      if (processing.has(trackId)) {
        blocked.push(trackId)
      } else {
        allowed.push(trackId)
      }
    })

    if (allowed.length > 0) {
      setProcessing(prev => {
        const next = new Map(prev)
        allowed.forEach(trackId => {
          next.set(trackId, { trackId, screen, startedAt: Date.now() })
        })
        return next
      })
    }

    return { allowed, blocked }
  }

  const unregisterProcessing = (trackIds: string[], screen: ProcessingScreen) => {
    setProcessing(prev => {
      const next = new Map(prev)
      trackIds.forEach(trackId => {
        const state = next.get(trackId)
        // Only remove if it's being processed in the specified screen
        if (state?.screen === screen) {
          next.delete(trackId)
        }
      })
      return next
    })
  }

  const getAllProcessing = () => {
    return new Map(processing)
  }

  const clearScreen = (screen: ProcessingScreen) => {
    setProcessing(prev => {
      const next = new Map(prev)
      for (const [trackId, state] of next.entries()) {
        if (state.screen === screen) {
          next.delete(trackId)
        }
      }
      return next
    })
  }

  return (
    <ProcessingContext.Provider
      value={{
        isProcessing,
        isProcessingIn,
        getProcessingScreen,
        registerProcessing,
        unregisterProcessing,
        getAllProcessing,
        clearScreen,
      }}
    >
      {children}
    </ProcessingContext.Provider>
  )
}

export function useProcessing() {
  const context = useContext(ProcessingContext)
  if (!context) {
    throw new Error('useProcessing must be used within ProcessingProvider')
  }
  return context
}
