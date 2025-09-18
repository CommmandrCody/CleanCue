import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  saveFile: (options: {
    title: string
    defaultPath: string
    filters: Electron.FileFilter[]
  }) => ipcRenderer.invoke('save-file', options),

  // External operations
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (fullPath: string) => ipcRenderer.invoke('show-item-in-folder', fullPath),

  // Engine operations
  engineScan: (folderPath: string) => ipcRenderer.invoke('engine-scan', folderPath),
  engineGetTracks: () => ipcRenderer.invoke('engine-get-tracks'),
  engineAnalyze: (trackIds: string[]) => ipcRenderer.invoke('engine-analyze', trackIds),
  engineExport: (options: any) => ipcRenderer.invoke('engine-export', options),
  deleteTracks: (trackIds: string[], deleteFiles: boolean) => ipcRenderer.invoke('engine-delete-tracks', trackIds, deleteFiles),

  // Event listeners
  onScanLibrary: (callback: (folderPath: string) => void) => {
    ipcRenderer.on('scan-library', (_, folderPath) => callback(folderPath))
  },
  onExportPlaylist: (callback: () => void) => {
    ipcRenderer.on('export-playlist', () => callback())
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// Define the API type for TypeScript
export interface ElectronAPI {
  selectFolder: () => Promise<string>
  saveFile: (options: {
    title: string
    defaultPath: string
    filters: Electron.FileFilter[]
  }) => Promise<string>
  openExternal: (url: string) => Promise<void>
  showItemInFolder: (fullPath: string) => Promise<void>
  engineScan: (folderPath: string) => Promise<{ success: boolean; tracksFound: number }>
  engineGetTracks: () => Promise<{ success: boolean; tracks: any[] }>
  engineAnalyze: (trackIds: string[]) => Promise<{ success: boolean; analyzed: number }>
  engineExport: (options: any) => Promise<{ success: boolean; path: string }>
  deleteTracks: (trackIds: string[], deleteFiles: boolean) => Promise<{ success: boolean; result?: { removedFromLibrary: number; deletedFiles: number; errors: Array<{ trackId: string; error: string }> }; error?: string }>
  onScanLibrary: (callback: (folderPath: string) => void) => void
  onExportPlaylist: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}