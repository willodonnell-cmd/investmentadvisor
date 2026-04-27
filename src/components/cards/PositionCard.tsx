import React from 'react'
import { Position } from '../../types'
import { Badge } from '../ui/Badge'
import { formatPct } from '../../utils/formatting'

const ACTION_STYLES: Record<string, string> = {
  DoNotOwn: 'text-text-muted',
  Watch:    'text-text-secondary',
  Start:    'text-blue-300',
  Add:      'text-success',
  Hold:     'text-text-primary',
  Trim:     'text-warning',
  Exit:     'text-danger',
  InitiateShort: 'text-danger',
  CoverShort:    'text-success',
}

interface PositionCardProps {
  position: Position
  ticker?: string
  thesisName?: string
}

export const PositionCard: React.FC<PositionCardProps> = ({ position, ticker, thesisName }) => {
  const actionColor = ACTION_STYLES[position.currentAction] ?? 'text-text-primary'
  const isShort = position.type === 'Short'

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          {ticker && (
            <span className="text-sm font-bold text-text-primary font-mono">{ticker}</span>
          )}
          {thesisName && (
            <p className="text-[11px] text-text-muted mt-0.5 truncate max-w-[180px]">{thesisName}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge label={position.type} size="sm" />
          <Badge label={position.account} size="sm" variant="muted" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-bold ${actionColor}`}>{position.currentAction}</p>
          <p className="text-[10px] text-text-muted mt-0.5">Action</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${isShort ? 'text-danger' : 'text-text-primary'}`}>
            {formatPct(position.currentSizePct, 1)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">Current</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-text-secondary">
            {formatPct(position.targetSizePct, 1)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">Target</p>
        </div>
      </div>
    </div>
  )
}
