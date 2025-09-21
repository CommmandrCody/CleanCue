import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useElectron } from '../hooks/useElectron'

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  path: string
}

export interface StemSeparationSettings {
  model: 'htdemucs' | 'htdemucs_ft' | 'htdemucs_6s' | 'mdx_extra'
  outputFormat: 'wav' | 'flac' | 'mp3'
  quality: 'low' | 'medium' | 'high'
  segments: number
  overlap: number
  clipMode: 'rescale' | 'clamp'
  mp3Bitrate?: number
  jobs?: number
}

export interface StemSeparationResults {
  vocalsPath?: string
  drumsPath?: string
  bassPath?: string
  otherPath?: string
}

export interface StemSeparationItem {
  id: string
  trackId: string
  track: Track
  settings: StemSeparationSettings
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'
  progress: number
  separationId?: string // Backend service separation ID
  results?: StemSeparationResults
  processingTimeMs?: number
  errorMessage?: string
  logs?: string[]
  addedAt: number
  startedAt?: number
  completedAt?: number
}

interface StemSeparationState {
  items: StemSeparationItem[]
  isProcessing: boolean
  currentItem: string | null
  defaultSettings: StemSeparationSettings
}

type StemSeparationAction =
  | { type: 'ADD_ITEM'; payload: { track: Track; settings: StemSeparationSettings } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<StemSeparationItem> } }
  | { type: 'START_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_CURRENT_ITEM'; payload: string | null }
  | { type: 'UPDATE_DEFAULT_SETTINGS'; payload: Partial<StemSeparationSettings> }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'CANCEL_ITEM'; payload: string }

const defaultSettings: StemSeparationSettings = {
  model: 'htdemucs',
  outputFormat: 'wav',
  quality: 'medium',
  segments: 4,
  overlap: 0.25,
  clipMode: 'rescale',
  jobs: 1
}

const initialState: StemSeparationState = {
  items: [],
  isProcessing: false,
  currentItem: null,
  defaultSettings
}

function stemSeparationReducer(state: StemSeparationState, action: StemSeparationAction): StemSeparationState {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            trackId: action.payload.track.id,
            track: action.payload.track,
            settings: action.payload.settings,
            status: 'pending',
            progress: 0,
            logs: [],
            addedAt: Date.now()
          }
        ]
      }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      }

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        )
      }

    case 'START_PROCESSING':
      return { ...state, isProcessing: true }

    case 'STOP_PROCESSING':
      return { ...state, isProcessing: false, currentItem: null }

    case 'SET_CURRENT_ITEM':
      return { ...state, currentItem: action.payload }

    case 'UPDATE_DEFAULT_SETTINGS':
      return {
        ...state,
        defaultSettings: { ...state.defaultSettings, ...action.payload }
      }

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        items: state.items.filter(item => item.status !== 'completed')
      }

    case 'CANCEL_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload
            ? { ...item, status: 'cancelled' as const }
            : item
        )
      }

    default:
      return state
  }
}

interface StemSeparationContextType {
  state: StemSeparationState
  addSeparation: (track: Track, settings?: Partial<StemSeparationSettings>) => void
  removeSeparation: (id: string) => void
  updateSeparation: (id: string, updates: Partial<StemSeparationItem>) => void
  startProcessing: () => Promise<void>
  stopProcessing: () => void
  cancelSeparation: (id: string) => Promise<void>
  updateDefaultSettings: (settings: Partial<StemSeparationSettings>) => void
  clearCompleted: () => void
  getActiveItems: () => StemSeparationItem[]
  getPendingItems: () => StemSeparationItem[]
  getCompletedItems: () => StemSeparationItem[]
}

const StemSeparationContext = createContext<StemSeparationContextType | null>(null)

interface StemSeparationProviderProps {
  children: ReactNode
}

