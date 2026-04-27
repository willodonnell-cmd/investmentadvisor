import React from 'react'
import { Trigger } from '../../types'
import { TriggerIndicator } from '../ui/TriggerIndicator'
import { ScoreBar } from '../ui/ScoreBar'
import { Badge } from '../ui/Badge'

interface TriggerCardProps {
  trigger: Trigger
}

export const TriggerCard: React.FC<TriggerCardProps> = ({ trigger }) => (
  <div className="bg-surface border border-border rounded-lg p-3 space-y-2.5">
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs text-text-primary leading-snug">{trigger.description}</p>
      {trigger.isPrimary && <Badge label="Primary" variant="accent" size="sm" />}
    </div>
    <div className="flex items-center justify-between">
      <TriggerIndicator readiness={trigger.readiness} size="sm" />
      <div className="w-24">
        <ScoreBar value={trigger.readinessScore} max={100} showValue={false} size="sm" />
      </div>
    </div>
    <p className="text-[10px] text-text-muted">{trigger.type}</p>
  </div>
)
