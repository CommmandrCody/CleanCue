import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as path from 'path'
import * as fs from 'fs'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

class CleanCueApp {
  private mainWindow: BrowserWindow | null = null
  private isDev = process.argv.includes('--dev')

  constructor() {
    this.setupApp()
  }

  private setupApp() {
    // This method will be called when Electron has finished initialization
    app.whenReady().then(() => {
      this.createMainWindow()
      this.setupMenu()
      this.setupIPC()

      // Auto-updater setup (only in production)
      if (!this.isDev) {
        this.setupAutoUpdater()
      }

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
      this.mainWindow.loadFile(path.join(__dirname, '../../../packages/ui/dist/index.html'))
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
              await shell.openExternal('https://github.com/cleancue/cleancue')
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
      // This would connect to the CleanCue engine
      // For now, return mock progress
      return { success: true, tracksFound: 156 }
    })

    ipcMain.handle('engine-analyze', async (_, trackIds: string[]) => {
      // This would trigger audio analysis
      return { success: true, analyzed: trackIds.length }
    })

    ipcMain.handle('engine-export', async (_, options: any) => {
      // This would trigger export
      return { success: true, path: options.outputPath }
    })
  }

  private setupAutoUpdater() {
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', () => {
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Update available',
        message: 'A new version of CleanCue is available. It will be downloaded in the background.',
        buttons: ['OK']
      })
    })

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Update ready',
        message: 'Update downloaded. The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
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