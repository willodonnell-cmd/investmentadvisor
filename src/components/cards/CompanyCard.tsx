import React from 'react'
import { Company } from '../../types'
import { Badge } from '../ui/Badge'
import { ScoreBar } from '../ui/ScoreBar'

interface CompanyCardProps {
  company: Company
}

const QUADRANT_STYLES: Record<Company['quadrant'], string> = {
  FullConviction:   'text-success bg-green-950 border-green-800',
  HoldOrWatch:      'text-yellow-300 bg-yellow-950 border-yellow-800',
  TacticalPosition: 'text-warning bg-orange-950 border-orange-800',
  Avoid:            'text-danger bg-red-950 border-red-900',
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => (
  <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-text-primary font-mono">{company.ticker}</span>
          <span className="text-xs text-text-secondary">{company.name}</span>
        </div>
        <p className="text-[11px] text-text-muted mt-0.5">{company.roleInThesis}</p>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${QUADRANT_STYLES[company.quadrant]}`}>
        {company.quadrant.replace(/([A-Z])/g, ' $1').trim()}
      </span>
    </div>

    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <ScoreBar
        value={company.businessQualityScore.total}
        label="Business Quality"
        size="sm"
      />
      <ScoreBar
        value={company.stockAttractivenessScore.total}
        label="Stock Attractiveness"
        size="sm"
      />
    </div>

    {company.scoreGap !== 0 && (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-text-muted">Score gap:</span>
        <span className={`text-[10px] font-medium ${company.scoreGap > 0 ? 'text-success' : 'text-danger'}`}>
          {company.scoreGap > 0 ? '+' : ''}{company.scoreGap.toFixed(1)}
        </span>
        <Badge label={company.scoreGap > 0 ? 'Stock > Business' : 'Business > Stock'} variant="muted" size="sm" />
      </div>
    )}
  </div>
)
