// ElectronAPI type definitions for UI package
declare global {
  interface Window {
    electronAPI: {
      // File system operations
      selectFolder: () => Promise<string>
      saveFile: (options: {
        title: string
        defaultPath: string
        filters: Electron.FileFilter[]
      }) => Promise<string>
      openExternal: (url: string) => Promise<void>
      showItemInFolder: (fullPath: string) => Promise<void>

      // Engine operations
      engineScan: (folderPath: string, options?: any) => Promise<{ success: boolean; tracksFound: number; tracksAdded?: number; tracksUpdated?: number; errors?: string[]; error?: string }>
      engineGetTracks: () => Promise<{ success: boolean; tracks: any[] }>
      engineClearLibrary: () => Promise<{ success: boolean }>
      getAllTracks: () => Promise<any[]>
      engineAnalyze: (trackIds: string[]) => Promise<{ success: boolean; analyzed: number }>
      engineExport: (options: any) => Promise<{ success: boolean; path: string }>
      exportTracks: (trackIds: string[], options: any) => Promise<{ success: boolean; path: string }>
      deleteTracks: (trackIds: string[], deleteFiles: boolean) => Promise<{ success: boolean; result?: { removedFromLibrary: number; deletedFiles: number; errors: Array<{ trackId: string; error: string }> }; error?: string }>
      getDuplicateGroups: () => Promise<any[]>
      scanForDuplicates: () => Promise<{ success: boolean }>
      saveAnalysisSettings: (settings: any) => Promise<{ success: boolean }>
      detectDJSoftware: () => Promise<{ success: boolean; software: string[]; serato?: any; traktor?: any; rekordbox?: any }>
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

      // Legacy analysis jobs
      getAnalysisJobs: () => Promise<{ success: boolean; jobs: any[] }>
      getLibraryHealth: () => Promise<any[]>
      scanLibraryHealth: () => Promise<{ success: boolean }>

      // Background Job Management API
      getAllJobs: () => Promise<any[]>
      getActiveJobs: () => Promise<any[]>
      getQueuedJobs: () => Promise<any[]>
      getJobById: (jobId: string) => Promise<any | null>
      cancelJob: (jobId: string) => Promise<boolean>
      retryJob: (jobId: string) => Promise<boolean>
      abortAllJobs: () => Promise<void>
      createScanJob: (paths: string[], extensions?: string[], userInitiated?: boolean) => Promise<string>
      createAnalysisJobs: (trackIds: string[], analysisTypes?: string[], userInitiated?: boolean) => Promise<string>

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

      // Event listeners
      onScanLibrary: (callback: (folderPath: string) => void) => void
      onExportPlaylist: (callback: () => void) => void
      on: (channel: string, listener: (...args: any[]) => void) => void
      removeListener: (channel: string, listener: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

export {}