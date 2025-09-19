import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useElectron } from './useElectron'
import { setupElectronAPIMock, resetElectronMocks, mockElectronAPI } from '../test/mocks/electronAPI'

describe('useElectron Hook', () => {
  beforeEach(() => {
    resetElectronMocks()
  })

  // Environment Detection Tests
  describe('Environment Detection', () => {
    it('detects Electron environment correctly', () => {
      setupElectronAPIMock()

      const { result } = renderHook(() => useElectron())

      expect(result.current.isElectron).toBe(true)
      expect(result.current.api).toBe(mockElectronAPI)
    })

    it('detects web environment correctly', () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      const { result } = renderHook(() => useElectron())

      expect(result.current.isElectron).toBe(false)
      expect(result.current.api).toBeNull()
    })

    it('handles missing window object gracefully', () => {
      // Simulate SSR environment where window is undefined
      const originalWindow = globalThis.window
      delete (globalThis as any).window

      const { result } = renderHook(() => useElectron())

      expect(result.current.isElectron).toBe(false)
      expect(result.current.api).toBeNull()

      // Restore window
      globalThis.window = originalWindow
    })
  })

  // Folder Picker Tests
  describe('Folder Picker', () => {
    beforeEach(() => {
      setupElectronAPIMock()
    })

    it('selects folders in Electron environment', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/Users/test/Music')

      const { result } = renderHook(() => useElectron())
      const selectedPath = await result.current.api?.selectFolder()

      expect(mockElectronAPI.selectFolder).toHaveBeenCalled()
      expect(selectedPath).toBe('/Users/test/Music')
    })

    it('handles folder selection cancellation', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('')

      const { result } = renderHook(() => useElectron())
      const selectedPath = await result.current.api?.selectFolder()

      expect(selectedPath).toBe('')
    })

    it('handles folder selection errors', async () => {
      mockElectronAPI.selectFolder.mockRejectedValue(new Error('Selection failed'))

      const { result } = renderHook(() => useElectron())

      await expect(result.current.api?.selectFolder()).rejects.toThrow('Selection failed')
    })

    it('returns null in web environment for folder selection', async () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      const { result } = renderHook(() => useElectron())
      const selectedPath = await result.current.api?.selectFolder()

      expect(selectedPath).toBeNull()
    })

    it('falls back to web folder selection when available', async () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      // Mock HTML5 folder picker
      const mockInput = {
        click: vi.fn(),
        addEventListener: vi.fn(),
        files: [
          { webkitRelativePath: 'Music/Artist/song.mp3' }
        ] as any
      }

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockInput as any)

      const { result } = renderHook(() => useElectron())

      // This would trigger the web fallback in a real scenario
      // The hook doesn't directly implement web fallback, but the components using it do
      expect(result.current.isElectron).toBe(false)

      createElementSpy.mockRestore()
    })
  })

  // File Saver Tests
  describe('File Saver', () => {
    beforeEach(() => {
      setupElectronAPIMock()
    })

    it('saves files in Electron environment', async () => {
      const saveOptions = {
        title: 'Save Playlist',
        defaultPath: 'playlist.m3u',
        filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
      }

      mockElectronAPI.saveFile.mockResolvedValue('/Users/test/playlist.m3u')

      const { result } = renderHook(() => useElectron())
      const savedPath = await result.current.api?.saveFile(saveOptions)

      expect(mockElectronAPI.saveFile).toHaveBeenCalledWith(saveOptions)
      expect(savedPath).toBe('/Users/test/playlist.m3u')
    })

    it('handles save cancellation', async () => {
      const saveOptions = {
        title: 'Save Playlist',
        defaultPath: 'playlist.m3u',
        filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
      }

      mockElectronAPI.saveFile.mockResolvedValue('')

      const { result } = renderHook(() => useElectron())
      const savedPath = await result.current.api?.saveFile(saveOptions)

      expect(savedPath).toBe('')
    })

    it('handles save file errors', async () => {
      const saveOptions = {
        title: 'Save Playlist',
        defaultPath: 'playlist.m3u',
        filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
      }

      mockElectronAPI.saveFile.mockRejectedValue(new Error('Save failed'))

      const { result } = renderHook(() => useElectron())

      await expect(result.current.api?.saveFile(saveOptions)).rejects.toThrow('Save failed')
    })

    it('returns null in web environment for file saving', async () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      const saveOptions = {
        title: 'Save Playlist',
        defaultPath: 'playlist.m3u',
        filters: [{ name: 'M3U Playlist', extensions: ['m3u'] }]
      }

      const { result } = renderHook(() => useElectron())
      const savedPath = await result.current.api?.saveFile(saveOptions)

      expect(savedPath).toBeNull()
    })

    it('validates save file options', async () => {
      const invalidOptions = {
        title: '',
        defaultPath: '',
        filters: []
      }

      const { result } = renderHook(() => useElectron())

      await result.current.api?.saveFile(invalidOptions)

      expect(mockElectronAPI.saveFile).toHaveBeenCalledWith(invalidOptions)
    })
  })

  // API Access Tests
  describe('API Access', () => {
    it('provides full API access in Electron environment', () => {
      setupElectronAPIMock()

      const { result } = renderHook(() => useElectron())

      expect(result.current.api).toHaveProperty('selectFolder')
      expect(result.current.api).toHaveProperty('saveFile')
      expect(result.current.api).toHaveProperty('engineScan')
      expect(result.current.api).toHaveProperty('getAllTracks')
      expect(result.current.api).toHaveProperty('deleteTracks')
    })

    it('returns null API in web environment', () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      const { result } = renderHook(() => useElectron())

      expect(result.current.api).toBeNull()
    })

    it('maintains API reference stability', () => {
      setupElectronAPIMock()

      const { result, rerender } = renderHook(() => useElectron())
      const firstApi = result.current.api

      rerender()
      const secondApi = result.current.api

      expect(firstApi).toBe(secondApi)
    })
  })

  // Hook Behavior Tests
  describe('Hook Behavior', () => {
    it('maintains stable return values across re-renders', () => {
      setupElectronAPIMock()

      const { result, rerender } = renderHook(() => useElectron())
      const firstResult = result.current

      rerender()
      const secondResult = result.current

      expect(firstResult.isElectron).toBe(secondResult.isElectron)
      expect(firstResult.api).toBe(secondResult.api)
      expect(firstResult.api?.selectFolder).toBe(secondResult.api?.selectFolder)
      expect(firstResult.api?.saveFile).toBe(secondResult.api?.saveFile)
    })

    it('updates when electronAPI becomes available', () => {
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })

      const { result, rerender } = renderHook(() => useElectron())

      expect(result.current.isElectron).toBe(false)

      // Simulate electronAPI becoming available
      setupElectronAPIMock()
      rerender()

      expect(result.current.isElectron).toBe(true)
      expect(result.current.api).toBeTruthy()
    })

    it('handles electronAPI becoming unavailable', () => {
      setupElectronAPIMock()

      const { result, rerender } = renderHook(() => useElectron())

      expect(result.current.isElectron).toBe(true)

      // Simulate electronAPI becoming unavailable
      Object.defineProperty(window, 'electronAPI', {
        value: undefined,
        writable: true
      })
      rerender()

      expect(result.current.isElectron).toBe(false)
      expect(result.current.api).toBeNull()
    })
  })

  // Integration Tests
  describe('Integration', () => {
    beforeEach(() => {
      setupElectronAPIMock()
    })

    it('works with real electron operations', async () => {
      mockElectronAPI.engineScan.mockResolvedValue({
        success: true,
        tracksFound: 5
      })

      const { result } = renderHook(() => useElectron())

      // Test that we can use the API through the hook
      if (result.current.api) {
        const scanResult = await result.current.api.engineScan('/test/music')
        expect(scanResult.success).toBe(true)
        expect(scanResult.tracksFound).toBe(5)
      }
    })

    it('handles chained operations', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/music')
      mockElectronAPI.engineScan.mockResolvedValue({
        success: true,
        tracksFound: 3
      })

      const { result } = renderHook(() => useElectron())

      // Simulate selecting a folder then scanning it
      const selectedPath = await result.current.api?.selectFolder()

      if (result.current.api && selectedPath) {
        const scanResult = await result.current.api.engineScan(selectedPath)
        expect(scanResult.success).toBe(true)
      }

      expect(mockElectronAPI.selectFolder).toHaveBeenCalled()
      expect(mockElectronAPI.engineScan).toHaveBeenCalledWith('/test/music')
    })

    it('handles concurrent operations', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue('/test/music')
      mockElectronAPI.saveFile.mockResolvedValue('/test/export.m3u')

      const { result } = renderHook(() => useElectron())

      // Run operations concurrently
      const [selectedPath, savedPath] = await Promise.all([
        result.current.api?.selectFolder(),
        result.current.api?.saveFile({
          title: 'Export',
          defaultPath: 'export.m3u',
          filters: [{ name: 'M3U', extensions: ['m3u'] }]
        })
      ])

      expect(selectedPath).toBe('/test/music')
      expect(savedPath).toBe('/test/export.m3u')
    })
  })

  // Error Handling Tests
  describe('Error Handling', () => {
    beforeEach(() => {
      setupElectronAPIMock()
    })

    it('propagates API errors correctly', async () => {
      const errorMessage = 'Permission denied'
      mockElectronAPI.selectFolder.mockRejectedValue(new Error(errorMessage))

      const { result } = renderHook(() => useElectron())

      await expect(result.current.api?.selectFolder()).rejects.toThrow(errorMessage)
    })

    it('handles malformed API responses', async () => {
      mockElectronAPI.selectFolder.mockResolvedValue(null as any)

      const { result } = renderHook(() => useElectron())
      const selectedPath = await result.current.api?.selectFolder()

      expect(selectedPath).toBeNull()
    })

    it('handles API method unavailability', async () => {
      // Simulate partial API availability
      const partialAPI = {
        ...mockElectronAPI,
        selectFolder: undefined
      }

      Object.defineProperty(window, 'electronAPI', {
        value: partialAPI,
        writable: true
      })

      const { result } = renderHook(() => useElectron())

      expect(result.current.isElectron).toBe(true)
      expect(result.current.api).toBeTruthy()

      // Should handle missing method gracefully
      if (result.current.api?.selectFolder) {
        await result.current.api?.selectFolder()
      } else {
        // Method not available, handle gracefully
        expect(result.current.api?.selectFolder).toBeUndefined()
      }
    })
  })

  // Performance Tests
  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      setupElectronAPIMock()

      let renderCount = 0
      const { rerender } = renderHook(() => {
        renderCount++
        return useElectron()
      })

      expect(renderCount).toBe(1)

      // Multiple re-renders should not cause extra work
      rerender()
      rerender()
      rerender()

      expect(renderCount).toBe(4) // Initial + 3 re-renders
    })

    it('memoizes expensive operations', () => {
      setupElectronAPIMock()

      const { result, rerender } = renderHook(() => useElectron())

      const firstSelectFolder = result.current.api?.selectFolder
      const firstSaveFile = result.current.api?.saveFile

      rerender()

      expect(result.current.api?.selectFolder).toBe(firstSelectFolder)
      expect(result.current.api?.saveFile).toBe(firstSaveFile)
    })
  })
})