import React, { useState, useEffect, useRef } from 'react'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source?: string
}

interface LogViewerProps {
  className?: string
}

export const LogViewer: React.FC<LogViewerProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState<string>('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize with empty logs - only real logs should appear
    setLogs([])

    // TODO: Connect to actual logging system via IPC
    // Listen for log events from the main process
    if (window.electronAPI?.on) {
      window.electronAPI.on('app:log', (_: any, logEntry: LogEntry) => {
        setLogs(prev => [...prev, logEntry])
      })
    }

    return () => {
      // Cleanup listener
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('app:log')
      }
    }
  }, [])

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const filteredLogs = logs.filter(log => {
    const matchesText = log.message.toLowerCase().includes(filter.toLowerCase()) ||
                       (log.source && log.source.toLowerCase().includes(filter.toLowerCase()))
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter
    return matchesText && matchesLevel
  })

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400'
      case 'warn': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      case 'debug': return 'text-gray-400'
      default: return 'text-gray-300'
    }
  }

  const getLevelBg = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-900/20'
      case 'warn': return 'bg-yellow-900/20'
      case 'info': return 'bg-blue-900/20'
      case 'debug': return 'bg-gray-900/20'
      default: return 'bg-gray-800/20'
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const exportLogs = () => {
    const logText = logs.map(log =>
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.source ? `[${log.source}] ` : ''}${log.message}`
    ).join('\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cleancue-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-800/50 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Application Logs</h3>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>

          <button
            onClick={clearLogs}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            Clear
          </button>

          <button
            onClick={exportLogs}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Export
          </button>
        </div>
      </div>

      {/* Log Display */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {logs.length === 0 ? 'No logs available' : 'No logs match the current filter'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded ${getLevelBg(log.level)} border-l-2 ${
                  log.level === 'error' ? 'border-red-500' :
                  log.level === 'warn' ? 'border-yellow-500' :
                  log.level === 'info' ? 'border-blue-500' :
                  'border-gray-500'
                }`}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <span className="text-gray-400 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`text-xs font-medium uppercase ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  {log.source && (
                    <span className="text-gray-500 text-xs">
                      [{log.source}]
                    </span>
                  )}
                </div>
                <div className="mt-1 text-gray-200 break-words">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between p-2 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        <span>
          Showing {filteredLogs.length} of {logs.length} log entries
        </span>
        <span>
          Errors: {logs.filter(l => l.level === 'error').length} |
          Warnings: {logs.filter(l => l.level === 'warn').length}
        </span>
      </div>
    </div>
  )
}