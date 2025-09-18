import { Disc, Search, Settings } from 'lucide-react'

interface HeaderProps {
  onScan: () => void
}

export function Header({ onScan }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Disc className="h-8 w-8 text-primary-500" />
          <div>
            <h1 className="text-xl font-bold">CleanCue</h1>
            <p className="text-sm text-gray-400">DJ Library Manager</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={onScan}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-md text-sm font-medium transition-colors"
          >
            <Search className="h-4 w-4 inline mr-2" />
            Scan Library
          </button>

          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}