export function StemSeparationProvider({ children }: StemSeparationProviderProps) {
  const [state, dispatch] = useReducer(stemSeparationReducer, initialState)
  const { api } = useElectron()

  // Listen for backend progress updates
  useEffect(() => {
    if (!api) return

    const handleProgress = (_: any, data: { separationId: string; progress: number }) => {
      const item = state.items.find(item => item.separationId === data.separationId)
      if (item) {
        dispatch({
          type: 'UPDATE_ITEM',
          payload: {
            id: item.id,
            updates: { progress: data.progress }
          }
        })
      }
    }

    const handleCompleted = (_: any, data: {
      separationId: string
      vocalsPath?: string
      drumsPath?: string
      bassPath?: string
      otherPath?: string
      processingTimeMs?: number
    }) => {
      const item = state.items.find(item => item.separationId === data.separationId)
      if (item) {
        dispatch({
          type: 'UPDATE_ITEM',
          payload: {
            id: item.id,
            updates: {
              status: 'completed',
              progress: 100,
              results: {
                vocalsPath: data.vocalsPath,
                drumsPath: data.drumsPath,
                bassPath: data.bassPath,
                otherPath: data.otherPath
              },
              processingTimeMs: data.processingTimeMs,
              completedAt: Date.now()
            }
          }
        })
      }
    }

    const handleFailed = (_: any, data: { separationId: string; error: string }) => {
      const item = state.items.find(item => item.separationId === data.separationId)
      if (item) {
        dispatch({
          type: 'UPDATE_ITEM',
          payload: {
            id: item.id,
            updates: {
              status: 'error',
              errorMessage: data.error,
              completedAt: Date.now()
            }
          }
        })
      }
    }

    api.on('stem:separation:progress', handleProgress)
    api.on('stem:separation:completed', handleCompleted)
    api.on('stem:separation:failed', handleFailed)

    return () => {
      api.removeAllListeners('stem:separation:progress')
      api.removeAllListeners('stem:separation:completed')
      api.removeAllListeners('stem:separation:failed')
    }
  }, [api, state.items])

  // Background processing effect
  useEffect(() => {
    if (!state.isProcessing || !api) return

    const processQueue = async () => {
      const pendingItems = state.items.filter(item => item.status === 'pending')

      if (pendingItems.length === 0) {
        dispatch({ type: 'STOP_PROCESSING' })
        return
      }

      for (const item of pendingItems) {
        if (!state.isProcessing) break // Stop if processing was cancelled

        console.log(`🎵 [STEM QUEUE] Processing item: ${item.track.title} (${item.id})`)

        dispatch({ type: 'SET_CURRENT_ITEM', payload: item.id })
        dispatch({
          type: 'UPDATE_ITEM',
          payload: {
            id: item.id,
            updates: {
              status: 'processing',
              startedAt: Date.now()
            }
          }
        })

        try {
          const response = await api.stemStartSeparation(item.trackId, item.settings)

          if (response.success && response.separationId) {
            console.log(`🎵 [STEM QUEUE] ✅ Started separation: ${response.separationId}`)
            dispatch({
              type: 'UPDATE_ITEM',
              payload: {
                id: item.id,
                updates: { separationId: response.separationId }
              }
            })

            // For queue processing, we don't wait for completion since we want to process items sequentially
            // The backend will handle one separation at a time, and we'll get progress updates via events
          } else {
            console.error(`🎵 [STEM QUEUE] ❌ Failed to start separation: ${response.error}`)
            dispatch({
              type: 'UPDATE_ITEM',
              payload: {
                id: item.id,
                updates: {
                  status: 'error',
                  errorMessage: response.error || 'Failed to start separation',
                  completedAt: Date.now()
                }
              }
            })
          }
        } catch (error) {
          console.error(`🎵 [STEM QUEUE] ❌ Exception during separation:`, error)
          dispatch({
            type: 'UPDATE_ITEM',
            payload: {
              id: item.id,
              updates: {
                status: 'error',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                completedAt: Date.now()
              }
            }
          })
        }
      }

      dispatch({ type: 'STOP_PROCESSING' })
    }

    processQueue()
  }, [state.isProcessing, api])

  const addSeparation = (track: Track, settingsOverride?: Partial<StemSeparationSettings>) => {
    const settings = { ...state.defaultSettings, ...settingsOverride }
    dispatch({ type: 'ADD_ITEM', payload: { track, settings } })
  }

  const removeSeparation = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }

  const updateSeparation = (id: string, updates: Partial<StemSeparationItem>) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } })
  }

  const startProcessing = async () => {
    const pendingItems = state.items.filter(item => item.status === 'pending')
    if (pendingItems.length === 0) {
      return
    }
    console.log(`🎵 [STEM QUEUE] Starting processing for ${pendingItems.length} items`)
    dispatch({ type: 'START_PROCESSING' })
  }

  const stopProcessing = () => {
    console.log('🎵 [STEM QUEUE] Stopping processing')
    dispatch({ type: 'STOP_PROCESSING' })
  }

  const cancelSeparation = async (id: string) => {
    const item = state.items.find(i => i.id === id)
    if (!item) return

    console.log(`🎵 [STEM QUEUE] Cancelling separation: ${id}`)

    if (item.separationId && api) {
      try {
        await api.stemCancel(item.separationId)
      } catch (error) {
        console.error('Failed to cancel separation:', error)
      }
    }

    dispatch({ type: 'CANCEL_ITEM', payload: id })
  }

  const updateDefaultSettings = (settings: Partial<StemSeparationSettings>) => {
    dispatch({ type: 'UPDATE_DEFAULT_SETTINGS', payload: settings })
  }

  const clearCompleted = () => {
    dispatch({ type: 'CLEAR_COMPLETED' })
  }

  const getActiveItems = () => {
    return state.items.filter(item => item.status === 'processing')
  }

  const getPendingItems = () => {
    return state.items.filter(item => item.status === 'pending')
  }

  const getCompletedItems = () => {
    return state.items.filter(item => item.status === 'completed')
  }

  const contextValue: StemSeparationContextType = {
    state,
    addSeparation,
    removeSeparation,
    updateSeparation,
    startProcessing,
    stopProcessing,
    cancelSeparation,
    updateDefaultSettings,
    clearCompleted,
    getActiveItems,
    getPendingItems,
    getCompletedItems
  }

  return (
    <StemSeparationContext.Provider value={contextValue}>
      {children}
    </StemSeparationContext.Provider>
  )
}

export function useStemSeparation() {
  const context = useContext(StemSeparationContext)
  if (!context) {
    throw new Error('useStemSeparation must be used within a StemSeparationProvider')
  }
  return context
}