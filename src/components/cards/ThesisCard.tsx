import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Thesis } from '../../types'
import { LifecycleBadge } from '../ui/Badge'
import { ProgressRing } from '../ui/ProgressRing'
import { TriggerIndicator } from '../ui/TriggerIndicator'
import { THESIS_TYPE_LABELS } from '../../constants'
import { formatHorizon } from '../../utils/formatting'

interface ThesisCardProps {
  thesis: Thesis
  compact?: boolean
}

export const ThesisCard: React.FC<ThesisCardProps> = ({ thesis, compact = false }) => {
  const navigate = useNavigate()
  const primaryTrigger = thesis.triggers.find((t) => t.isPrimary)

  return (
    <div
      onClick={() => navigate(`/thesis/${thesis.id}`)}
      className="group relative bg-surface hover:bg-surface-2 border border-border hover:border-[#3a3a3a] rounded-xl p-4 cursor-pointer transition-all duration-150"
      style={{
        backdropFilter: 'blur(12px)',
        background: 'rgba(20,20,20,0.8)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-white transition-colors">
            {thesis.name}
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            {THESIS_TYPE_LABELS[thesis.type] ?? thesis.type}
          </p>
        </div>
        <LifecycleBadge stage={thesis.stage} size="sm" />
      </div>

      {!compact && thesis.statement && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
          {thesis.statement}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {primaryTrigger && (
            <TriggerIndicator readiness={primaryTrigger.readiness} size="sm" />
          )}
          <span className="text-[10px] text-text-muted">
            {formatHorizon(thesis.timeHorizon)}
          </span>
        </div>

        <ProgressRing
          pct={thesis.decayClock.elapsedPct}
          zone={thesis.decayClock.zone}
          size={28}
          strokeWidth={2.5}
        />
      </div>

      {thesis.primaryMispricedVariable && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-[10px] text-text-muted">Mispriced: </span>
          <span className="text-[10px] text-accent font-medium">
            {thesis.primaryMispricedVariable.replace(/([A-Z])/g, ' $1').trim()}
          </span>
        </div>
      )}
    </div>
  )
}
