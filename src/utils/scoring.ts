import { ScoredDimensions } from '../types'

export const calcScoredDimensionsTotal = (scored: ScoredDimensions): number => {
  const values = Object.values(scored.dimensions)
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export const calcScoreGap = (
  stockAttractivenessTotal: number,
  businessQualityTotal: number
): number => stockAttractivenessTotal - businessQualityTotal

export const quarterKelly = (
  edge: number,
  odds: number
): number => {
  const kelly = edge / odds
  return Math.max(0, kelly / 4)
}

export const calcDecayElapsed = (
  createdAt: Date,
  horizonMonths: number
): { elapsedMonths: number; elapsedPct: number; zone: 'Green' | 'Yellow' | 'Orange' | 'Red' | 'Overdue' } => {
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  const elapsedMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44)
  const elapsedPct = Math.min((elapsedMonths / horizonMonths) * 100, 100)

  let zone: 'Green' | 'Yellow' | 'Orange' | 'Red' | 'Overdue'
  if (elapsedPct >= 100) zone = 'Overdue'
  else if (elapsedPct >= 80) zone = 'Red'
  else if (elapsedPct >= 60) zone = 'Orange'
  else if (elapsedPct >= 40) zone = 'Yellow'
  else zone = 'Green'

  return { elapsedMonths, elapsedPct, zone }
}
