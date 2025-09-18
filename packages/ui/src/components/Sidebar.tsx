import { Library, Activity, Copy, BarChart3 } from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
}

const menuItems = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'duplicates', label: 'Duplicates', icon: Copy },
  { id: 'analysis', label: 'Analysis', icon: BarChart3 },
]

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={clsx(
                'w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                currentView === item.id
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}