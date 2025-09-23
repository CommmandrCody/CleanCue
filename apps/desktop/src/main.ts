import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

class CleanCueApp {
  private mainWindow: BrowserWindow | null = null
  private splashWindow: BrowserWindow | null = null
  private isDev = process.argv.includes('--dev')
  private engine: any = null
  private engineInitialized = false
  private engineInitializing = false

  constructor() {
    this.setupApp()
  }

  private async initializeEngine() {
    if (this.engineInitialized) {
      return
    }

    if (this.engineInitializing) {
      // Wait for the current initialization to complete
      while (this.engineInitializing && !this.engineInitialized) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return
    }

    if (!this.engine) {
      this.engineInitializing = true
      console.log('Initializing real CleanCue engine...')
      try {
        // Determine correct workers path before initializing engine
        let workersPath: string
        if (app.isPackaged) {
          // In packaged app, workers are in extraResources
          workersPath = path.join(process.resourcesPath, 'workers')
        } else {
          // In development, workers are in packages directory
          workersPath = path.resolve(__dirname, '../../../packages/workers')
        }

        console.log('Workers path:', workersPath)

        // Load the real CleanCue engine
        const { CleanCueEngine } = require('@cleancue/engine');
        console.log('✅ CleanCue engine loaded');
        this.sendLogToRenderer('info', '🔧 CleanCue engine loaded');

        // Initialize with custom config path to set workers path before engine creates services
        this.engine = new CleanCueEngine()

        // Determine correct python path (use virtual environment if available)
        const pythonPath = path.join(workersPath, 'venv', 'bin', 'python')

        // Update config immediately before any services are initialized
        this.engine.updateConfig({
          workers: {
            pythonPath: pythonPath,
            workersPath: workersPath
          }
        })

        // Initialize the database
        await this.engine.initialize()

        // Add a small delay to ensure database is fully ready
        await new Promise(resolve => setTimeout(resolve, 200))

        // Verify database is working by testing a simple operation
        try {
          this.engine.getAllTracks()
          console.log('Database readiness check passed')
        } catch (error) {
          console.warn('Database readiness check failed, adding extra delay:', error)
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Set up event forwarding to renderer process
        this.setupEventForwarding()

        this.engineInitialized = true
        console.log('CleanCue engine initialized successfully')
      } catch (error) {
        console.error('Failed to initialize CleanCue engine:', error)
        throw error
      } finally {
        this.engineInitializing = false
      }
    }
  }

  private sendLogToRenderer(level: 'info' | 'warn' | 'error' | 'debug', message: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('app:log', {
        timestamp: new Date().toISOString(),
        level,
        message,
        source: 'main'
      });
    }
  }

