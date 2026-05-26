import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useThesisStore } from '../store/thesisStore'
import { usePortfolioStore } from '../store/portfolioStore'
import { useMacroStore } from '../store/macroStore'
import { LifecycleStage } from '../types'
import { deleteThesisFromSystem } from '../utils/deleteThesis'
import { useTopBar } from '../store/topbarStore'
import { AskAIDock } from '../components/ui/AskAIDock'
import { Sunburst } from '../components/ui/Sunburst'
import { Thesis } from '../types'

const tk = {
  bg: '#ede9e0', surface: '#f5f2eb', surface2: '#e8e4d8', card: '#fbf8f1',
  ink: '#1a1a1f', ink2: '#3a3a42', muted: '#6b6960', muted2: '#8b8980',
  hairline: 'rgba(0,0,0,0.08)', hairline2: 'rgba(0,0,0,0.14)',
  sun2: '#f4922c', sun3: '#e0511a',
  purple: '#4a1d6b', rust: '#92400e', green: '#2d6a4f',
  neg: '#9b2c1a',
}

const STAGE_CONFIG = {
  Developing: { color: tk.purple, bg: 'rgba(74,29,107,0.06)', label: 'DEVELOPING' },
  Actionable:  { color: tk.rust,   bg: 'rgba(146,64,14,0.06)',  label: 'ACTIONABLE' },
  Live:        { color: tk.green,  bg: 'rgba(45,106,79,0.06)',  label: 'LIVE' },
}

// ── Regime label helpers ──────────────────────────────────────────────────────

function regimeVerdict(regime: ReturnType<typeof useMacroStore.getState>['regime']): string {
  const parts: string[] = []
  if (regime.creditCycle === 'LateCycle') parts.push('Late-cycle')
  else if (regime.creditCycle === 'EarlyCycle') parts.push('Early-cycle')
  if (regime.liquidity === 'Tight') parts.push('tight liquidity')
  else if (regime.liquidity === 'Ample') parts.push('ample liquidity')
  else if (regime.realRates === 'High') parts.push('high real rates')
  if (regime.policy === 'Restrictive') parts.push('restrictive policy')
  return parts.join(' · ') || 'Neutral regime'
}

function regimeStance(regime: ReturnType<typeof useMacroStore.getState>['regime']): string {
  if (regime.riskAppetite === 'RiskOff') return 'DEFENSIVE · SELECTIVE'
  if (regime.riskAppetite === 'RiskOn') return 'OFFENSIVE · BROAD'
  return 'SELECTIVE · HEDGED'
}

function cycleLabel(v: string): string {
  return v.replace('LateCycle', 'Late').replace('EarlyCycle', 'Early').replace('MidCycle', 'Mid')
}

// ── Macro regime band ─────────────────────────────────────────────────────────

