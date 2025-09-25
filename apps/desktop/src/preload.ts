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
  engineScan: (folderPath: string, options?: any) => ipcRenderer.invoke('engine-scan', folderPath, options),
  engineGetTracks: () => ipcRenderer.invoke('engine-get-tracks'),
  engineClearLibrary: () => ipcRenderer.invoke('engine-clear-library'),
  getAllTracks: () => ipcRenderer.invoke('get-all-tracks'),
  engineExport: (options: any) => ipcRenderer.invoke('engine-export', options),
  exportTracks: (trackIds: string[], options: any) => ipcRenderer.invoke('export-tracks', trackIds, options),
  deleteTracks: (trackIds: string[], deleteFiles: boolean) => ipcRenderer.invoke('engine-delete-tracks', trackIds, deleteFiles),
  getDuplicateGroups: () => ipcRenderer.invoke('get-duplicate-groups'),
  scanForDuplicates: () => ipcRenderer.invoke('scan-for-duplicates'),
  saveAnalysisSettings: (settings: any) => ipcRenderer.invoke('save-analysis-settings', settings),
  detectDJSoftware: () => ipcRenderer.invoke('detect-dj-software'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  fixHealthIssue: (issueId: string) => ipcRenderer.invoke('fix-health-issue', issueId),

  // Key notation settings
  setKeyNotation: (notation: 'sharp' | 'flat') => ipcRenderer.invoke('set-key-notation', notation),
  getKeyNotation: () => ipcRenderer.invoke('get-key-notation'),
  importLibrarySource: (options: {
    sourcePath: string
    mode: 'copy' | 'link'
    organization: string
    libraryPath?: string
    handleDuplicates: 'skip' | 'replace' | 'rename'
    copyFormat: string
    createBackup: boolean
  }) => ipcRenderer.invoke('import-library-source', options),

  // Additional API methods for UI components
  getAnalysisJobs: () => ipcRenderer.invoke('getAnalysisJobs'),
  getLibraryHealth: () => ipcRenderer.invoke('get-library-health'),
  scanLibraryHealth: () => ipcRenderer.invoke('scan-library-health'),

  // Background Job Management API
  getAllJobs: () => ipcRenderer.invoke('get-all-jobs'),
  getActiveJobs: () => ipcRenderer.invoke('get-active-jobs'),
  getQueuedJobs: () => ipcRenderer.invoke('get-queued-jobs'),
  getJobById: (jobId: string) => ipcRenderer.invoke('get-job-by-id', jobId),
  cancelJob: (jobId: string) => ipcRenderer.invoke('cancel-job', jobId),
  retryJob: (jobId: string) => ipcRenderer.invoke('retry-job', jobId),
  abortAllJobs: () => ipcRenderer.invoke('abort-all-jobs'),
  createScanJob: (paths: string[], extensions?: string[], userInitiated?: boolean) =>
    ipcRenderer.invoke('create-scan-job', paths, extensions, userInitiated),
  createAnalysisJobs: (trackIds: string[]) =>
    ipcRenderer.invoke('createAnalysisJobs', trackIds),

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

  // YouTube downloader operations
  youtubeCheckDependencies: () => ipcRenderer.invoke('youtube-check-dependencies'),
  youtubeGetVideoInfo: (url: string) => ipcRenderer.invoke('youtube-get-video-info', url),
  youtubeSearchVideos: (query: string, maxResults?: number) => ipcRenderer.invoke('youtube-search-videos', query, maxResults),
  youtubeDownloadAudio: (url: string, options?: any) => ipcRenderer.invoke('youtube-download-audio', url, options),
  youtubeDownloadBatch: (items: any[], globalOptions?: any) => ipcRenderer.invoke('youtube-download-batch', items, globalOptions),

  // Event listeners
  onScanLibrary: (callback: (folderPath: string) => void) => {
    ipcRenderer.on('scan-library', (_, folderPath) => callback(folderPath))
  },
  onExportPlaylist: (callback: () => void) => {
    ipcRenderer.on('export-playlist', () => callback())
  },

  // Event listeners for progress events
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, listener)
  },
  removeListener: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener)
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
  engineScan: (folderPath: string) => Promise<{ success: boolean; tracksFound: number; tracksAdded?: number; tracksUpdated?: number; errors?: string[]; error?: string }>
  engineGetTracks: () => Promise<{ success: boolean; tracks: any[] }>
  getAllTracks: () => Promise<any[]>
  engineExport: (options: any) => Promise<{ success: boolean; path: string }>
  exportTracks: (trackIds: string[], options: any) => Promise<{ success: boolean; path: string }>
  deleteTracks: (trackIds: string[], deleteFiles: boolean) => Promise<{ success: boolean; result?: { removedFromLibrary: number; deletedFiles: number; errors: Array<{ trackId: string; error: string }> }; error?: string }>
  getDuplicateGroups: () => Promise<any[]>
  scanForDuplicates: () => Promise<{ success: boolean }>
  saveAnalysisSettings: (settings: any) => Promise<{ success: boolean }>
  detectDJSoftware: () => Promise<{ success: boolean; software: string[] }>
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>
  fixHealthIssue: (issueId: string) => Promise<{ success: boolean; message: string }>
  importLibrarySource: (options: {
    sourcePath: string
    mode: 'copy' | 'link'
    organization: string
    libraryPath?: string
    handleDuplicates: 'skip' | 'replace' | 'rename'
    copyFormat: string
    createBackup: boolean
  }) => Promise<{ success: boolean; tracksImported?: number; message?: string; error?: string }>

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

  // YouTube downloader API
  youtubeCheckDependencies: () => Promise<{ success: boolean; available?: boolean; error?: string }>
  youtubeGetVideoInfo: (url: string) => Promise<{ success: boolean; videoInfo?: any; error?: string }>
  youtubeSearchVideos: (query: string, maxResults?: number) => Promise<{ success: boolean; results?: any[]; error?: string }>
  youtubeDownloadAudio: (url: string, options?: any) => Promise<{ success: boolean; downloadedFiles?: string[]; outputDir?: string; error?: string }>
  youtubeDownloadBatch: (items: any[], globalOptions?: any) => Promise<{ success: boolean; results?: any[]; error?: string }>

  // Background Job Management API types
  getAllJobs: () => Promise<any[]>
  getActiveJobs: () => Promise<any[]>
  getQueuedJobs: () => Promise<any[]>
  getJobById: (jobId: string) => Promise<any | null>
  cancelJob: (jobId: string) => Promise<boolean>
  retryJob: (jobId: string) => Promise<boolean>
  abortAllJobs: () => Promise<void>
  createScanJob: (paths: string[], extensions?: string[], userInitiated?: boolean) => Promise<string>
  createAnalysisJobs: (trackIds: string[], analysisTypes?: string[], userInitiated?: boolean) => Promise<string>

  onScanLibrary: (callback: (folderPath: string) => void) => void
  onExportPlaylist: (callback: () => void) => void
  on: (channel: string, listener: (...args: any[]) => void) => void
  removeListener: (channel: string, listener: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}