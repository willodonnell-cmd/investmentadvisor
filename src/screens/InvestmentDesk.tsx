import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThesisStore, useSignalStore } from '../store'
import { ThesisCard } from '../components/cards/ThesisCard'
import { LifecycleBadge } from '../components/ui/Badge'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { LifecycleStage } from '../types'
import { detectConvergence, detectDivergence } from '../api/signals'
import { MISPRICED_VARIABLE_LABELS } from '../constants'

const PIPELINE_STAGES: LifecycleStage[] = [
  'Signal', 'Hypothesis', 'PressureTest', 'Actionable', 'Watch', 'Live',
]

type EvidenceSort = 'score' | 'direction' | 'convergence' | 'lastSignal'

function EvidenceDashboard() {
  const navigate = useNavigate()
  const thesesRecord = useThesisStore((s) => s.theses)
  const signalsRecord = useSignalStore((s) => s.signals)
  const compositesRecord = useSignalStore((s) => s.composites)

  const [sort, setSort] = useState<EvidenceSort>('score')

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
      }
    })
  }, [activeTheses, allSignals, allComposites])

  const sorted = useMemo(() => {
    const copy = [...rows]
    if (sort === 'score') return copy.sort((a, b) => b.compositeScore - a.compositeScore)
    if (sort === 'direction') {
      const order = { Strengthening: 0, Stable: 1, Weakening: 2 }
      return copy.sort((a, b) => order[a.direction] - order[b.direction])
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
    Strengthening: { color: 'text-success', arrow: '↑', bg: 'bg-success' },
    Stable:        { color: 'text-text-secondary', arrow: '→', bg: 'bg-yellow-600' },
    Weakening:     { color: 'text-danger', arrow: '↓', bg: 'bg-danger' },
  }

  const SORT_OPTS: { value: EvidenceSort; label: string }[] = [
    { value: 'score', label: 'Score' },
    { value: 'direction', label: 'Direction' },
    { value: 'convergence', label: 'Convergence' },
    { value: 'lastSignal', label: 'Freshness' },
  ]

  if (activeTheses.length === 0) return null

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
              className={`px-2 py-1 text-[10px] rounded border transition-colors
                ${sort === o.value
                  ? 'border-accent/50 text-text-primary bg-accent/10'
                  : 'border-border text-text-muted hover:border-[#3a3a3a]'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1.2fr_80px_100px_80px_80px] gap-2
          px-4 py-2 bg-surface border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
          <span>Thesis</span>
          <span>Primary Variable</span>
          <span className="text-right">Score</span>
          <span>Direction</span>
          <span>Status</span>
          <span className="text-right">Last Signal</span>
        </div>

        {sorted.map((row, idx) => {
          const dir = DIR_STYLES[row.direction]
          const barPct = ((row.compositeScore + 10) / 20) * 100

          return (
            <button
              key={row.thesis.id}
              onClick={() => navigate(`/thesis/${row.thesis.id}`)}
              className={`w-full text-left grid grid-cols-[2fr_1.2fr_80px_100px_80px_80px] gap-2
                px-4 py-2.5 transition-colors hover:bg-[#1a1a1a]
                ${idx < sorted.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              {/* Name */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {row.cascadeAlert && (
                    <span className="text-[9px] bg-accent/20 border border-accent/40 text-accent
                      rounded px-1 py-0.5 flex-shrink-0">
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
                <div className="relative h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden w-full">
                  <div className="absolute top-0 left-1/2 h-full w-px bg-[#3a3a3a]" />
                  <div
                    className={`absolute top-0 h-full rounded-full ${dir.bg}/60`}
                    style={{
                      left: row.compositeScore >= 0 ? '50%' : `${barPct}%`,
                      width: `${Math.abs(row.compositeScore) / 20 * 100}%`,
                    }}
                  />
                </div>
                <p className={`text-[10px] font-mono text-right mt-0.5 ${dir.color}`}>
                  {row.compositeScore > 0 ? '+' : ''}{row.compositeScore.toFixed(1)}
                </p>
              </div>

              {/* Direction */}
              <div className="self-center flex items-center gap-1.5">
                <span className={`text-sm ${dir.color}`}>{dir.arrow}</span>
                <span className={`text-[11px] ${dir.color}`}>{row.direction}</span>
              </div>

              {/* Status badges */}
              <div className="self-center flex flex-wrap gap-1">
                {row.convergenceCount > 0 && (
                  <span className="text-[9px] bg-green-950/40 border border-green-800/40 text-success
                    rounded px-1 py-0.5">
                    ⚡ {row.convergenceCount}
                  </span>
                )}
                {row.divergenceCount > 0 && (
                  <span className="text-[9px] bg-orange-950/40 border border-orange-800/40 text-warning
                    rounded px-1 py-0.5">
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

  const activeTheses = getActiveTheses()
  const liveAndActionable = activeTheses.filter(
    (t) => t.stage === 'Live' || t.stage === 'Actionable',
  )
  const totalActive = activeTheses.length

  return (
    <div className="p-5 space-y-6 max-w-[1400px]">

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
            {liveAndActionable.map((thesis) => (
              <div key={thesis.id} className="flex-shrink-0 w-[260px]">
                <ThesisCard thesis={thesis} compact />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-24 border border-dashed border-border rounded-xl flex items-center justify-center">
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
            return (
              <div key={stage} className="bg-surface rounded-xl border border-border p-3 min-h-[120px]">
                <div className="flex items-center justify-between mb-2">
                  <LifecycleBadge stage={stage} size="sm" />
                  <span className="text-[10px] text-text-muted font-medium tabular-nums">
                    {stageTheses.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {stageTheses.map((thesis) => (
                    <button
                      key={thesis.id}
                      onClick={() => navigate(`/thesis/${thesis.id}`)}
                      className="w-full text-left px-2 py-1.5 bg-surface-2 hover:bg-[#222222]
                        rounded-lg transition-colors group"
                    >
                      <p className="text-[11px] text-text-primary font-medium truncate
                        group-hover:text-white transition-colors">
                        {thesis.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