function MacroBand() {
  const [expanded, setExpanded] = useState(false)
  const regime = useMacroStore((s) => s.regime)

  const indicators = [
    { label: 'RATES',     value: regime.realRates },
    { label: 'CYCLE',     value: cycleLabel(regime.creditCycle) },
    { label: 'LIQUIDITY', value: regime.liquidity },
    { label: 'RISK',      value: regime.riskAppetite === 'RiskOff' ? 'Risk-Off' : regime.riskAppetite === 'RiskOn' ? 'Risk-On' : 'Neutral' },
    { label: 'DOLLAR',    value: regime.dollar },
    { label: 'POLICY',    value: regime.policy },
  ]

  const dotColor = regime.riskAppetite === 'RiskOff' ? tk.neg
    : regime.riskAppetite === 'RiskOn' ? tk.green : tk.sun2

  return (
    <div style={{
      background: tk.surface, border: `1px solid ${tk.hairline}`,
      borderRadius: 12, marginBottom: 18, overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 0,
          minHeight: 38, cursor: 'pointer',
        }}
      >
        {/* Verdict pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 16px', borderRight: `1px solid ${tk.hairline}`, height: 38, flexShrink: 0,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
            boxShadow: `0 0 0 2px ${dotColor}30`,
          }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: tk.ink2, whiteSpace: 'nowrap' }}>
            {regimeVerdict(regime)}
          </span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em',
            color: tk.muted2, fontFamily: 'GeistMono, monospace', marginLeft: 4,
          }}>
            {regimeStance(regime)}
          </span>
        </div>

        {/* Indicator cells */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {indicators.map((ind, i) => (
            <div key={ind.label} style={{
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              padding: '0 14px', borderRight: i < indicators.length - 1 ? `1px solid ${tk.hairline}` : 'none',
              flex: 1, minWidth: 0,
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2, lineHeight: 1.2 }}>
                {ind.label}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: tk.ink, fontFamily: 'GeistMono, monospace', lineHeight: 1.3 }}>
                {ind.value}
              </span>
            </div>
          ))}
        </div>

        {/* Expand chevron */}
        <div style={{ padding: '0 14px', color: tk.muted2, fontSize: 11, flexShrink: 0 }}>
          {expanded ? '▴' : '▾'}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${tk.hairline}`,
          background: tk.surface2, padding: '12px 16px',
          fontSize: 12, color: tk.muted,
        }}>
          <p style={{ margin: 0 }}>
            Regime last updated · <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 11 }}>
              {regime.lastUpdated ? new Date(regime.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never'}
            </span>
            &nbsp;· Click <strong>Macro</strong> in the topbar to update.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Summary stats line ────────────────────────────────────────────────────────

function SummaryLine({ developing, actionable, live }: { developing: number; actionable: number; live: number }) {
  const allTheses = useThesisStore((s) => s.theses)
  const total = Object.keys(allTheses).length
  const active = developing + actionable + live

  const avgConviction = useMemo(() => {
    const activeList = Object.values(allTheses).filter(t =>
      ['Developing', 'Actionable', 'Live'].includes(t.stage)
    )
    if (!activeList.length) return 0
    const scores = activeList.map(t => {
      const raw = t.thesisQualityScore ?? t.businessQualityScore ?? 0
      return raw <= 10 ? Math.round(raw * 10) : Math.round(Math.min(raw, 100))
    })
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [allTheses])

  const stats = [
    { k: 'ACTIVE', v: active > 0 ? `${active}/${total}` : '—', mono: true },
    { k: 'AT RISK NAV', v: '—', mono: true },
    { k: 'MTD', v: '—', mono: true, color: tk.muted2 },
    { k: 'YTD', v: '—', mono: true, color: tk.muted2 },
    { k: 'AVG CONV.', v: avgConviction > 0 ? `${avgConviction}/100` : '—', mono: true },
  ]

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      borderTop: `1px solid ${tk.hairline}`,
      borderBottom: `1px solid ${tk.hairline}`,
      marginBottom: 22, background: tk.surface,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {stats.map((s, i) => (
        <div key={s.k} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          borderRight: i < stats.length - 1 ? `1px solid ${tk.hairline}` : 'none',
          flex: 1,
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2 }}>
            {s.k}
          </span>
          <span style={{
            fontFamily: s.mono ? 'GeistMono, monospace' : 'inherit',
            fontSize: 13.5, fontWeight: 600,
            color: s.color ?? tk.ink,
            letterSpacing: '-0.01em',
          }}>
            {s.v}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Thesis card ───────────────────────────────────────────────────────────────

function convictionScore(t: Thesis): number {
  const raw = t.thesisQualityScore ?? t.businessQualityScore ?? 0
  if (raw <= 10) return Math.round(raw * 10)
  return Math.round(Math.min(raw, 100))
}

function typeChip(t: Thesis): string {
  if (t.type.includes('RealEstate') || t.type.includes('Household')) return 'F'
  if (t.type.includes('Short') || t.type.includes('Hedge')) return 'S'
  return 'T'
}

function ageLabel(t: Thesis): string {
  const ms = Date.now() - new Date(t.createdAt).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d'
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

function sectorLabel(t: Thesis): { label: string; color: string; bg: string } {
  const type = t.type ?? ''
  if (type.includes('Energy')) return { label: 'ENERGY', color: '#1e4d5c', bg: '#dbeaef' }
  if (type.includes('Material') || type.includes('Lithium') || type.includes('Commodity'))
    return { label: 'COMMODITY', color: '#7a4a0c', bg: '#f0e2c4' }
  if (type.includes('RealEstate') || type.includes('REIT'))
    return { label: 'REIT', color: '#3a3650', bg: '#dedce8' }
  if (type.includes('Technology') || type.includes('AI'))
    return { label: 'TECH', color: '#1a4a36', bg: '#d5e6dc' }
  return { label: 'THESIS', color: '#56504a', bg: '#e8e4d8' }
}

function PipelineCard({ thesis, onDelete }: { thesis: Thesis; onDelete: () => void }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hovered, setHovered] = useState(false)
  const chip = typeChip(thesis)
  const score = convictionScore(thesis)
  const sector = sectorLabel(thesis)
  const convColor = score >= 70 ? tk.green : score >= 45 ? tk.sun2 : tk.neg

  return (
    <div
      style={{
        position: 'relative', borderRadius: 12, overflow: 'hidden',
        background: `linear-gradient(180deg, rgba(196,137,42,0.04) 0%, ${tk.card} 100%)`,
        border: `1px solid ${hovered ? tk.hairline2 : tk.hairline}`,
        boxShadow: hovered
          ? '0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 20px -14px rgba(0,0,0,0.18)'
          : '0 1px 0 rgba(255,255,255,0.5) inset, 0 1px 2px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      {/* Delete button */}
      {hovered && !confirmDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 2,
            width: 22, height: 22, borderRadius: 5,
            background: 'transparent', border: '1px solid transparent',
            color: tk.muted2, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 100ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(155,44,26,0.10)'
            e.currentTarget.style.borderColor = 'rgba(155,44,26,0.20)'
            e.currentTarget.style.color = tk.neg
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'transparent'
            e.currentTarget.style.color = tk.muted2
          }}
        >×</button>
      )}

      {/* Confirm overlay */}
      {confirmDelete && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3,
          background: 'rgba(251,248,241,0.95)', borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
          backdropFilter: 'blur(4px)',
        }}>
          <p style={{ fontSize: 12, color: tk.ink, fontWeight: 500 }}>Delete this thesis?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
              style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${tk.hairline2}`, background: 'transparent', fontSize: 12, cursor: 'pointer', color: tk.ink2 }}
            >Cancel</button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: tk.neg, fontSize: 12, cursor: 'pointer', color: '#fff' }}
            >Delete</button>
          </div>
        </div>
      )}

      {/* Card header strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px 8px',
        background: 'rgba(196,137,42,0.05)',
        borderBottom: `1px solid ${tk.hairline}`,
      }}>
        <span style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'rgba(196,137,42,0.14)', border: '1px solid rgba(196,137,42,0.35)',
          color: '#7a4a0c', fontSize: 9, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {chip}
        </span>
        {thesis.ticker && (
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 11.5, fontWeight: 700, color: tk.ink, letterSpacing: '0.04em' }}>
            {thesis.ticker}
          </span>
        )}
        <span style={{
          marginLeft: 'auto',
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '1px 6px', borderRadius: 3,
          color: sector.color, background: sector.bg,
        }}>
          {sector.label}
        </span>
        <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 9.5, color: tk.muted2 }}>
          #{thesis.id.slice(-3).toUpperCase()}
        </span>
      </div>

      {/* Card body */}
      <div
        onClick={() => navigate(`/thesis/${thesis.id}`)}
        style={{ padding: '14px 14px 0' }}
      >
        <p style={{ fontSize: 14.5, fontWeight: 600, color: tk.ink, lineHeight: 1.28, marginBottom: 6, letterSpacing: '-0.005em' }}>
          {thesis.name}
        </p>
        {thesis.statement && (
          <p style={{
            fontSize: 12, color: tk.muted, lineHeight: 1.55, marginBottom: 10,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {thesis.statement}
          </p>
        )}

        {/* Conviction */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2 }}>
            Conviction
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 99, background: tk.surface2, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0, right: `${100 - score}%`,
                background: `linear-gradient(90deg, ${tk.sun2}, ${tk.sun3})`,
                borderRadius: 99, transition: 'right 400ms ease',
              }} />
            </div>
            <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 19, fontWeight: 600, color: tk.ink, letterSpacing: '-0.01em', lineHeight: 1, minWidth: 30, textAlign: 'right' }}>
              {score}
            </span>
            <span style={{ fontSize: 10, color: tk.muted2, fontFamily: 'GeistMono, monospace' }}>/100</span>
          </div>
        </div>
      </div>

      {/* Card footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 12px',
        background: 'rgba(0,0,0,0.015)',
        borderTop: `1px solid ${tk.hairline}`,
        marginTop: 10,
      }}>
        <span style={{ fontSize: 10.5, color: tk.muted2, letterSpacing: '0.02em' }}>
          {thesis.type.replace(/([A-Z])/g, ' $1').trim().split(' ').slice(0, 3).join(' ')}
        </span>
        <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 10, color: tk.muted2 }}>
          {ageLabel(thesis)}
        </span>
      </div>
    </div>
  )
}

// ── Promote toast ─────────────────────────────────────────────────────────────

function PromoteToast({ thesisId, onDismiss }: { thesisId: string; onDismiss: () => void }) {
  const navigate = useNavigate()
  const thesis = useThesisStore((s) => s.theses[thesisId])
  useEffect(() => {
    const t = setTimeout(onDismiss, 7000)
    return () => clearTimeout(t)
  }, [onDismiss])

  if (!thesis) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: tk.card, border: `1px solid ${tk.hairline2}`,
      borderRadius: 99, padding: '8px 16px',
      boxShadow: '0 10px 28px -16px rgba(0,0,0,.30), 0 2px 6px rgba(0,0,0,.06)',
      position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, animation: 'toastIn 300ms ease',
    }}>
      <Sunburst size={18} />
      <span style={{ fontSize: 12.5, color: tk.ink, fontWeight: 500 }}>
        {thesis.ticker || thesis.name.split(' ').slice(0, 2).join(' ')} promoted to Developing
      </span>
      <button onClick={() => navigate(`/thesis/${thesisId}`)} style={{ fontSize: 12, fontWeight: 600, color: tk.sun2, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
        Open →
      </button>
      <button onClick={onDismiss} style={{ fontSize: 13, color: tk.muted2, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>
        ×
      </button>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export const InvestmentDesk: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const stageFilter = searchParams.get('stage') as LifecycleStage | null

  const getThesisByStage = useThesisStore((s) => s.getThesisByStage)
  const advanceLifecycle = useThesisStore((s) => s.advanceLifecycle)
  const justPromotedId = useThesisStore((s) => s.justPromotedId)
  const clearJustPromoted = useThesisStore((s) => s.clearJustPromoted)
  const lens = usePortfolioStore((s) => s.lens)

  const developing = useMemo(() => getThesisByStage('Developing'), [getThesisByStage])
  const actionable  = useMemo(() => getThesisByStage('Actionable'),  [getThesisByStage])
  const live        = useMemo(() => getThesisByStage('Live'),        [getThesisByStage])

  const columns = [
    { stage: 'Developing' as LifecycleStage, theses: developing },
    { stage: 'Actionable' as LifecycleStage, theses: actionable },
    { stage: 'Live'       as LifecycleStage, theses: live       },
  ]

  const [dragging, setDragging] = useState<{ id: string; from: LifecycleStage } | null>(null)
  const [dragOver, setDragOver] = useState<LifecycleStage | null>(null)

  useTopBar({
    title: 'Command Center',
    crumb: lens !== 'Standalone' ? 'Prologis-aware lens active' : undefined,
  })

  const handleDelete = (id: string, name: string) => deleteThesisFromSystem(id, name)

  return (
    <div style={{ padding: '18px 24px 40px', minWidth: 1100 }}>
      {justPromotedId && (
        <PromoteToast thesisId={justPromotedId} onDismiss={clearJustPromoted} />
      )}

      {/* Macro regime band */}
      <MacroBand />

      {/* Portfolio summary line */}
      <SummaryLine developing={developing.length} actionable={actionable.length} live={live.length} />

      {/* Thesis Pipeline header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase',
          color: tk.muted2,
        }}>
          Thesis Pipeline
        </span>
        <span style={{
          fontFamily: 'GeistMono, monospace', fontSize: 10.5, color: tk.muted2,
          background: tk.surface, border: `1px solid ${tk.hairline}`,
          borderRadius: 99, padding: '1px 8px',
        }}>
          {developing.length + actionable.length + live.length}
        </span>
      </div>

      {/* 3-column Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, alignItems: 'start' }}>
        {columns.map(({ stage, theses }) => {
          const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]
          const isOver = dragOver === stage
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragging && dragging.from !== stage) {
                  advanceLifecycle(dragging.id, stage, `Moved to ${stage} via pipeline`)
                }
                setDragging(null); setDragOver(null)
              }}
              style={{
                borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${isOver ? cfg.color + '50' : tk.hairline}`,
                background: tk.surface,
                transition: 'border-color 150ms ease',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '13px 16px 12px',
                borderLeft: `3px solid ${cfg.color}`,
                background: cfg.bg,
                borderBottom: `1px solid ${tk.hairline}`,
                display: 'flex', alignItems: 'center',
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
                  color: cfg.color, textTransform: 'uppercase', flex: 1,
                }}>
                  {cfg.label}
                </span>
                <span style={{
                  fontFamily: 'GeistMono, monospace', fontSize: 11, fontWeight: 700,
                  color: cfg.color,
                  background: cfg.color + '18', border: `1px solid ${cfg.color}30`,
                  borderRadius: 99, padding: '1px 8px',
                }}>
                  {theses.length}
                </span>
              </div>

              {/* Cards body */}
              <div style={{ padding: '14px 12px 4px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {theses.length === 0 ? (
                  <div style={{
                    minHeight: 80, border: `1.5px dashed rgba(0,0,0,0.10)`,
                    borderRadius: 10, display: 'flex', alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <p style={{ fontSize: 12, color: tk.muted2 }}>No theses</p>
                  </div>
                ) : (
                  theses.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDragging({ id: t.id, from: stage })}
                      onDragEnd={() => { setDragging(null); setDragOver(null) }}
                      style={{ opacity: dragging?.id === t.id ? 0.4 : 1, transition: 'opacity 150ms' }}
                    >
                      <PipelineCard thesis={t} onDelete={() => handleDelete(t.id, t.name)} />
                    </div>
                  ))
                )}

                {/* Column footer CTA */}
                <button
                  onClick={() => navigate('/brainstorm')}
                  style={{
                    width: '100%', padding: '10px 0',
                    border: `1.5px dashed rgba(0,0,0,0.10)`, borderRadius: 8,
                    background: 'transparent', cursor: 'pointer',
                    fontSize: 12, color: tk.muted2, marginBottom: 12,
                    transition: 'border-color 150ms, color 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = cfg.color + '50'
                    e.currentTarget.style.color = cfg.color
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
                    e.currentTarget.style.color = tk.muted2
                  }}
                >
                  {stage === 'Developing' ? '+ New hypothesis'
                    : stage === 'Actionable' ? '+ Promote from Developing'
                    : '+ Promote from Actionable'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <AskAIDock
        context="about your pipeline"
        starterQuestions={[
          'Which thesis has the most signal convergence right now?',
          'What should I promote from Developing to Actionable?',
          'Are any theses overdue for reassessment?',
          'Where is the conviction decaying fastest?',
        ]}
      />

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
