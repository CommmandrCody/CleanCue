import { Library, Activity, FileText, Scissors, Tag, Zap, Music } from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
}

const menuItems = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'analysis', label: 'Audio Analysis', icon: Activity },
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'filename', label: 'Filename Management', icon: FileText },
  { id: 'stems', label: 'Stem Separation', icon: Scissors },
  { id: 'metadata', label: 'Metadata Tagging', icon: Tag },
  { id: 'smartmix', label: 'Smart Mix & Mashup', icon: Zap },
  { id: 'djdeck', label: 'DJ Deck', icon: Music },
]

const menuItemsWithMeta = menuItems.map(item => ({
  ...item,
  disabled: ('disabled' in item ? item.disabled : false) as boolean,
  comingSoon: ('comingSoon' in item ? item.comingSoon : false) as boolean
}))

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4">
      <nav className="space-y-2">
        {menuItemsWithMeta.map((item) => {
          const Icon = item.icon
          const isLibrary = item.id === 'library'

          return (
            <div key={item.id}>
              <button
                onClick={() => !item.disabled && onViewChange(item.id)}
                disabled={item.disabled}
                className={clsx(
                  'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  item.disabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : currentView === item.id
                    ? isLibrary
                      ? 'bg-blue-600 text-white'
                      : 'bg-primary-600 text-white'
                    : isLibrary
                    ? 'text-blue-300 hover:bg-blue-900/30 hover:text-blue-200'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {item.comingSoon && (
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">Soon</span>
                )}
              </button>

              {/* Separator after Library */}
              {isLibrary && (
                <div className="my-3 border-t border-gray-600">
                  <div className="mt-3 px-3 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                    Processing
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}