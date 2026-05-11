import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { OpenAIModelSelect } from '../ui/OpenAIModelSelect'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const Icon = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
    style={{ width: 16, height: 16, display: 'block', flexShrink: 0 }}>
    {d}
  </svg>
)

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Desk', path: '/',
    icon: <Icon d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} />,
  },
  {
    label: 'Brainstorm', path: '/brainstorm',
    icon: <Icon d={<path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2z"/>} />,
  },
  {
    label: 'Theses', path: '/theses',
    icon: <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} />,
  },
  {
    label: 'Compare', path: '/compare',
    icon: <Icon d={<><line x1="12" y1="3" x2="12" y2="21"/><path d="m3 8 9-5 9 5"/><path d="M3 16l9 5 9-5"/></>} />,
  },
  {
    label: 'Decisions', path: '/decision',
    icon: <Icon d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />,
  },
  {
    label: 'Portfolio', path: '/portfolio',
    icon: <Icon d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>} />,
  },
  {
    label: 'Performance', path: '/paper',
    icon: <Icon d={<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>} />,
  },
]

const STAGE_LEGEND = [
  { label: 'Live',          color: '#2d6a4f' },
  { label: 'Actionable',    color: '#92400e' },
  { label: 'Pressure Test', color: '#1e3a5f' },
  { label: 'Hypothesis',    color: '#4a1d6b' },
  { label: 'Watch',         color: '#1e4d6b' },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <nav style={{
      width: 210,
      flexShrink: 0,
      background: '#1a1a1f',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 2,
      boxShadow: '4px 0 24px rgba(0,0,0,0.28), 1px 0 0 rgba(0,0,0,0.12)',
    }}>
      {/* Identity header */}
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          flexShrink: 0,
          background: 'radial-gradient(circle at 40% 40%, #d4a843 0%, #c4892a 45%, #a86e1a 100%)',
        }} />
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: '#e8e6e0',
        }}>
          Dossier
        </span>
      </div>

      {/* Workspace */}
      <div className="nav-section">Workspace</div>

      {NAV_ITEMS.slice(0, 3).map(item => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path)
        return (
          <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
            <div className="nav-item" style={{ color: isActive ? '#ffffff' : undefined }}>
              {isActive && (
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6,
                  width: 3, borderRadius: '0 2px 2px 0',
                  background: '#ffffff',
                }} />
              )}
              <span style={{ opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>
              {item.label}
            </div>
          </NavLink>
        )
      })}

      <div className="nav-section">Analysis</div>

      {NAV_ITEMS.slice(3).map(item => {
        const isActive = location.pathname.startsWith(item.path)
        return (
          <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
            <div className="nav-item" style={{ color: isActive ? '#ffffff' : undefined }}>
              {isActive && (
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6,
                  width: 3, borderRadius: '0 2px 2px 0',
                  background: '#ffffff',
                }} />
              )}
              <span style={{ opacity: isActive ? 1 : 0.55 }}>{item.icon}</span>
              {item.label}
            </div>
          </NavLink>
        )
      })}

      {/* Stage legend */}
      <div style={{
        marginTop: 'auto',
        padding: '0 0 20px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div className="nav-section" style={{ padding: '16px 16px 8px' }}>AI</div>
        <div style={{ padding: '0 16px 14px' }}>
          <OpenAIModelSelect />
        </div>
        <div className="nav-section" style={{ padding: '8px 16px 10px' }}>Stage</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '0 16px 24px' }}>
          {STAGE_LEGEND.map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 11, color: '#6b6860',
            }}>
              <div style={{
                width: 12, height: 3, borderRadius: 2,
                background: s.color, flexShrink: 0,
              }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
