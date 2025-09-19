import { useState, useEffect } from 'react'
import { Download, Search, Clock, AlertTriangle, CheckCircle, X, Plus, Trash2, ExternalLink } from 'lucide-react'
import { useElectron } from '../hooks/useElectron'

interface YouTubeVideoInfo {
  id: string
  title: string
  uploader: string
  duration?: number
  view_count?: number
  description?: string
  upload_date?: string
  url: string
  playlist?: boolean
  entries?: YouTubeVideoInfo[]
  entry_count?: number
}

interface YouTubeSearchResult {
  id: string
  title: string
  uploader: string
  duration?: number
  view_count?: number
  url: string
}

interface DownloadItem {
  id: string
  url?: string
  query?: string
  title: string
  status: 'pending' | 'downloading' | 'completed' | 'error'
  progress?: number
  outputFiles?: string[]
  error?: string
  videoInfo?: YouTubeVideoInfo
}

interface YouTubeDownloaderProps {
  isOpen: boolean
  onClose: () => void
}

export function YouTubeDownloader({ isOpen, onClose }: YouTubeDownloaderProps) {
  const { api } = useElectron()
  const [downloadItems, setDownloadItems] = useState<DownloadItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [dependenciesChecked, setDependenciesChecked] = useState(false)
  const [dependenciesAvailable, setDependenciesAvailable] = useState(false)
  const [downloadOptions, setDownloadOptions] = useState({
    quality: 'best',
    format: 'mp3',
    embedMetadata: true,
    embedThumbnail: false
  })

  useEffect(() => {
    if (isOpen && api && !dependenciesChecked) {
      checkDependencies()
    }
  }, [isOpen, api, dependenciesChecked])

  const checkDependencies = async () => {
    if (!api) return

    try {
      const result = await api.youtubeCheckDependencies()
      setDependenciesAvailable(result.available || false)
      setDependenciesChecked(true)
    } catch (error) {
      console.error('Failed to check dependencies:', error)
      setDependenciesAvailable(false)
      setDependenciesChecked(true)
    }
  }

  const searchVideos = async () => {
    if (!api || !searchQuery.trim()) return

    setIsSearching(true)
    try {
      const result = await api.youtubeSearchVideos(searchQuery, 10)
      if (result.success && result.results) {
        setSearchResults(result.results)
      } else {
        console.error('Search failed:', result.error)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const addFromUrl = async () => {
    if (!api || !urlInput.trim()) return

    try {
      const result = await api.youtubeGetVideoInfo(urlInput)
      if (result.success && result.videoInfo) {
        const videoInfo = result.videoInfo
        const newItem: DownloadItem = {
          id: Date.now().toString(),
          url: urlInput,
          title: videoInfo.title || 'Unknown Title',
          status: 'pending',
          videoInfo
        }
        setDownloadItems(prev => [...prev, newItem])
        setUrlInput('')
      } else {
        console.error('Failed to get video info:', result.error)
      }
    } catch (error) {
      console.error('Error adding URL:', error)
    }
  }

  const addFromSearch = (video: YouTubeSearchResult) => {
    const newItem: DownloadItem = {
      id: Date.now().toString(),
      url: video.url,
      title: video.title,
      status: 'pending',
      videoInfo: {
        id: video.id,
        title: video.title,
        uploader: video.uploader,
        duration: video.duration,
        view_count: video.view_count,
        url: video.url
      }
    }
    setDownloadItems(prev => [...prev, newItem])
  }

  const removeItem = (id: string) => {
    setDownloadItems(prev => prev.filter(item => item.id !== id))
  }

  const startDownloads = async () => {
    if (!api || downloadItems.length === 0) return

    setIsDownloading(true)

    try {
      const items = downloadItems
        .filter(item => item.status === 'pending')
        .map(item => ({
          url: item.url,
          query: item.query,
          options: downloadOptions
        }))

      if (items.length === 0) {
        setIsDownloading(false)
        return
      }

      // Update status to downloading
      setDownloadItems(prev =>
        prev.map(item =>
          item.status === 'pending'
            ? { ...item, status: 'downloading' as const }
            : item
        )
      )

      const result = await api.youtubeDownloadBatch(items, downloadOptions)

      if (result.success && result.results) {
        // Update items with results
        setDownloadItems(prev => {
          const updated = [...prev]
          result.results?.forEach((downloadResult, index) => {
            const itemIndex = updated.findIndex((item, i) =>
              item.status === 'downloading' && i === index
            )
            if (itemIndex >= 0) {
              updated[itemIndex] = {
                ...updated[itemIndex],
                status: downloadResult.success ? 'completed' : 'error',
                outputFiles: downloadResult.downloadedFiles,
                error: downloadResult.error
              }
            }
          })
          return updated
        })
      }
    } catch (error) {
      console.error('Download failed:', error)
      // Mark all downloading items as error
      setDownloadItems(prev =>
        prev.map(item =>
          item.status === 'downloading'
            ? { ...item, status: 'error' as const, error: 'Download failed' }
            : item
        )
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatViewCount = (count?: number) => {
    if (!count) return 'Unknown'
    if (count > 1000000) return `${(count / 1000000).toFixed(1)}M views`
    if (count > 1000) return `${(count / 1000).toFixed(1)}K views`
    return `${count} views`
  }

  if (!isOpen) return null

  if (!dependenciesChecked) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Checking dependencies...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!dependenciesAvailable) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-red-400">Dependencies Missing</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>yt-dlp is not installed or not available</span>
            </div>
            <p className="text-gray-300 text-sm">
              To use the YouTube downloader, please install yt-dlp:
            </p>
            <div className="bg-gray-700 p-3 rounded font-mono text-sm">
              pip install yt-dlp
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">YouTube Downloader</h2>
            <p className="text-gray-400">Download audio from YouTube videos and playlists</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Search & Add */}
          <div className="space-y-6">
            {/* URL Input */}
            <div>
              <h3 className="font-medium mb-3">Add by URL</h3>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste YouTube URL here..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && addFromUrl()}
                />
                <button
                  onClick={addFromUrl}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div>
              <h3 className="font-medium mb-3">Search YouTube</h3>
              <div className="flex space-x-3 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for videos..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && searchVideos()}
                />
                <button
                  onClick={searchVideos}
                  disabled={isSearching}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-md transition-colors"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Search Results */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{video.title}</div>
                      <div className="text-sm text-gray-400 flex items-center space-x-2">
                        <span>{video.uploader}</span>
                        <span>•</span>
                        <span>{formatDuration(video.duration)}</span>
                        <span>•</span>
                        <span>{formatViewCount(video.view_count)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-3">
                      <button
                        onClick={() => window.open(video.url, '_blank')}
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => addFromSearch(video)}
                        className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Download Queue & Options */}
          <div className="space-y-6">
            {/* Download Options */}
            <div>
              <h3 className="font-medium mb-3">Download Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Audio Quality</label>
                  <select
                    value={downloadOptions.quality}
                    onChange={(e) => setDownloadOptions(prev => ({ ...prev, quality: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="best">Best Quality</option>
                    <option value="320">320 kbps</option>
                    <option value="256">256 kbps</option>
                    <option value="192">192 kbps</option>
                    <option value="128">128 kbps</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Format</label>
                  <select
                    value={downloadOptions.format}
                    onChange={(e) => setDownloadOptions(prev => ({ ...prev, format: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mp3">MP3</option>
                    <option value="m4a">M4A</option>
                    <option value="flac">FLAC</option>
                    <option value="wav">WAV</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={downloadOptions.embedMetadata}
                    onChange={(e) => setDownloadOptions(prev => ({ ...prev, embedMetadata: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600"
                  />
                  <span className="text-sm">Embed metadata</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={downloadOptions.embedThumbnail}
                    onChange={(e) => setDownloadOptions(prev => ({ ...prev, embedThumbnail: e.target.checked }))}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600"
                  />
                  <span className="text-sm">Embed thumbnail</span>
                </label>
              </div>
            </div>

            {/* Download Queue */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Download Queue ({downloadItems.length})</h3>
                <button
                  onClick={startDownloads}
                  disabled={isDownloading || downloadItems.filter(item => item.status === 'pending').length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm transition-colors"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 inline mr-2" />
                      Download All
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {downloadItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {item.status === 'pending' && <Clock className="h-4 w-4 text-gray-400" />}
                      {item.status === 'downloading' && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      )}
                      {item.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-400" />}
                      {item.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-400" />}

                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.title}</div>
                        {item.videoInfo && (
                          <div className="text-sm text-gray-400">
                            {item.videoInfo.uploader} • {formatDuration(item.videoInfo.duration)}
                          </div>
                        )}
                        {item.status === 'error' && item.error && (
                          <div className="text-sm text-red-400">{item.error}</div>
                        )}
                        {item.status === 'completed' && item.outputFiles && (
                          <div className="text-sm text-green-400">
                            Downloaded {item.outputFiles.length} file(s)
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-400 transition-colors ml-3"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {downloadItems.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No downloads in queue</p>
                    <p className="text-sm">Add videos from search or URL to start downloading</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}