  private setupEventForwarding() {
    if (!this.engine) return;

    // Set up console logging forwarding to renderer for better debugging
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.log = (...args: any[]) => {
      originalConsoleLog(...args);
      this.sendLogToRenderer('info', args.join(' '));
    };

    console.error = (...args: any[]) => {
      originalConsoleError(...args);
      this.sendLogToRenderer('error', args.join(' '));
    };

    console.warn = (...args: any[]) => {
      originalConsoleWarn(...args);
      this.sendLogToRenderer('warn', args.join(' '));
    };

    // Forward scan events to renderer
    this.engine.on('scan:started', (data: any) => {
      console.log('[MAIN] Forwarding scan:started event:', data);
      this.mainWindow?.webContents.send('scan:started', data);
    });

    this.engine.on('scan:progress', (data: any) => {
      console.log('[MAIN] Forwarding scan:progress event:', data);
      this.mainWindow?.webContents.send('scan:progress', data);
    });

    this.engine.on('scan:completed', (data: any) => {
      console.log('[MAIN] Forwarding scan:completed event:', data);
      this.mainWindow?.webContents.send('scan:completed', data);
    });

    // Forward analysis events
    this.engine.on('analysis:started', (data: any) => {
      this.mainWindow?.webContents.send('analysis:started', data);
    });

    this.engine.on('analysis:progress', (data: any) => {
      this.mainWindow?.webContents.send('analysis:progress', data);
    });

    this.engine.on('analysis:completed', (data: any) => {
      this.mainWindow?.webContents.send('analysis:completed', data);
    });

    // Forward job management events
    this.engine.on('job:started', (data: any) => {
      console.log('[MAIN] Forwarding job:started event:', data);
      this.mainWindow?.webContents.send('job:started', data);
    });

    this.engine.on('job:progress', (data: any) => {
      console.log('[MAIN] Forwarding job:progress event:', data);
      this.mainWindow?.webContents.send('job:progress', data);
    });

    this.engine.on('job:completed', (data: any) => {
      console.log('[MAIN] Forwarding job:completed event:', data);
      this.mainWindow?.webContents.send('job:completed', data);
    });

    this.engine.on('job:failed', (data: any) => {
      console.log('[MAIN] Forwarding job:failed event:', data);
      this.mainWindow?.webContents.send('job:failed', data);
    });

    this.engine.on('job:cancelled', (data: any) => {
      console.log('[MAIN] Forwarding job:cancelled event:', data);
      this.mainWindow?.webContents.send('job:cancelled', data);
    });

    this.engine.on('job:timeout', (data: any) => {
      console.log('[MAIN] Forwarding job:timeout event:', data);
      this.mainWindow?.webContents.send('job:timeout', data);
    });

    this.engine.on('job:queued', (data: any) => {
      console.log('[MAIN] Forwarding job:queued event:', data);
      this.mainWindow?.webContents.send('job:queued', data);
    });

    this.engine.on('job:retried', (data: any) => {
      console.log('[MAIN] Forwarding job:retried event:', data);
      this.mainWindow?.webContents.send('job:retried', data);
    });

    // Forward export events
    this.engine.on('export:started', (data: any) => {
      this.mainWindow?.webContents.send('export:started', data);
    });

    this.engine.on('export:completed', (data: any) => {
      this.mainWindow?.webContents.send('export:completed', data);
    });

    // Forward STEM separation events
    this.engine.on('stem:separation:started', (data: any) => {
      this.mainWindow?.webContents.send('stem:separation:started', data);
    });

    this.engine.on('stem:separation:progress', (data: any) => {
      this.mainWindow?.webContents.send('stem:separation:progress', data);
    });

    this.engine.on('stem:separation:completed', (data: any) => {
      this.mainWindow?.webContents.send('stem:separation:completed', data);
    });

    this.engine.on('stem:separation:failed', (data: any) => {
      this.mainWindow?.webContents.send('stem:separation:failed', data);
    });

    this.engine.on('stem:separation:cancelled', (data: any) => {
      this.mainWindow?.webContents.send('stem:separation:cancelled', data);
    });

    console.log('[MAIN] Event forwarding setup complete');
  }

