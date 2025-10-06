import { useState, useEffect } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  FileX,
  Music,
  Tag,
  HardDrive,
  RefreshCw,
  Search,
  Info,
  CheckSquare,
  Square,
  Settings
} from 'lucide-react'
import clsx from 'clsx'
import { DuplicateDetection } from './DuplicateDetection'

interface HealthIssue {
  id: string
  type: 'missing' | 'corrupted' | 'metadata' | 'duplicate' | 'warning'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  trackPath?: string
  suggestion?: string
  count?: number
}

export function HealthDashboard() {
  const [activeTab, setActiveTab] = useState<'health' | 'duplicates'>('health')
  const [issues, setIssues] = useState<HealthIssue[]>([])
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  const [filterBySeverity, setFilterBySeverity] = useState<string | null>(null)
  const [filterByType, setFilterByType] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fixing, setFixing] = useState(false)

  useEffect(() => {
    loadHealthIssues()
  }, [])

  const loadHealthIssues = async () => {
    try {
      setLoading(true)
      if (window.electronAPI) {
        const response = await window.electronAPI.getLibraryHealth()
        if (Array.isArray(response)) {
          setIssues(response)
        } else if ((response as any)?.success && Array.isArray((response as any).issues)) {
          setIssues((response as any).issues)
        } else {
          setIssues([])
        }
      }
    } catch (error) {
      console.error('Failed to load health issues:', error)
      setIssues([])
    } finally {
      setLoading(false)
    }
  }

  const totalIssues = issues.length
  const highSeverityIssues = issues.filter(i => i.severity === 'high').length
  const mediumSeverityIssues = issues.filter(i => i.severity === 'medium').length
  const lowSeverityIssues = issues.filter(i => i.severity === 'low').length

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'missing':
        return <FileX className="h-5 w-5" />
      case 'corrupted':
        return <AlertTriangle className="h-5 w-5" />
      case 'metadata':
        return <Tag className="h-5 w-5" />
      case 'duplicate':
        return <Music className="h-5 w-5" />
      case 'warning':
        return <Info className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-400 bg-red-900/20 border-red-700'
      case 'medium':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-700'
      case 'low':
        return 'text-blue-400 bg-blue-900/20 border-blue-700'
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-700'
    }
  }

  const handleScanHealth = async () => {
    try {
      setScanning(true)
      if (window.electronAPI) {
        const response = await window.electronAPI.scanLibraryHealth()
        if (Array.isArray(response)) {
          setIssues(response)
        } else if ((response as any)?.success && Array.isArray((response as any).issues)) {
          setIssues((response as any).issues)
        } else {
          setIssues([])
        }
      }
    } catch (error) {
      console.error('Failed to scan library health:', error)
    } finally {
      setScanning(false)
    }
  }

  const handleFixIssue = async (issueId: string) => {
    try {
      if (window.electronAPI) {
        const response = await window.electronAPI.fixHealthIssue(issueId)
        if (response.success) {
          setIssues(prev => prev.filter(issue => issue.id !== issueId))
          setSelectedIssues(prev => prev.filter(id => id !== issueId))
        }
      }
    } catch (error) {
      console.error('Failed to fix issue:', error)
    }
  }

  const handleFixAllSelected = async () => {
    if (selectedIssues.length === 0) return

    try {
      setFixing(true)
      for (const issueId of selectedIssues) {
        await handleFixIssue(issueId)
      }
    } finally {
      setFixing(false)
    }
  }

  const handleSelectAll = () => {
    const filteredIssues = getFilteredIssues()
    if (selectedIssues.length === filteredIssues.length) {
      setSelectedIssues([])
    } else {
      setSelectedIssues(filteredIssues.map(issue => issue.id))
    }
  }

  // const handleToggleIssue = (issueId: string) => {
  //   setSelectedIssues(prev =>
  //     prev.includes(issueId)
  //       ? prev.filter(id => id !== issueId)
  //       : [...prev, issueId]
  //   )
  // }

  const getFilteredIssues = () => {
    let filtered = issues

    if (filterBySeverity) {
      filtered = filtered.filter(issue => issue.severity === filterBySeverity)
    }

    if (filterByType) {
      filtered = filtered.filter(issue => issue.type === filterByType)
    }

    return filtered
  }

  const selectedIssueData = issues.find(i => i.id === selectedIssue)
  const filteredIssues = getFilteredIssues()
  const allFilteredSelected = filteredIssues.length > 0 && selectedIssues.length === filteredIssues.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Library Health & Duplicates</h2>
          <p className="text-gray-400">Keep your DJ collection clean and performance-ready</p>
        </div>

        <button
          onClick={handleScanHealth}
          disabled={scanning}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
        >
          {scanning ? (
            <>
              <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 inline mr-2" />
              Scan Health
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('health')}
          className={clsx(
            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'health'
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          Health Issues
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={clsx(
            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'duplicates'
              ? 'bg-primary-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          )}
        >
          Duplicates
        </button>
      </div>

      {activeTab === 'health' && (
      <>
      {/* Health Overview - Clickable Filters */}
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => {
            setFilterBySeverity(null)
            setFilterByType(null)
          }}
          className={clsx(
            "bg-gray-800 rounded-lg p-4 text-left transition-all hover:bg-gray-700",
            !filterBySeverity && !filterByType && "ring-2 ring-primary-500"
          )}
        >
          <div className="flex items-center space-x-3">
            <Activity className="h-8 w-8 text-primary-400" />
            <div>
              <div className="text-2xl font-bold">{loading ? '...' : totalIssues}</div>
              <div className="text-sm text-gray-400">Total Issues</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setFilterBySeverity(filterBySeverity === 'high' ? null : 'high')
            setFilterByType(null)
          }}
          className={clsx(
            "bg-gray-800 rounded-lg p-4 text-left transition-all hover:bg-gray-700",
            filterBySeverity === 'high' && "ring-2 ring-red-500"
          )}
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div>
              <div className="text-2xl font-bold text-red-400">{loading ? '...' : highSeverityIssues}</div>
              <div className="text-sm text-gray-400">High Priority</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setFilterBySeverity(filterBySeverity === 'medium' ? null : 'medium')
            setFilterByType(null)
          }}
          className={clsx(
            "bg-gray-800 rounded-lg p-4 text-left transition-all hover:bg-gray-700",
            filterBySeverity === 'medium' && "ring-2 ring-yellow-500"
          )}
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-8 w-8 text-yellow-400" />
            <div>
              <div className="text-2xl font-bold text-yellow-400">{loading ? '...' : mediumSeverityIssues}</div>
              <div className="text-sm text-gray-400">Medium Priority</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setFilterBySeverity(filterBySeverity === 'low' ? null : 'low')
            setFilterByType(null)
          }}
          className={clsx(
            "bg-gray-800 rounded-lg p-4 text-left transition-all hover:bg-gray-700",
            filterBySeverity === 'low' && "ring-2 ring-blue-500"
          )}
        >
          <div className="flex items-center space-x-3">
            <Info className="h-8 w-8 text-blue-400" />
            <div>
              <div className="text-2xl font-bold text-blue-400">{loading ? '...' : lowSeverityIssues}</div>
              <div className="text-sm text-gray-400">Low Priority</div>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues List */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Health Issues ({filteredIssues.length})</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>Select All</span>
                </button>
                {selectedIssues.length > 0 && (
                  <button
                    onClick={handleFixAllSelected}
                    disabled={fixing}
                    className="flex items-center space-x-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50"
                  >
                    <Settings className="h-4 w-4" />
                    <span>
                      {fixing ? 'Fixing...' : `Fix ${selectedIssues.length} Selected`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
            {issues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue.id)}
                className={clsx(
                  'p-4 cursor-pointer hover:bg-gray-700 transition-colors',
                  selectedIssue === issue.id && 'bg-gray-700'
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className={clsx('p-2 rounded-lg border', getSeverityColor(issue.severity))}>
                    {getIssueIcon(issue.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{issue.title}</h4>
                      {issue.count && (
                        <span className="px-2 py-1 bg-gray-700 text-xs rounded">
                          {issue.count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{issue.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={clsx(
                        'px-2 py-1 text-xs rounded',
                        issue.severity === 'high' ? 'bg-red-900/30 text-red-300' :
                        issue.severity === 'medium' ? 'bg-yellow-900/30 text-yellow-300' :
                        'bg-blue-900/30 text-blue-300'
                      )}>
                        {issue.severity} priority
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {issues.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
              <p className="font-medium">Library is healthy!</p>
              <p className="text-sm mt-2">No issues found in your music library</p>
            </div>
          )}
        </div>

        {/* Issue Details */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
            <h3 className="font-medium">Issue Details</h3>
          </div>

          {selectedIssueData ? (
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className={clsx('p-3 rounded-lg border', getSeverityColor(selectedIssueData.severity))}>
                  {getIssueIcon(selectedIssueData.type)}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-medium">{selectedIssueData.title}</h4>
                  <p className="text-gray-400 mt-1">{selectedIssueData.description}</p>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium mb-2">Issue Type</h5>
                <p className="text-sm text-gray-400 capitalize">{selectedIssueData.type}</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h5 className="font-medium mb-2">Severity</h5>
                <span className={clsx(
                  'px-2 py-1 text-xs rounded',
                  selectedIssueData.severity === 'high' ? 'bg-red-900/30 text-red-300' :
                  selectedIssueData.severity === 'medium' ? 'bg-yellow-900/30 text-yellow-300' :
                  'bg-blue-900/30 text-blue-300'
                )}>
                  {selectedIssueData.severity} priority
                </span>
              </div>

              {selectedIssueData.suggestion && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h5 className="font-medium mb-2 text-blue-300">Suggested Action</h5>
                  <p className="text-sm text-blue-200">{selectedIssueData.suggestion}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => handleFixIssue(selectedIssueData.id)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
                >
                  Fix Issue
                </button>
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors">
                  Ignore
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an issue to view details</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {activeTab === 'duplicates' && (
        <DuplicateDetection />
      )}
    </div>
  )
}