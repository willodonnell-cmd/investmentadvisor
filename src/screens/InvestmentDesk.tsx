import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThesisStore, useSignalStore, usePortfolioStore } from '../store'
import { ThesisCard } from '../components/cards/ThesisCard'
import { LifecycleBadge } from '../components/ui/Badge'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { LifecycleStage, ThesisLens } from '../types'
import { detectConvergence, detectDivergence } from '../api/signals'
import { computePrologisOverlap, PrologisOverlapLabel } from '../api/correlation'
import { canAdvanceTo } from '../utils/thesisHelpers'
import { MISPRICED_VARIABLE_LABELS } from '../constants'

const PIPELINE_STAGES: LifecycleStage[] = [
  'Signal', 'Hypothesis', 'PressureTest', 'Actionable', 'Watch', 'Live',
]

const STAGE_ACCENT: Record<LifecycleStage, string> = {
  Signal:       '#A8A098',
  Hypothesis:   'linear-gradient(to right, #683890, #502878)',
  PressureTest: 'linear-gradient(to right, #385A98, #284878)',
  Actionable:   'linear-gradient(to right, #A05818, #804010)',
  Watch:        'linear-gradient(to right, #227070, #185858)',
  Live:         'linear-gradient(to right, #3A8058, #2A6040)',
  PlayedOut:    '#A8A098',
  Broken:       '#A83030',
  Archived:     '#C8C0B4',
}

const OVERLAP_STYLE: Record<PrologisOverlapLabel, { bg: string; color: string; dot: string }> = {
  High:   { bg: 'rgba(160,40,40,0.10)',  color: '#A02828', dot: '#A02828' },
  Medium: { bg: 'rgba(122,74,16,0.10)',  color: '#7A4A10', dot: '#7A4A10' },
  Low:    { bg: 'rgba(20,12,4,0.06)',    color: '#706050', dot: '#A89878' },
  Hedge:  { bg: 'rgba(30,112,66,0.10)', color: '#1E7042', dot: '#1E7042' },
}

const OVERLAP_LABEL_TEXT: Record<PrologisOverlapLabel, string> = {
  High: 'High Corr', Medium: 'Med Corr', Low: 'Low Corr', Hedge: 'Hedge',
}

function OverlapPill({ label }: { label: PrologisOverlapLabel }) {
  const s = OVERLAP_STYLE[label]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: s.bg, color: s.color,
      fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
      borderRadius: 4, padding: '2px 5px', flexShrink: 0,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.dot }} />
      {OVERLAP_LABEL_TEXT[label]}
    </span>
  )
}

const BANNER_CONFIG: Record<Exclude<ThesisLens, 'Standalone'>, {
  title: string; desc: string; color: string; bg: string; border: string
}> = {
  PrologisAware: {
    title: 'Prologis-Aware Overlay',
    desc: '35% synthetic household weight applied · Macro drivers: Real Asset Repricing · Consumer Health · Rates · Overlap shown per thesis',
    color: '#7A4A10',
    bg: 'rgba(122,74,16,0.05)',
    border: 'rgba(122,74,16,0.20)',
  },
  CompareVsPrologis: {
    title: 'vs Prologis Mode',
    desc: 'Theses sized at −20% vs direct Prologis allocation · Real-asset theses are most direct alternatives · Overlap shown per thesis',
    color: '#2A4A90',
    bg: 'rgba(42,74,144,0.05)',
    border: 'rgba(42,74,144,0.20)',
  },
}

function PrologisContextBanner({ lens }: { lens: Exclude<ThesisLens, 'Standalone'> }) {
  const cfg = BANNER_CONFIG[lens]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 8, padding: '8px 14px',
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.color, flexShrink: 0,
      }} />
      <div>
        <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 8 }}>
          {cfg.title}
        </span>
        <span style={{ fontSize: 10.5, color: '#706050' }}>{cfg.desc}</span>
      </div>
    </div>
  )
}

type EvidenceSort = 'score' | 'direction' | 'convergence' | 'lastSignal'

