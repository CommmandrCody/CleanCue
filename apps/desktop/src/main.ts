import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

class CleanCueApp {
  private mainWindow: BrowserWindow | null = null
  private isDev = process.argv.includes('--dev')
  private engine: any = null

  constructor() {
    this.setupApp()
  }

  private async initializeEngine() {
    if (!this.engine) {
      console.log('Initializing real CleanCue engine...')
      try {
        // Import CleanCue engine using CommonJS require
        const { CleanCueEngine } = require('@cleancue/engine')

        // Initialize with configuration - it will create default config automatically
        this.engine = new CleanCueEngine()

        // Update workers path to point to the correct Python workers location
        const workersPath = path.resolve(__dirname, '../../packages/workers')
        this.engine.updateConfig({
          workers: {
            pythonPath: 'python3',
            workersPath: workersPath
          }
        })

        console.log('CleanCue engine initialized successfully')
      } catch (error) {
        console.error('Failed to initialize CleanCue engine:', error)
        throw error
      }
    }
  }

  private setupApp() {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(() => {
      this.createMainWindow()
      this.setupMenu()
      this.setupIPC()


      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow()
        }
      })
    })

    // Quit when all windows are closed, except on macOS
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit()
      }
    })

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
      })
    })
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      show: false // Don't show until ready
    })

    // Load the app
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:3000')
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'ui/index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
    })

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })
  }

  private setupMenu() {
    const isMac = process.platform === 'darwin'

    const template: Electron.MenuItemConstructorOptions[] = [
      ...(isMac ? [{
        label: app.getName(),
        submenu: [
          { role: 'about' as const },
          { type: 'separator' as const },
          { role: 'services' as const },
          { type: 'separator' as const },
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const }
        ]
      }] : []),
      {
        label: 'File',
        submenu: [
          {
            label: 'Scan Library...',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.handleScanLibrary()
          },
          { type: 'separator' },
          {
            label: 'Export Playlist...',
            accelerator: 'CmdOrCtrl+E',
            click: () => this.handleExportPlaylist()
          },
          { type: 'separator' },
          ...(isMac ? [] : [{ role: 'quit' as const }])
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' as const },
          { role: 'redo' as const },
          { type: 'separator' as const },
          { role: 'cut' as const },
          { role: 'copy' as const },
          { role: 'paste' as const },
          ...(isMac ? [
            { role: 'pasteAndMatchStyle' as const },
            { role: 'delete' as const },
            { role: 'selectAll' as const },
            { type: 'separator' as const },
            {
              label: 'Speech',
              submenu: [
                { role: 'startSpeaking' as const },
                { role: 'stopSpeaking' as const }
              ]
            }
          ] : [
            { role: 'delete' as const },
            { type: 'separator' as const },
            { role: 'selectAll' as const }
          ])
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' as const },
          { role: 'forceReload' as const },
          { role: 'toggleDevTools' as const },
          { type: 'separator' as const },
          { role: 'resetZoom' as const },
          { role: 'zoomIn' as const },
          { role: 'zoomOut' as const },
          { type: 'separator' as const },
          { role: 'togglefullscreen' as const }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' as const },
          { role: 'close' as const },
          ...(isMac ? [
            { type: 'separator' as const },
            { role: 'front' as const },
            { type: 'separator' as const },
            { role: 'window' as const }
          ] : [])
        ]
      },
      {
        role: 'help',
        submenu: [
          {
            label: 'About CleanCue',
            click: () => this.showAbout()
          },
          {
            label: 'Learn More',
            click: async () => {
              await shell.openExternal('https://github.com/CommmandrCody/CleanCue')
            }
          }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  private setupIPC() {
    // Handle folder selection
    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory'],
        title: 'Select Music Library Folder'
      })
      return result.filePaths[0]
    })

    // Handle file save dialog
    ipcMain.handle('save-file', async (_, options: {
      title: string
      defaultPath: string
      filters: Electron.FileFilter[]
    }) => {
      const result = await dialog.showSaveDialog(this.mainWindow!, options)
      return result.filePath
    })

    // Handle opening external links
    ipcMain.handle('open-external', async (_, url: string) => {
      await shell.openExternal(url)
    })

    // Handle showing item in folder
    ipcMain.handle('show-item-in-folder', async (_, fullPath: string) => {
      shell.showItemInFolder(fullPath)
    })

    // Handle engine operations (scan, analyze, export)
    ipcMain.handle('engine-scan', async (_, folderPath: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }
        const result = await this.engine.scanLibrary([folderPath])
        return {
          success: true,
          tracksFound: result.tracksScanned,
          tracksAdded: result.tracksAdded,
          tracksUpdated: result.tracksUpdated,
          errors: result.errors
        }
      } catch (error) {
        console.error('Scan failed:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('engine-get-tracks', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }
        const tracks = this.engine.getAllTracks()
        return { success: true, tracks }
      } catch (error) {
        console.error('Failed to get tracks:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('engine-clear-library', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // Get all tracks and delete them
        const tracks = this.engine.getAllTracks()
        const trackIds = tracks.map((track: any) => track.id)

        if (trackIds.length > 0) {
          await this.engine.deleteTracks(trackIds, false) // Don't delete files, just remove from library
        }

        return { success: true, removedCount: trackIds.length }
      } catch (error) {
        console.error('Failed to clear library:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('engine-analyze', async (_, trackIds: string[]) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // Analyze specific tracks with BPM and key detection
        let analyzed = 0
        for (const trackId of trackIds) {
          try {
            await this.engine.analyzeTrack(trackId, ['tempo', 'key', 'energy'])
            analyzed++
          } catch (error) {
            console.warn(`Failed to analyze track ${trackId}:`, error)
          }
        }

        return { success: true, analyzed }
      } catch (error) {
        console.error('Analysis failed:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('engine-export', async (_, options: any) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // Create export format object
        const format = {
          name: options.format || 'm3u',
          extension: options.format === 'serato' ? '.m3u' : '.m3u'
        }

        await this.engine.exportLibrary(format, {
          outputPath: options.outputPath,
          relativePaths: options.relativePaths || false,
          includeCues: options.includeCues || false
        })

        return { success: true, path: options.outputPath }
      } catch (error) {
        console.error('Export failed:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('engine-delete-tracks', async (_, trackIds: string[], deleteFiles: boolean = false) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.deleteTracks(trackIds, deleteFiles)
        return {
          success: true,
          result: {
            removedFromLibrary: result.removedFromLibrary,
            deletedFiles: result.deletedFiles,
            errors: result.errors
          }
        }
      } catch (error) {
        console.error('Delete tracks failed:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // STEM Separation IPC handlers
    ipcMain.handle('stem-check-dependencies', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.checkStemSeparationDependencies()
        return { success: true, ...result }
      } catch (error) {
        console.error('Failed to check STEM dependencies:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-start-separation', async (_, trackId: string, settings: any) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const separationId = await this.engine.startStemSeparation(trackId, settings)
        return { success: true, separationId }
      } catch (error) {
        console.error('Failed to start STEM separation:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-get-status', async (_, separationId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const status = await this.engine.getStemSeparationStatus(separationId)
        return { success: true, status }
      } catch (error) {
        console.error('Failed to get STEM status:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-get-by-track', async (_, trackId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.getStemSeparationByTrackId(trackId)
        return { success: true, result }
      } catch (error) {
        console.error('Failed to get STEM by track:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-get-all', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const separations = await this.engine.getAllStemSeparations()
        return { success: true, separations }
      } catch (error) {
        console.error('Failed to get all STEM separations:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-cancel', async (_, separationId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.cancelStemSeparation(separationId)
        return { success: true, cancelled: result }
      } catch (error) {
        console.error('Failed to cancel STEM separation:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-delete', async (_, separationId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.deleteStemSeparation(separationId)
        return { success: true, deleted: result }
      } catch (error) {
        console.error('Failed to delete STEM separation:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-get-models', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const models = await this.engine.getAvailableStemModels()
        return { success: true, models }
      } catch (error) {
        console.error('Failed to get STEM models:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-get-default-settings', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const settings = this.engine.getStemSeparationDefaultSettings()
        return { success: true, settings }
      } catch (error) {
        console.error('Failed to get default STEM settings:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('stem-estimate-time', async (_, trackId: string, model: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const estimatedTime = await this.engine.estimateStemProcessingTime(trackId, model)
        return { success: true, estimatedTime }
      } catch (error) {
        console.error('Failed to estimate STEM processing time:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Additional API handlers for UI components
    ipcMain.handle('get-analysis-jobs', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // For now return empty array, implement actual analysis job tracking later
        return { success: true, jobs: [] }
      } catch (error) {
        console.error('Failed to get analysis jobs:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('get-library-health', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // For now return empty array, implement actual health checking later
        return { success: true, issues: [] }
      } catch (error) {
        console.error('Failed to get library health:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('scan-library-health', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // For now return empty array, implement actual health scanning later
        return { success: true, issues: [] }
      } catch (error) {
        console.error('Failed to scan library health:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('get-all-tracks', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const tracks = this.engine.getAllTracks()
        return tracks
      } catch (error) {
        console.error('Failed to get all tracks:', error)
        return []
      }
    })

    ipcMain.handle('export-tracks', async (_, trackIds: string[], options: any) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.exportToUSB(trackIds, options)
        return { success: true, path: result.outputPath }
      } catch (error) {
        console.error('Failed to export tracks:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('get-duplicate-groups', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // TODO: Implement duplicate detection
        return []
      } catch (error) {
        console.error('Failed to get duplicate groups:', error)
        return []
      }
    })

    ipcMain.handle('scan-for-duplicates', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // TODO: Implement duplicate scanning
        return []
      } catch (error) {
        console.error('Failed to scan for duplicates:', error)
        return []
      }
    })

    ipcMain.handle('save-analysis-settings', async (_, settings: any) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // Save analysis settings to config
        return { success: true }
      } catch (error) {
        console.error('Failed to save analysis settings:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('detect-dj-software', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // Implement DJ software detection later
        return { success: true, software: [] }
      } catch (error) {
        console.error('Failed to detect DJ software:', error)
        return { success: false, error: (error as Error).message }
      }
    })
  }


  private async handleScanLibrary() {
    const folderPath = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Music Library Folder'
    })

    if (!folderPath.canceled && folderPath.filePaths.length > 0) {
      this.mainWindow?.webContents.send('scan-library', folderPath.filePaths[0])
    }
  }

  private async handleExportPlaylist() {
    this.mainWindow?.webContents.send('export-playlist')
  }

  private showAbout() {
    dialog.showMessageBox(this.mainWindow!, {
      type: 'info',
      title: 'About CleanCue',
      message: 'CleanCue',
      detail: `Version: ${app.getVersion()}\\n\\nOpen-source DJ library management toolkit.\\nBuilt with Electron and React.`
    })
  }
}

// Initialize the app
new CleanCueApp()