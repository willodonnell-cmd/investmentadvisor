import React, { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { OpenAIModelSelect } from '../ui/OpenAIModelSelect'
import { Sunburst } from '../ui/Sunburst'
import { getEnvLabel } from '../../lib/envLabel'
import { useThesisStore } from '../../store/thesisStore'
import { useCompareStore } from '../../store/compareStore'
import { useHuntStore } from '../../store/huntStore'
import { useBrainstormStore, isBrainstormCanvasRunning, brainstormPhaseLabel } from '../../store/brainstormStore'

const REASONING_LEVELS = ['Low', 'Med', 'High'] as const
type ReasoningLevel = typeof REASONING_LEVELS[number]

const STAGE_COLORS = {
  Developing: '#4a1d6b',
  Actionable: '#92400e',
  Live: '#2d6a4f',
}

function CountChip({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <span style={{
      marginLeft: 'auto',
      fontFamily: 'GeistMono, monospace',
      fontSize: 10.5,
      fontWeight: 500,
      color: '#8b8980',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 99,
      padding: '1px 7px',
      lineHeight: 1.5,
    }}>
      {n}
    </span>
  )
}

function StatusDot({ running }: { running: boolean }) {
  if (!running) return null
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%',
      background: '#f4922c',
      flexShrink: 0,
      marginLeft: 4,
      animation: 'huntPulse 1.4s ease-in-out infinite',
    }} />
  )
}

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const env = getEnvLabel()
  const [reasoning, setReasoning] = useState<ReasoningLevel>('Med')

  const theses = useThesisStore((s) => s.theses)
  const developing = Object.values(theses).filter((t) => t.stage === 'Developing').length
  const actionable = Object.values(theses).filter((t) => t.stage === 'Actionable').length
  const live = Object.values(theses).filter((t) => t.stage === 'Live').length
  const totalActive = developing + actionable + live
  const compareSlots = useCompareStore((s) => s.slots.length)

  const huntRunning = useHuntStore((s) => s.isRunning)
  const isStreaming = useBrainstormStore((s) => s.isStreaming)
  const canvasPhase = useBrainstormStore((s) => s.phase)
  const canvasRunning = isBrainstormCanvasRunning(canvasPhase)
  const brainstormRunning = isStreaming || canvasRunning

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const isHuntActive = location.pathname === '/hunt'

  function NavItem({ label, path, count, running }: {
    label: string; path: string; count?: number; running?: boolean
  }) {
    const active = isActive(path)
    return (
      <NavLink to={path} style={{ textDecoration: 'none' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          height: 34,
          padding: '0 16px',
          fontSize: 13,
          fontWeight: active ? 600 : 400,
          color: active ? '#ffffff' : 'rgba(232,230,224,0.55)',
          cursor: 'pointer',
          transition: 'color 120ms ease, background 120ms ease',
          background: active
            ? 'linear-gradient(to right, rgba(244,146,44,0.14), transparent)'
            : 'transparent',
        }}
          onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
          onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
        >
          {active && (
            <span style={{
              position: 'absolute', left: 0, top: 4, bottom: 4,
              width: 3, borderRadius: '0 2px 2px 0',
              background: '#f4922c',
            }} />
          )}
          <span style={{ flex: 1 }}>{label}</span>
          {running && <StatusDot running />}
          {count !== undefined && <CountChip n={count} />}
        </div>
      </NavLink>
    )
  }

  return (
    <nav style={{
      width: 220,
      flexShrink: 0,
      background: '#1a1a1f',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      zIndex: 2,
      boxShadow: '4px 0 24px rgba(0,0,0,0.28), 1px 0 0 rgba(0,0,0,0.12)',
    }}>
      {/* Brand header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        gap: 10, padding: '0 16px', flexShrink: 0,
      }}>
        <Sunburst size={24} />
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: '0.10em',
          textTransform: 'uppercase', color: '#e8e6e0',
        }}>
          Dossier
        </span>
        <span
          title={env.detail}
          style={{
            marginLeft: 'auto',
            fontSize: 9, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', padding: '2px 6px',
            borderRadius: 4, flexShrink: 0,
            ...(env.tone === 'local'
              ? { color: '#8ecae6', background: 'rgba(142,202,230,0.12)', border: '1px solid rgba(142,202,230,0.25)' }
              : env.tone === 'prod'
                ? { color: '#f4922c', background: 'rgba(244,146,44,0.12)', border: '1px solid rgba(244,146,44,0.25)' }
                : { color: '#a8a5a0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }),
          }}
        >
          {env.label}
        </span>
      </div>

      {/* Workspace group */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '18px 16px 7px',
      }}>
        <Sunburst size={8} />
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#6b6960' }}>
          Workspace
        </span>
      </div>

      <NavItem label="Command Center" path="/" />
      <NavItem label="Build Thesis" path="/brainstorm" running={brainstormRunning} />
      <NavItem label="Search Stocks" path="/hunt?mode=stocks" count={undefined} running={huntRunning && useHuntStore.getState().mode === 'stocks'} />
      <NavItem label="Search Funds" path="/hunt?mode=funds" running={huntRunning && useHuntStore.getState().mode === 'funds'} />
      <NavItem label="Performance" path="/paper" />
      <NavItem label="Compare" path="/compare" count={compareSlots} />

      {/* Thesis Pipeline group */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '18px 16px 7px',
      }}>
        <Sunburst size={8} />
        <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#6b6960' }}>
          Thesis Pipeline
        </span>
        <CountChip n={totalActive} />
      </div>

      {(['Developing', 'Actionable', 'Live'] as const).map((stage) => {
        const count = stage === 'Developing' ? developing : stage === 'Actionable' ? actionable : live
        const color = STAGE_COLORS[stage]
        const isStageActive = location.pathname === '/' || location.search.includes(`stage=${stage}`)
        return (
          <button
            key={stage}
            onClick={() => navigate(`/?stage=${stage}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 30, padding: '0 16px 0 22px',
              background: 'none', border: 'none', cursor: 'pointer',
              textAlign: 'left', width: '100%',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: color, flexShrink: 0,
            }} />
            <span style={{ fontSize: 12, color: 'rgba(232,230,224,0.45)', flex: 1 }}>{stage}</span>
            <CountChip n={count} />
          </button>
        )
      })}

      {/* AI section */}
      <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 16 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '14px 16px 8px',
        }}>
          <Sunburst size={8} />
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#6b6960' }}>
            AI
          </span>
        </div>
        <div style={{ padding: '0 12px 10px' }}>
          <OpenAIModelSelect />
        </div>
        {/* Reasoning segmented control */}
        <div style={{ padding: '0 12px' }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#6b6960', marginBottom: 5 }}>
            Reasoning
          </div>
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 7, padding: 2, gap: 2,
          }}>
            {REASONING_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setReasoning(level)}
                style={{
                  flex: 1, padding: '4px 0',
                  borderRadius: 5, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  background: reasoning === level ? 'rgba(244,146,44,0.20)' : 'transparent',
                  color: reasoning === level ? '#f4922c' : 'rgba(232,230,224,0.40)',
                  transition: 'all 120ms ease',
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes huntPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(244,146,44,0.5); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(244,146,44,0); }
        }
      `}</style>
    </nav>
  )
}
