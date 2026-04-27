import React, { useState } from 'react'
import type { Signal, MispricedVariable, SignalDirection, SourceQualityTier, SignalSpecificity, SignalScenarioTag } from '../../types'
import { MISPRICED_VARIABLE_LABELS } from '../../constants'
import { computeSignalWeight } from '../../api/signals'

interface Props {
  thesisId: string
  primaryVariable: MispricedVariable
  secondaryVariables: MispricedVariable[]
  onSave: (signal: Omit<Signal, 'id' | 'createdAt'>) => void
  onCancel: () => void
}

const DIRECTION_OPTS: { value: SignalDirection; label: string; color: string }[] = [
  { value: 'Strengthening', label: 'Strengthening', color: 'text-success border-green-800 bg-green-950/40' },
  { value: 'Neutral',       label: 'Neutral',       color: 'text-text-secondary border-border bg-surface' },
  { value: 'Weakening',     label: 'Weakening',     color: 'text-danger border-red-800 bg-red-950/40' },
]

const QUALITY_OPTS: { value: SourceQualityTier; label: string }[] = [
  { value: 'Tier1', label: 'Tier 1 — Primary source (earnings, filing, mgmt)' },
  { value: 'Tier2', label: 'Tier 2 — Expert / sell-side / channel check' },
  { value: 'Tier3', label: 'Tier 3 — Industry / trade press' },
  { value: 'Tier4', label: 'Tier 4 — Anecdote / social / unverified' },
]

const SPECIFICITY_OPTS: { value: SignalSpecificity; label: string }[] = [
  { value: 'Direct-Quantifiable', label: 'Direct Quantifiable' },
  { value: 'Direct-Qualitative',  label: 'Direct Qualitative' },
  { value: 'Indirect',            label: 'Indirect' },
  { value: 'Tangential',          label: 'Tangential' },
]

const SCENARIO_OPTS: { value: SignalScenarioTag; label: string }[] = [
  { value: 'ThesisConfirmed', label: 'Thesis Confirmed' },
  { value: 'ContestedPath',   label: 'Contested Path' },
  { value: 'ThesisBroken',    label: 'Thesis Broken' },
  { value: 'Neutral',         label: 'Neutral' },
]

const PillSelect = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[]
  value: T
  onChange: (v: T) => void
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors
          ${value === opt.value
            ? (opt.color ?? 'text-text-primary border-accent/60 bg-accent/15')
            : 'text-text-muted border-border hover:border-[#3a3a3a] hover:text-text-secondary'
          }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
)

export const SignalEntryForm: React.FC<Props> = ({
  thesisId,
  primaryVariable,
  secondaryVariables,
  onSave,
  onCancel,
}) => {
  const variableOptions = [
    primaryVariable,
    ...secondaryVariables,
  ].map((v) => ({ value: v, label: MISPRICED_VARIABLE_LABELS[v] ?? v }))

  const [variable, setVariable] = useState<MispricedVariable>(primaryVariable)
  const [direction, setDirection] = useState<SignalDirection>('Strengthening')
  const [quality, setQuality] = useState<SourceQualityTier>('Tier2')
  const [specificity, setSpecificity] = useState<SignalSpecificity>('Direct-Qualitative')
  const [scenarioTag, setScenarioTag] = useState<SignalScenarioTag>('Neutral')
  const [independent, setIndependent] = useState(true)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  const previewSignal: Signal = {
    id: 'preview',
    linkedThesisId: thesisId,
    variable,
    direction,
    sourceQuality: quality,
    sourceIndependent: independent,
    specificity,
    scenarioTag,
    weight: 0,
    title: title || 'Preview',
    observedAt: new Date(),
    createdAt: new Date(),
  }
  const previewWeight = computeSignalWeight(previewSignal)

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      linkedThesisId: thesisId,
      variable,
      direction,
      sourceQuality: quality,
      sourceIndependent: independent,
      specificity,
      scenarioTag,
      weight: previewWeight,
      title: title.trim(),
      notes: notes.trim() || undefined,
      observedAt: new Date(),
    })
  }

  return (
    <div className="space-y-4 p-4 bg-surface border border-border rounded-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">New Signal</h3>
        <span className="text-[10px] text-text-muted">
          Weight preview: <span className="text-text-secondary font-mono">{previewWeight.toFixed(3)}</span>
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-text-muted">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="One-sentence description of the signal…"
          className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-xs
            text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-text-muted">Variable</label>
        <PillSelect options={variableOptions} value={variable} onChange={setVariable} />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-text-muted">Direction</label>
        <PillSelect options={DIRECTION_OPTS} value={direction} onChange={setDirection} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">Source Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as SourceQualityTier)}
            className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-xs
              text-text-secondary focus:outline-none focus:border-accent/40"
          >
            {QUALITY_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">Specificity</label>
          <select
            value={specificity}
            onChange={(e) => setSpecificity(e.target.value as SignalSpecificity)}
            className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-xs
              text-text-secondary focus:outline-none focus:border-accent/40"
          >
            {SPECIFICITY_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">Scenario Tag</label>
          <PillSelect options={SCENARIO_OPTS} value={scenarioTag} onChange={setScenarioTag} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-text-muted">Source Independence</label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIndependent(true)}
              className={`px-3 py-1 text-[11px] rounded-md border transition-colors
                ${independent
                  ? 'text-text-primary border-accent/60 bg-accent/15'
                  : 'text-text-muted border-border hover:border-[#3a3a3a]'}`}
            >
              Independent
            </button>
            <button
              type="button"
              onClick={() => setIndependent(false)}
              className={`px-3 py-1 text-[11px] rounded-md border transition-colors
                ${!independent
                  ? 'text-text-primary border-border bg-surface-2'
                  : 'text-text-muted border-border hover:border-[#3a3a3a]'}`}
            >
              Correlated
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-text-muted">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Additional context…"
          className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-xs
            text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent/40 resize-none"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-text-muted border border-border
            hover:border-[#3a3a3a] hover:text-text-secondary rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim()}
          className="px-4 py-1.5 text-xs font-medium text-text-primary bg-accent/90 hover:bg-accent
            disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          Save Signal
        </button>
      </div>
    </div>
  )
}
