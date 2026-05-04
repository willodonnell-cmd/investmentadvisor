import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const Icon = ({ d, viewBox = '0 0 24 24' }: { d: React.ReactNode; viewBox?: string }) => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={1.6}
    style={{ width: 14, height: 14, display: 'block', flexShrink: 0 }}>
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
    label: 'Paper Track', path: '/paper',
    icon: <Icon d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />,
  },
]

const STAGE_LEGEND = [
  { label: 'Live',          color: '#1E7042' },
  { label: 'Actionable',    color: '#8A4A08' },
  { label: 'Pressure Test', color: '#2A4A90' },
  { label: 'Hypothesis',    color: '#5A2890' },
  { label: 'Watch',         color: '#1A6868' },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const [expanded, setExpanded] = useState(true)
  const width = expanded ? 196 : 52

  return (
    <nav
      style={{
        width,
        flexShrink: 0,
        background: 'linear-gradient(180deg, #1E1A14 0%, #191510 100%)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.30), 1px 0 0 rgba(0,0,0,0.20)',
        display: 'flex',
        flexDirection: 'column',
        padding: expanded ? '18px 10px 16px' : '18px 7px 16px',
        gap: 1,
        position: 'relative',
        zIndex: 2,
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), padding 0.22s',
        overflow: 'hidden',
      }}
    >
      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 10,
        padding: expanded ? '2px 4px 20px' : '2px 0 20px',
        justifyContent: expanded ? 'flex-start' : 'center',
      }}>
        <button
          onClick={() => setExpanded(e => !e)}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #C8A060 0%, #A07840 100%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 11, color: '#1A1208', letterSpacing: '0.02em',
            border: 'none', cursor: 'pointer',
            fontWeight: 400,
          }}
        >
          GD
        </button>
        {expanded && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            whiteSpace: 'nowrap',
          }}>
            Dossier
          </span>
        )}
      </div>

      {/* Workspace */}
      {expanded && <div className="nav-section">Workspace</div>}

      {NAV_ITEMS.slice(0, 3).map(item => {
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path)
        return (
          <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
            <div
              className="nav-item"
              style={{ justifyContent: expanded ? 'flex-start' : 'center' }}
              title={!expanded ? item.label : undefined}
            >
              {isActive && (
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6,
                  width: 2.5, borderRadius: 2,
                  background: 'linear-gradient(to bottom, #C8A060, #A07840)',
                }} />
              )}
              <span style={{ color: isActive ? '#F0E4C8' : undefined }}>
                {item.icon}
              </span>
              {expanded && (
                <span style={{ color: isActive ? '#F0E4C8' : undefined }}>
                  {item.label}
                </span>
              )}
            </div>
          </NavLink>
        )
      })}

      {/* Analysis */}
      {expanded && <div className="nav-section" style={{ marginTop: 8 }}>Analysis</div>}
      {!expanded && <div style={{ height: 10 }} />}

      {NAV_ITEMS.slice(3).map(item => {
        const isActive = location.pathname.startsWith(item.path)
        return (
          <NavLink key={item.path} to={item.path} style={{ textDecoration: 'none' }}>
            <div
              className="nav-item"
              style={{ justifyContent: expanded ? 'flex-start' : 'center' }}
              title={!expanded ? item.label : undefined}
            >
              {isActive && (
                <span style={{
                  position: 'absolute', left: 0, top: 6, bottom: 6,
                  width: 2.5, borderRadius: 2,
                  background: 'linear-gradient(to bottom, #C8A060, #A07840)',
                }} />
              )}
              <span style={{ color: isActive ? '#F0E4C8' : undefined }}>
                {item.icon}
              </span>
              {expanded && (
                <span style={{ color: isActive ? '#F0E4C8' : undefined }}>
                  {item.label}
                </span>
              )}
            </div>
          </NavLink>
        )
      })}

      {/* Stage legend */}
      {expanded && (
        <div style={{
          marginTop: 'auto',
          paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div className="nav-section" style={{ paddingTop: 0, paddingBottom: 8 }}>Stage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
            {STAGE_LEGEND.map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 10.5, color: 'rgba(255,255,255,0.38)',
              }}>
                <div style={{
                  width: 12, height: 3, borderRadius: 2,
                  background: s.color, flexShrink: 0, opacity: 0.9,
                }} />
                {s.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