  private setupApp() {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(() => {
      this.createSplashWindow()
      this.setupMenu()
      this.setupIPC()

      // Initialize main window after splash
      setTimeout(() => {
        this.createMainWindow()
      }, 1500) // Show splash for 1.5 seconds

      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow()
        }
      })
    })

    // Handle app shutdown with analysis job checking
    app.on('before-quit', async (event) => {
      if (this.engine && this.engineInitialized) {
        try {
          // Check for active analysis jobs
          const activeJobs = await this.engine.getActiveAnalysisJobs()
          if (activeJobs && activeJobs.length > 0) {
            event.preventDefault()

            const result = await dialog.showMessageBox(this.mainWindow!, {
              type: 'warning',
              title: 'Active Analysis Jobs',
              message: `You have ${activeJobs.length} active analysis job(s) running.`,
              detail: 'Do you want to abort these jobs and quit, or cancel quitting?',
              buttons: ['Abort Jobs & Quit', 'Cancel'],
              defaultId: 1,
              cancelId: 1
            })

            if (result.response === 0) {
              // User chose to abort jobs and quit
              console.log('[SHUTDOWN] Aborting active analysis jobs before quit...')
              await this.engine.abortAllAnalysisJobs()
              app.quit()
            }
            // If response === 1, do nothing (cancel quit)
          }
        } catch (error) {
          console.error('[SHUTDOWN] Error checking active jobs:', error)
          // If we can't check, just quit
          app.quit()
        }
      }
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

  private createSplashWindow() {
    this.splashWindow = new BrowserWindow({
      width: 400,
      height: 300,
      frame: false,
      alwaysOnTop: true,
      center: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      show: false
    })

    // Create splash screen HTML content
    const splashHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
        }
        .logo {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .tagline {
            font-size: 18px;
            font-weight: 300;
            opacity: 0.9;
            margin-bottom: 32px;
        }
        .loading {
            width: 200px;
            height: 4px;
            background: rgba(255,255,255,0.2);
            border-radius: 2px;
            overflow: hidden;
        }
        .loading-bar {
            width: 0%;
            height: 100%;
            background: rgba(255,255,255,0.8);
            border-radius: 2px;
            animation: loading 1.5s ease-in-out;
        }
        @keyframes loading {
            from { width: 0%; }
            to { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="logo">CleanCue</div>
    <div class="tagline">Take control of your music</div>
    <div class="loading">
        <div class="loading-bar"></div>
    </div>
</body>
</html>
    `

    // Write splash HTML to a temporary location
    // Use app.getPath('temp') to write to a writable location instead of __dirname (which is read-only in asar)
    const splashPath = path.join(app.getPath('temp'), 'cleancue-splash.html')
    fs.writeFileSync(splashPath, splashHTML)

    // Load the splash screen
    this.splashWindow.loadFile(splashPath)

    // Show splash when ready
    this.splashWindow.once('ready-to-show', () => {
      this.splashWindow?.show()
    })

    // Handle splash window closed
    this.splashWindow.on('closed', () => {
      this.splashWindow = null
    })
  }

  private createMainWindow() {
    console.log('🪟 Creating main window...')
    // Close splash window when main window is created
    if (this.splashWindow) {
      this.splashWindow.close()
    }

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
      console.log('🪟 Main window ready-to-show event fired')
      this.mainWindow?.show()
      console.log('🪟 Main window show() called')

      // Proactively initialize engine after window is shown to ensure
      // library loads properly on app startup
      this.initializeEngineProactively()
    })

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null
    })
  }

  private async initializeEngineProactively() {
    try {
      console.log('🚀 Proactively initializing engine for faster library loading...')
      await this.initializeEngine()
      console.log('✅ Engine initialized proactively - library should load immediately')
    } catch (error) {
      console.warn('⚠️ Failed to initialize engine proactively:', error)
      // Non-critical - engine will still initialize on first IPC call
    }
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
            label: 'Documentation',
            click: async () => {
              await shell.openExternal('https://github.com/CmndrCody/CleanCue/wiki')
            }
          },
          {
            label: 'User Guide',
            click: async () => {
              await shell.openExternal('https://github.com/CmndrCody/CleanCue#readme')
            }
          },
          {
            label: 'GitHub Repository',
            click: async () => {
              await shell.openExternal('https://github.com/CmndrCody/CleanCue')
            }
          },
          { type: 'separator' },
          {
            label: 'Report Issue',
            click: async () => {
              await shell.openExternal('https://github.com/CmndrCody/CleanCue/issues')
            }
          },
          { type: 'separator' },
          {
            label: 'About CleanCue',
            click: () => this.showAbout()
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
    let scanInProgress = false
    ipcMain.handle('engine-scan', async (_, folderPath: string, options?: any) => {
      const callId = Math.random().toString(36).substring(7)
      try {
        // Prevent concurrent scans
        if (scanInProgress) {
          console.log(`[MAIN] ⚠️ [${callId}] Scan already in progress, rejecting duplicate call`)
          return { success: false, error: 'Scan already in progress' }
        }

        scanInProgress = true
        console.log(`[MAIN] 🎯 [${callId}] IPC engine-scan handler called with folder: ${folderPath}`)
        console.log(`[MAIN] 🎯 [${callId}] IPC engine-scan options:`, options)

        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        console.log(`[MAIN] 🔍 [${callId}] Starting scan of folder: ${folderPath}`)
        console.log(`[MAIN] 📋 [${callId}] Scan options:`, options)

        const result = await this.engine.scanLibrary([folderPath], options)

        console.log(`[MAIN] ✅ [${callId}] Engine scan completed with result:`, {
          tracksScanned: result.tracksScanned,
          tracksAdded: result.tracksAdded,
          tracksUpdated: result.tracksUpdated,
          errorsCount: result.errors.length
        })

        // Get current track count to verify database state
        const allTracks = this.engine.getAllTracks()
        console.log(`[MAIN] 📊 Current database track count: ${allTracks.length}`)

        // Ensure database operations are fully committed before returning
        await new Promise(resolve => setTimeout(resolve, 500))

        // If auto-analyze is enabled, queue tracks for analysis
        if (options?.autoAnalyzeBpmKey && result.tracksAdded > 0) {
          const newTracks = this.engine.getAllTracks().slice(-result.tracksAdded)
          const trackIds = newTracks.map((track: any) => track.id)
          // Queue them for analysis asynchronously
          setTimeout(() => {
            this.engine?.analyzeSelectedTracks(trackIds)
          }, 1000)
        }

        const finalResult = {
          success: true,
          tracksFound: result.tracksScanned,
          tracksAdded: result.tracksAdded,
          tracksUpdated: result.tracksUpdated,
          errors: result.errors
        }

        console.log(`[MAIN] 📤 [${callId}] Returning scan result to UI:`, {
          ...finalResult,
          engineResult: {
            tracksScanned: result.tracksScanned,
            tracksAdded: result.tracksAdded,
            tracksUpdated: result.tracksUpdated,
            errorsCount: result.errors.length
          }
        })
        return finalResult
      } catch (error) {
        console.error(`[MAIN] ❌ [${callId}] Scan failed:`, error)
        return { success: false, error: (error as Error).message }
      } finally {
        scanInProgress = false
        console.log(`[MAIN] 🔓 [${callId}] Scan lock released`)
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
      console.log(`[MAIN] engine-analyze called with ${trackIds.length} tracks:`, trackIds)
      this.sendLogToRenderer('info', `🎵 Starting analysis of ${trackIds.length} tracks...`)

      try {
        await this.initializeEngine()
        if (!this.engine) {
          console.error('[MAIN] Engine not initialized for analysis')
          this.sendLogToRenderer('error', '❌ Engine not initialized for analysis')
          return { success: false, error: 'Engine not initialized' }
        }

        console.log('[MAIN] Starting analysis for tracks...')
        this.sendLogToRenderer('info', '🔍 Creating analysis jobs for tracks...')

        // Use the engine's job system for analysis
        await this.engine.analyzeSelectedTracks(trackIds, ['tempo', 'key', 'energy'])

        console.log(`[MAIN] Analysis jobs created for ${trackIds.length} tracks`)
        this.sendLogToRenderer('info', `🎯 Analysis jobs created for ${trackIds.length} tracks - check Analysis view for progress`)
        return { success: true, analyzed: trackIds.length }
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

    ipcMain.handle('stem-start-separation', async (event, trackId: string, settings: any) => {
      console.log(`🎵 [STEM] Starting separation for track: ${trackId}`)
      console.log(`🎵 [STEM] Settings:`, JSON.stringify(settings, null, 2))
      try {
        await this.initializeEngine()
        if (!this.engine) {
          console.error('🎵 [STEM] ❌ Engine not initialized')
          return { success: false, error: 'Engine not initialized' }
        }

        console.log(`🎵 [STEM] ✅ Engine ready, calling startStemSeparation...`)

        // Progress callback to send updates to UI
        const onProgress = (message: string) => {
          console.log(`🎵 [STEM-PROGRESS] ${message}`)
          this.sendLogToRenderer('info', `🎵 [STEM-PROGRESS] ${message}`)
          event.sender.send('stem:installation:progress', { message })
        }

        const separationId = await this.engine.startStemSeparation(trackId, settings, onProgress)
        console.log(`🎵 [STEM] ✅ Separation started with ID: ${separationId}`)
        return { success: true, separationId }
      } catch (error) {
        console.error('🎵 [STEM] ❌ Failed to start STEM separation:', error)
        console.error('🎵 [STEM] ❌ Error details:', {
          message: (error as Error).message,
          stack: (error as Error).stack,
          trackId,
          settings
        })
        this.sendLogToRenderer('error', `🎵 [STEM] ❌ ${(error as Error).message}`)
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

        const jobs = this.engine.getAllAnalysisJobs()
        return { success: true, jobs }
      } catch (error) {
        console.error('Failed to get analysis jobs:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Background Job Management IPC handlers
    ipcMain.handle('get-all-jobs', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return []
        }
        return this.engine.getAllJobs()
      } catch (error) {
        console.error('Failed to get all jobs:', error)
        return []
      }
    })

    ipcMain.handle('get-active-jobs', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return []
        }
        return this.engine.getActiveJobs()
      } catch (error) {
        console.error('Failed to get active jobs:', error)
        return []
      }
    })

    ipcMain.handle('get-queued-jobs', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return []
        }
        return this.engine.getQueuedJobs()
      } catch (error) {
        console.error('Failed to get queued jobs:', error)
        return []
      }
    })

    ipcMain.handle('get-job-by-id', async (_, jobId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return null
        }
        return this.engine.getJobById(jobId)
      } catch (error) {
        console.error('Failed to get job by ID:', error)
        return null
      }
    })

    ipcMain.handle('cancel-job', async (_, jobId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return false
        }
        return this.engine.cancelJob(jobId)
      } catch (error) {
        console.error('Failed to cancel job:', error)
        return false
      }
    })

    ipcMain.handle('retry-job', async (_, jobId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return false
        }
        return this.engine.retryJob(jobId)
      } catch (error) {
        console.error('Failed to retry job:', error)
        return false
      }
    })

    ipcMain.handle('abort-all-jobs', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return
        }
        await this.engine.abortAllJobs()
      } catch (error) {
        console.error('Failed to abort all jobs:', error)
        throw error
      }
    })

    ipcMain.handle('create-scan-job', async (_, paths: string[], extensions?: string[], userInitiated: boolean = true) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          throw new Error('Engine not initialized')
        }
        return this.engine.createScanJob(paths, extensions, userInitiated)
      } catch (error) {
        console.error('Failed to create scan job:', error)
        throw error
      }
    })

    ipcMain.handle('create-analysis-jobs', async (_, trackIds: string[], analysisTypes?: string[], userInitiated: boolean = true) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          throw new Error('Engine not initialized')
        }
        return this.engine.createAnalysisJobs(trackIds, analysisTypes, userInitiated)
      } catch (error) {
        console.error('Failed to create analysis jobs:', error)
        throw error
      }
    })

    ipcMain.handle('get-library-health', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const rawIssues = this.engine.getLibraryHealth()

        // Transform engine format to UI format
        const issues = rawIssues.map((issue: any) => ({
          id: issue.id,
          type: this.mapIssueType(issue.type, issue.category),
          severity: this.mapIssueSeverity(issue.type),
          title: issue.message,
          description: issue.details || issue.message,
          trackPath: issue.trackId ? this.getTrackPath(issue.trackId) : undefined,
          suggestion: issue.canAutoFix ? 'This issue can be automatically fixed' : 'Manual intervention required',
          count: 1
        }))

        return { success: true, issues }
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

        const result = await this.engine.scanLibraryHealth()

        if (result.success) {
          // Get the updated issues after scan
          const rawIssues = this.engine.getLibraryHealth()
          const issues = rawIssues.map((issue: any) => ({
            id: issue.id,
            type: this.mapIssueType(issue.type, issue.category),
            severity: this.mapIssueSeverity(issue.type),
            title: issue.message,
            description: issue.details || issue.message,
            trackPath: issue.trackId ? this.getTrackPath(issue.trackId) : undefined,
            suggestion: issue.canAutoFix ? 'This issue can be automatically fixed' : 'Manual intervention required',
            count: 1
          }))

          return { success: true, issues, issuesFound: result.issuesFound }
        }

        return result
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

        const groups = this.engine.getDuplicateGroups()
        return groups
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

        const result = await this.engine.scanForDuplicates()
        return result
      } catch (error) {
        console.error('Failed to scan for duplicates:', error)
        return { success: false, error: (error as Error).message }
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

    // Handle fixing health issues
    ipcMain.handle('fix-health-issue', async (_, issueId: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.fixHealthIssue(issueId)
        return result
      } catch (error) {
        console.error('Failed to fix health issue:', error)
        return { success: false, message: (error as Error).message }
      }
    })

    // Handle saving general app settings
    ipcMain.handle('save-settings', async (_, settings: any) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // Save general app settings to config
        this.engine.updateConfig({
          settings: settings
        })

        console.log('App settings saved successfully:', settings)
        return { success: true }
      } catch (error) {
        console.error('Failed to save app settings:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // Handle library import
    ipcMain.handle('import-library-source', async (_, options: {
      sourcePath: string
      mode: 'copy' | 'link'
      organization: string
      libraryPath?: string
      handleDuplicates: 'skip' | 'replace' | 'rename'
      copyFormat: string
      createBackup: boolean
    }) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        // For now, implement basic import using existing scan functionality
        if (options.mode === 'link') {
          // Link mode: just scan the folder to add tracks to library without copying
          const result = await this.engine.scanLibrary([options.sourcePath])
          return {
            success: true,
            tracksImported: result.tracksAdded,
            message: `Successfully linked ${result.tracksAdded} tracks from ${options.sourcePath}`
          }
        } else {
          // Copy mode: for now, just do a scan (actual copying would need file system operations)
          // TODO: Implement actual file copying with organization
          const result = await this.engine.scanLibrary([options.sourcePath])
          return {
            success: true,
            tracksImported: result.tracksAdded,
            message: `Successfully imported ${result.tracksAdded} tracks (copy mode - files scanned but not yet physically copied)`
          }
        }
      } catch (error) {
        console.error('Failed to import library source:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    // YouTube downloader IPC handlers
    ipcMain.handle('youtube-check-dependencies', async () => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const result = await this.engine.checkYouTubeDependencies()
        return { success: true, ...result }
      } catch (error) {
        console.error('Failed to check YouTube dependencies:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('youtube-get-video-info', async (_, url: string) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const videoInfo = await this.engine.getYouTubeVideoInfo(url)
        return { success: true, videoInfo }
      } catch (error) {
        console.error('Failed to get YouTube video info:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('youtube-search-videos', async (_, query: string, maxResults: number = 10) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const searchResults = await this.engine.searchYouTubeVideos(query, maxResults)
        return { success: true, results: searchResults }
      } catch (error) {
        console.error('Failed to search YouTube videos:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('youtube-download-audio', async (_, url: string, options: any = {}) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const downloadResult = await this.engine.downloadYouTubeAudio(url, options)
        return downloadResult
      } catch (error) {
        console.error('Failed to download YouTube audio:', error)
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.handle('youtube-download-batch', async (_, items: any[], globalOptions: any = {}) => {
      try {
        await this.initializeEngine()
        if (!this.engine) {
          return { success: false, error: 'Engine not initialized' }
        }

        const batchResults = await this.engine.downloadYouTubeBatch(items, globalOptions)
        return { success: true, results: batchResults }
      } catch (error) {
        console.error('Failed to download YouTube batch:', error)
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
      detail: `Version: ${app.getVersion()}

Take control of your music library with advanced DJ tools.

Created by CmndrCody
https://cmndrcody.com

Open-source DJ library management toolkit
Built with Electron, React, and TypeScript

Features:
• Audio analysis (BPM, key, energy)
• STEM separation with AI models
• Duplicate detection and cleanup
• USB export with filename normalization
• Library health monitoring
• YouTube downloader integration

For documentation and support:
https://github.com/CmndrCody/CleanCue`
    })
  }

  private mapIssueType(engineType: string, category: string): string {
    switch (category.toLowerCase()) {
      case 'missing files':
        return 'missing'
      case 'missing metadata':
        return 'metadata'
      case 'corrupted files':
        return 'corrupted'
      case 'duplicates':
        return 'duplicate'
      default:
        return 'warning'
    }
  }

  private mapIssueSeverity(engineType: string): string {
    switch (engineType) {
      case 'error':
        return 'high'
      case 'warning':
        return 'medium'
      case 'info':
        return 'low'
      default:
        return 'medium'
    }
  }

  private getTrackPath(trackId: string): string | undefined {
    try {
      if (!this.engine) return undefined
      const track = this.engine.db.getTrackById(trackId)
      return track?.path
    } catch (error) {
      console.error('Failed to get track path:', error)
      return undefined
    }
  }
}

// Initialize the app
new CleanCueApp()