function EvidenceDashboard() {
  const navigate = useNavigate()
  const thesesRecord = useThesisStore((s) => s.theses)
  const signalsRecord = useSignalStore((s) => s.signals)
  const compositesRecord = useSignalStore((s) => s.composites)
  const lens = usePortfolioStore((s) => s.lens)

  const [sort, setSort] = useState<EvidenceSort>('score')

  const showPrologis = lens !== 'Standalone'

  const activeTheses = useMemo(
    () =>
      Object.values(thesesRecord).filter(
        (t) => !['Broken', 'Archived', 'PlayedOut'].includes(t.stage),
      ),
    [thesesRecord],
  )

  const allSignals = useMemo(() => Object.values(signalsRecord), [signalsRecord])
  const allComposites = useMemo(() => Object.values(compositesRecord), [compositesRecord])

  const rows = useMemo(() => {
    return activeTheses.map((t) => {
      const thesisSignals = allSignals.filter((s) => s.linkedThesisId === t.id)
      const thesisComposites = allComposites.filter((c) => c.linkedThesisId === t.id)

      const primaryComposite = thesisComposites.find(
        (c) => c.variable === t.primaryMispricedVariable,
      )
      const compositeScore = primaryComposite?.compositeScore ?? 0
      const overallScore =
        thesisComposites.length > 0
          ? thesisComposites.reduce((s, c) => s + c.compositeScore, 0) / thesisComposites.length
          : 0

      const lastSignal = thesisSignals.reduce<Date | null>((latest, s) => {
        const d = new Date(s.observedAt)
        return !latest || d > latest ? d : latest
      }, null)
      const daysSinceLast = lastSignal
        ? Math.floor((Date.now() - lastSignal.getTime()) / 86_400_000)
        : null

      const convergenceAlerts = detectConvergence(thesisSignals, t.id)
      const divergenceFlags = detectDivergence(thesisSignals, t.id)

      const cascadeAlert =
        convergenceAlerts.length >= 3 ||
        (convergenceAlerts.length >= 2 && divergenceFlags.length === 0)

      const direction =
        overallScore > 1 ? 'Strengthening' : overallScore < -1 ? 'Weakening' : 'Stable'

      const prologisOverlap = computePrologisOverlap(t)

      return {
        thesis: t,
        compositeScore: overallScore,
        primaryCompositeScore: compositeScore,
        direction,
        convergenceCount: convergenceAlerts.length,
        divergenceCount: divergenceFlags.length,
        daysSinceLast,
        cascadeAlert,
        signalCount: thesisSignals.length,
        prologisOverlap,
      }
    })
  }, [activeTheses, allSignals, allComposites])

  const sorted = useMemo(() => {
    const copy = [...rows]
    if (sort === 'score') return copy.sort((a, b) => b.compositeScore - a.compositeScore)
    if (sort === 'direction') {
      const order = { Strengthening: 0, Stable: 1, Weakening: 2 }
      return copy.sort((a, b) => order[a.direction as keyof typeof order] - order[b.direction as keyof typeof order])
    }
    if (sort === 'convergence') {
      return copy.sort((a, b) => b.convergenceCount - a.convergenceCount)
    }
    if (sort === 'lastSignal') {
      return copy.sort((a, b) => {
        if (a.daysSinceLast === null) return 1
        if (b.daysSinceLast === null) return -1
        return a.daysSinceLast - b.daysSinceLast
      })
    }
    return copy
  }, [rows, sort])

  const DIR_STYLES = {
    Strengthening: { color: 'text-success', arrow: '↑', barColor: '#2E6E4A' },
    Stable:        { color: 'text-text-secondary', arrow: '→', barColor: '#9A7A50' },
    Weakening:     { color: 'text-danger', arrow: '↓', barColor: '#A83030' },
  }

  const SORT_OPTS: { value: EvidenceSort; label: string }[] = [
    { value: 'score', label: 'Score' },
    { value: 'direction', label: 'Direction' },
    { value: 'convergence', label: 'Convergence' },
    { value: 'lastSignal', label: 'Freshness' },
  ]

  if (activeTheses.length === 0) return null

  const gridCols = showPrologis
    ? 'grid-cols-[2fr_1.2fr_80px_70px_100px_80px_80px]'
    : 'grid-cols-[2fr_1.2fr_80px_100px_80px_80px]'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Evidence Dashboard
          </h2>
          <span className="text-[10px] text-text-muted">
            {rows.filter((r) => r.signalCount > 0).length} of {rows.length} theses with signals
          </span>
        </div>
        <div className="flex gap-1.5">
          {SORT_OPTS.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              style={sort === o.value ? {
                borderColor: 'rgba(154,122,80,0.5)',
                color: '#1A1410',
                background: 'rgba(154,122,80,0.10)',
              } : {
                borderColor: '#D8D0C4',
                color: '#A8A098',
              }}
              className="px-2 py-1 text-[10px] rounded border transition-colors hover:border-accent/40"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        borderRadius: 10,
        overflow: 'hidden',
        background: '#FDFCF9',
        boxShadow: '0 0 0 1px rgba(20,12,4,0.06), 0 1px 3px rgba(20,12,4,0.06), 0 4px 12px rgba(20,12,4,0.07)',
      }}>
        {/* Header */}
        <div className={`grid ${gridCols} gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-text-muted`}
          style={{ background: '#F5F2EC', borderBottom: '1px solid rgba(20,12,4,0.07)' }}>
          <span>Thesis</span>
          <span>Primary Variable</span>
          <span className="text-right">Score</span>
          {showPrologis && <span>P-Corr</span>}
          <span>Direction</span>
          <span>Status</span>
          <span className="text-right">Last Signal</span>
        </div>

        {sorted.map((row, idx) => {
          const dir = DIR_STYLES[row.direction as keyof typeof DIR_STYLES]
          const barPct = ((row.compositeScore + 10) / 20) * 100

          return (
            <button
              key={row.thesis.id}
              onClick={() => navigate(`/thesis/${row.thesis.id}`)}
              className={`w-full text-left grid ${gridCols} gap-2 px-4 py-2.5 transition-colors`}
              style={{
                background: '#FDFCF9',
                borderBottom: idx < sorted.length - 1 ? '1px solid rgba(20,12,4,0.05)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8F4EF')}
              onMouseLeave={e => (e.currentTarget.style.background = '#FDFCF9')}
            >
              {/* Name */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {row.cascadeAlert && (
                    <span style={{
                      fontSize: 9, background: 'rgba(154,122,80,0.15)',
                      border: '1px solid rgba(154,122,80,0.35)', color: '#7A5A38',
                      borderRadius: 3, padding: '1px 4px', flexShrink: 0,
                    }}>
                      CASCADE
                    </span>
                  )}
                  <p className="text-xs text-text-primary font-medium truncate">{row.thesis.name}</p>
                </div>
                <p className="text-[10px] text-text-muted">{row.thesis.type}</p>
              </div>

              {/* Primary variable */}
              <span className="text-[11px] text-text-muted self-center truncate">
                {MISPRICED_VARIABLE_LABELS[row.thesis.primaryMispricedVariable] ?? row.thesis.primaryMispricedVariable}
              </span>

              {/* Score bar */}
              <div className="self-center">
                <div className="relative h-1.5 rounded-full overflow-hidden w-full"
                  style={{ background: '#D8D0C4' }}>
                  <div className="absolute top-0 left-1/2 h-full w-px" style={{ background: '#C0B8AC' }} />
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      background: dir.barColor + 'AA',
                      left: row.compositeScore >= 0 ? '50%' : `${barPct}%`,
                      width: `${Math.abs(row.compositeScore) / 20 * 100}%`,
                    }}
                  />
                </div>
                <p className={`text-[10px] font-mono text-right mt-0.5 ${dir.color}`}>
                  {row.compositeScore > 0 ? '+' : ''}{row.compositeScore.toFixed(1)}
                </p>
              </div>

              {/* Prologis overlap */}
              {showPrologis && (
                <div className="self-center">
                  <OverlapPill label={row.prologisOverlap.label} />
                </div>
              )}

              {/* Direction */}
              <div className="self-center flex items-center gap-1.5">
                <span className={`text-sm ${dir.color}`}>{dir.arrow}</span>
                <span className={`text-[11px] ${dir.color}`}>{row.direction}</span>
              </div>

              {/* Status badges */}
              <div className="self-center flex flex-wrap gap-1">
                {row.convergenceCount > 0 && (
                  <span style={{
                    fontSize: 9, background: 'rgba(46,110,74,0.12)',
                    border: '1px solid rgba(46,110,74,0.30)', color: '#2E6E4A',
                    borderRadius: 3, padding: '1px 4px',
                  }}>
                    ⚡ {row.convergenceCount}
                  </span>
                )}
                {row.divergenceCount > 0 && (
                  <span style={{
                    fontSize: 9, background: 'rgba(122,74,16,0.12)',
                    border: '1px solid rgba(122,74,16,0.30)', color: '#7A4A10',
                    borderRadius: 3, padding: '1px 4px',
                  }}>
                    ⚠ {row.divergenceCount}
                  </span>
                )}
                {row.signalCount === 0 && (
                  <span className="text-[9px] text-text-muted">—</span>
                )}
              </div>

              {/* Days since last signal */}
              <div className="self-center text-right">
                <p className={`text-[11px] ${
                  row.daysSinceLast === null ? 'text-text-muted' :
                  row.daysSinceLast > 30 ? 'text-danger' :
                  row.daysSinceLast > 14 ? 'text-warning' : 'text-text-secondary'
                }`}>
                  {row.daysSinceLast === null ? '—' : `${row.daysSinceLast}d ago`}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const InvestmentDesk: React.FC = () => {
  const navigate = useNavigate()
  const thesesRecord = useThesisStore((s) => s.theses)
  const getActiveTheses = useThesisStore((s) => s.getActiveTheses)
  const getThesisByStage = useThesisStore((s) => s.getThesisByStage)
  const advanceLifecycle = useThesisStore((s) => s.advanceLifecycle)
  const lens = usePortfolioStore((s) => s.lens)

  const [dragging, setDragging] = useState<{ id: string; fromStage: LifecycleStage } | null>(null)
  const [dragOverStage, setDragOverStage] = useState<LifecycleStage | null>(null)

  const activeTheses = getActiveTheses()
  const liveAndActionable = activeTheses.filter(
    (t) => t.stage === 'Live' || t.stage === 'Actionable',
  )
  const totalActive = activeTheses.length
  const showPrologis = lens !== 'Standalone'

  const isValidDrop = (toStage: LifecycleStage) =>
    dragging != null && canAdvanceTo(dragging.fromStage, toStage)

  const handleDrop = (toStage: LifecycleStage) => {
    if (dragging && canAdvanceTo(dragging.fromStage, toStage)) {
      advanceLifecycle(dragging.id, toStage, `Moved to ${toStage} via pipeline`)
    }
    setDragging(null)
    setDragOverStage(null)
  }

  return (
    <div className="p-5 space-y-4 max-w-[1400px]">

      {/* Prologis context banner */}
      {showPrologis && (
        <PrologisContextBanner lens={lens as Exclude<ThesisLens, 'Standalone'>} />
      )}

      {/* Active Theses Rail */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Active Theses
          </h2>
          <span className="text-xs text-text-muted">
            {liveAndActionable.length} live / actionable · {totalActive} total active
          </span>
        </div>
        {liveAndActionable.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {liveAndActionable.map((thesis) => {
              const overlap = showPrologis ? computePrologisOverlap(thesis) : null
              return (
                <div key={thesis.id} className="flex-shrink-0 w-[260px]">
                  <ThesisCard thesis={thesis} compact />
                  {overlap && (
                    <div style={{ marginTop: 4, paddingLeft: 2 }}>
                      <OverlapPill label={overlap.label} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{
            height: 88, borderRadius: 10,
            border: '1.5px dashed #D8D0C4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p className="text-xs text-text-muted">
              {Object.keys(thesesRecord).length === 0
                ? 'No theses yet — start in Brainstorm'
                : 'No live or actionable theses'}
            </p>
          </div>
        )}
      </section>

      {/* Evidence Dashboard */}
      <section>
        <ErrorBoundary label="Evidence Dashboard">
          <EvidenceDashboard />
        </ErrorBoundary>
      </section>

      {/* Thesis Pipeline */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Thesis Pipeline
          </h2>
          <button
            onClick={() => navigate('/brainstorm')}
            className="text-xs text-accent hover:text-accent/80 transition-colors font-medium"
          >
            + New thesis
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {PIPELINE_STAGES.map((stage) => {
            const stageTheses = getThesisByStage(stage)
            const accentBar = STAGE_ACCENT[stage]
            const isGradient = accentBar.startsWith('linear')
            return (
              <div
                key={stage}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage) }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={() => handleDrop(stage)}
                style={{
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#FDFCF9',
                  boxShadow: dragOverStage === stage && isValidDrop(stage)
                    ? '0 0 0 2px #9A7A50, 0 4px 16px rgba(154,122,80,0.20)'
                    : '0 0 0 1px rgba(20,12,4,0.06), 0 1px 3px rgba(20,12,4,0.06), 0 4px 12px rgba(20,12,4,0.07)',
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.12s ease',
                }}
              >
                {/* Stage accent bar */}
                <div style={{ height: 4, background: accentBar, flexShrink: 0 }} />
                <div style={{ padding: '10px 10px 12px', flex: 1 }}>
                  <div className="flex items-center justify-between mb-2">
                    <LifecycleBadge stage={stage} size="sm" />
                    <span style={{ fontSize: 10, color: '#A89878', fontWeight: 500 }}>
                      {stageTheses.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {stageTheses.map((thesis) => {
                      const overlap = showPrologis ? computePrologisOverlap(thesis) : null
                      const dotColor = overlap ? OVERLAP_STYLE[overlap.label].dot : null
                      const isDragging = dragging?.id === thesis.id
                      return (
                        <div
                          key={thesis.id}
                          draggable
                          onDragStart={() => setDragging({ id: thesis.id, fromStage: stage })}
                          onDragEnd={() => { setDragging(null); setDragOverStage(null) }}
                          onClick={() => navigate(`/thesis/${thesis.id}`)}
                          className="w-full text-left rounded-md transition-colors cursor-grab active:cursor-grabbing"
                          style={{
                            padding: '5px 8px',
                            background: 'rgba(20,12,4,0.04)',
                            opacity: isDragging ? 0.4 : 1,
                            userSelect: 'none',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,12,4,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(20,12,4,0.04)')}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {dotColor && (
                              <span style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: dotColor, flexShrink: 0,
                              }} />
                            )}
                            <p style={{ fontSize: 11, color: '#18140E', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {thesis.name}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
