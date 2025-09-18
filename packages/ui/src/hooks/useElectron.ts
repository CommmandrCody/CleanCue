import { useEffect, useState } from 'react'

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI)
  }, [])

  return {
    isElectron,
    api: isElectron ? window.electronAPI : null
  }
}

// Hook for folder selection
export function useFolderPicker() {
  const { api } = useElectron()

  const selectFolder = async (): Promise<string | null> => {
    if (api) {
      try {
        const folderPath = await api.selectFolder()
        return folderPath || null
      } catch (error) {
        console.error('Failed to select folder:', error)
        return null
      }
    }

    // Fallback for web - would normally use File System Access API
    return null
  }

  return { selectFolder }
}

// Hook for file saving
export function useFileSaver() {
  const { api } = useElectron()

  const saveFile = async (options: {
    title: string
    defaultPath: string
    filters: Array<{ name: string; extensions: string[] }>
  }): Promise<string | null> => {
    if (api) {
      try {
        const filePath = await api.saveFile(options)
        return filePath || null
      } catch (error) {
        console.error('Failed to save file:', error)
        return null
      }
    }

    // Fallback for web - would normally trigger download
    return null
  }

  return { saveFile }
}