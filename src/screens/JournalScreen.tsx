import React, { useState, useMemo } from 'react'
import { useJournalStore } from '../store/journalStore'
import { useThesisStore } from '../store/thesisStore'
import { useTopBar } from '../store/topbarStore'
import type { JournalEntry, DecisionType, ConfidenceLevel, PredictionOutcome } from '../types/journal'

// ─── Constants ────────────────────────────────────────────────────────────────

const DECISION_TYPES: { value: DecisionType; label: string }[] = [
  { value: 'entry', label: 'Entry' },
  { value: 'exit', label: 'Exit' },
  { value: 'trim', label: 'Trim' },
  { value: 'hold', label: 'Hold' },
  { value: 'pass', label: 'Pass' },
]

const CONFIDENCE_LEVELS: { value: ConfidenceLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'very-high', label: 'Very High' },
]

const OUTCOME_OPTIONS: { value: PredictionOutcome; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'correct', label: 'Correct' },
  { value: 'partially-correct', label: 'Partially Correct' },
  { value: 'incorrect', label: 'Incorrect' },
]

const OUTCOME_COLORS: Record<PredictionOutcome, { bg: string; text: string }> = {
  pending:           { bg: 'rgba(107,104,96,0.10)', text: '#6b6860' },
  correct:           { bg: 'rgba(30,112,66,0.10)',  text: '#1E7042' },
  'partially-correct': { bg: 'rgba(146,64,14,0.10)', text: '#92400e' },
  incorrect:         { bg: 'rgba(160,40,40,0.10)',  text: '#A02828' },
}

