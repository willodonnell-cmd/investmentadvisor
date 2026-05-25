import type { Signal, SignalComposite, ConvergenceAlert, DivergenceFlag, SignalDirection, SourceQualityTier, SignalSpecificity } from '../types'

const QUALITY_BASE: Record<SourceQualityTier, number> = {
  Tier1: 1.0,
  Tier2: 0.8,
  Tier3: 0.6,
  Tier4: 0.4,
  Proposed: 0,
}

const SPECIFICITY_MULT: Record<SignalSpecificity, number> = {
  'Direct-Quantifiable': 1.0,
  'Direct-Qualitative': 0.8,
  Indirect: 0.5,
  Tangential: 0.25,
}

const HALF_LIFE_DAYS: Record<SourceQualityTier, number> = {
  Tier1: 90,
  Tier2: 60,
  Tier3: 30,
  Tier4: 14,
  Proposed: 365,
}

const DIRECTION_SCORE: Record<SignalDirection, number> = {
  Strengthening: 1,
  Neutral: 0,
  Weakening: -1,
}

function recencyDecay(observedAt: Date, halfLifeDays: number): number {
  const ageMs = Date.now() - new Date(observedAt).getTime()
  const ageDays = ageMs / 86_400_000
  return Math.pow(0.5, ageDays / halfLifeDays)
}

export function computeSignalWeight(signal: Signal): number {
  const base = QUALITY_BASE[signal.sourceQuality]
  const spec = SPECIFICITY_MULT[signal.specificity]
  const decay = recencyDecay(signal.observedAt, HALF_LIFE_DAYS[signal.sourceQuality])
  const independenceBonus = signal.sourceIndependent ? 1.15 : 1.0
  return base * spec * decay * independenceBonus
}

export function computeComposite(signals: Signal[], thesisId: string): SignalComposite[] {
  const byVariable = new Map<string, Signal[]>()
  for (const s of signals) {
    if (s.linkedThesisId !== thesisId || s.isProposed) continue
    const arr = byVariable.get(s.variable) ?? []
    arr.push(s)
    byVariable.set(s.variable, arr)
  }

  const composites: SignalComposite[] = []
  for (const [variable, varSignals] of byVariable) {
    let weightedSum = 0
    let totalWeight = 0
    let recentWeightedSum = 0
    let recentWeight = 0

    const thirtyDaysAgo = Date.now() - 30 * 86_400_000

    for (const s of varSignals) {
      const w = computeSignalWeight(s)
      const score = DIRECTION_SCORE[s.direction] * w * 10
      weightedSum += score
      totalWeight += w

      if (new Date(s.observedAt).getTime() > thirtyDaysAgo) {
        recentWeightedSum += score
        recentWeight += w
      }
    }

    const compositeScore = totalWeight > 0
      ? Math.max(-10, Math.min(10, weightedSum / totalWeight))
      : 0

    const recentWeightedScore = recentWeight > 0
      ? Math.max(-10, Math.min(10, recentWeightedSum / recentWeight))
      : compositeScore

    const direction: SignalDirection =
      compositeScore > 1 ? 'Strengthening' : compositeScore < -1 ? 'Weakening' : 'Neutral'

    composites.push({
      id: `${thesisId}-${variable}`,
      linkedThesisId: thesisId,
      variable: variable as Signal['variable'],
      compositeScore,
      signalCount: varSignals.length,
      recentWeightedScore,
      direction,
      lastUpdated: new Date(),
    })
  }

  return composites
}

export function detectConvergence(
  signals: Signal[],
  thesisId: string,
): ConvergenceAlert[] {
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000
  const recent = signals.filter(
    (s) =>
      s.linkedThesisId === thesisId &&
      !s.isProposed &&
      new Date(s.observedAt).getTime() > thirtyDaysAgo,
  )

  const byVariable = new Map<string, Signal[]>()
  for (const s of recent) {
    const arr = byVariable.get(s.variable) ?? []
    arr.push(s)
    byVariable.set(s.variable, arr)
  }

  const alerts: ConvergenceAlert[] = []

  for (const [variable, varSignals] of byVariable) {
    const directions = new Set(varSignals.map((s) => s.direction))
    if (directions.size !== 1) continue

    const direction = varSignals[0].direction
    if (direction === 'Neutral') continue

    const independentCount = varSignals.filter((s) => s.sourceIndependent).length
    if (independentCount < 3) continue

    alerts.push({
      thesisId,
      variable: variable as Signal['variable'],
      direction,
      signalCount: varSignals.length,
      detectedAt: new Date(),
      multiplier: 1.25,
    })
  }

  return alerts
}

export function detectDivergence(
  signals: Signal[],
  thesisId: string,
): DivergenceFlag[] {
  const sixtyDaysAgo = Date.now() - 60 * 86_400_000
  const recent = signals.filter(
    (s) =>
      s.linkedThesisId === thesisId &&
      !s.isProposed &&
      s.direction !== 'Neutral' &&
      new Date(s.observedAt).getTime() > sixtyDaysAgo,
  )

  const byVariable = new Map<string, Set<SignalDirection>>()
  for (const s of recent) {
    const dirs = byVariable.get(s.variable) ?? new Set<SignalDirection>()
    dirs.add(s.direction)
    byVariable.set(s.variable, dirs)
  }

  const flags: DivergenceFlag[] = []
  for (const [variable, dirs] of byVariable) {
    if (dirs.size < 2) continue
    flags.push({
      thesisId,
      variable: variable as Signal['variable'],
      conflictingDirections: Array.from(dirs),
      detectedAt: new Date(),
    })
  }

  return flags
}

export function computeThesisSignalScore(
  composites: SignalComposite[],
  primaryVariable: Signal['variable'],
  secondaryVariables: Signal['variable'][],
): number {
  const getScore = (v: string) =>
    composites.find((c) => c.variable === v)?.compositeScore ?? 0

  const primaryScore = getScore(primaryVariable)
  const secondaryScores = secondaryVariables.map(getScore)
  const otherVariables = composites
    .filter(
      (c) =>
        c.variable !== primaryVariable &&
        !secondaryVariables.includes(c.variable as Signal['variable']),
    )
    .map((c) => c.compositeScore)

  const secondaryAvg = secondaryScores.length
    ? secondaryScores.reduce((a, b) => a + b, 0) / secondaryScores.length
    : 0
  const otherAvg = otherVariables.length
    ? otherVariables.reduce((a, b) => a + b, 0) / otherVariables.length
    : 0

  return primaryScore * 0.6 + secondaryAvg * 0.25 + otherAvg * 0.15
}
