import type {
  Thesis, MacroDriver, FactorType, FactorExposure,
  MacroDriverExposure, CorrelatedPair, PortfolioMacroSignature,
  ThesisLens,
} from '../types'
import type { Scenario } from '../types'
import type { Position } from '../types'

// ─── Driver assignment table ───────────────────────────────────────────────

type DriverSpec = { primary: MacroDriver[]; secondary?: MacroDriver }

const THESIS_DRIVERS: Record<string, DriverSpec> = {
  LongDurationCompounder:            { primary: ['UsInterestRates', 'CreditCycle'] },
  MacroRegimeShift:                  { primary: ['UsInterestRates', 'CreditCycle'], secondary: 'DollarDirection' },
  DeepContrarianMispricing:          { primary: ['CreditCycle', 'RegulatoryEnvironment'] },
  SpecialSituationsCatalyst:         { primary: ['CreditCycle', 'PoliticalEconomyFiscal'] },
  CapitalAllocationQuality:          { primary: ['UsInterestRates', 'CreditCycle'] },
  MarketStructureReflexivity:        { primary: ['CreditCycle', 'TechnologyAdoptionCurve'] },
  TechnologyDisruption:              { primary: ['AiCapexCycle', 'TechnologyAdoptionCurve'] },
  RegulatoryPolicy:                  { primary: ['RegulatoryEnvironment', 'PoliticalEconomyFiscal'] },
  IndustryStructureConsumerBehavior: { primary: ['ConsumerHealth', 'LaborMarketWageDynamics'] },
  CapitalCycle:                      { primary: ['CreditCycle', 'UsInterestRates'], secondary: 'RegulatoryEnvironment' },
  OperationalTurnaround:             { primary: ['CreditCycle', 'ConsumerHealth'] },
  RealEstatePhysicalAssets:          { primary: ['RealAssetRepricing', 'UsInterestRates'], secondary: 'CreditCycle' },
  Geopolitical:                      { primary: ['GeopoliticalRiskPremium', 'DollarDirection'] },
  ShortHedgeThesis:                  { primary: ['CreditCycle', 'GeopoliticalRiskPremium'] },
  HouseholdAllocationDecision:       { primary: ['UsInterestRates', 'ConsumerHealth'] },
}

export const PROLOGIS_DRIVERS: DriverSpec = {
  primary: ['RealAssetRepricing', 'ConsumerHealth'],
  secondary: 'UsInterestRates',
}

// ─── Factor loadings table ─────────────────────────────────────────────────

const THESIS_FACTORS: Record<string, Partial<Record<FactorType, number>>> = {
  LongDurationCompounder:            { MarketBeta: 1.0, Quality: 1.5, Duration: 1.5, Value: -0.5 },
  MacroRegimeShift:                  { MarketBeta: 0.5, Credit: 0.5, Duration: 1.0, Momentum: 1.0 },
  DeepContrarianMispricing:          { Value: 2.0, Quality: -0.5, MarketBeta: 0.5, Momentum: -1.5 },
  SpecialSituationsCatalyst:         { MarketBeta: 0.5, Momentum: 1.5, Quality: 0.5 },
  CapitalAllocationQuality:          { Quality: 2.0, MarketBeta: 0.5, Value: 0.5, Duration: 0.5 },
  MarketStructureReflexivity:        { Momentum: 2.0, MarketBeta: 1.0, Credit: 1.0 },
  TechnologyDisruption:              { MarketBeta: 1.5, Momentum: 1.5, Quality: 1.0, Duration: -1.0 },
  RegulatoryPolicy:                  { MarketBeta: 0.5, Credit: 0.5, Quality: 0.5 },
  IndustryStructureConsumerBehavior: { MarketBeta: 0.5, Value: 1.0, Quality: 0.5 },
  CapitalCycle:                      { Value: 1.5, Commodity: 1.5, MarketBeta: 0.5, Momentum: -0.5 },
  OperationalTurnaround:             { Value: 2.0, MarketBeta: 1.0, Quality: -1.0 },
  RealEstatePhysicalAssets:          { Duration: 2.0, Value: 1.0, Credit: 1.0, MarketBeta: 0.5 },
  Geopolitical:                      { Commodity: 1.5, Credit: -0.5, MarketBeta: -0.5 },
  ShortHedgeThesis:                  { MarketBeta: -1.5, Momentum: -1.5, Credit: -1.0, Quality: -0.5 },
  HouseholdAllocationDecision:       { MarketBeta: 0.5, Duration: 1.0, Quality: 0.5 },
}

