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
  getAllTracks: () => ipcRenderer.invoke('get-all-tracks'),
  engineAnalyze: (trackIds: string[]) => ipcRenderer.invoke('engine-analyze', trackIds),
  engineExport: (options: any) => ipcRenderer.invoke('engine-export', options),
  exportTracks: (trackIds: string[], options: any) => ipcRenderer.invoke('export-tracks', trackIds, options),
  deleteTracks: (trackIds: string[], deleteFiles: boolean) => ipcRenderer.invoke('engine-delete-tracks', trackIds, deleteFiles),
  getDuplicateGroups: () => ipcRenderer.invoke('get-duplicate-groups'),
  scanForDuplicates: () => ipcRenderer.invoke('scan-for-duplicates'),
  saveAnalysisSettings: (settings: any) => ipcRenderer.invoke('save-analysis-settings', settings),
  detectDJSoftware: () => ipcRenderer.invoke('detect-dj-software'),

  // Additional API methods for UI components
  getAnalysisJobs: () => ipcRenderer.invoke('get-analysis-jobs'),
  getLibraryHealth: () => ipcRenderer.invoke('get-library-health'),
  scanLibraryHealth: () => ipcRenderer.invoke('scan-library-health'),

  // STEM Separation operations
  stemCheckDependencies: () => ipcRenderer.invoke('stem-check-dependencies'),
  stemStartSeparation: (trackId: string, settings: any) => ipcRenderer.invoke('stem-start-separation', trackId, settings),
  stemGetStatus: (separationId: string) => ipcRenderer.invoke('stem-get-status', separationId),
  stemGetByTrack: (trackId: string) => ipcRenderer.invoke('stem-get-by-track', trackId),
  stemGetAll: () => ipcRenderer.invoke('stem-get-all'),
  stemCancel: (separationId: string) => ipcRenderer.invoke('stem-cancel', separationId),
  stemDelete: (separationId: string) => ipcRenderer.invoke('stem-delete', separationId),
  stemGetModels: () => ipcRenderer.invoke('stem-get-models'),
  stemGetDefaultSettings: () => ipcRenderer.invoke('stem-get-default-settings'),
  stemEstimateTime: (trackId: string, model: string) => ipcRenderer.invoke('stem-estimate-time', trackId, model),

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
  getAllTracks: () => Promise<any[]>
  engineAnalyze: (trackIds: string[]) => Promise<{ success: boolean; analyzed: number }>
  engineExport: (options: any) => Promise<{ success: boolean; path: string }>
  exportTracks: (trackIds: string[], options: any) => Promise<{ success: boolean; path: string }>
  deleteTracks: (trackIds: string[], deleteFiles: boolean) => Promise<{ success: boolean; result?: { removedFromLibrary: number; deletedFiles: number; errors: Array<{ trackId: string; error: string }> }; error?: string }>
  getDuplicateGroups: () => Promise<any[]>
  scanForDuplicates: () => Promise<{ success: boolean }>
  saveAnalysisSettings: (settings: any) => Promise<{ success: boolean }>
  detectDJSoftware: () => Promise<{ success: boolean; software: string[] }>

  // STEM Separation API
  stemCheckDependencies: () => Promise<{ success: boolean; available: boolean; missingDeps: string[] }>
  stemStartSeparation: (trackId: string, settings: any) => Promise<{ success: boolean; separationId: string }>
  stemGetStatus: (separationId: string) => Promise<{ success: boolean; status: any }>
  stemGetByTrack: (trackId: string) => Promise<{ success: boolean; result: any }>
  stemGetAll: () => Promise<{ success: boolean; separations: any[] }>
  stemCancel: (separationId: string) => Promise<{ success: boolean; cancelled: boolean }>
  stemDelete: (separationId: string) => Promise<{ success: boolean; deleted: boolean }>
  stemGetModels: () => Promise<{ success: boolean; models: string[] }>
  stemGetDefaultSettings: () => Promise<{ success: boolean; settings: any }>
  stemEstimateTime: (trackId: string, model: string) => Promise<{ success: boolean; estimatedTime: number }>

  onScanLibrary: (callback: (folderPath: string) => void) => void
  onExportPlaylist: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}