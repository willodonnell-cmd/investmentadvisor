import React, { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useThesisStore, useMacroStore, useScenarioStore, useSynthesisStore, useSignalStore, useKillStore } from '../store'
import { LifecycleBadge, Badge } from '../components/ui/Badge'
import { TriggerCard } from '../components/cards/TriggerCard'
import { ProgressRing } from '../components/ui/ProgressRing'
import { TriggerIndicator } from '../components/ui/TriggerIndicator'
import { Drawer } from '../components/ui/Drawer'
import { EmptyState } from '../components/ui/EmptyState'
import { MacroRegimeModal } from '../components/ui/MacroRegimeModal'
import { ScenarioCard } from '../components/ui/ScenarioCard'
import { ExpertSynthesisView } from '../components/ui/ExpertSynthesisView'
import { SignalEntryForm } from '../components/ui/SignalEntryForm'
import { SignalCompositeCard } from '../components/ui/SignalCompositeCard'
import { ReassessmentModal } from '../components/ui/ReassessmentModal'
import { KillModal } from '../components/ui/KillModal'
import { THESIS_TYPE_LABELS, MISPRICED_VARIABLE_LABELS } from '../constants'
import { formatDate, formatHorizon, formatRelativeTime } from '../utils/formatting'
import { LifecycleStage, Thesis, Signal, KillRecord } from '../types'
import { LIFECYCLE_ORDER, canAdvanceTo } from '../utils/thesisHelpers'
import { computeRegimeCompatibility, COMPATIBILITY_LABELS, COMPATIBILITY_COLORS } from '../api/macroRegime'
import { generateScenarios } from '../api/scenarios'
import { generateExpertSynthesis } from '../api/expertSynthesis'
import { generateResearchView } from '../api/underwriting'
import { computeComposite, computeSignalWeight, detectConvergence, detectDivergence } from '../api/signals'
import { computeDecayClock, shouldTriggerReassessment, computeEvidenceDrift } from '../api/decay'

const VARIANT_STRENGTH_LABELS: Record<string, string> = {
  ClearConsensusStrongVariant:    'Clear Consensus · Strong Variant',
  MixedConsensusModerateVariant:  'Mixed Consensus · Moderate Variant',
  UnclearConsensusWeakVariant:    'Unclear Consensus · Weak Variant',
  BroadlyAgreesWithConsensus:     'Broadly Agrees With Consensus',
}

const VARIANT_STRENGTH_STYLES: Record<string, string> = {
  ClearConsensusStrongVariant:    'text-success border-green-800 bg-green-950',
  MixedConsensusModerateVariant:  'text-warning border-orange-800 bg-orange-950',
  UnclearConsensusWeakVariant:    'text-text-secondary border-border bg-surface',
  BroadlyAgreesWithConsensus:     'text-text-muted border-border bg-surface',
}

const DRIFT_STYLES: Record<string, string> = {
  Positive:      'text-success',
  Neutral:       'text-text-secondary',
  Negative:      'text-warning',
  SevereNegative:'text-danger',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string
  children: React.ReactNode
  accent?: boolean
}> = ({ title, children, accent }) => (
  <section className={`border rounded-xl p-4 space-y-3
    ${accent ? 'border-accent/15 bg-[rgba(255,107,107,0.03)]' : 'border-border bg-surface'}`}>
    <h2 className={`text-[10px] font-bold uppercase tracking-widest
      ${accent ? 'text-accent/70' : 'text-text-muted'}`}>
      {title}
    </h2>
    {children}
  </section>
)

const BulletList: React.FC<{
  items: string[]
  dotColor?: string
}> = ({ items, dotColor = 'text-text-muted' }) => (
  <ul className="space-y-1.5">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
        <span className={`${dotColor} mt-0.5 flex-shrink-0`}>·</span>
        {item}
      </li>
    ))}
  </ul>
)

// ─── Lifecycle Advance Panel ────────────────────────────────────────────────

