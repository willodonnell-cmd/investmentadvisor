import type { ConvictionDeltaCategory } from '../types/conviction'

/** Signal-triggered score changes (thesis-engine-spec §6.3). */
export const CONVICTION_DELTA_MAGNITUDES: Record<
  ConvictionDeltaCategory,
  { label: string; range: [number, number]; description: string }
> = {
  ConfirmingMaterial: {
    label: 'Confirming — Material',
    range: [8, 15],
    description: 'Assumption strengthened; conviction upgrade warranted',
  },
  ConfirmingMinor: {
    label: 'Confirming — Minor',
    range: [2, 7],
    description: 'Incremental support; modest upgrade',
  },
  Neutral: {
    label: 'Neutral',
    range: [0, 0],
    description: 'Relevant but no directional update',
  },
  ContradictingMinor: {
    label: 'Contradicting — Minor',
    range: [-7, -2],
    description: 'Partial divergence; slight reduction',
  },
  ContradictingMaterial: {
    label: 'Contradicting — Material',
    range: [-15, -8],
    description: 'Substantial divergence; meaningful reduction',
  },
  ThesisAltering: {
    label: 'Thesis-Altering',
    range: [-35, -20],
    description: 'Assumption invalidated; kill review warranted',
  },
}

/** Initial conviction score calibration (0–100). */
export const CONVICTION_SCORE_CALIBRATION = [
  { range: [0, 25], label: 'Weak', description: 'Vague framing, unfalsifiable, or major structural gaps' },
  { range: [26, 45], label: 'Speculative', description: 'Plausible direction but thin variant or weak transmission' },
  { range: [46, 60], label: 'Moderate', description: 'Coherent thesis, unproven; standard developing conviction' },
  { range: [61, 75], label: 'Strong', description: 'Sharp variant, clear mispriced variable, plausible path' },
  { range: [76, 85], label: 'Exceptional', description: 'Rare at creation — unusually specific and falsifiable' },
  { range: [86, 92], label: 'Near-ceiling', description: 'Almost never at initial assessment' },
  { range: [93, 100], label: 'Maximum', description: 'Reserved for sustained confirming evidence over time; virtually impossible at creation' },
] as const

export const CONVICTION_SCORE_MIN = 0
export const CONVICTION_SCORE_MAX = 100

export function clampConvictionScore(score: number): number {
  return Math.max(CONVICTION_SCORE_MIN, Math.min(CONVICTION_SCORE_MAX, Math.round(score)))
}

export function clampDriverMagnitude(magnitude: number, direction: 'Up' | 'Down'): number {
  const abs = Math.max(1, Math.min(35, Math.round(Math.abs(magnitude))))
  return direction === 'Down' ? -abs : abs
}

export function formatMagnitude(magnitude: number): string {
  return magnitude > 0 ? `+${magnitude}` : `${magnitude}`
}
