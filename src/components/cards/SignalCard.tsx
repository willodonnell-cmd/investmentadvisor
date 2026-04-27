import React from 'react'
import { Signal } from '../../types'
import { MISPRICED_VARIABLE_LABELS } from '../../constants'
import { formatRelativeTime } from '../../utils/formatting'

const DIRECTION_CONFIG = {
  Strengthening: { color: 'text-success', icon: '↑' },
  Neutral:       { color: 'text-text-secondary', icon: '→' },
  Weakening:     { color: 'text-danger', icon: '↓' },
}

const TIER_LABELS: Record<string, string> = {
  Tier1: 'T1',
  Tier2: 'T2',
  Tier3: 'T3',
  Tier4: 'T4',
}

interface SignalCardProps {
  signal: Signal
}

export const SignalCard: React.FC<SignalCardProps> = ({ signal }) => {
  const dir = DIRECTION_CONFIG[signal.direction]

  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 flex items-start gap-3">
      <span className={`text-base font-bold mt-0.5 ${dir.color}`}>{dir.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-primary font-medium truncate">{signal.title}</p>
        <p className="text-[10px] text-text-muted mt-0.5">
          {MISPRICED_VARIABLE_LABELS[signal.variable]} · {signal.specificity} · {TIER_LABELS[signal.sourceQuality]}
          {signal.sourceIndependent && ' · Independent'}
        </p>
        {signal.notes && (
          <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">{signal.notes}</p>
        )}
      </div>
      <span className="text-[10px] text-text-muted whitespace-nowrap">
        {formatRelativeTime(signal.observedAt)}
      </span>
    </div>
  )
}
