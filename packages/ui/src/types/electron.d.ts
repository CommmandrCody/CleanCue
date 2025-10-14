export interface ElectronAPI {
  selectFolder: () => Promise<string>
  saveFile: (options: {
    title: string
    defaultPath: string
    filters: Array<{ name: string; extensions: string[] }>
  }) => Promise<string>
  openExternal: (url: string) => Promise<void>
  showItemInFolder: (fullPath: string) => Promise<void>

  // Engine operations
  engineScan: (folderPath: string, options?: any) => Promise<{ success: boolean; tracksFound: number; tracksAdded?: number; tracksUpdated?: number; errors?: string[]; error?: string }>
  engineGetTracks: () => Promise<{ success: boolean; tracks: any[]; error?: string }>
  engineClearLibrary: () => Promise<{ success: boolean; removedCount?: number; message?: string; error?: string }>
  getAllTracks: () => Promise<any[]>
  engineAnalyze: (trackIds: string[]) => Promise<{ success: boolean; analyzed: number }>
  engineExport: (options: any) => Promise<{ success: boolean; path: string }>
  exportTracks: (trackIds: string[], options: any) => Promise<{ success: boolean; path: string }>
  deleteTracks: (trackIds: string[], deleteFiles: boolean) => Promise<{ success: boolean; result?: { removedFromLibrary: number; deletedFiles: number; errors: Array<{ trackId: string; error: string }> }; error?: string }>

  // Duplicate detection
  getDuplicateGroups: () => Promise<any[]>
  scanForDuplicates: () => Promise<any[]>

  // Analysis settings
  saveAnalysisSettings: (settings: any) => Promise<{ success: boolean }>
  detectDJSoftware: () => Promise<{ success: boolean; software: string[]; serato?: any; traktor?: any; rekordbox?: any }>

  // Additional API methods for UI components
  getAnalysisJobs: () => Promise<{ success: boolean; jobs: any[] }>
  getLibraryHealth: () => Promise<{ success: boolean; issues: any[] }>
  scanLibraryHealth: () => Promise<{ success: boolean; issues: any[] }>
  saveSettings: (settings: any) => Promise<{ success: boolean; error?: string }>
  fixHealthIssue: (issueId: string) => Promise<{ success: boolean; message: string }>

  // Key notation settings
  setKeyNotation: (notation: 'sharp' | 'flat') => Promise<{ success: boolean; error?: string }>
  getKeyNotation: () => Promise<{ success: boolean; notation?: 'sharp' | 'flat'; error?: string }>

  // Library Import operations
  importLibrarySource: (options: {
    sourcePath: string
    mode: 'copy' | 'link'
    organization: 'artist-album' | 'genre-artist' | 'flat' | 'preserve'
    libraryPath: string
    handleDuplicates: 'skip' | 'replace' | 'rename'
    copyFormat: 'original' | 'mp3-320' | 'flac'
    createBackup: boolean
  }) => Promise<{ success: boolean; importedCount: number; skippedCount: number; error?: string }>

  // STEM Separation operations
  stemCheckDependencies: () => Promise<{ success: boolean; available: boolean; missingDeps: string[] }>
  stemStartSeparation: (trackId: string, settings: any) => Promise<{ success: boolean; separationId: string; error?: string }>
  stemGetStatus: (separationId: string) => Promise<{ success: boolean; status: any }>
  stemGetByTrack: (trackId: string) => Promise<{ success: boolean; result: any }>
  stemGetAll: () => Promise<{ success: boolean; separations: any[] }>
  stemCancel: (separationId: string) => Promise<{ success: boolean; cancelled: boolean }>
  stemDelete: (separationId: string) => Promise<{ success: boolean; deleted: boolean; error?: string }>
  stemGetModels: () => Promise<{ success: boolean; models: string[] }>
  stemGetDefaultSettings: () => Promise<{ success: boolean; settings: any; error?: string }>
  stemEstimateTime: (trackId: string, model: string) => Promise<{ success: boolean; estimatedTime: number }>


  // Logging
  appendLog: (filename: string, content: string) => Promise<{ success: boolean; path?: string; error?: string }>

  // Event listeners
  onScanLibrary: (callback: (folderPath: string) => void) => void
  onExportPlaylist: (callback: () => void) => void
  on: (channel: string, listener: (...args: any[]) => void) => void
  removeListener: (channel: string, listener: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}