const PROLOGIS_FACTORS: Partial<Record<FactorType, number>> = {
  Duration: 2.0, Value: 1.0, Credit: 0.5, MarketBeta: 0.8,
}

const ALL_FACTORS: FactorType[] = [
  'MarketBeta', 'Value', 'Quality', 'Momentum', 'Size', 'Duration', 'Commodity', 'Credit',
]

// ─── Helpers ──────────────────────────────────────────────────────────────

function driversForThesis(t: Thesis): MacroDriver[] {
  const spec = THESIS_DRIVERS[t.type]
  if (!spec) return []
  return spec.secondary ? [...spec.primary, spec.secondary] : [...spec.primary]
}

function macroDriverSimilarity(driversA: MacroDriver[], driversB: MacroDriver[]): number {
  if (driversA.length === 0 || driversB.length === 0) return 0
  const setA = new Set(driversA)
  const setB = new Set(driversB)
  const intersection = [...setA].filter((d) => setB.has(d)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

function factorSimilarity(
  loadA: Partial<Record<FactorType, number>>,
  loadB: Partial<Record<FactorType, number>>,
): number {
  const vecA = ALL_FACTORS.map((f) => loadA[f] ?? 0)
  const vecB = ALL_FACTORS.map((f) => loadB[f] ?? 0)
  const dot = vecA.reduce((s, a, i) => s + a * vecB[i], 0)
  const magA = Math.sqrt(vecA.reduce((s, a) => s + a * a, 0))
  const magB = Math.sqrt(vecB.reduce((s, b) => s + b * b, 0))
  if (magA === 0 || magB === 0) return 0
  return Math.max(0, Math.min(1, dot / (magA * magB)))
}

function triggerDependencyScore(
  a: Thesis,
  b: Thesis,
): { score: number; strength?: 'Significant' | 'Structural'; upstreamCondition: string } {
  let score = 0

  if (a.primaryMispricedVariable === b.primaryMispricedVariable) score += 0.40
  const sharedSecondary = a.secondaryMispricedVariables.filter(
    (v) =>
      b.secondaryMispricedVariables.includes(v) ||
      v === b.primaryMispricedVariable,
  ).length
  score += Math.min(sharedSecondary * 0.15, 0.30)
  if (a.type === b.type) score += 0.20

  const driversA = driversForThesis(a)
  const driversB = driversForThesis(b)
  const driverOverlap = driversA.filter((d) => driversB.includes(d)).length
  score += Math.min(driverOverlap * 0.10, 0.20)

  score = Math.min(score, 1.0)
  const strength: 'Significant' | 'Structural' | undefined =
    score >= 0.60 ? 'Structural' : score >= 0.30 ? 'Significant' : undefined

  const sharedVar =
    a.primaryMispricedVariable === b.primaryMispricedVariable
      ? a.primaryMispricedVariable
      : driversA.find((d) => driversB.includes(d)) ?? 'shared macro driver'

  return {
    score,
    strength,
    upstreamCondition: `Both theses depend on ${sharedVar} for conviction`,
  }
}

function scenarioAlignment(scenariosA: Scenario[], scenariosB: Scenario[]): number {
  const probOf = (scs: Scenario[], type: string) =>
    scs.find((s) => s.type === type)?.probability ?? 0.33
  const bullA = probOf(scenariosA, 'ThesisConfirmed')
  const bullB = probOf(scenariosB, 'ThesisConfirmed')
  const bearA = probOf(scenariosA, 'ThesisBroken')
  const bearB = probOf(scenariosB, 'ThesisBroken')
  const bullAlign = Math.min(bullA, bullB) + Math.abs(bullA - 0.33) * 0.5
  const bearAlign = Math.min(bearA, bearB) + Math.abs(bearA - 0.33) * 0.5
  return Math.max(Math.min(bullAlign, 1), Math.min(bearAlign, 1))
}

function classifyCorrelation(
  score: number,
): CorrelatedPair['classification'] {
  if (score < 0.25) return 'Uncorrelated'
  if (score < 0.40) return 'LowCorrelation'
  if (score < 0.60) return 'ModerateCorrelation'
  if (score < 0.80) return 'HighCorrelation'
  return 'NearIdentical'
}

function classifyDriverExposure(
  pct: number,
): MacroDriverExposure['classification'] {
  if (pct < 0.15) return 'Minimal'
  if (pct < 0.35) return 'Moderate'
  if (pct < 0.55) return 'Concentrated'
  return 'Extreme'
}

function classifyFactorExposure(
  score: number,
): FactorExposure['classification'] {
  const abs = Math.abs(score)
  if (abs <= 1.5) return 'Balanced'
  if (abs <= 2.5) return 'ModerateConcentration'
  if (abs <= 3.5) return 'Concentrated'
  return 'Extreme'
}

// ─── Main computation ─────────────────────────────────────────────────────

export interface CorrelationInput {
  theses: Thesis[]
  scenariosByThesis: Record<string, Scenario[]>
  positionsByThesis: Record<string, Position | undefined>
  isPrologisAware: boolean
}

export interface CorrelationResult {
  macroDriverExposures: MacroDriverExposure[]
  factorProfile: FactorExposure[]
  correlatedPairs: CorrelatedPair[]
  triggerDependencies: PortfolioMacroSignature['triggerDependencies']
}

export function computeCorrelation(input: CorrelationInput): CorrelationResult {
  const { theses, scenariosByThesis, positionsByThesis, isPrologisAware } = input

  // Build synthetic Prologis thesis-like entry
  const prologisWeight = isPrologisAware ? 0.35 : 0

  // Weight per thesis: position size or equal weight fallback
  const totalPositionWeight = theses.reduce(
    (s, t) => s + (positionsByThesis[t.id]?.currentSizePct ?? 0),
    0,
  )
  const equalWeight = totalPositionWeight > 0 ? 0 : 1 / Math.max(theses.length, 1)

  function weightOf(t: Thesis): number {
    if (totalPositionWeight > 0)
      return (positionsByThesis[t.id]?.currentSizePct ?? 0.02) / (totalPositionWeight + prologisWeight)
    return equalWeight
  }

  // ── Macro Driver Exposures ──
  const driverExposureMap = new Map<MacroDriver, { weight: number; ids: string[] }>()

  for (const t of theses) {
    const w = weightOf(t)
    const drivers = driversForThesis(t)
    for (const d of drivers) {
      const cur = driverExposureMap.get(d) ?? { weight: 0, ids: [] }
      driverExposureMap.set(d, { weight: cur.weight + w, ids: [...cur.ids, t.id] })
    }
  }

  if (isPrologisAware) {
    const prologisDrivers = PROLOGIS_DRIVERS.secondary
      ? [...PROLOGIS_DRIVERS.primary, PROLOGIS_DRIVERS.secondary]
      : [...PROLOGIS_DRIVERS.primary]
    const pW = prologisWeight / (totalPositionWeight + prologisWeight)
    for (const d of prologisDrivers) {
      const cur = driverExposureMap.get(d) ?? { weight: 0, ids: [] }
      driverExposureMap.set(d, { weight: cur.weight + pW, ids: [...cur.ids, 'prologis'] })
    }
  }

  const macroDriverExposures: MacroDriverExposure[] = Array.from(
    driverExposureMap.entries(),
  )
    .map(([driver, { weight, ids }]) => ({
      driver,
      weightedExposurePct: weight,
      linkedThesisIds: ids,
      classification: classifyDriverExposure(weight),
    }))
    .sort((a, b) => b.weightedExposurePct - a.weightedExposurePct)

  // ── Factor Profile ──
  const factorAgg = new Map<FactorType, number>()
  for (const f of ALL_FACTORS) factorAgg.set(f, 0)

  for (const t of theses) {
    const w = weightOf(t)
    const loadings = THESIS_FACTORS[t.type] ?? {}
    for (const f of ALL_FACTORS) {
      factorAgg.set(f, (factorAgg.get(f) ?? 0) + (loadings[f] ?? 0) * w * 10)
    }
  }

  if (isPrologisAware) {
    const pW = prologisWeight / (totalPositionWeight + prologisWeight)
    for (const f of ALL_FACTORS) {
      factorAgg.set(f, (factorAgg.get(f) ?? 0) + (PROLOGIS_FACTORS[f] ?? 0) * pW * 10)
    }
  }

  const factorProfile: FactorExposure[] = ALL_FACTORS.map((f) => {
    const netScore = factorAgg.get(f) ?? 0
    return {
      factor: f,
      netScore,
      classification: classifyFactorExposure(netScore),
    }
  })

  // ── Pairwise Correlation ──
  const correlatedPairs: CorrelatedPair[] = []
  const triggerDependencies: PortfolioMacroSignature['triggerDependencies'] = []

  for (let i = 0; i < theses.length; i++) {
    for (let j = i + 1; j < theses.length; j++) {
      const a = theses[i]
      const b = theses[j]

      const macroScore = macroDriverSimilarity(driversForThesis(a), driversForThesis(b))
      const factorScore = factorSimilarity(
        THESIS_FACTORS[a.type] ?? {},
        THESIS_FACTORS[b.type] ?? {},
      )
      const triggerDep = triggerDependencyScore(a, b)
      const scenarioScore = scenarioAlignment(
        scenariosByThesis[a.id] ?? [],
        scenariosByThesis[b.id] ?? [],
      )

      const composite =
        macroScore * 0.35 +
        factorScore * 0.25 +
        triggerDep.score * 0.25 +
        scenarioScore * 0.15

      const classification = classifyCorrelation(composite)

      // Which dimension drove the correlation
      const dims: [number, CorrelatedPair['primaryCorrelationDriver']][] = [
        [macroScore * 0.35, 'MacroDriver'],
        [factorScore * 0.25, 'Factor'],
        [triggerDep.score * 0.25, 'Trigger'],
        [scenarioScore * 0.15, 'Scenario'],
      ]
      const primaryDriver = dims.reduce((best, cur) =>
        cur[0] > best[0] ? cur : best,
      )[1]

      if (composite >= 0.25) {
        correlatedPairs.push({
          thesisIdA: a.id,
          thesisIdB: b.id,
          correlationScore: composite,
          classification,
          primaryCorrelationDriver: primaryDriver,
          intentional: undefined,
          recommendedAction:
            composite >= 0.60
              ? 'Review whether this overlap is intentional or requires sizing adjustment'
              : undefined,
        })
      }

      if (triggerDep.strength) {
        triggerDependencies.push({
          thesisIdA: a.id,
          thesisIdB: b.id,
          strength: triggerDep.strength,
          upstreamCondition: triggerDep.upstreamCondition,
        })
      }
    }
  }

  correlatedPairs.sort((a, b) => b.correlationScore - a.correlationScore)

  return { macroDriverExposures, factorProfile, correlatedPairs, triggerDependencies }
}

// ─── Per-thesis Prologis overlap ──────────────────────────────────────────

export type PrologisOverlapLabel = 'High' | 'Medium' | 'Low' | 'Hedge'

export function computePrologisOverlap(thesis: Thesis): {
  score: number
  label: PrologisOverlapLabel
} {
  const spec = THESIS_DRIVERS[thesis.type]
  const thesisDrivers: MacroDriver[] = spec
    ? spec.secondary ? [...spec.primary, spec.secondary] : [...spec.primary]
    : []
  const prologisDrivers: MacroDriver[] = [
    ...PROLOGIS_DRIVERS.primary,
    PROLOGIS_DRIVERS.secondary!,
  ]

  const macroScore = macroDriverSimilarity(thesisDrivers, prologisDrivers)
  const factorScore = factorSimilarity(
    THESIS_FACTORS[thesis.type] ?? {},
    PROLOGIS_FACTORS,
  )

  const composite = macroScore * 0.5 + factorScore * 0.5
  const label: PrologisOverlapLabel =
    composite >= 0.50 ? 'High'
    : composite >= 0.30 ? 'Medium'
    : composite >= 0.10 ? 'Low'
    : 'Hedge'

  return { score: composite, label }
}
