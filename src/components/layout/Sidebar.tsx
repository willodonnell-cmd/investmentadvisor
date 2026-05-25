import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { OpenAIModelSelect } from '../ui/OpenAIModelSelect'
import { getEnvLabel } from '../../lib/envLabel'
import { useBrainstormStore, isBrainstormCanvasRunning, brainstormPhaseLabel } from '../../store/brainstormStore'
import { useHuntStore } from '../../store/huntStore'

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
    label: 'Hunt', path: '/hunt',
    icon: <Icon d={<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>} />,
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
  {
    label: 'Workspace', path: '/workspace',
    icon: <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>} />,
  },
]

const STAGE_LEGEND = [
  { label: 'Live',          color: '#2d6a4f' },
  { label: 'Actionable',    color: '#92400e' },
  { label: 'Developing',    color: '#4a1d6b' },
]

const HuntStatusDot: React.FC<{ running: boolean; completed: boolean; phase: string }> = ({ running, completed, phase }) => {
  if (!running && !completed) return null
  const color = running ? '#ff6b6b' : '#2e6e4a'
  return (
    <span
      title={running ? phase : 'Hunt complete'}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        marginLeft: 'auto',
        animation: running ? 'huntPulse 1.4s ease-in-out infinite' : undefined,
        boxShadow: running ? '0 0 0 0 rgba(255,107,107,0.5)' : undefined,
      }}
    />
  )
}

const BrainstormStatusDot: React.FC<{ running: boolean; completed: boolean; phase: string }> = ({ running, completed, phase }) => {
  if (!running && !completed) return null
  const color = running ? '#ff6b6b' : '#2e6e4a'
  return (
    <span
      title={running ? phase : 'Brainstorm complete'}
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        marginLeft: 'auto',
        animation: running ? 'huntPulse 1.4s ease-in-out infinite' : undefined,
        boxShadow: running ? '0 0 0 0 rgba(255,107,107,0.5)' : undefined,
      }}
    />
  )
}

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const env = getEnvLabel()
  const isRunning = useHuntStore((s) => s.isRunning)
  const phase = useHuntStore((s) => s.phase)
  const justCompleted = useHuntStore((s) => s.justCompleted)
  const isStreaming = useBrainstormStore((s) => s.isStreaming)
  const canvasPhase = useBrainstormStore((s) => s.phase)
  const brainstormJustCompleted = useBrainstormStore((s) => s.justCompleted)
  const canvasRunning = isBrainstormCanvasRunning(canvasPhase)
  const brainstormRunning = isStreaming || canvasRunning
  const brainstormPhase = brainstormPhaseLabel(canvasPhase, isStreaming)

  const renderNavItem = (item: NavItem) => {
    const isActive = item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path)
    const isHunt = item.path === '/hunt'
    const isBrainstorm = item.path === '/brainstorm'
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
          {isBrainstorm && (
            <BrainstormStatusDot
              running={brainstormRunning}
              completed={brainstormJustCompleted && !brainstormRunning}
              phase={brainstormPhase}
            />
          )}
          {isHunt && (
            <HuntStatusDot running={isRunning} completed={justCompleted} phase={phase} />
          )}
        </div>
      </NavLink>
    )
  }

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
        <span
          title={env.detail}
          style={{
            marginLeft: 'auto',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 7px',
            borderRadius: 4,
            flexShrink: 0,
            ...(env.tone === 'local'
              ? { color: '#8ecae6', background: 'rgba(142,202,230,0.12)', border: '1px solid rgba(142,202,230,0.25)' }
              : env.tone === 'prod'
                ? { color: '#d4a843', background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.25)' }
                : { color: '#a8a5a0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }),
          }}
        >
          {env.label}
        </span>
      </div>

      {/* Workspace */}
      <div className="nav-section">Workspace</div>

      {NAV_ITEMS.slice(0, 3).map(renderNavItem)}

      <div className="nav-section">Analysis</div>

      {NAV_ITEMS.slice(3).map(renderNavItem)}

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
      <style>{`
        @keyframes huntPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(255,107,107,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(255,107,107,0); }
        }
      `}</style>
    </nav>
  )
}
