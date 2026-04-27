import React, { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useThesisStore, usePortfolioStore, useScenarioStore, useMacroStore, useSignalStore } from '../store'
import { ProgressRing } from '../components/ui/ProgressRing'
import { LifecycleBadge, Badge } from '../components/ui/Badge'
import { computeSizing } from '../api/sizing'
import { computeDecayClock } from '../api/decay'
import type { SizingOutput, SizingRung } from '../types'

const RUNG_CONFIG: Record<SizingRung, { label: string; color: string; bg: string }> = {
  WatchOnly:           { label: 'Watch Only',          color: 'text-text-muted',   bg: 'bg-surface' },
  StarterPosition:     { label: 'Starter Position',    color: 'text-text-secondary', bg: 'bg-surface' },
  HalfPosition:        { label: 'Half Position',       color: 'text-warning',      bg: 'bg-orange-950/20' },
  TrimmedCore:         { label: 'Trimmed Core',        color: 'text-warning',      bg: 'bg-orange-950/20' },
  FullPosition:        { label: 'Full Position',       color: 'text-success',      bg: 'bg-green-950/20' },
  OverweightConviction:{ label: 'Overweight',          color: 'text-accent',       bg: 'bg-accent/10' },
  Exit:                { label: 'Exit',                color: 'text-danger',       bg: 'bg-red-950/20' },
}

const ZONE_COLORS = {
  Green:   'text-success',
  Yellow:  'text-yellow-400',
  Orange:  'text-warning',
  Red:     'text-danger',
  Overdue: 'text-danger',
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}

function ModifierBar({ value, label }: { value: number; label: string }) {
  const norm = Math.max(0, Math.min(2, value))
  const width = (norm / 2) * 100
  const color =
    value >= 1.10 ? 'bg-success' :
    value >= 0.90 ? 'bg-yellow-600' :
    value >= 0.70 ? 'bg-warning' :
    'bg-danger'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-[11px] font-mono text-text-secondary w-10 text-right">{value.toFixed(2)}×</span>
    </div>
  )
}

function SizingBandVisual({ sizing }: { sizing: SizingOutput }) {
  const min = 0
  const max = 0.20
  const range = max - min
  const bandLeft = ((sizing.sizingBand[0] - min) / range) * 100
  const bandWidth = ((sizing.sizingBand[1] - sizing.sizingBand[0]) / range) * 100
  const targetLeft = ((sizing.targetSizePct - min) / range) * 100
  const startLeft = ((sizing.startingSizePct - min) / range) * 100

  return (
    <div className="space-y-1">
      <div className="relative h-6 rounded-lg bg-[#1a1a1a] overflow-hidden">
        {/* Band */}
        <div
          className="absolute top-0 h-full bg-accent/20 border-l border-r border-accent/40"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
        />
        {/* Starting size */}
        <div
          className="absolute top-1 bottom-1 w-0.5 bg-text-muted rounded-full"
          style={{ left: `${startLeft}%` }}
          title={`Starting: ${pct(sizing.startingSizePct)}`}
        />
        {/* Target */}
        <div
          className="absolute top-0.5 bottom-0.5 w-1 bg-accent rounded-full"
          style={{ left: `${targetLeft}%` }}
          title={`Target: ${pct(sizing.targetSizePct)}`}
        />
      </div>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>0%</span>
        <span className="text-text-secondary">
          Band: {pct(sizing.sizingBand[0])} — {pct(sizing.sizingBand[1])} · Target: {pct(sizing.targetSizePct)}
        </span>
        <span>20%</span>
      </div>
    </div>
  )
}