const DECISION_COLORS: Record<DecisionType, { bg: string; text: string }> = {
  entry: { bg: 'rgba(30,112,66,0.10)',   text: '#1E7042' },
  exit:  { bg: 'rgba(160,40,40,0.10)',   text: '#A02828' },
  trim:  { bg: 'rgba(146,64,14,0.10)',   text: '#92400e' },
  hold:  { bg: 'rgba(30,61,90,0.10)',    text: '#1e3d5a' },
  pass:  { bg: 'rgba(107,104,96,0.10)',  text: '#6b6860' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtCapital(n: number | null): string {
  if (n === null) return ''
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: '#f5f2eb',
      border: `1px solid ${accent ? 'rgba(160,40,40,0.25)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: '#a8a5a0', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: accent ? '#A02828' : '#1a1a1f', fontFamily: 'GeistMono, monospace', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{
      display: 'inline-flex', borderRadius: 8,
      border: '1px solid rgba(0,0,0,0.12)', overflow: 'hidden', flexShrink: 0,
    }}>
      {options.map((opt, i) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '5px 12px',
              fontSize: 11, fontWeight: active ? 600 : 400,
              letterSpacing: '0.02em',
              borderRight: i < options.length - 1 ? '1px solid rgba(0,0,0,0.10)' : 'none',
              background: active ? '#1a1a1f' : 'rgba(248,244,238,0.9)',
              color: active ? '#ffffff' : 'rgba(0,0,0,0.45)',
              cursor: 'pointer',
              transition: 'background 0.10s, color 0.10s',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid rgba(0,0,0,0.12)',
  fontSize: 13,
  color: '#1a1a1f',
  background: '#fdfcf9',
  outline: 'none',
  boxSizing: 'border-box',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  lineHeight: 1.5,
  minHeight: 72,
}

const labelStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.09em',
  textTransform: 'uppercase' as const,
  color: '#a8a5a0',
  marginBottom: 6,
  display: 'block',
}

// ─── Empty form state ─────────────────────────────────────────────────────────

function emptyForm() {
  return {
    decisionType: 'entry' as DecisionType,
    ticker: '',
    thesisId: '',
    variantPerceptionStatement: '',
    explicitPrediction: '',
    confidenceLevel: 'medium' as ConfidenceLevel,
    predictionTimeframe: '',
    capitalDeployed: '',
  }
}

// ─── New Entry Form ───────────────────────────────────────────────────────────

function NewEntryForm({ onSuccess }: { onSuccess: () => void }) {
  const addEntry = useJournalStore((s) => s.addEntry)
  const theses = useThesisStore((s) => s.theses)
  const thesisList = useMemo(
    () => Object.values(theses).sort((a, b) => a.name.localeCompare(b.name)),
    [theses],
  )

  const [form, setForm] = useState(emptyForm())

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, val: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.variantPerceptionStatement.trim() || !form.explicitPrediction.trim()) return

    const selectedThesis = form.thesisId ? theses[form.thesisId] : null
    const capital = form.capitalDeployed !== '' ? parseFloat(form.capitalDeployed.replace(/[^0-9.]/g, '')) : null

    addEntry({
      decisionType: form.decisionType,
      ticker: form.ticker.trim() || null,
      thesisId: selectedThesis?.id ?? null,
      thesisName: selectedThesis?.name ?? null,
      thesisScoreAtDecision: selectedThesis?.thesisQualityScore ?? null,
      macroRegimeAtDecision: null,
      variantPerceptionStatement: form.variantPerceptionStatement.trim(),
      explicitPrediction: form.explicitPrediction.trim(),
      confidenceLevel: form.confidenceLevel,
      predictionTimeframe: form.predictionTimeframe.trim(),
      capitalDeployed: isNaN(capital ?? NaN) ? null : capital,
      reviewedAt: null,
      reviewNotes: null,
      predictionOutcome: 'pending',
      lessonsLearned: null,
    })

    setForm(emptyForm())
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#f5f2eb',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#a8a5a0', marginBottom: 4 }}>
        Log a Decision
      </p>

      {/* Row 1: Decision type + Ticker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
        <div>
          <label style={labelStyle}>Decision Type</label>
          <SegmentedControl
            options={DECISION_TYPES}
            value={form.decisionType}
            onChange={(v) => set('decisionType', v)}
          />
        </div>
        <div>
          <label style={labelStyle}>Ticker (optional)</label>
          <input
            style={{ ...inputStyle, width: 120 }}
            value={form.ticker}
            onChange={(e) => set('ticker', e.target.value.toUpperCase())}
            placeholder="e.g. PLD"
          />
        </div>
      </div>

      {/* Row 2: Thesis link */}
      <div>
        <label style={labelStyle}>Link to Thesis (optional)</label>
        <select
          style={{ ...inputStyle, cursor: 'pointer' }}
          value={form.thesisId}
          onChange={(e) => set('thesisId', e.target.value)}
        >
          <option value="">— No thesis —</option>
          {thesisList.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Row 3: Variant perception */}
      <div>
        <label style={labelStyle}>Variant Perception Statement</label>
        <textarea
          style={textareaStyle}
          value={form.variantPerceptionStatement}
          onChange={(e) => set('variantPerceptionStatement', e.target.value)}
          placeholder="What is the market getting wrong here?"
          required
        />
      </div>

      {/* Row 4: Explicit prediction */}
      <div>
        <label style={labelStyle}>Explicit Prediction</label>
        <textarea
          style={textareaStyle}
          value={form.explicitPrediction}
          onChange={(e) => set('explicitPrediction', e.target.value)}
          placeholder="I believe X will happen within Y timeframe because Z"
          required
        />
      </div>

      {/* Row 5: Confidence + Timeframe */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Confidence Level</label>
          <SegmentedControl
            options={CONFIDENCE_LEVELS}
            value={form.confidenceLevel}
            onChange={(v) => set('confidenceLevel', v)}
          />
        </div>
        <div>
          <label style={labelStyle}>Prediction Timeframe</label>
          <input
            style={inputStyle}
            value={form.predictionTimeframe}
            onChange={(e) => set('predictionTimeframe', e.target.value)}
            placeholder="e.g. 2 quarters, 12 months"
          />
        </div>
      </div>

      {/* Row 6: Capital deployed */}
      <div style={{ maxWidth: 200 }}>
        <label style={labelStyle}>Capital Deployed (optional)</label>
        <input
          style={inputStyle}
          type="text"
          inputMode="numeric"
          value={form.capitalDeployed}
          onChange={(e) => set('capitalDeployed', e.target.value)}
          placeholder="$0"
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
        <button
          type="submit"
          style={{
            padding: '9px 24px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #C8A060, #A07840)',
            fontSize: 13, fontWeight: 600, color: '#1A1208', cursor: 'pointer',
          }}
        >
          Log Decision
        </button>
      </div>
    </form>
  )
}

// ─── Inline Review Panel ──────────────────────────────────────────────────────

function ReviewPanel({ entry, onClose }: { entry: JournalEntry; onClose: () => void }) {
  const updateEntry = useJournalStore((s) => s.updateEntry)
  const [notes, setNotes] = useState(entry.reviewNotes ?? '')
  const [outcome, setOutcome] = useState<PredictionOutcome>(entry.predictionOutcome)
  const [lessons, setLessons] = useState(entry.lessonsLearned ?? '')

  function handleSave() {
    updateEntry(entry.id, {
      reviewNotes: notes.trim() || null,
      predictionOutcome: outcome,
      lessonsLearned: lessons.trim() || null,
      reviewedAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div style={{
      background: 'rgba(248,244,238,0.85)',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: '0 0 10px 10px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      borderTop: 'none',
      marginTop: -1,
    }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#a8a5a0' }}>
        Review Entry
      </p>

      <div>
        <label style={labelStyle}>Prediction Outcome</label>
        <SegmentedControl
          options={OUTCOME_OPTIONS}
          value={outcome}
          onChange={setOutcome}
        />
      </div>

      <div>
        <label style={labelStyle}>Review Notes</label>
        <textarea
          style={{ ...textareaStyle, minHeight: 60 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What actually happened? How did it compare to your prediction?"
        />
      </div>

      <div>
        <label style={labelStyle}>Lessons Learned</label>
        <textarea
          style={{ ...textareaStyle, minHeight: 60 }}
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          placeholder="What would you do differently? What does this update in your process?"
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            padding: '6px 14px', borderRadius: 7,
            border: '1px solid rgba(0,0,0,0.12)',
            fontSize: 12, color: '#6b6860', background: 'none', cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '6px 14px', borderRadius: 7, border: 'none',
            background: 'linear-gradient(135deg, #C8A060, #A07840)',
            fontSize: 12, fontWeight: 600, color: '#1A1208', cursor: 'pointer',
          }}
        >
          Save Review
        </button>
      </div>
    </div>
  )
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry, isReviewing, onToggleReview,
}: {
  entry: JournalEntry
  isReviewing: boolean
  onToggleReview: () => void
}) {
  const deleteEntry = useJournalStore((s) => s.deleteEntry)
  const dt = DECISION_COLORS[entry.decisionType]
  const oc = OUTCOME_COLORS[entry.predictionOutcome]

  return (
    <div>
      <div style={{
        background: '#f5f2eb',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: isReviewing ? '10px 10px 0 0' : 10,
        padding: '14px 18px',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 4,
            background: dt.bg, color: dt.text,
          }}>
            {entry.decisionType}
          </span>
          {entry.ticker && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1f', fontFamily: 'GeistMono, monospace', letterSpacing: '0.02em' }}>
              {entry.ticker}
            </span>
          )}
          {entry.thesisName && (
            <span style={{ fontSize: 11, color: '#6b6860' }}>{entry.thesisName}</span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#a8a5a0' }}>{fmtDate(entry.createdAt)}</span>
        </div>

        {/* Prediction */}
        <p style={{
          fontSize: 12, color: '#1a1a1f', lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          {entry.explicitPrediction}
        </p>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
            background: 'rgba(0,0,0,0.05)', color: '#6b6860',
            textTransform: 'capitalize',
          }}>
            {entry.confidenceLevel.replace('-', ' ')} confidence
          </span>
          {entry.predictionTimeframe && (
            <span style={{ fontSize: 11, color: '#a8a5a0' }}>{entry.predictionTimeframe}</span>
          )}
          {entry.capitalDeployed !== null && (
            <span style={{ fontSize: 11, color: '#a8a5a0' }}>{fmtCapital(entry.capitalDeployed)}</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
            background: oc.bg, color: oc.text,
            textTransform: 'capitalize',
          }}>
            {entry.predictionOutcome.replace('-', ' ')}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button
              onClick={onToggleReview}
              style={{
                padding: '4px 10px', borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.12)',
                fontSize: 11, color: isReviewing ? '#1a1a1f' : '#6b6860',
                fontWeight: isReviewing ? 600 : 400,
                background: isReviewing ? 'rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              {isReviewing ? 'Close' : 'Review'}
            </button>
            <button
              onClick={() => deleteEntry(entry.id)}
              style={{
                padding: '4px 8px', borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 11, color: '#a8a5a0',
                background: 'none', cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {isReviewing && <ReviewPanel entry={entry} onClose={onToggleReview} />}
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const JournalScreen: React.FC = () => {
  const entries = useJournalStore((s) => s.entries)
  const getEntriesPendingReview = useJournalStore((s) => s.getEntriesPendingReview)
  const theses = useThesisStore((s) => s.theses)
  const thesisList = useMemo(() => Object.values(theses).sort((a, b) => a.name.localeCompare(b.name)), [theses])

  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState<DecisionType | 'all'>('all')
  const [filterOutcome, setFilterOutcome] = useState<PredictionOutcome | 'all'>('all')
  const [filterThesisId, setFilterThesisId] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  useTopBar({ title: 'Decision Journal', crumb: 'Predictions · Review · Learning' })

  const pendingOverdue = useMemo(() => getEntriesPendingReview(), [entries, getEntriesPendingReview])

  // Stats
  const reviewedEntries = useMemo(
    () => entries.filter((e) => e.predictionOutcome !== 'pending'),
    [entries],
  )
  const accuracyRate = useMemo(() => {
    if (reviewedEntries.length === 0) return null
    const correct = reviewedEntries.filter(
      (e) => e.predictionOutcome === 'correct' || e.predictionOutcome === 'partially-correct',
    ).length
    return correct / reviewedEntries.length
  }, [reviewedEntries])

  // Filtered list
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterType !== 'all' && e.decisionType !== filterType) return false
      if (filterOutcome !== 'all' && e.predictionOutcome !== filterOutcome) return false
      if (filterThesisId !== 'all' && e.thesisId !== filterThesisId) return false
      if (searchText.trim()) {
        const q = searchText.toLowerCase()
        const haystack = [
          e.ticker ?? '',
          e.thesisName ?? '',
          e.explicitPrediction,
          e.variantPerceptionStatement,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [entries, filterType, filterOutcome, filterThesisId, searchText])

  function handleFormSuccess() {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2500)
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12 }}>
        <StatCard label="Decisions Logged" value={String(entries.length)} />
        <StatCard
          label="Prediction Accuracy"
          value={accuracyRate !== null ? `${(accuracyRate * 100).toFixed(0)}%` : '—'}
        />
        <StatCard
          label="Pending Review"
          value={String(pendingOverdue.length)}
          accent={pendingOverdue.length > 0}
        />
      </div>

      {/* Success flash */}
      {showSuccess && (
        <div style={{
          background: 'rgba(30,112,66,0.08)',
          border: '1px solid rgba(30,112,66,0.20)',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 12,
          color: '#1E7042',
          fontWeight: 500,
        }}>
          Decision logged.
        </div>
      )}

      {/* New entry form */}
      <NewEntryForm onSuccess={handleFormSuccess} />

      {/* Filter bar */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, width: 180, fontSize: 12 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search…"
          />
          <select
            style={{ ...inputStyle, width: 120, fontSize: 12, cursor: 'pointer' }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as DecisionType | 'all')}
          >
            <option value="all">All types</option>
            {DECISION_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select
            style={{ ...inputStyle, width: 150, fontSize: 12, cursor: 'pointer' }}
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value as PredictionOutcome | 'all')}
          >
            <option value="all">All outcomes</option>
            {OUTCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            style={{ ...inputStyle, width: 180, fontSize: 12, cursor: 'pointer' }}
            value={filterThesisId}
            onChange={(e) => setFilterThesisId(e.target.value)}
          >
            <option value="all">All theses</option>
            {thesisList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {(filterType !== 'all' || filterOutcome !== 'all' || filterThesisId !== 'all' || searchText) && (
            <button
              onClick={() => { setFilterType('all'); setFilterOutcome('all'); setFilterThesisId('all'); setSearchText('') }}
              style={{
                padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.10)',
                fontSize: 11, color: '#a8a5a0', background: 'none', cursor: 'pointer',
              }}
            >
              Clear filters
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a8a5a0' }}>
            {filtered.length} / {entries.length}
          </span>
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div style={{
          background: '#f5f2eb', border: '1.5px dashed rgba(0,0,0,0.12)',
          borderRadius: 12, padding: '32px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: '#a8a5a0' }}>No decisions logged yet.</p>
          <p style={{ fontSize: 11, color: '#c8c0b4', marginTop: 4 }}>Use the form above to record your first decision.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: '#f5f2eb', border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12, padding: '24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: '#a8a5a0' }}>No entries match the current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isReviewing={reviewingId === entry.id}
              onToggleReview={() => setReviewingId(reviewingId === entry.id ? null : entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
