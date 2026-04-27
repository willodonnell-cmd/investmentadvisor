import React from 'react'
import type { SignalComposite, Signal, ConvergenceAlert, DivergenceFlag } from '../../types'
import { MISPRICED_VARIABLE_LABELS } from '../../constants'
import { formatRelativeTime } from '../../utils/formatting'

interface Props {
  composite: SignalComposite
  signals: Signal[]
  convergenceAlert?: ConvergenceAlert
  divergenceFlag?: DivergenceFlag
}

const DIRECTION_STYLES = {
  Strengthening: 'text-success',
  Neutral: 'text-text-secondary',
  Weakening: 'text-danger',
}

const DIRECTION_ARROWS = {
  Strengthening: '↑',
  Neutral: '→',
  Weakening: '↓',
}

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 10) / 20) * 100
  const color =
    score > 3 ? 'bg-success' :
    score > 0 ? 'bg-green-700' :
    score > -3 ? 'bg-warning' :
    'bg-danger'

  return (
    <div className="relative h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden w-full">
      <div
        className="absolute top-0 left-1/2 h-full rounded-full transition-all"
        style={{
          left: score >= 0 ? '50%' : `${pct}%`,
          width: `${Math.abs(score) / 20 * 100}%`,
        }}
      >
        <div className={`h-full w-full ${color} rounded-full`} />
      </div>
      <div className="absolute left-1/2 top-0 w-px h-full bg-[#444]" />
    </div>
  )
}

export const SignalCompositeCard: React.FC<Props> = ({
  composite,
  signals,
  convergenceAlert,
  divergenceFlag,
}) => {
  const [expanded, setExpanded] = React.useState(false)
  const varSignals = signals.filter((s) => s.variable === composite.variable)
  const label = MISPRICED_VARIABLE_LABELS[composite.variable] ?? composite.variable
  const dirStyle = DIRECTION_STYLES[composite.direction]
  const arrow = DIRECTION_ARROWS[composite.direction]

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-text-secondary font-medium truncate">{label}</span>
            {convergenceAlert && (
              <span className="text-[10px] text-success border border-green-800 bg-green-950/40 rounded px-1.5 py-0.5 flex-shrink-0">
                ⚡ Convergence ×{convergenceAlert.multiplier}
              </span>
            )}
            {divergenceFlag && (
              <span className="text-[10px] text-warning border border-orange-800 bg-orange-950/40 rounded px-1.5 py-0.5 flex-shrink-0">
                ⚠ Divergence
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-xs font-mono font-bold ${dirStyle}`}>
              {arrow} {composite.compositeScore.toFixed(1)}
            </span>
            <span className="text-[10px] text-text-muted">{composite.signalCount} signal{composite.signalCount !== 1 ? 's' : ''}</span>
            <span className="text-text-muted text-xs">{expanded ? '∧' : '∨'}</span>
          </div>
        </div>
        <div className="mt-2">
          <ScoreBar score={composite.compositeScore} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Composite</p>
              <p className={`text-sm font-bold font-mono ${dirStyle}`}>
                {composite.compositeScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Recent (30d)</p>
              <p className="text-sm font-bold font-mono text-text-primary">
                {composite.recentWeightedScore.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Last Updated</p>
              <p className="text-xs text-text-secondary">
                {formatRelativeTime(composite.lastUpdated)}
              </p>
            </div>
          </div>

          {varSignals.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Individual Signals</p>
              {varSignals
                .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
                .map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-secondary truncate">{s.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {s.sourceQuality} · {s.specificity} {s.sourceIndependent ? '· Independent' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[11px] font-medium ${DIRECTION_STYLES[s.direction]}`}>
                        {DIRECTION_ARROWS[s.direction]} {s.direction}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono">
                        w={s.weight.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {convergenceAlert && (
            <div className="bg-green-950/30 border border-green-800/40 rounded-lg px-3 py-2">
              <p className="text-[11px] text-success font-medium">
                ⚡ Convergence detected — {convergenceAlert.signalCount} independent signals in same direction within 30 days.
                Multiplier: {convergenceAlert.multiplier}×
              </p>
            </div>
          )}
          {divergenceFlag && (
            <div className="bg-orange-950/30 border border-orange-800/40 rounded-lg px-3 py-2">
              <p className="text-[11px] text-warning font-medium">
                ⚠ Divergence flag — conflicting directions detected: {divergenceFlag.conflictingDirections.join(' vs ')}.
                Review signals for quality or timing differences.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
