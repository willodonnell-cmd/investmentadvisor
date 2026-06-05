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
import { JournalPromptBanner } from '../components/ui/JournalPromptBanner'
import { ConvictionLedger } from '../components/ui/ConvictionLedger'
import { ThesisResearchPanel } from '../components/ui/ThesisResearchPanel'
import { AskAIDock } from '../components/ui/AskAIDock'
import { useTopBar } from '../store/topbarStore'
import { THESIS_TYPE_LABELS, MISPRICED_VARIABLE_LABELS } from '../constants'
import { formatDate, formatHorizon, formatRelativeTime } from '../utils/formatting'
import { LifecycleStage, Thesis, Signal, KillRecord, ThesisLens } from '../types'
import { deleteThesisFromSystem } from '../utils/deleteThesis'
import { computeRegimeCompatibility, COMPATIBILITY_LABELS, COMPATIBILITY_COLORS } from '../api/macroRegime'
import { generateScenarios } from '../api/scenarios'
import { generateExpertSynthesis } from '../api/expertSynthesis'
import { generateResearchView } from '../api/underwriting'
import { computeComposite, computeSignalWeight, detectConvergence, detectDivergence } from '../api/signals'
import { triggerConvictionComparison } from '../api/convictionComparison'
import { useThesisBackgroundJobs } from '../hooks/useThesisBackgroundJobs'
import { computeDecayClock, shouldTriggerReassessment, computeEvidenceDrift } from '../api/decay'

const VARIANT_STRENGTH_LABELS: Record<string, string> = {
  ClearConsensusStrongVariant:    'Clear Consensus · Strong Variant',
  MixedConsensusModerateVariant:  'Mixed Consensus · Moderate Variant',
  UnclearConsensusWeakVariant:    'Unclear Consensus · Weak Variant',
  BroadlyAgreesWithConsensus:     'Broadly Agrees With Consensus',
}

const VARIANT_STRENGTH_STYLES: Record<string, React.CSSProperties> = {
  ClearConsensusStrongVariant:    { color: '#2E6E4A', background: 'rgba(46,110,74,0.10)', border: '1px solid rgba(46,110,74,0.30)' },
  MixedConsensusModerateVariant:  { color: '#7A4A10', background: 'rgba(122,74,16,0.10)', border: '1px solid rgba(122,74,16,0.30)' },
  UnclearConsensusWeakVariant:    { color: '#56504A', background: 'rgba(216,208,196,0.5)', border: '1px solid #D8D0C4' },
  BroadlyAgreesWithConsensus:     { color: '#A8A098', background: 'rgba(216,208,196,0.3)', border: '1px solid #D8D0C4' },
}

const DRIFT_STYLES: Record<string, string> = {
  Positive:      'text-success',
  Neutral:       'text-text-secondary',
  Negative:      'text-warning',
  SevereNegative:'text-danger',
}

