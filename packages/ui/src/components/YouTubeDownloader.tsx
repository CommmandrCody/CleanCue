import { useState, useEffect } from 'react'
import { Download, Search, Clock, AlertTriangle, CheckCircle, X, Plus, Trash2, ExternalLink, FolderOpen, FileText, ChevronDown, ChevronRight } from 'lucide-react'
import { useElectron } from '../hooks/useElectron'
import { useYouTubeDownload, YouTubeSearchResult } from '../contexts/YouTubeDownloadContext'


interface YouTubeDownloaderProps {
  isOpen: boolean
  onClose: () => void
}

export function YouTubeDownloader({ isOpen, onClose }: YouTubeDownloaderProps) {
  const { api } = useElectron()
  const { state: downloadState, addDownload, removeDownload, updateOptions, startProcessing } = useYouTubeDownload()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isAddingUrl, setIsAddingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [dependenciesChecked, setDependenciesChecked] = useState(false)
  const [dependenciesAvailable, setDependenciesAvailable] = useState(false)
  const [selectedItemLogs, setSelectedItemLogs] = useState<string | null>(null)

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
    if (!api || !urlInput.trim() || isAddingUrl) return

    setIsAddingUrl(true)
    setUrlError(null)
    try {
      const result = await api.youtubeGetVideoInfo(urlInput)
      if (result.success && result.videoInfo) {
        const videoInfo = result.videoInfo
        const newItem = {
          url: urlInput,
          title: videoInfo.title || 'Unknown Title',
          status: 'pending' as const,
          videoInfo
        }
        addDownload(newItem)
        setUrlInput('')
      } else {
        console.error('Failed to get video info:', result.error)
        setUrlError(result.error || 'Failed to get video information')
      }
    } catch (error) {
      console.error('Error adding URL:', error)
      setUrlError('Failed to add URL. Please check the URL and try again.')
    } finally {
      setIsAddingUrl(false)
    }
  }

  const addFromSearch = (video: YouTubeSearchResult) => {
    const newItem = {
      url: video.url,
      title: video.title,
      status: 'pending' as const,
      videoInfo: {
        id: video.id,
        title: video.title,
        uploader: video.uploader,
        duration: video.duration,
        view_count: video.view_count,
        url: video.url
      }
    }
    addDownload(newItem)
  }

  const removeItem = (id: string) => {
    removeDownload(id)
  }

  const startDownloads = async () => {
    if (downloadState.items.filter(item => item.status === 'pending').length === 0) return

    // Update download options in the global context
    updateOptions(downloadState.options)

    // Start the background processing
    await startProcessing()
  }

  const selectDownloadLocation = async () => {
    if (!api) return

    try {
      const folder = await api.selectFolder()
      if (folder) {
        updateOptions({ outputDir: folder })
      }
    } catch (error) {
      console.error('Failed to select download location:', error)
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
                  onChange={(e) => {
                    setUrlInput(e.target.value)
                    if (urlError) setUrlError(null)
                  }}
                  placeholder="Paste YouTube URL here..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && addFromUrl()}
                />
                <button
                  onClick={addFromUrl}
                  disabled={isAddingUrl}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isAddingUrl ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </div>
              {urlError && (
                <div className="mt-2 text-red-400 text-sm flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{urlError}</span>
                </div>
              )}
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

              {/* Download Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Download Location</label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={downloadState.options.outputDir || 'Default (~/Downloads/CleanCue)'}
                    readOnly
                    placeholder="Choose download folder..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300"
                  />
                  <button
                    onClick={selectDownloadLocation}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-md text-sm transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Audio Quality</label>
                  <select
                    value={downloadState.options.quality}
                    onChange={(e) => updateOptions({ quality: e.target.value })}
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
                    value={downloadState.options.format}
                    onChange={(e) => updateOptions({ format: e.target.value })}
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
                    checked={downloadState.options.embedMetadata}
                    onChange={(e) => updateOptions({ embedMetadata: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600"
                  />
                  <span className="text-sm">Embed metadata</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={downloadState.options.embedThumbnail}
                    onChange={(e) => updateOptions({ embedThumbnail: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600"
                  />
                  <span className="text-sm">Embed thumbnail</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={downloadState.options.useCookies}
                    onChange={(e) => updateOptions({ useCookies: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-600"
                  />
                  <span className="text-sm">Use browser cookies</span>
                </label>
              </div>
            </div>

            {/* Download Queue */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">Download Queue ({downloadState.items.length})</h3>
                <button
                  onClick={startDownloads}
                  disabled={downloadState.isProcessing || downloadState.items.filter(item => item.status === 'pending').length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md text-sm transition-colors"
                >
                  {downloadState.isProcessing ? (
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
                {downloadState.items.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
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

                          {/* Progress bar for downloading items */}
                          {item.status === 'downloading' && item.progress && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{item.progress.percentage ? `${item.progress.percentage.toFixed(1)}%` : 'Processing...'}</span>
                                <div className="flex items-center space-x-2">
                                  {item.progress.speed && <span>{item.progress.speed}</span>}
                                  {item.progress.eta && <span>ETA: {item.progress.eta}</span>}
                                </div>
                              </div>
                              <div className="w-full bg-gray-600 rounded-full h-1.5">
                                <div
                                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${item.progress.percentage || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {item.status === 'error' && item.error && (
                            <div className="text-sm text-red-400">{item.error}</div>
                          )}
                          {item.status === 'completed' && item.outputFiles && (
                            <div className="text-sm text-green-400 flex items-center space-x-2">
                              <span>Downloaded {item.outputFiles.length} file(s)</span>
                              {item.outputFiles.length > 0 && (
                                <button
                                  onClick={() => api?.showItemInFolder(item.outputFiles![0])}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  title="Show in Finder"
                                >
                                  <FolderOpen className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Log viewer toggle */}
                          {item.logs && item.logs.length > 0 && (
                            <div className="mt-2">
                              <button
                                onClick={() => setSelectedItemLogs(selectedItemLogs === item.id ? null : item.id)}
                                className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                              >
                                {selectedItemLogs === item.id ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                <FileText className="h-3 w-3" />
                                <span>View logs ({item.logs.length} lines)</span>
                              </button>
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

                    {/* Expandable log display */}
                    {selectedItemLogs === item.id && item.logs && (
                      <div className="ml-4 bg-gray-900 rounded p-3 max-h-48 overflow-y-auto">
                        <div className="text-xs font-mono text-gray-300 space-y-1">
                          {item.logs.map((line, index) => (
                            <div key={index} className={`${
                              line.includes('[download]') ? 'text-blue-300' :
                              line.includes('[error]') ? 'text-red-300' :
                              line.includes('[info]') ? 'text-green-300' :
                              'text-gray-400'
                            }`}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {downloadState.items.length === 0 && (
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