import React, { useState } from 'react'
import type { Thesis, ReassessmentMemo } from '../../types'
import type { Signal, SignalComposite } from '../../types'
import { generateReassessmentMemo } from '../../api/decay'

interface Props {
  thesis: Thesis
  signals: Signal[]
  composites: SignalComposite[]
  triggerReason: string
  pathway: 'A' | 'B' | 'C' | 'D'
  onSave: (memo: ReassessmentMemo) => void
  onDismiss: () => void
}

const DECISION_CONFIG: Record<ReassessmentMemo['decision'], { color: string; bg: string; border: string; label: string }> = {
  Reaffirm: { color: 'text-success',        bg: 'bg-green-950/40',  border: 'border-green-800',  label: 'Reaffirm' },
  Reduce:   { color: 'text-warning',        bg: 'bg-orange-950/40', border: 'border-orange-800', label: 'Reduce Conviction' },
  Kill:     { color: 'text-danger',         bg: 'bg-red-950/40',    border: 'border-red-800',    label: 'Kill Thesis' },
  Convert:  { color: 'text-text-secondary', bg: 'bg-surface',       border: 'border-border',     label: 'Convert / Reframe' },
}

const PATHWAY_LABELS = { A: 'Scheduled', B: 'Disconfirmer triggered', C: 'Signal collapse', D: 'Forced by decay' }

export const ReassessmentModal: React.FC<Props> = ({
  thesis,
  signals,
  composites,
  triggerReason,
  pathway,
  onSave,
  onDismiss,
}) => {
  const [memo, setMemo] = useState<ReassessmentMemo | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const result = await generateReassessmentMemo(thesis, signals, composites, triggerReason, pathway)
      setMemo(result)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  const decisionCfg = memo ? DECISION_CONFIG[memo.decision] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#0f0f0f] border border-border rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] text-warning uppercase tracking-widest font-semibold mb-1">
              Reassessment Protocol — {PATHWAY_LABELS[pathway]}
            </p>
            <h2 className="text-sm font-bold text-text-primary">{thesis.name}</h2>
            <p className="text-[11px] text-text-muted mt-0.5">{triggerReason}</p>
          </div>
          <button
            onClick={onDismiss}
            className="text-text-muted hover:text-text-secondary text-lg leading-none mt-0.5 flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Decay context */}
        <div className="px-5 py-3 flex gap-4 border-b border-border bg-surface/60">
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Decay Zone</p>
            <p className="text-xs font-medium text-text-primary">{thesis.decayClock.zone}</p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Elapsed</p>
            <p className="text-xs font-medium text-text-primary">
              {thesis.decayClock.elapsedMonths}mo / {thesis.decayClock.statedHorizonMonths}mo
            </p>
          </div>
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Evidence Drift</p>
            <p className={`text-xs font-medium ${
              thesis.evidenceDriftDirection === 'Positive' ? 'text-success' :
              thesis.evidenceDriftDirection === 'Negative' ? 'text-warning' :
              thesis.evidenceDriftDirection === 'SevereNegative' ? 'text-danger' :
              'text-text-secondary'
            }`}>{thesis.evidenceDriftDirection}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 max-h-[480px] overflow-y-auto">
          {!memo && !generating && (
            <div className="text-center py-6">
              <p className="text-sm text-text-secondary mb-1">Generate a formal reassessment</p>
              <p className="text-xs text-text-muted mb-4">
                The system will analyze decay clock, evidence drift, and signal state to recommend a decision.
              </p>
              <button
                onClick={handleGenerate}
                className="px-5 py-2 text-xs font-semibold text-text-primary bg-accent/90 hover:bg-accent
                  rounded-xl transition-colors"
              >
                Run Reassessment
              </button>
            </div>
          )}

          {generating && (
            <div className="text-center py-8">
              <p className="text-sm text-text-muted animate-pulse">Analyzing thesis state…</p>
            </div>
          )}

          {error && (
            <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              <p className="text-xs text-danger">{error}</p>
              <button onClick={handleGenerate} className="text-[11px] text-accent mt-1 hover:underline">
                Retry
              </button>
            </div>
          )}

          {memo && decisionCfg && (
            <div className="space-y-3">
              {/* Decision */}
              <div className={`px-4 py-3 rounded-xl border ${decisionCfg.bg} ${decisionCfg.border}`}>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Decision</p>
                <p className={`text-base font-bold ${decisionCfg.color}`}>{decisionCfg.label}</p>
              </div>

              {/* Trigger */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Trigger</p>
                <p className="text-xs text-text-secondary leading-relaxed">{memo.trigger}</p>
              </div>

              {/* Evidence */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Evidence State</p>
                <p className="text-xs text-text-secondary leading-relaxed">{memo.evidence}</p>
              </div>

              {/* Recommendation */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Recommendation</p>
                <p className="text-xs text-text-primary leading-relaxed">{memo.recommendation}</p>
              </div>

              {/* Kill rationale */}
              {memo.decision === 'Kill' && memo.killRationale && (
                <div className="bg-red-950/20 border border-red-800/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-danger/70 mb-1">Kill Rationale</p>
                  <p className="text-xs text-text-secondary leading-relaxed">{memo.killRationale}</p>
                </div>
              )}

              {/* Key risks */}
              {memo.keyRisks.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5">Key Risks</p>
                  <ul className="space-y-1">
                    {memo.keyRisks.map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs text-text-secondary">
                        <span className="text-text-muted mt-0.5 flex-shrink-0">·</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {memo && (
              <button
                onClick={handleGenerate}
                className="px-3 py-1.5 text-xs text-text-muted border border-border
                  hover:border-[#3a3a3a] hover:text-text-secondary rounded-lg transition-colors"
              >
                Regenerate
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs text-text-muted border border-border
                hover:border-[#3a3a3a] rounded-lg transition-colors"
            >
              Dismiss
            </button>
            {memo && (
              <button
                onClick={() => onSave(memo)}
                className="px-4 py-1.5 text-xs font-semibold text-text-primary bg-accent/90 hover:bg-accent
                  rounded-lg transition-colors"
              >
                Save & Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
