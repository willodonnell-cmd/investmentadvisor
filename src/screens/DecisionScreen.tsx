import React, { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { useThesisStore, usePortfolioStore, useScenarioStore, useMacroStore, useSignalStore } from '../store'
import { JournalPromptBanner } from '../components/ui/JournalPromptBanner'
import { ProgressRing } from '../components/ui/ProgressRing'
import { LifecycleBadge, Badge } from '../components/ui/Badge'
import { computeSizing } from '../api/sizing'
import { computeDecayClock } from '../api/decay'
import type { SizingOutput, SizingRung, PositionType, AccountType, PositionAction } from '../types'

const RUNG_TO_ACTION: Record<SizingRung, PositionAction> = {
  WatchOnly:            'Watch',
  StarterPosition:      'Start',
  HalfPosition:         'Start',
  TrimmedCore:          'Trim',
  FullPosition:         'Hold',
  OverweightConviction: 'Add',
  Exit:                 'Exit',
}

const RUNG_CONFIG: Record<SizingRung, { label: string; color: string; style: React.CSSProperties }> = {
  WatchOnly:           { label: 'Watch Only',          color: 'text-text-muted',   style: { background: 'rgba(248,244,238,0.85)', border: '1px solid rgba(216,208,196,0.7)' } },
  StarterPosition:     { label: 'Starter Position',    color: 'text-text-secondary', style: { background: 'rgba(248,244,238,0.85)', border: '1px solid rgba(216,208,196,0.7)' } },
  HalfPosition:        { label: 'Half Position',       color: 'text-warning',      style: { background: 'rgba(122,74,16,0.07)', border: '1px solid rgba(122,74,16,0.25)' } },
  TrimmedCore:         { label: 'Trimmed Core',        color: 'text-warning',      style: { background: 'rgba(122,74,16,0.07)', border: '1px solid rgba(122,74,16,0.25)' } },
  FullPosition:        { label: 'Full Position',       color: 'text-success',      style: { background: 'rgba(46,110,74,0.07)', border: '1px solid rgba(46,110,74,0.25)' } },
  OverweightConviction:{ label: 'Overweight',          color: 'text-accent',       style: { background: 'rgba(154,122,80,0.08)', border: '1px solid rgba(154,122,80,0.30)' } },
  Exit:                { label: 'Exit',                color: 'text-danger',       style: { background: 'rgba(168,48,48,0.07)', border: '1px solid rgba(168,48,48,0.25)' } },
}

const ZONE_COLORS = {
  Green:   'text-success',
  Yellow:  'text-accent',
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
    value >= 1.10 ? '#2E6E4A' :
    value >= 0.90 ? '#9A7A50' :
    value >= 0.70 ? '#7A4A10' :
    '#A83030'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-muted w-28 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(216,208,196,0.8)' }}>
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
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
      <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(216,208,196,0.5)' }}>
        {/* Band */}
        <div
          className="absolute top-0 h-full"
          style={{
            left: `${bandLeft}%`, width: `${bandWidth}%`,
            background: 'rgba(154,122,80,0.18)',
            borderLeft: '1px solid rgba(154,122,80,0.40)',
            borderRight: '1px solid rgba(154,122,80,0.40)',
          }}
        />
        {/* Starting size */}
        <div
          className="absolute top-1 bottom-1 w-0.5 rounded-full"
          style={{ left: `${startLeft}%`, background: '#A8A098' }}
          title={`Starting: ${pct(sizing.startingSizePct)}`}
        />
        {/* Target */}
        <div
          className="absolute top-0.5 bottom-0.5 w-1 rounded-full"
          style={{ left: `${targetLeft}%`, background: '#9A7A50' }}
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

const cardStyle: React.CSSProperties = {
  background: 'rgba(248,244,238,0.85)',
  border: '1px solid rgba(216,208,196,0.7)',
  borderRadius: 12,
  padding: 16,
  boxShadow: '0 1px 4px rgba(60,40,10,0.05)',
}

export const DecisionScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const thesesRecord = useThesisStore((s) => s.theses)
  const positionsRecord = usePortfolioStore((s) => s.positions)
  const addPosition = usePortfolioStore((s) => s.addPosition)
  const updatePosition = usePortfolioStore((s) => s.updatePosition)
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
  const [showCommitForm, setShowCommitForm] = useState(false)
  const [commitType, setCommitType] = useState<PositionType>('Long')
  const [commitAccount, setCommitAccount] = useState<AccountType>('Taxable')
  const [commitSizePct, setCommitSizePct] = useState<number>(0)
  const [journalPrompt, setJournalPrompt] = useState<{ thesisId: string; thesisName: string; ticker?: string } | null>(null)

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
          <h1 className="text-xl font-bold text-text-primary">Capital Allocation</h1>
        </div>

        {activeTheses.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ border: '1.5px dashed #D8D0C4' }}>
            <p className="text-sm text-text-secondary mb-2">No active theses</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {activeTheses.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className="w-full text-left px-4 py-3 rounded-xl transition-colors"
                style={cardStyle}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,234,224,0.9)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,244,238,0.85)')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary font-medium">{t.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5 italic">
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

      {journalPrompt && (
        <JournalPromptBanner
          decisionType="entry"
          thesisId={journalPrompt.thesisId}
          thesisName={journalPrompt.thesisName}
          ticker={journalPrompt.ticker}
          onDismiss={() => setJournalPrompt(null)}
        />
      )}

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
          <p className="text-xs text-text-muted mt-0.5 italic">
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
              hover:border-accent/40 hover:text-text-primary rounded-lg transition-colors"
          >
            View Thesis
          </Link>
        </div>
      </div>

      {sizing && rungCfg && (
        <>
          {/* ── Sizing Recommendation ── */}
          <div className="rounded-xl p-5 space-y-4" style={rungCfg.style}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">Sizing</p>
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
            <div style={cardStyle} className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Layer 1 · Kelly</p>
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
                <p className="text-[11px] text-text-muted">No scenarios yet.</p>
              )}
            </div>

            {/* Layer 2: Modifiers */}
            <div style={cardStyle} className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Layer 2 · Modifiers</p>
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
          <div style={cardStyle} className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Layer 3 · Constraints</p>
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
            <div style={cardStyle} className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-text-muted">Signal Context</p>
              <div className="grid grid-cols-3 gap-2">
                {composites.slice(0, 6).map((c) => (
                  <div key={c.id} className="rounded-lg px-3 py-2"
                    style={{ background: 'rgba(216,208,196,0.4)', border: '1px solid rgba(216,208,196,0.6)' }}>
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
            <div style={cardStyle}>
              <p className="text-[10px] uppercase tracking-widest text-success/80 mb-2">Increase size if</p>
              <ul className="space-y-1.5">
                {sizing.whatWouldIncreaseSize.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-text-secondary">
                    <span className="text-success mt-0.5">↑</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div style={cardStyle}>
              <p className="text-[10px] uppercase tracking-widest text-warning/80 mb-2">Decrease size if</p>
              <ul className="space-y-1.5">
                {sizing.whatWouldDecreaseSize.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-text-secondary">
                    <span className="text-warning mt-0.5">↓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div style={cardStyle}>
              <p className="text-[10px] uppercase tracking-widest text-danger/80 mb-2">Exit Triggers</p>
              <ul className="space-y-1.5">
                {sizing.whatWouldTriggerExit.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-text-secondary">
                    <span className="text-danger mt-0.5">×</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Commit Position ── */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(216,208,196,0.7)', boxShadow: '0 1px 4px rgba(60,40,10,0.05)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(248,244,238,0.85)' }}>
              <div>
                {existingPosition ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-text-muted">Active Position</span>
                    <span className="text-xs font-semibold text-text-primary">
                      {existingPosition.type} · {existingPosition.account} · {pct(existingPosition.currentSizePct)}
                    </span>
                    <span className="text-[11px] text-text-muted">{existingPosition.currentAction}</span>
                  </div>
                ) : (
                  <span className="text-[10px] uppercase tracking-widest text-text-muted">No position recorded</span>
                )}
              </div>
              <button
                onClick={() => {
                  if (!showCommitForm && sizing) {
                    setCommitType(existingPosition?.type ?? 'Long')
                    setCommitAccount(existingPosition?.account ?? 'Taxable')
                    setCommitSizePct(
                      existingPosition
                        ? Math.round(existingPosition.currentSizePct * 1000) / 10
                        : Math.round(sizing.startingSizePct * 1000) / 10
                    )
                  }
                  setShowCommitForm((v) => !v)
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-accent/90 hover:bg-accent
                  rounded-lg transition-colors"
              >
                {existingPosition ? 'Update Position' : 'Commit Position'}
              </button>
            </div>

            {showCommitForm && sizing && (
              <div className="px-4 py-4 space-y-4" style={{ borderTop: '1px solid rgba(216,208,196,0.7)', background: 'rgba(242,236,226,0.6)' }}>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Type</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['Long', 'Short', 'Paired', 'Hedge'] as PositionType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setCommitType(t)}
                          className="px-2.5 py-1 text-[11px] rounded border transition-colors"
                          style={commitType === t ? {
                            borderColor: 'rgba(154,122,80,0.5)',
                            background: 'rgba(154,122,80,0.12)',
                            color: '#7A5A38',
                          } : {
                            borderColor: '#D8D0C4',
                            color: '#A8A098',
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Account</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['Taxable', 'IRA401k', 'Roth', 'PrologisConcentrated'] as AccountType[]).map((a) => (
                        <button
                          key={a}
                          onClick={() => setCommitAccount(a)}
                          className="px-2.5 py-1 text-[11px] rounded border transition-colors"
                          style={commitAccount === a ? {
                            borderColor: 'rgba(154,122,80,0.5)',
                            background: 'rgba(154,122,80,0.12)',
                            color: '#7A5A38',
                          } : {
                            borderColor: '#D8D0C4',
                            color: '#A8A098',
                          }}
                        >
                          {a === 'PrologisConcentrated' ? 'PLD Acct' : a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">
                      Current Size %
                      <span className="text-text-secondary ml-1.5 normal-case not-italic">{commitSizePct}%</span>
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.5}
                      value={commitSizePct}
                      onChange={(e) => setCommitSizePct(parseFloat(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                      <span>0%</span>
                      <span className="text-text-secondary">Target: {pct(sizing.targetSizePct)}</span>
                      <span>20%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-text-muted">
                    Action: <span className="text-text-secondary font-medium">{sizing.rung === 'Exit' ? 'Exit' : RUNG_TO_ACTION[sizing.rung]}</span>
                    <span className="ml-2 text-text-muted">· Target {pct(sizing.targetSizePct)} · Band {pct(sizing.sizingBand[0])}–{pct(sizing.sizingBand[1])}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCommitForm(false)}
                      className="px-3 py-1.5 text-xs text-text-muted border border-border hover:border-accent/40 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const action = RUNG_TO_ACTION[sizing.rung]
                        const sizeFrac = commitSizePct / 100
                        if (existingPosition) {
                          updatePosition(existingPosition.id, {
                            type: commitType,
                            account: commitAccount,
                            currentSizePct: sizeFrac,
                            targetSizePct: sizing.targetSizePct,
                            currentAction: action,
                            sizingOutput: sizing,
                          })
                        } else {
                          addPosition({
                            id: uuid(),
                            linkedThesisId: thesis.id,
                            type: commitType,
                            currentAction: action,
                            currentSizePct: sizeFrac,
                            targetSizePct: sizing.targetSizePct,
                            sizingOutput: sizing,
                            account: commitAccount,
                            isIntentionalCorrelation: false,
                            openedAt: new Date(),
                            updatedAt: new Date(),
                          })
                          setJournalPrompt({ thesisId: thesis.id, thesisName: thesis.name, ticker: thesis.ticker })
                        }
                        setShowCommitForm(false)
                      }}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-accent/90 hover:bg-accent rounded-lg transition-colors"
                    >
                      {existingPosition ? 'Update' : 'Commit'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Nav actions ── */}
          <div className="flex gap-3 justify-end pt-1">
            <Link
              to={`/memo/${thesis.id}`}
              className="px-4 py-2 text-xs text-text-secondary border border-border
                hover:border-accent/40 hover:text-text-primary rounded-xl transition-colors"
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
        <div className="rounded-xl p-8 text-center" style={{ border: '1.5px dashed #D8D0C4' }}>
          <p className="text-sm text-text-secondary mb-1">Sizing unavailable</p>
          <p className="text-xs text-text-muted">Generate scenarios on the thesis to compute the Quarter-Kelly anchor.</p>
        </div>
      )}
    </div>
  )
}
