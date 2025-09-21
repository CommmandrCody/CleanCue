import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useElectron } from '../hooks/useElectron'

export interface YouTubeVideoInfo {
  id: string
  title: string
  uploader: string
  duration?: number
  view_count?: number
  description?: string
  upload_date?: string
  url: string
  playlist?: boolean
  entries?: YouTubeVideoInfo[]
  entry_count?: number
}

export interface YouTubeSearchResult {
  id: string
  title: string
  uploader: string
  duration?: number
  view_count?: number
  url: string
}

interface DownloadProgress {
  percentage?: number
  speed?: string
  eta?: string
}

interface DownloadItem {
  id: string
  url?: string
  query?: string
  title: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress?: DownloadProgress
  outputFiles?: string[]
  error?: string
  videoInfo?: YouTubeVideoInfo
  logs?: string[]
  addedAt: number
}

interface DownloadOptions {
  quality: string
  format: string
  embedMetadata: boolean
  embedThumbnail: boolean
  outputDir: string
  useCookies: boolean
}

interface YouTubeDownloadState {
  items: DownloadItem[]
  isProcessing: boolean
  currentItem: string | null
  options: DownloadOptions
}

type YouTubeDownloadAction =
  | { type: 'ADD_ITEM'; payload: Omit<DownloadItem, 'id' | 'addedAt'> }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<DownloadItem> } }
  | { type: 'START_PROCESSING' }
  | { type: 'STOP_PROCESSING' }
  | { type: 'SET_CURRENT_ITEM'; payload: string | null }
  | { type: 'UPDATE_OPTIONS'; payload: Partial<DownloadOptions> }
  | { type: 'CLEAR_COMPLETED' }

const initialState: YouTubeDownloadState = {
  items: [],
  isProcessing: false,
  currentItem: null,
  options: {
    quality: 'best',
    format: 'mp3',
    embedMetadata: true,
    embedThumbnail: false,
    outputDir: '',
    useCookies: true
  }
}

function youtubeDownloadReducer(state: YouTubeDownloadState, action: YouTubeDownloadAction): YouTubeDownloadState {
  switch (action.type) {
    case 'ADD_ITEM':
      return {
        ...state,
        items: [
          ...state.items,
          {
            ...action.payload,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
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

    case 'UPDATE_OPTIONS':
      return {
        ...state,
        options: { ...state.options, ...action.payload }
      }

    case 'CLEAR_COMPLETED':
      return {
        ...state,
        items: state.items.filter(item => item.status !== 'completed')
      }

    default:
      return state
  }
}

interface YouTubeDownloadContextType {
  state: YouTubeDownloadState
  addDownload: (item: Omit<DownloadItem, 'id' | 'addedAt'>) => void
  removeDownload: (id: string) => void
  updateDownload: (id: string, updates: Partial<DownloadItem>) => void
  startProcessing: () => Promise<void>
  stopProcessing: () => void
  updateOptions: (options: Partial<DownloadOptions>) => void
  clearCompleted: () => void
  getActiveDownloads: () => DownloadItem[]
  getPendingDownloads: () => DownloadItem[]
}

const YouTubeDownloadContext = createContext<YouTubeDownloadContextType | null>(null)

interface YouTubeDownloadProviderProps {
  children: ReactNode
}

export function YouTubeDownloadProvider({ children }: YouTubeDownloadProviderProps) {
  const [state, dispatch] = useReducer(youtubeDownloadReducer, initialState)
  const { api } = useElectron()

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

        dispatch({ type: 'SET_CURRENT_ITEM', payload: item.id })
        dispatch({ type: 'UPDATE_ITEM', payload: { id: item.id, updates: { status: 'downloading' } } })

        try {
          const downloadResult = await api.youtubeDownloadAudio(
            item.url || item.query || '',
            state.options
          )

          dispatch({
            type: 'UPDATE_ITEM',
            payload: {
              id: item.id,
              updates: {
                status: downloadResult.success ? 'completed' : 'error',
                outputFiles: downloadResult.downloadedFiles,
                error: downloadResult.error
              }
            }
          })
        } catch (error) {
          dispatch({
            type: 'UPDATE_ITEM',
            payload: {
              id: item.id,
              updates: {
                status: 'error',
                error: `Download failed: ${error}`
              }
            }
          })
        }
      }

      dispatch({ type: 'STOP_PROCESSING' })
    }

    processQueue()
  }, [state.isProcessing, api])

  const addDownload = (item: Omit<DownloadItem, 'id' | 'addedAt'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item })
  }

  const removeDownload = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }

  const updateDownload = (id: string, updates: Partial<DownloadItem>) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates } })
  }

  const startProcessing = async () => {
    if (state.items.filter(item => item.status === 'pending').length === 0) {
      return
    }
    dispatch({ type: 'START_PROCESSING' })
  }

  const stopProcessing = () => {
    dispatch({ type: 'STOP_PROCESSING' })
  }

  const updateOptions = (options: Partial<DownloadOptions>) => {
    dispatch({ type: 'UPDATE_OPTIONS', payload: options })
  }

  const clearCompleted = () => {
    dispatch({ type: 'CLEAR_COMPLETED' })
  }

  const getActiveDownloads = () => {
    return state.items.filter(item => item.status === 'downloading')
  }

  const getPendingDownloads = () => {
    return state.items.filter(item => item.status === 'pending')
  }

  const contextValue: YouTubeDownloadContextType = {
    state,
    addDownload,
    removeDownload,
    updateDownload,
    startProcessing,
    stopProcessing,
    updateOptions,
    clearCompleted,
    getActiveDownloads,
    getPendingDownloads
  }

  return (
    <YouTubeDownloadContext.Provider value={contextValue}>
      {children}
    </YouTubeDownloadContext.Provider>
  )
}

export function useYouTubeDownload() {
  const context = useContext(YouTubeDownloadContext)
  if (!context) {
    throw new Error('useYouTubeDownload must be used within a YouTubeDownloadProvider')
  }
  return context
}