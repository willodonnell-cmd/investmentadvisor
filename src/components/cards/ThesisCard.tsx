import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Thesis } from '../../types'
import { LifecycleBadge } from '../ui/Badge'
import { ProgressRing } from '../ui/ProgressRing'
import { TriggerIndicator } from '../ui/TriggerIndicator'
import { THESIS_TYPE_LABELS } from '../../constants'
import { formatHorizon } from '../../utils/formatting'
import { LifecycleStage } from '../../types'

const STAGE_ACCENT: Record<LifecycleStage, string> = {
  Developing:   'linear-gradient(to bottom, #683890, #502878)',
  Actionable:   'linear-gradient(to bottom, #A05818, #804010)',
  Live:         'linear-gradient(to bottom, #3A8058, #2A6040)',
  PlayedOut:    '#A8A098',
  Broken:       '#A83030',
  Archived:     '#C8C0B4',
}

interface ThesisCardProps {
  thesis: Thesis
  compact?: boolean
}

export const ThesisCard: React.FC<ThesisCardProps> = ({ thesis, compact = false }) => {
  const navigate = useNavigate()
  const primaryTrigger = thesis.triggers.find((t) => t.isPrimary)
  const accent = STAGE_ACCENT[thesis.stage]
  const isGradient = accent.startsWith('linear')

  return (
    <div
      onClick={() => navigate(`/thesis/${thesis.id}`)}
      className="group relative cursor-pointer"
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        background: 'rgba(248,244,238,0.9)',
        boxShadow: '0 2px 12px rgba(60,40,10,0.08), 0 1px 3px rgba(60,40,10,0.06)',
        border: '1px solid rgba(216,208,196,0.8)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        display: 'flex',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(60,40,10,0.12), 0 2px 6px rgba(60,40,10,0.08)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(60,40,10,0.08), 0 1px 3px rgba(60,40,10,0.06)'
      }}
    >
      {/* Left accent bar */}
      <div style={{ width: 3, flexShrink: 0, background: isGradient ? accent : accent }} />

      <div style={{ flex: 1, padding: 14 }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary truncate">
              {thesis.name}
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 italic">
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
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(216,208,196,0.7)' }}>
            <span className="text-[10px] text-text-muted">Mispriced: </span>
            <span className="text-[10px] text-accent font-medium">
              {thesis.primaryMispricedVariable.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
