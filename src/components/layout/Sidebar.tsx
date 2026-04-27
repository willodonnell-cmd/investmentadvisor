import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

interface NavItem {
  label: string
  path: string
  icon: string
  phase: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Desk',       path: '/',           icon: '⬡',  phase: 1 },
  { label: 'Brainstorm', path: '/brainstorm', icon: '◎',  phase: 2 },
  { label: 'Theses',     path: '/theses',     icon: '▤',  phase: 2 },
  { label: 'Compare',    path: '/compare',    icon: '⇄',  phase: 3 },
  { label: 'Decisions',  path: '/decision',   icon: '◈',  phase: 4 },
  { label: 'Portfolio',  path: '/portfolio',  icon: '◩',  phase: 5 },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <nav className="w-[56px] flex flex-col items-center py-4 gap-1 bg-background border-r border-border flex-shrink-0">
      <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
        <span className="text-accent text-xs font-bold">I</span>
      </div>

      {NAV_ITEMS.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path)

        return (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 group relative
              ${isActive
                ? 'bg-surface-2 text-text-primary border border-border shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface'
              }`}
          >
            <span className="text-sm">{item.icon}</span>
            <span className="absolute left-full ml-2 px-2 py-1 bg-surface-2 text-text-primary text-xs rounded border border-border
              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {item.label}
              {item.phase > 1 && (
                <span className="ml-1 text-text-muted">P{item.phase}</span>
              )}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