export const DecisionScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const thesesRecord = useThesisStore((s) => s.theses)
  const positionsRecord = usePortfolioStore((s) => s.positions)
  const scenariosRecord = useScenarioStore((s) => s.scenarios)
  const regime = useMacroStore((s) => s.regime)
  const lens = usePortfolioStore((s) => s.lens)
  const compositesByThesis = useSignalStore((s) => s.composites)

  const allTheses = useMemo(() => Object.values(thesesRecord), [thesesRecord])
  const activeTheses = useMemo(
    () => allTheses.filter((t) => !['Broken', 'Archived', 'PlayedOut'].includes(t.stage)),
    [allTheses],
  )

  const [selectedId, setSelectedId] = useState<string>(id ?? '')

  const thesis = useMemo(
    () => (selectedId ? thesesRecord[selectedId] : null),
    [selectedId, thesesRecord],
  )

  const scenarios = useMemo(
    () =>
      selectedId
        ? Object.values(scenariosRecord).filter((s) => s.linkedThesisId === selectedId)
        : [],
    [selectedId, scenariosRecord],
  )

  const existingPosition = useMemo(
    () =>
      selectedId
        ? Object.values(positionsRecord).find((p) => p.linkedThesisId === selectedId)
        : undefined,
    [selectedId, positionsRecord],
  )

  const sizing = useMemo<SizingOutput | null>(() => {
    if (!thesis) return null
    return computeSizing(
      thesis,
      scenarios,
      allTheses,
      lens === 'PrologisAware',
      regime,
    )
  }, [thesis, scenarios, allTheses, lens, regime])

  const decayClock = useMemo(() => {
    if (!thesis) return null
    return computeDecayClock(thesis, thesis.createdAt)
  }, [thesis])

  const composites = useMemo(
    () =>
      selectedId
        ? Object.values(compositesByThesis).filter((c) => c.linkedThesisId === selectedId)
        : [],
    [selectedId, compositesByThesis],
  )

  if (!selectedId || !thesis) {
    return (
      <div className="p-5 max-w-[860px]">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">Capital Allocation Decision</h1>
          <p className="text-xs text-text-muted mt-1">Select a thesis to compute sizing and review decision context</p>
        </div>

        {activeTheses.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-sm text-text-secondary mb-2">No active theses</p>
            <p className="text-xs text-text-muted">Create a thesis first from the Investment Desk.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {activeTheses.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left px-4 py-3 bg-surface border border-border
                  hover:border-[#3a3a3a] rounded-xl transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary font-medium">{t.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {t.type} · {t.timeHorizon}mo · {t.primaryMispricedVariable}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressRing pct={t.decayClock.elapsedPct} zone={t.decayClock.zone} size={32} strokeWidth={2.5} />
                    <span className={`text-xs font-medium ${ZONE_COLORS[t.decayClock.zone]}`}>
                      {t.decayClock.zone}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const rungCfg = sizing ? RUNG_CONFIG[sizing.rung] : null

  return (
    <div className="p-5 max-w-[860px] space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <button
              onClick={() => setSelectedId('')}
              className="text-[11px] text-text-muted hover:text-text-secondary transition-colors"
            >
              ← All theses
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <LifecycleBadge stage={thesis.stage} />
            <Badge label={thesis.type} variant="muted" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">{thesis.name}</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {thesis.primaryMispricedVariable} · {thesis.timeHorizon}mo horizon
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {decayClock && (
            <div className="text-center">
              <ProgressRing
                pct={decayClock.elapsedPct}
                zone={decayClock.zone}
                size={52}
                strokeWidth={3.5}
              />
              <p className="text-[10px] text-text-muted mt-1">
                {decayClock.elapsedMonths}mo elapsed
              </p>
            </div>
          )}
          <Link
            to={`/thesis/${thesis.id}`}
            className="px-3 py-1.5 text-xs text-text-secondary border border-border
              hover:border-[#3a3a3a] hover:text-text-primary rounded-lg transition-colors"
          >
            View Thesis
          </Link>
        </div>
      </div>

      {sizing && rungCfg && (
        <>
          {/* ── Sizing Recommendation ── */}
          <div className={`border rounded-xl p-5 space-y-4 ${rungCfg.bg} border-border`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Sizing Recommendation</p>
                <p className={`text-2xl font-bold ${rungCfg.color}`}>{rungCfg.label}</p>
                <p className="text-sm text-text-primary font-semibold mt-0.5">
                  Target {pct(sizing.targetSizePct)}
                  <span className="text-xs text-text-muted font-normal ml-2">
                    ({pct(sizing.sizingBand[0])} – {pct(sizing.sizingBand[1])} band)
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-muted">Starting position</p>
                <p className="text-lg font-semibold text-text-secondary">{pct(sizing.startingSizePct)}</p>
                {existingPosition && (
                  <>
                    <p className="text-[10px] text-text-muted mt-1">Current position</p>
                    <p className="text-sm font-medium text-text-primary">{pct(existingPosition.currentSizePct)}</p>
                  </>
                )}
              </div>
            </div>

            <SizingBandVisual sizing={sizing} />

            <p className="text-[11px] text-text-muted leading-relaxed">{sizing.rationale}</p>
          </div>

          {/* ── Three-Layer Breakdown ── */}
          <div className="grid grid-cols-2 gap-3">

            {/* Layer 1: Kelly anchor */}
            <div className="border border-border bg-surface rounded-xl p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Layer 1 — Quarter-Kelly Anchor</p>
              <p className="text-xl font-bold font-mono text-text-primary">{pct(sizing.anchorSize)}</p>
              {scenarios.length >= 3 ? (
                <div className="space-y-1 pt-1">
                  {scenarios.map((s) => (
                    <div key={s.id} className="flex justify-between text-[11px]">
                      <span className="text-text-muted">{s.type === 'ThesisConfirmed' ? 'Bull' : s.type === 'ContestedPath' ? 'Base' : 'Bear'}</span>
                      <span className="text-text-secondary">
                        {(s.probability * 100).toFixed(0)}% · {s.returnRangeMin}%–{s.returnRangeMax}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted">Generate scenarios to compute anchor.</p>
              )}
            </div>

            {/* Layer 2: Modifiers */}
            <div className="border border-border bg-surface rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Layer 2 — Conviction Modifiers</p>
                <span className="text-[11px] font-mono font-bold text-text-primary">
                  {sizing.boundedModifier.toFixed(2)}×
                </span>
              </div>
              <div className="space-y-1.5">
                <ModifierBar value={sizing.modifierBreakdown.underwritingQuality} label="Underwriting" />
                <ModifierBar value={sizing.modifierBreakdown.variantPerception} label="Variant strength" />
                <ModifierBar value={sizing.modifierBreakdown.triggerReadiness} label="Trigger readiness" />
                <ModifierBar value={sizing.modifierBreakdown.quadrant} label="Quadrant" />
                <ModifierBar value={sizing.modifierBreakdown.convictionDecay} label="Decay clock" />
                <ModifierBar value={sizing.modifierBreakdown.macroRegime} label="Macro regime" />
              </div>
            </div>
          </div>

          {/* Layer 3: Portfolio constraints */}
          <div className="border border-border bg-surface rounded-xl p-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Layer 3 — Portfolio Constraints</p>
            <div className="grid grid-cols-4 gap-3 pt-1">
              {[
                { label: 'Overlap penalty', value: sizing.portfolioConstraints.overlapPenalty },
                { label: 'Concentration', value: sizing.portfolioConstraints.concentrationAdjustment },
                { label: 'Capital source', value: sizing.portfolioConstraints.capitalSourceAdjustment },
                { label: 'Macro driver', value: sizing.portfolioConstraints.macroDriverConcentration },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-text-muted">{label}</p>
                  <p className={`text-sm font-bold font-mono ${value < 0.95 ? 'text-warning' : 'text-text-secondary'}`}>
                    {value.toFixed(2)}×
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Signal context ── */}
          {composites.length > 0 && (
            <div className="border border-border bg-surface rounded-xl p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Signal Context</p>
              <div className="grid grid-cols-3 gap-2">
                {composites.slice(0, 6).map((c) => (
                  <div key={c.id} className="bg-[#1a1a1a] rounded-lg px-3 py-2">
                    <p className="text-[10px] text-text-muted truncate">{c.variable}</p>
                    <p className={`text-sm font-bold font-mono ${
                      c.compositeScore > 2 ? 'text-success' :
                      c.compositeScore < -2 ? 'text-danger' :
                      'text-text-secondary'
                    }`}>{c.compositeScore.toFixed(1)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Decision triggers ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-border bg-surface rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-success/70 mb-2">What Would Increase Size</p>
              <ul className="space-y-1.5">
                {sizing.whatWouldIncreaseSize.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-text-secondary">
                    <span className="text-success mt-0.5">↑</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-border bg-surface rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-warning/70 mb-2">What Would Decrease Size</p>
              <ul className="space-y-1.5">
                {sizing.whatWouldDecreaseSize.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-text-secondary">
                    <span className="text-warning mt-0.5">↓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border border-border bg-surface rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-danger/70 mb-2">Exit Triggers</p>
              <ul className="space-y-1.5">
                {sizing.whatWouldTriggerExit.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-text-secondary">
                    <span className="text-danger mt-0.5">×</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex gap-3 justify-end pt-2">
            <Link
              to={`/memo/${thesis.id}`}
              className="px-4 py-2 text-xs text-text-secondary border border-border
                hover:border-[#3a3a3a] hover:text-text-primary rounded-xl transition-colors"
            >
              Open Underwriting Memo
            </Link>
            <Link
              to={`/thesis/${thesis.id}`}
              className="px-4 py-2 text-xs font-semibold text-text-primary border border-accent/40
                hover:border-accent hover:bg-accent/10 rounded-xl transition-colors"
            >
              Manage Thesis →
            </Link>
          </div>
        </>
      )}

      {!sizing && (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <p className="text-sm text-text-secondary mb-1">Sizing unavailable</p>
          <p className="text-xs text-text-muted">Generate scenarios on the thesis to compute the Quarter-Kelly anchor.</p>
        </div>
      )}
    </div>
  )
}
