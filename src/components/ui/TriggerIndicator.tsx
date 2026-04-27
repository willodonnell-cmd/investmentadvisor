import React from 'react'
import { TriggerReadiness } from '../../types'

const READINESS_CONFIG: Record<TriggerReadiness, { label: string; dotColor: string; textColor: string }> = {
  NotReady:     { label: 'Not Ready',    dotColor: '#555555', textColor: 'text-text-muted' },
  Building:     { label: 'Building',     dotColor: '#888888', textColor: 'text-text-secondary' },
  Accelerating: { label: 'Accelerating', dotColor: '#fb923c', textColor: 'text-warning' },
  Active:       { label: 'Active',       dotColor: '#4ade80', textColor: 'text-success' },
  Diminishing:  { label: 'Diminishing',  dotColor: '#f87171', textColor: 'text-danger' },
}

interface TriggerIndicatorProps {
  readiness: TriggerReadiness
  size?: 'sm' | 'md'
}

export const TriggerIndicator: React.FC<TriggerIndicatorProps> = ({ readiness, size = 'md' }) => {
  const config = READINESS_CONFIG[readiness]
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'
  const isPulsing = readiness === 'Active' || readiness === 'Accelerating'

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex">
        {isPulsing && (
          <span
            className={`animate-ping absolute inline-flex ${dotSize} rounded-full opacity-50`}
            style={{ backgroundColor: config.dotColor }}
          />
        )}
        <span
          className={`relative inline-flex ${dotSize} rounded-full`}
          style={{ backgroundColor: config.dotColor }}
        />
      </span>
      <span className={`${textSize} font-medium ${config.textColor}`}>{config.label}</span>
    </div>
  )
}