const LifecyclePanel: React.FC<{ thesis: Thesis }> = ({ thesis }) => {
  const { advanceLifecycle } = useThesisStore()
  const [showAdvance, setShowAdvance] = useState(false)
  const [reason, setReason] = useState('')

  const advanceable = LIFECYCLE_ORDER.filter(
    (s) => canAdvanceTo(thesis.stage, s)
  ).slice(0, 4)

  const handleAdvance = (stage: LifecycleStage) => {
    advanceLifecycle(thesis.id, stage, reason || `Manually advanced to ${stage}`)
    setShowAdvance(false)
    setReason('')
  }

  return (
    <div className="flex items-center gap-2">
      <LifecycleBadge stage={thesis.stage} />
      {advanceable.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowAdvance((v) => !v)}
            className="text-[10px] text-text-muted hover:text-text-secondary border border-border
              hover:border-[#3a3a3a] rounded px-2 py-0.5 transition-colors"
          >
            Advance ▾
          </button>
          {showAdvance && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowAdvance(false)}
              />
              <div className="absolute left-0 top-full mt-1 z-20 w-64 bg-surface-2 border border-border
                rounded-xl shadow-xl p-3 space-y-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs
                    text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40"
                />
                <div className="space-y-1">
                  {advanceable.map((stage) => (
                    <button
                      key={stage}
                      onClick={() => handleAdvance(stage)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-text-secondary
                        hover:text-text-primary hover:bg-[#222] rounded-lg transition-colors"
                    >
                      → {stage}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Detail Drawer ──────────────────────────────────────────────────────────

const DetailDrawer: React.FC<{ thesis: Thesis; open: boolean; onClose: () => void }> = ({
  thesis,
  open,
  onClose,
}) => (
  <Drawer open={open} onClose={onClose} title="Thesis Detail" width="w-[520px]">
    <div className="space-y-5">
      {/* Metadata */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">Metadata</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['ID', thesis.id.slice(0, 8) + '…'],
            ['Lens', thesis.lens],
            ['Created', formatDate(thesis.createdAt)],
            ['Updated', formatRelativeTime(thesis.updatedAt)],
            ['Horizon', formatHorizon(thesis.timeHorizon)],
            ['Drift', `${thesis.evidenceDriftScore > 0 ? '+' : ''}${thesis.evidenceDriftScore}`],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] text-text-muted">{k}</p>
              <p className="text-xs text-text-primary font-medium truncate">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Macro regime compatibility */}
      {thesis.macroRegimeCompatibility && (
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Macro Compatibility</p>
          <Badge label={thesis.macroRegimeCompatibility} />
        </div>
      )}

      {/* Beneficiaries & Losers */}
      {(thesis.beneficiaries.length > 0 || thesis.losers.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Beneficiaries</p>
            <BulletList items={thesis.beneficiaries} dotColor="text-success" />
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Losers</p>
            <BulletList items={thesis.losers} dotColor="text-danger" />
          </div>
        </div>
      )}

      {/* Change History */}
      {thesis.changeHistory.length > 0 && (
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Change History</p>
          <div className="space-y-2">
            {[...thesis.changeHistory].reverse().map((entry, i) => (
              <div key={i} className="border border-border rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-text-secondary font-medium">{entry.field}</span>
                  <span className="text-[10px] text-text-muted">{formatRelativeTime(new Date(entry.changedAt))}</span>
                </div>
                <p className="text-[11px] text-text-muted">{entry.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary mispriced variables */}
      {thesis.secondaryMispricedVariables.length > 0 && (
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
            Secondary Mispriced Variables
          </p>
          <div className="flex flex-wrap gap-1.5">
            {thesis.secondaryMispricedVariables.map((v) => (
              <Badge key={v} label={MISPRICED_VARIABLE_LABELS[v] ?? v} size="sm" variant="muted" />
            ))}
          </div>
        </div>
      )}
    </div>
  </Drawer>
)

// ─── Main Screen ────────────────────────────────────────────────────────────

const SCENARIO_ORDER = ['ThesisConfirmed', 'ContestedPath', 'ThesisBroken'] as const

const PRESSURE_TEST_PLUS: LifecycleStage[] = ['PressureTest', 'Actionable', 'Watch', 'Live']

export const ThesisScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [macroModalOpen, setMacroModalOpen] = useState(false)
  const [generatingScenarios, setGeneratingScenarios] = useState(false)
  const [generatingExpert, setGeneratingExpert] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [showSignalForm, setShowSignalForm] = useState(false)
  const [showReassessment, setShowReassessment] = useState(false)
  const [showKill, setShowKill] = useState(false)

  const thesis = useThesisStore((s) => (id ? s.theses[id] : undefined))
  const removeThesis = useThesisStore((s) => s.removeThesis)
  const updateThesis = useThesisStore((s) => s.updateThesis)
  const advanceLifecycle = useThesisStore((s) => s.advanceLifecycle)

  const regime = useMacroStore((s) => s.regime)

  const upsertMany = useScenarioStore((s) => s.upsertMany)
  const removeByThesis = useScenarioStore((s) => s.removeByThesis)
  const updateProbability = useScenarioStore((s) => s.updateProbability)
  const scenariosRecord = useScenarioStore((s) => s.scenarios)
  const scenarios = useMemo(
    () => Object.values(scenariosRecord)
      .filter((sc) => sc.linkedThesisId === id)
      .sort((a, b) =>
        SCENARIO_ORDER.indexOf(a.type as typeof SCENARIO_ORDER[number]) -
        SCENARIO_ORDER.indexOf(b.type as typeof SCENARIO_ORDER[number])
      ),
    [scenariosRecord, id]
  )

  const setSynthesis = useSynthesisStore((s) => s.setSynthesis)
  const setResearchView = useSynthesisStore((s) => s.setResearchView)
  const setReassessmentMemo = useSynthesisStore((s) => s.setReassessmentMemo)
  const synthesis = useSynthesisStore((s) => (id ? s.expertSyntheses[id] : undefined))
  const researchView = useSynthesisStore((s) => (id ? s.researchViews[id] : undefined))

  const addSignal = useSignalStore((s) => s.addSignal)
  const upsertComposite = useSignalStore((s) => s.upsertComposite)
  const signalsRecord = useSignalStore((s) => s.signals)
  const compositesByThesis = useSignalStore((s) => s.composites)

  const addKillRecord = useKillStore((s) => s.addKillRecord)

  const thesisSignals = useMemo(
    () => Object.values(signalsRecord).filter((s) => s.linkedThesisId === id),
    [signalsRecord, id]
  )

  const composites = useMemo(
    () => Object.values(compositesByThesis).filter((c) => c.linkedThesisId === id),
    [compositesByThesis, id]
  )

  const convergenceAlerts = useMemo(
    () => (thesis && id ? detectConvergence(thesisSignals, id) : []),
    [thesisSignals, id, thesis]
  )

  const divergenceFlags = useMemo(
    () => (thesis && id ? detectDivergence(thesisSignals, id) : []),
    [thesisSignals, id, thesis]
  )

  const liveDecayClock = useMemo(
    () => (thesis ? computeDecayClock(thesis, thesis.createdAt) : null),
    [thesis]
  )

  const reassessmentCheck = useMemo(
    () =>
      thesis && liveDecayClock
        ? shouldTriggerReassessment(liveDecayClock, thesis.evidenceDriftDirection)
        : null,
    [thesis, liveDecayClock]
  )

  if (!thesis) {
    return (
      <div className="p-5">
        <EmptyState
          title="Thesis not found"
          description="This thesis may have been deleted."
          action={{ label: '← Back to Desk', onClick: () => navigate('/') }}
        />
      </div>
    )
  }

  const primaryTrigger = thesis.triggers.find((t) => t.isPrimary)
  const compatibility = computeRegimeCompatibility(thesis.type, regime)
  const isPressureTestPlus = PRESSURE_TEST_PLUS.includes(thesis.stage)
  const totalProbPct = Math.round(scenarios.reduce((s, sc) => s + sc.probability, 0) * 100)

  const handleDelete = () => {
    if (!confirm(`Delete "${thesis.name}"? This cannot be undone.`)) return
    removeThesis(thesis.id)
    navigate('/')
  }

  const handleAddSignal = (partial: Omit<Signal, 'id' | 'createdAt'>) => {
    const signal: Signal = {
      ...partial,
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
    }
    addSignal(signal)
    const allSignals = [...thesisSignals, signal]
    const newComposites = computeComposite(allSignals, thesis.id)
    newComposites.forEach(upsertComposite)
    const drift = computeEvidenceDrift(newComposites, thesis.primaryMispricedVariable)
    updateThesis(thesis.id, {
      evidenceDriftScore: drift.score,
      evidenceDriftDirection: drift.direction,
    })
    setShowSignalForm(false)
  }

  const handleKillComplete = (record: KillRecord) => {
    addKillRecord(record)
    advanceLifecycle(thesis.id, 'Broken', `Kill type ${record.killType}: ${record.killReason}`)
    setShowKill(false)
    navigate('/')
  }

  const handleGenerateScenarios = async () => {
    if (generatingScenarios) return
    setGeneratingScenarios(true)
    setGenError(null)
    try {
      removeByThesis(thesis.id)
      const newScenarios = await generateScenarios(thesis)
      upsertMany(newScenarios)
    } catch (e: any) {
      setGenError(`Scenarios: ${e.message}`)
    } finally {
      setGeneratingScenarios(false)
    }
  }

  const handleGenerateExpertSynthesis = async () => {
    if (generatingExpert) return
    setGeneratingExpert(true)
    setGenError(null)
    try {
      let rv = researchView
      if (!rv) {
        rv = await generateResearchView(thesis)
        setResearchView(thesis.id, rv)
      }
      const result = await generateExpertSynthesis(thesis, thesis.lens, rv)
      setSynthesis(thesis.id, result)
    } catch (e: any) {
      setGenError(`Expert synthesis: ${e.message}`)
    } finally {
      setGeneratingExpert(false)
    }
  }

  return (
    <>
      <div className="p-5 max-w-[900px] space-y-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <LifecyclePanel thesis={thesis} />
              <Badge label={THESIS_TYPE_LABELS[thesis.type] ?? thesis.type} variant="muted" />
              <Badge label={thesis.lens} variant="muted" />
            </div>
            <h1 className="text-xl font-bold text-text-primary leading-tight">{thesis.name}</h1>
            <p className="text-xs text-text-muted mt-1">
              {formatDate(thesis.createdAt)} · {formatHorizon(thesis.timeHorizon)} horizon
            </p>
          </div>

          {/* Decay clock + controls */}
          <div className="flex items-start gap-3 flex-shrink-0">
            <div className="text-right">
              {primaryTrigger && (
                <div className="mb-2 flex justify-end">
                  <TriggerIndicator readiness={primaryTrigger.readiness} size="sm" />
                </div>
              )}
              <ProgressRing
                pct={thesis.decayClock.elapsedPct}
                zone={thesis.decayClock.zone}
                size={52}
                strokeWidth={3.5}
              />
              <p className="text-[10px] text-text-muted mt-1 text-center">
                {Math.round(thesis.decayClock.elapsedPct)}% elapsed
              </p>
            </div>
            <div className="flex flex-col gap-1.5 pt-0.5">
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-3 py-1.5 text-xs text-text-secondary border border-border
                  hover:border-[#3a3a3a] hover:text-text-primary rounded-lg transition-colors"
              >
                Detail
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs text-danger/70 border border-border
                  hover:border-red-900 hover:text-danger rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* ── Thesis Statement ── */}
        {thesis.statement && (
          <Section title="Thesis Statement" accent>
            <p className="text-sm text-text-primary leading-relaxed font-medium">
              {thesis.statement}
            </p>
          </Section>
        )}

        {/* ── Why Now + Transmission Path ── */}
        {(thesis.whyNow || thesis.transmissionPath) && (
          <div className="grid grid-cols-2 gap-3">
            {thesis.whyNow && (
              <Section title="Why Now">
                <p className="text-xs text-text-secondary leading-relaxed">{thesis.whyNow}</p>
              </Section>
            )}
            {thesis.transmissionPath && (
              <Section title="Transmission Path" accent>
                <p className="text-xs text-text-secondary leading-relaxed">{thesis.transmissionPath}</p>
              </Section>
            )}
          </div>
        )}

        {/* ── Variant Perception ── */}
        {(thesis.consensusView || thesis.variantView) && (
          <Section title="Variant Perception">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold
                ${VARIANT_STRENGTH_STYLES[thesis.variantPerceptionStrength] ?? 'text-text-muted border-border bg-surface'}`}
            >
              {VARIANT_STRENGTH_LABELS[thesis.variantPerceptionStrength] ?? thesis.variantPerceptionStrength}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-1">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Consensus</p>
                <p className="text-xs text-text-secondary leading-relaxed">{thesis.consensusView || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-accent uppercase tracking-wider mb-1.5">Variant</p>
                <p className="text-xs text-text-primary leading-relaxed">{thesis.variantView || '—'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center gap-2">
              <span className="text-[10px] text-text-muted">Primary mispriced variable:</span>
              <span className="text-[10px] text-accent font-semibold">
                {MISPRICED_VARIABLE_LABELS[thesis.primaryMispricedVariable] ?? thesis.primaryMispricedVariable}
              </span>
            </div>
          </Section>
        )}

        {/* ── Assumptions & Disconfirmers ── */}
        {(thesis.keyAssumptions.length > 0 || thesis.disconfirmers.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {thesis.keyAssumptions.length > 0 && (
              <Section title="Key Assumptions">
                <BulletList items={thesis.keyAssumptions} dotColor="text-success" />
              </Section>
            )}
            {thesis.disconfirmers.length > 0 && (
              <Section title="Disconfirmers">
                <BulletList items={thesis.disconfirmers} dotColor="text-danger" />
              </Section>
            )}
          </div>
        )}

        {/* ── Triggers ── */}
        {thesis.triggers.length > 0 && (
          <Section title="Triggers">
            <div className="space-y-2">
              {thesis.triggers.map((trigger, i) => (
                <TriggerCard key={i} trigger={trigger} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Value Capture & Evidence Drift ── */}
        {(thesis.valueCaptureMethod || thesis.evidenceDriftDirection !== 'Neutral') && (
          <div className="grid grid-cols-2 gap-3">
            {thesis.valueCaptureMethod && (
              <Section title="Value Capture Method">
                <p className="text-xs text-text-secondary leading-relaxed">{thesis.valueCaptureMethod}</p>
              </Section>
            )}
            {thesis.evidenceDriftDirection !== 'Neutral' && (
              <Section title="Evidence Drift">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${DRIFT_STYLES[thesis.evidenceDriftDirection]}`}>
                    {thesis.evidenceDriftScore > 0 ? '+' : ''}{thesis.evidenceDriftScore}
                  </span>
                  <span className={`text-xs ${DRIFT_STYLES[thesis.evidenceDriftDirection]}`}>
                    {thesis.evidenceDriftDirection}
                  </span>
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ── Macro Regime ── */}
        <Section title="Macro Regime">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-bold"
                style={{ color: COMPATIBILITY_COLORS[compatibility] }}
              >
                {COMPATIBILITY_LABELS[compatibility]}
              </span>
              <span className="text-[10px] text-text-muted">
                {regime.realRates} rates · {regime.creditCycle} credit · {regime.liquidity} liquidity
              </span>
            </div>
            <button
              onClick={() => setMacroModalOpen(true)}
              className="text-[10px] text-text-muted hover:text-text-secondary border border-border
                hover:border-[#3a3a3a] rounded px-2 py-0.5 transition-colors"
            >
              Edit Regime
            </button>
          </div>
        </Section>

        {/* ── Scenarios (PressureTest+) ── */}
        {isPressureTestPlus && (
          <Section title="Narrative Scenarios">
            {scenarios.length > 0 && (
              <>
                {totalProbPct !== 100 && (
                  <div className="px-3 py-2 bg-orange-950/40 border border-orange-800/40 rounded-lg mb-3">
                    <p className="text-[10px] text-warning">
                      ⚠ Probabilities sum to {totalProbPct}% — must equal 100%
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {scenarios.map((sc) => (
                    <ScenarioCard
                      key={sc.id}
                      scenario={sc}
                      onProbabilityChange={updateProbability}
                    />
                  ))}
                </div>
              </>
            )}
            <div className="flex items-center justify-between pt-1">
              {scenarios.length === 0 && (
                <p className="text-xs text-text-muted">No scenarios generated yet.</p>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {genError && genError.startsWith('Scenarios') && (
                  <p className="text-[10px] text-danger">{genError}</p>
                )}
                <button
                  onClick={handleGenerateScenarios}
                  disabled={generatingScenarios}
                  className="px-3 py-1.5 text-xs font-medium text-text-primary bg-accent/90 hover:bg-accent
                    disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {generatingScenarios ? 'Generating…' : scenarios.length > 0 ? 'Regenerate' : 'Generate Scenarios'}
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ── Expert Synthesis (PressureTest+) ── */}
        {isPressureTestPlus && (
          <Section title="Expert Synthesis">
            {synthesis && <ExpertSynthesisView synthesis={synthesis} />}
            <div className="flex items-center justify-between pt-1">
              {!synthesis && (
                <p className="text-xs text-text-muted">No expert synthesis yet. Generates Research View first, then voices the panel.</p>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {genError && genError.startsWith('Expert') && (
                  <p className="text-[10px] text-danger">{genError}</p>
                )}
                <button
                  onClick={handleGenerateExpertSynthesis}
                  disabled={generatingExpert}
                  className="px-3 py-1.5 text-xs font-medium text-text-primary bg-accent/90 hover:bg-accent
                    disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {generatingExpert ? 'Running…' : synthesis ? 'Re-run Synthesis' : 'Run Expert Synthesis'}
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ── Underwriting Memo ── */}
        {isPressureTestPlus && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => navigate(`/memo/${thesis.id}`)}
              className="px-4 py-2 text-xs font-semibold text-text-primary border border-accent/40
                hover:border-accent hover:bg-accent/10 rounded-xl transition-colors"
            >
              Open Underwriting Memo →
            </button>
          </div>
        )}

        {/* ── Signals ── */}
        <Section title="Signal Evidence">
          {/* Reassessment banner */}
          {reassessmentCheck?.shouldTrigger && (
            <div className="flex items-center justify-between bg-orange-950/30 border border-orange-800/40
              rounded-lg px-3 py-2 mb-2">
              <div>
                <p className="text-[11px] text-warning font-medium">Reassessment Due</p>
                <p className="text-[10px] text-text-muted">{reassessmentCheck.reason}</p>
              </div>
              <button
                onClick={() => setShowReassessment(true)}
                className="px-3 py-1 text-[11px] text-warning border border-orange-800 rounded-lg
                  hover:bg-orange-950/40 transition-colors flex-shrink-0"
              >
                Run Reassessment
              </button>
            </div>
          )}

          {/* Composites */}
          {composites.length > 0 ? (
            <div className="space-y-2">
              {composites.map((c) => (
                <SignalCompositeCard
                  key={c.id}
                  composite={c}
                  signals={thesisSignals}
                  convergenceAlert={convergenceAlerts.find((a) => a.variable === c.variable)}
                  divergenceFlag={divergenceFlags.find((f) => f.variable === c.variable)}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted">
              No signals recorded. Add signals to build composite scores for mispriced variables.
            </p>
          )}

          {/* Signal entry form */}
          {showSignalForm ? (
            <SignalEntryForm
              thesisId={thesis.id}
              primaryVariable={thesis.primaryMispricedVariable}
              secondaryVariables={thesis.secondaryMispricedVariables}
              onSave={handleAddSignal}
              onCancel={() => setShowSignalForm(false)}
            />
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-text-muted">
                {thesisSignals.length} signal{thesisSignals.length !== 1 ? 's' : ''} recorded
              </span>
              <button
                onClick={() => setShowSignalForm(true)}
                className="px-3 py-1.5 text-xs font-medium text-text-primary bg-accent/90 hover:bg-accent
                  rounded-lg transition-colors"
              >
                + Add Signal
              </button>
            </div>
          )}
        </Section>

        {/* ── Decision + Kill bar ── */}
        <div className="flex items-center gap-3 justify-between pt-1">
          <button
            onClick={() => setShowKill(true)}
            className="px-4 py-2 text-xs font-medium text-danger/80 border border-red-900/50
              hover:border-red-700 hover:text-danger hover:bg-red-950/20 rounded-xl transition-colors"
          >
            Kill Thesis
          </button>
          <Link
            to={`/decision/${thesis.id}`}
            className="px-4 py-2 text-xs font-semibold text-text-primary border border-accent/40
              hover:border-accent hover:bg-accent/10 rounded-xl transition-colors"
          >
            Capital Allocation →
          </Link>
        </div>

      </div>

      <DetailDrawer thesis={thesis} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {macroModalOpen && <MacroRegimeModal onClose={() => setMacroModalOpen(false)} />}

      {showReassessment && liveDecayClock && reassessmentCheck && (
        <ReassessmentModal
          thesis={thesis}
          signals={thesisSignals}
          composites={composites}
          triggerReason={reassessmentCheck.reason}
          pathway={reassessmentCheck.pathway}
          onSave={(memo) => {
            setReassessmentMemo(thesis.id, memo)
            setShowReassessment(false)
          }}
          onDismiss={() => setShowReassessment(false)}
        />
      )}

      {showKill && (
        <KillModal
          thesis={thesis}
          signals={thesisSignals}
          composites={composites}
          onKill={handleKillComplete}
          onCancel={() => setShowKill(false)}
        />
      )}
    </>
  )
}
