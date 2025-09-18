export interface ElectronAPI {
  selectFolder: () => Promise<string>
  saveFile: (options: {
    title: string
    defaultPath: string
    filters: Array<{ name: string; extensions: string[] }>
  }) => Promise<string>
  openExternal: (url: string) => Promise<void>
  showItemInFolder: (fullPath: string) => Promise<void>
  engineScan: (folderPath: string) => Promise<{ success: boolean; tracksFound: number }>
  engineAnalyze: (trackIds: string[]) => Promise<{ success: boolean; analyzed: number }>
  engineExport: (options: any) => Promise<{ success: boolean; path: string }>
  onScanLibrary: (callback: (folderPath: string) => void) => void
  onExportPlaylist: (callback: () => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}