const ACTIVE_STAGES: LifecycleStage[] = ['Developing', 'Actionable', 'Live']
const STAGE_SEGMENT_COLORS: Record<string, string> = {
  Developing: '#4a1d6b',
  Actionable: '#92400e',
  Live:       '#2d6a4f',
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const Section: React.FC<{
  title: string
  children: React.ReactNode
  accent?: boolean
}> = ({ title, children, accent }) => (
  <section
    className="rounded-xl p-4 space-y-3"
    style={accent ? {
      background: 'rgba(154,122,80,0.06)',
      border: '1px solid rgba(154,122,80,0.18)',
    } : {
      background: 'rgba(248,244,238,0.85)',
      border: '1px solid rgba(216,208,196,0.7)',
      boxShadow: '0 1px 4px rgba(60,40,10,0.05)',
    }}
  >
    <h2 className={`text-[10px] font-bold uppercase tracking-widest
      ${accent ? 'text-accent/80' : 'text-text-muted'}`}>
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

// ─── 3-segment Lifecycle Pill ───────────────────────────────────────────────

const LifecyclePill3: React.FC<{ thesis: Thesis }> = ({ thesis }) => {
  const { advanceLifecycle } = useThesisStore()
  const isTerminal = !ACTIVE_STAGES.includes(thesis.stage)

  return (
    <div style={{
      display: 'inline-flex', borderRadius: 6,
      border: '1px solid rgba(0,0,0,0.14)', overflow: 'hidden', flexShrink: 0,
    }}>
      {ACTIVE_STAGES.map((stage, i) => {
        const isActive = thesis.stage === stage
        const color = STAGE_SEGMENT_COLORS[stage]
        return (
          <button
            key={stage}
            onClick={() => advanceLifecycle(thesis.id, stage, `Manual → ${stage}`)}
            style={{
              padding: '4px 10px',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderRight: i < 2 ? '1px solid rgba(0,0,0,0.12)' : 'none',
              background: isActive ? color : 'rgba(248,244,238,0.9)',
              color: isActive ? '#fff' : 'rgba(0,0,0,0.28)',
              cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            {stage}
          </button>
        )
      })}
      {isTerminal && (
        <div style={{
          padding: '4px 10px', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          background: '#fde8e4', color: '#9b2c1a',
          borderLeft: '1px solid rgba(0,0,0,0.12)',
        }}>
          {thesis.stage}
        </div>
      )}
    </div>
  )
}

// ─── Editable Canvas Cell ───────────────────────────────────────────────────

interface EditableCanvasCellProps {
  index: number
  title: string
  value: string | string[]
  onEdit?: (v: string | string[]) => void
  colSpan?: number
  accent?: boolean
  readOnly?: boolean
  display?: React.ReactNode
}

const EditableCanvasCell: React.FC<EditableCanvasCellProps> = ({
  index, title, value, onEdit, colSpan, accent, readOnly, display,
}) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const isArray = Array.isArray(value)

  const startEdit = () => {
    if (readOnly || !onEdit) return
    setDraft(isArray ? (value as string[]).join('\n') : (value as string))
    setEditing(true)
  }

  const saveEdit = () => {
    if (!onEdit) return
    onEdit(isArray
      ? draft.split('\n').map(s => s.trim()).filter(Boolean)
      : draft.trim()
    )
    setEditing(false)
  }

  return (
    <div
      className="group relative"
      style={{
        gridColumn: colSpan ? `span ${colSpan}` : undefined,
        background: accent ? 'rgba(244,146,44,0.05)' : '#fbf8f1',
        border: `1px solid ${accent ? 'rgba(244,146,44,0.18)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 1px 0 rgba(255,255,255,.5) inset',
        minHeight: 80,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 9, fontWeight: 500, color: '#8b8980', letterSpacing: '0.02em' }}>
            {String(index).padStart(2, '0')}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#3a3a42' }}>
            {title}
          </span>
        </div>
        {!readOnly && !editing && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={startEdit}
              style={{ fontSize: 11, cursor: 'pointer', background: 'none', border: 'none', padding: '2px 5px', borderRadius: 4, color: '#8b8980' }}
              title="Edit"
            >✏️</button>
            <button
              style={{ fontSize: 11, cursor: 'pointer', background: 'none', border: 'none', padding: '2px 5px', borderRadius: 4, color: '#f4922c' }}
              title="Ask AI"
            >✨</button>
          </div>
        )}
      </div>

      {display ? (
        display
      ) : editing ? (
        <textarea
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => {
            if (e.key === 'Escape') setEditing(false)
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit()
          }}
          rows={isArray ? Math.max(3, (value as string[]).length + 1) : 3}
          style={{
            width: '100%', background: 'transparent',
            border: 'none', borderBottom: '1px solid rgba(154,122,80,0.4)',
            outline: 'none', resize: 'none',
            fontSize: 12, color: '#3a3a42', lineHeight: 1.55, fontFamily: 'inherit',
          }}
        />
      ) : isArray ? (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
          {(value as string[]).length === 0 ? (
            <span
              onClick={startEdit}
              style={{ fontSize: 11, color: '#a8a5a0', fontStyle: 'italic', cursor: 'text' }}
            >Click ✏️ to edit…</span>
          ) : (value as string[]).map((item, i) => (
            <li key={i} onClick={startEdit} style={{ display: 'flex', gap: 5, fontSize: 12, color: '#6b6860', lineHeight: 1.55, cursor: 'text' }}>
              <span style={{ color: '#a8a5a0', flexShrink: 0 }}>·</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p
          onClick={startEdit}
          style={{
            margin: 0, fontSize: 12,
            color: (value as string) ? '#3a3a42' : '#a8a5a0',
            lineHeight: 1.55,
            cursor: readOnly ? 'default' : 'text',
            fontStyle: (value as string) ? 'normal' : 'italic',
          }}
        >
          {(value as string) || 'Click to edit…'}
        </p>
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

      {thesis.macroRegimeCompatibility && (
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Macro Compatibility</p>
          <Badge label={thesis.macroRegimeCompatibility} />
        </div>
      )}

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
const ANALYSIS_STAGES: LifecycleStage[] = ['Developing', 'Actionable', 'Live']
const ACTIONABLE_PLUS: LifecycleStage[] = ['Actionable', 'Live']

const LENS_CYCLE: ThesisLens[] = ['Standalone', 'PrologisAware', 'CompareVsPrologis']
const LENS_LABELS: Record<ThesisLens, string> = {
  Standalone:        'Standalone',
  PrologisAware:     'Prologis-Aware',
  CompareVsPrologis: 'vs Prologis',
}

type ThesisTab = 'overview' | 'research'

export const ThesisScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ThesisTab>('overview')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [macroModalOpen, setMacroModalOpen] = useState(false)
  const [generatingScenarios, setGeneratingScenarios] = useState(false)
  const [generatingExpert, setGeneratingExpert] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [showSignalForm, setShowSignalForm] = useState(false)
  const [signalFormPrefill, setSignalFormPrefill] = useState<Partial<Omit<Signal, 'id' | 'createdAt'>> | null>(null)
  const [convertingSignalId, setConvertingSignalId] = useState<string | null>(null)
  const [showReassessment, setShowReassessment] = useState(false)
  const [showKill, setShowKill] = useState(false)
  const [killJournalPrompt, setKillJournalPrompt] = useState<{ thesisId: string; thesisName: string; ticker?: string } | null>(null)

  const thesis = useThesisStore((s) => (id ? s.theses[id] : undefined))
  const { convictionRunning, scenariosRunning, expertRunning, jobError } = useThesisBackgroundJobs(thesis)
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
  const updateSignal = useSignalStore((s) => s.updateSignal)
  const upsertComposite = useSignalStore((s) => s.upsertComposite)
  const signalsRecord = useSignalStore((s) => s.signals)
  const compositesByThesis = useSignalStore((s) => s.composites)

  const addKillRecord = useKillStore((s) => s.addKillRecord)

  const thesisSignals = useMemo(
    () => Object.values(signalsRecord).filter((s) => s.linkedThesisId === id),
    [signalsRecord, id]
  )

  const proposedSignals = useMemo(
    () => thesisSignals.filter((s) => s.isProposed),
    [thesisSignals]
  )

  const confirmedSignals = useMemo(
    () => thesisSignals.filter((s) => !s.isProposed),
    [thesisSignals]
  )

  const composites = useMemo(
    () => Object.values(compositesByThesis).filter((c) => c.linkedThesisId === id),
    [compositesByThesis, id]
  )

  const convergenceAlerts = useMemo(
    () => (thesis && id ? detectConvergence(confirmedSignals, id) : []),
    [confirmedSignals, id, thesis]
  )

  const divergenceFlags = useMemo(
    () => (thesis && id ? detectDivergence(confirmedSignals, id) : []),
    [confirmedSignals, id, thesis]
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

  useTopBar({
    title: thesis?.name ?? 'Thesis',
    backTo: '/',
    backLabel: 'Command Center',
    crumb: `Thesis #${id?.slice(-6).toUpperCase() ?? '---'}`,
  })

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

  const cycleLens = () => {
    const next = LENS_CYCLE[(LENS_CYCLE.indexOf(thesis.lens) + 1) % LENS_CYCLE.length]
    updateThesis(thesis.id, { lens: next })
  }

  const primaryTrigger = thesis.triggers.find((t) => t.isPrimary)
  const compatibility = computeRegimeCompatibility(thesis.type, regime)
  const isActionablePlus = ACTIONABLE_PLUS.includes(thesis.stage)
  const showAnalysisSections = ANALYSIS_STAGES.includes(thesis.stage)
  const showResearchTab = thesis.stage === 'Developing'
  const totalProbPct = Math.round(scenarios.reduce((s, sc) => s + sc.probability, 0) * 100)

  const handleDelete = () => {
    if (deleteThesisFromSystem(thesis.id, thesis.name)) {
      navigate('/')
    }
  }

  const openSignalForm = (
    prefill?: Partial<Omit<Signal, 'id' | 'createdAt'>>,
    convertingId?: string,
  ) => {
    setSignalFormPrefill(prefill ?? null)
    setConvertingSignalId(convertingId ?? null)
    setShowSignalForm(true)
  }

  const closeSignalForm = () => {
    setShowSignalForm(false)
    setSignalFormPrefill(null)
    setConvertingSignalId(null)
  }

  const refreshComposites = (signals: Signal[]) => {
    const newComposites = computeComposite(signals, thesis.id)
    newComposites.forEach(upsertComposite)
    const drift = computeEvidenceDrift(newComposites, thesis.primaryMispricedVariable)
    updateThesis(thesis.id, {
      evidenceDriftScore: drift.score,
      evidenceDriftDirection: drift.direction,
    })
  }

  const handleAddSignal = (
    partial: Omit<Signal, 'id' | 'createdAt'>,
    convertingId?: string,
  ) => {
    if (convertingId) {
      const existing = signalsRecord[convertingId]
      if (!existing) return
      const updated: Signal = {
        ...existing,
        ...partial,
        isProposed: false,
        proposedDirection: undefined,
        proposedSourceType: undefined,
        proposedSignificance: undefined,
        weight: computeSignalWeight({ ...existing, ...partial, isProposed: false } as Signal),
      }
      updateSignal(convertingId, updated)
      refreshComposites([...confirmedSignals.filter((s) => s.id !== convertingId), updated])
      triggerConvictionComparison(updated, thesis).catch(() => {})
      closeSignalForm()
      return
    }

    const signal: Signal = {
      ...partial,
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
    }
    addSignal(signal)
    refreshComposites([...confirmedSignals, signal])
    closeSignalForm()
  }

  const handleMarkProposedObserved = (signal: Signal) => {
    openSignalForm({
      linkedThesisId: signal.linkedThesisId,
      variable: signal.variable,
      direction: signal.direction,
      sourceQuality: 'Tier2',
      sourceIndependent: signal.sourceIndependent,
      specificity: signal.specificity === 'Indirect' ? 'Direct-Qualitative' : signal.specificity,
      scenarioTag: signal.scenarioTag,
      weight: signal.weight,
      title: signal.title,
      notes: signal.notes,
      observedAt: new Date(),
    }, signal.id)
  }

  const handleKillComplete = (record: KillRecord) => {
    addKillRecord(record)
    advanceLifecycle(thesis.id, 'Killed', `Kill type ${record.killType}: ${record.killReason}`)
    setShowKill(false)
    setKillJournalPrompt({ thesisId: thesis.id, thesisName: thesis.name, ticker: thesis.ticker })
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

        {killJournalPrompt && (
          <JournalPromptBanner
            decisionType="exit"
            thesisId={killJournalPrompt.thesisId}
            thesisName={killJournalPrompt.thesisName}
            ticker={killJournalPrompt.ticker}
            onDismiss={() => { setKillJournalPrompt(null); navigate('/') }}
          />
        )}

        {/* ── Hero Card ── */}
        <div style={{
          display: 'flex', borderRadius: 12, overflow: 'hidden',
          background: 'rgba(248,244,238,0.92)',
          border: '1px solid rgba(216,208,196,0.7)',
          boxShadow: '0 2px 12px rgba(60,40,10,0.08), 0 1px 3px rgba(60,40,10,0.06)',
        }}>
          {/* Sunburst gradient left bar */}
          <div style={{
            width: 4, flexShrink: 0,
            background: 'linear-gradient(to bottom, #ffd87a 0%, #f4922c 35%, #e0511a 70%, #a01a0c 100%)',
          }} />

          <div style={{ flex: 1, padding: '16px 18px' }}>
            {/* Title row */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-text-primary leading-tight">
                  {thesis.name}
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="font-mono text-[10px] text-text-muted">
                    #{thesis.id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-text-muted text-[10px]">·</span>
                  <Badge label={THESIS_TYPE_LABELS[thesis.type] ?? thesis.type} variant="muted" size="sm" />
                  <span className="text-text-muted text-[10px]">·</span>
                  <button
                    onClick={cycleLens}
                    className="text-[10px] text-text-muted border border-border hover:border-accent/40
                      hover:text-text-secondary rounded px-2 py-0.5 transition-colors"
                    title="Click to change lens"
                  >
                    {LENS_LABELS[thesis.lens] ?? thesis.lens}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <LifecyclePill3 thesis={thesis} />
                <div className="text-center">
                  {primaryTrigger && (
                    <div className="mb-1.5 flex justify-center">
                      <TriggerIndicator readiness={primaryTrigger.readiness} size="sm" />
                    </div>
                  )}
                  <ProgressRing
                    pct={thesis.decayClock.elapsedPct}
                    zone={thesis.decayClock.zone}
                    size={42}
                    strokeWidth={3}
                  />
                  <p className="text-[9px] text-text-muted mt-0.5">
                    {Math.round(thesis.decayClock.elapsedPct)}%
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="px-3 py-1.5 text-xs text-text-secondary border border-border
                      hover:border-accent/40 hover:text-text-primary rounded-lg transition-colors"
                  >
                    Detail
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-xs text-danger/70 border border-border
                      hover:border-danger/40 hover:text-danger rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Meta strip */}
            <div className="grid grid-cols-6" style={{ borderTop: '1px solid rgba(216,208,196,0.6)' }}>
              {[
                {
                  label: 'Conviction',
                  value: thesis.thesisQualityScore != null ? `${thesis.thesisQualityScore}/10` : '—',
                },
                {
                  label: 'Horizon',
                  value: formatHorizon(thesis.timeHorizon),
                },
                {
                  label: 'Signals',
                  value: `${confirmedSignals.length}${proposedSignals.length > 0 ? ` +${proposedSignals.length}p` : ''}`,
                },
                {
                  label: 'Drift',
                  value: thesis.evidenceDriftDirection !== 'Neutral'
                    ? `${thesis.evidenceDriftScore > 0 ? '+' : ''}${thesis.evidenceDriftScore} ${thesis.evidenceDriftDirection}`
                    : 'Neutral',
                },
                {
                  label: 'Compatibility',
                  value: COMPATIBILITY_LABELS[compatibility] ?? '—',
                },
                {
                  label: 'Created',
                  value: formatDate(thesis.createdAt),
                },
              ].map((cell, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    borderRight: i < 5 ? '1px solid rgba(216,208,196,0.6)' : 'none',
                  }}
                >
                  <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#a8a5a0', marginBottom: 3 }}>
                    {cell.label}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1f', lineHeight: 1.2 }}>
                    {cell.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab switcher ── */}
        {showResearchTab && (
          <div className="tab-group">
            <button
              className={`tab${activeTab === 'overview' ? ' active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab${activeTab === 'research' ? ' active' : ''}`}
              onClick={() => setActiveTab('research')}
            >
              Research
            </button>
          </div>
        )}

        {activeTab === 'research' && showResearchTab ? (
          <ThesisResearchPanel thesis={thesis} active={activeTab === 'research'} />
        ) : (
        <>

        {/* ── Thesis Canvas ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">
            Thesis Canvas
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>

            {/* 01 Statement */}
            <EditableCanvasCell
              index={1} title="Statement" colSpan={4} accent
              value={thesis.statement}
              onEdit={v => updateThesis(thesis.id, { statement: v as string })}
            />

            {/* 02 Why Now */}
            <EditableCanvasCell
              index={2} title="Why Now"
              value={thesis.whyNow}
              onEdit={v => updateThesis(thesis.id, { whyNow: v as string })}
            />

            {/* 03 Transmission Path */}
            <EditableCanvasCell
              index={3} title="Transmission Path" colSpan={2} accent
              value={thesis.transmissionPath}
              onEdit={v => updateThesis(thesis.id, { transmissionPath: v as string })}
            />

            {/* 04 Variant Strength */}
            <EditableCanvasCell
              index={4} title="Variant Strength"
              value={VARIANT_STRENGTH_LABELS[thesis.variantPerceptionStrength] ?? thesis.variantPerceptionStrength}
              readOnly
              display={
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
                  style={VARIANT_STRENGTH_STYLES[thesis.variantPerceptionStrength] ?? { color: '#A8A098' }}
                >
                  {VARIANT_STRENGTH_LABELS[thesis.variantPerceptionStrength] ?? thesis.variantPerceptionStrength}
                </div>
              }
            />

            {/* 05 Consensus View */}
            <EditableCanvasCell
              index={5} title="Consensus View" colSpan={2}
              value={thesis.consensusView}
              onEdit={v => updateThesis(thesis.id, { consensusView: v as string })}
            />

            {/* 06 Variant View */}
            <EditableCanvasCell
              index={6} title="Variant View" colSpan={2} accent
              value={thesis.variantView}
              onEdit={v => updateThesis(thesis.id, { variantView: v as string })}
            />

            {/* 07 Key Assumptions */}
            <EditableCanvasCell
              index={7} title="Key Assumptions"
              value={thesis.keyAssumptions}
              onEdit={v => updateThesis(thesis.id, { keyAssumptions: v as string[] })}
            />

            {/* 08 Disconfirmers */}
            <EditableCanvasCell
              index={8} title="Disconfirmers"
              value={thesis.disconfirmers}
              onEdit={v => updateThesis(thesis.id, { disconfirmers: v as string[] })}
            />

            {/* 09 Beneficiaries */}
            <EditableCanvasCell
              index={9} title="Beneficiaries"
              value={thesis.beneficiaries}
              onEdit={v => updateThesis(thesis.id, { beneficiaries: v as string[] })}
            />

            {/* 10 Losers */}
            <EditableCanvasCell
              index={10} title="Losers"
              value={thesis.losers}
              onEdit={v => updateThesis(thesis.id, { losers: v as string[] })}
            />

            {/* 11 Value Capture */}
            <EditableCanvasCell
              index={11} title="Value Capture" colSpan={2}
              value={thesis.valueCaptureMethod ?? ''}
              onEdit={v => updateThesis(thesis.id, { valueCaptureMethod: v as string })}
            />

            {/* 12 Mispriced Variable */}
            <EditableCanvasCell
              index={12} title="Mispriced Variable"
              value={MISPRICED_VARIABLE_LABELS[thesis.primaryMispricedVariable] ?? thesis.primaryMispricedVariable}
              readOnly
              display={
                <span className="text-[11px] text-accent font-semibold">
                  {MISPRICED_VARIABLE_LABELS[thesis.primaryMispricedVariable] ?? thesis.primaryMispricedVariable.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              }
            />

            {/* 13 Time Horizon */}
            <EditableCanvasCell
              index={13} title="Time Horizon"
              value={formatHorizon(thesis.timeHorizon)}
              readOnly
              display={
                <span className="font-mono text-sm font-semibold text-text-primary">
                  {formatHorizon(thesis.timeHorizon)}
                </span>
              }
            />
          </div>
        </div>

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

        {/* ── Evidence Drift ── */}
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
                hover:border-accent/40 rounded px-2 py-0.5 transition-colors"
            >
              Edit Regime
            </button>
          </div>
        </Section>

        {/* ── Scenarios ── */}
        {showAnalysisSections && (
          <Section title="Narrative Scenarios">
            {scenarios.length > 0 && (
              <>
                {totalProbPct !== 100 && (
                  <div className="px-3 py-2 rounded-lg mb-3" style={{
                    background: 'rgba(122,74,16,0.10)',
                    border: '1px solid rgba(122,74,16,0.30)',
                  }}>
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
                  disabled={generatingScenarios || scenariosRunning}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-accent/90 hover:bg-accent
                    disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {(generatingScenarios || scenariosRunning) ? 'Generating…' : scenarios.length > 0 ? 'Regenerate' : 'Generate Scenarios'}
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ── Expert Synthesis ── */}
        {showAnalysisSections && (
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
                  disabled={generatingExpert || expertRunning}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-accent/90 hover:bg-accent
                    disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {(generatingExpert || expertRunning) ? 'Running…' : synthesis ? 'Re-run Synthesis' : 'Run Expert Synthesis'}
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ── Underwriting Memo ── */}
        {isActionablePlus && (
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
          {reassessmentCheck?.shouldTrigger && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-2" style={{
              background: 'rgba(122,74,16,0.10)',
              border: '1px solid rgba(122,74,16,0.30)',
            }}>
              <div>
                <p className="text-[11px] text-warning font-medium">Reassessment Due</p>
                <p className="text-[10px] text-text-muted">{reassessmentCheck.reason}</p>
              </div>
              <button
                onClick={() => setShowReassessment(true)}
                className="px-3 py-1 text-[11px] text-warning rounded-lg
                  hover:bg-warning/10 transition-colors flex-shrink-0"
                style={{ border: '1px solid rgba(122,74,16,0.40)' }}
              >
                Run Reassessment
              </button>
            </div>
          )}

          {proposedSignals.length > 0 && (
            <div
              className="rounded-lg p-3 mb-3 space-y-2"
              style={{
                background: 'rgba(216,208,196,0.25)',
                border: '1px solid rgba(154,122,80,0.22)',
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Proposed Signals to Track
              </p>
              <div className="space-y-2">
                {proposedSignals.map((signal) => {
                  const significance = signal.proposedSignificance ?? (signal.specificity === 'Direct-Quantifiable' ? 'High' : 'Medium')
                  const directionLabel = signal.proposedDirection ?? (signal.direction === 'Weakening' ? 'Disconfirming' : 'Confirming')
                  const sourceType = signal.proposedSourceType ?? 'Unknown source'
                  return (
                    <div
                      key={signal.id}
                      className="rounded-lg px-3 py-2.5"
                      style={{
                        background: 'rgba(248,244,238,0.7)',
                        border: '1px solid rgba(216,208,196,0.8)',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-text-muted mt-0.5 flex-shrink-0">☐</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-text-primary leading-relaxed">{signal.title}</p>
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0 px-1.5 py-0.5 rounded"
                              style={{
                                color: significance === 'High' ? '#7A4A10' : '#706050',
                                background: significance === 'High' ? 'rgba(122,74,16,0.10)' : 'rgba(20,12,4,0.05)',
                              }}
                            >
                              {significance}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted mt-1">
                            Source: {sourceType} · {directionLabel === 'Disconfirming' ? 'Disconfirms' : 'Confirms'}: {MISPRICED_VARIABLE_LABELS[signal.variable] ?? signal.variable}
                          </p>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">Proposed</span>
                            <button
                              type="button"
                              onClick={() => handleMarkProposedObserved(signal)}
                              className="text-[10px] text-accent hover:text-accent/80 transition-colors"
                            >
                              Mark as observed →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {composites.length > 0 ? (
            <div className="space-y-2">
              {composites.map((c) => (
                <SignalCompositeCard
                  key={c.id}
                  composite={c}
                  signals={confirmedSignals}
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

          {showSignalForm ? (
            <SignalEntryForm
              thesisId={thesis.id}
              primaryVariable={thesis.primaryMispricedVariable}
              secondaryVariables={thesis.secondaryMispricedVariables}
              onSave={handleAddSignal}
              onCancel={closeSignalForm}
              initialValues={signalFormPrefill ?? undefined}
              convertingId={convertingSignalId ?? undefined}
            />
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-text-muted">
                {confirmedSignals.length} signal{confirmedSignals.length !== 1 ? 's' : ''} recorded
                {proposedSignals.length > 0 && ` · ${proposedSignals.length} proposed`}
              </span>
              <button
                onClick={() => openSignalForm()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-accent/90 hover:bg-accent
                  rounded-lg transition-colors"
              >
                + Add Signal
              </button>
            </div>
          )}
        </Section>

        {(genError || (jobError && !genError)) && (
          <p className="text-[10px] text-danger px-1">{genError ?? jobError}</p>
        )}

        {/* ── Conviction Ledger ── */}
        <Section title="Conviction Ledger">
          <ConvictionLedger
            thesisId={thesis.id}
            convictionReasoning={thesis.convictionReasoning}
            thesisQualityScore={thesis.thesisQualityScore}
            convictionDrivers={thesis.convictionDrivers}
            convictionInitStatus={thesis.convictionInitStatus}
            convictionRunning={convictionRunning}
          />
        </Section>

        {/* ── Decision + Kill bar ── */}
        <div className="flex items-center gap-3 justify-between pt-1">
          <button
            onClick={() => setShowKill(true)}
            className="px-4 py-2 text-xs font-medium text-danger/80 border border-danger/30
              hover:border-danger/60 hover:text-danger hover:bg-danger/5 rounded-xl transition-colors"
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

        </>
        )}

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

      <AskAIDock
        context={`Thesis: ${thesis.name}`}
        starterQuestions={[
          `What is the key risk to the ${thesis.name} thesis right now?`,
          `Which signals would most strengthen conviction here?`,
          `How does the macro regime affect this thesis?`,
          `What is the most likely path to thesis invalidation?`,
        ]}
      />
    </>
  )
}
