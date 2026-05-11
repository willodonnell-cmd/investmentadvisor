import type { Thesis, PortfolioMacroSignature, StressTestResult, ThesisLens } from '../types'
import type { Scenario, Position } from '../types'
import { SYSTEM_IDENTITY, callInvestmentAPI } from './openai'
import { computeCorrelation } from './correlation'

// ─── Stress test sensitivity per thesis type ─────────────────────────────

type StressKey = 'RatesSpike' | 'Recession' | 'AiDecelerate' | 'DollarStrength' | 'GeoNormalize'

const STRESS_SENSITIVITY: Record<string, Record<StressKey, number>> = {
  LongDurationCompounder:            { RatesSpike: -0.25, Recession: -0.12, AiDecelerate: -0.05, DollarStrength: -0.05, GeoNormalize: 0.02 },
  MacroRegimeShift:                  { RatesSpike:  0.10, Recession:  0.05, AiDecelerate: -0.02, DollarStrength:  0.08, GeoNormalize: 0.05 },
  DeepContrarianMispricing:          { RatesSpike:  0.05, Recession:  0.12, AiDecelerate:  0.00, DollarStrength:  0.03, GeoNormalize: 0.03 },
  SpecialSituationsCatalyst:         { RatesSpike: -0.08, Recession: -0.10, AiDecelerate: -0.02, DollarStrength: -0.03, GeoNormalize: 0.02 },
  CapitalAllocationQuality:          { RatesSpike: -0.10, Recession: -0.10, AiDecelerate: -0.02, DollarStrength: -0.03, GeoNormalize: 0.02 },
  MarketStructureReflexivity:        { RatesSpike:  0.05, Recession: -0.05, AiDecelerate: -0.02, DollarStrength:  0.02, GeoNormalize: 0.01 },
  TechnologyDisruption:              { RatesSpike: -0.20, Recession: -0.15, AiDecelerate: -0.25, DollarStrength: -0.05, GeoNormalize: 0.03 },
  RegulatoryPolicy:                  { RatesSpike: -0.03, Recession: -0.05, AiDecelerate: -0.01, DollarStrength: -0.02, GeoNormalize: 0.01 },
  IndustryStructureConsumerBehavior: { RatesSpike: -0.08, Recession: -0.12, AiDecelerate: -0.01, DollarStrength: -0.08, GeoNormalize: 0.03 },
  CapitalCycle:                      { RatesSpike:  0.08, Recession: -0.05, AiDecelerate: -0.01, DollarStrength:  0.05, GeoNormalize: 0.02 },
  OperationalTurnaround:             { RatesSpike: -0.05, Recession: -0.08, AiDecelerate: -0.01, DollarStrength: -0.02, GeoNormalize: 0.02 },
  RealEstatePhysicalAssets:          { RatesSpike: -0.30, Recession: -0.15, AiDecelerate: -0.02, DollarStrength: -0.05, GeoNormalize: 0.02 },
  Geopolitical:                      { RatesSpike:  0.02, Recession:  0.02, AiDecelerate:  0.00, DollarStrength:  0.10, GeoNormalize: -0.20 },
  ShortHedgeThesis:                  { RatesSpike:  0.15, Recession:  0.20, AiDecelerate:  0.05, DollarStrength:  0.05, GeoNormalize: -0.15 },
  HouseholdAllocationDecision:       { RatesSpike: -0.08, Recession: -0.08, AiDecelerate: -0.01, DollarStrength: -0.03, GeoNormalize: 0.02 },
}

const PROLOGIS_SENSITIVITY: Record<StressKey, number> = {
  RatesSpike: -0.28, Recession: -0.12, AiDecelerate: -0.02, DollarStrength: -0.04, GeoNormalize: 0.01,
}

const STRESS_LABELS: Record<StressKey, string> = {
  RatesSpike:    'Rates Spike +150bps',
  Recession:     'US Recession (−20% earnings)',
  AiDecelerate:  'AI Capex Decelerates −40%',
  DollarStrength:'Dollar Strengthens +15%',
  GeoNormalize:  'Geopolitical Risk Normalization',
}

const STRESS_KEYS: StressKey[] = ['RatesSpike', 'Recession', 'AiDecelerate', 'DollarStrength', 'GeoNormalize']

// ─── Diversification quality score ───────────────────────────────────────

function computeDiversificationScore(
  correlatedPairs: PortfolioMacroSignature['highCorrelationPairs'],
  stressTests: StressTestResult[],
  extremeExposures: number,
): number {
  let score = 10

  const highCorr = correlatedPairs.filter(
    (p) => p.classification === 'HighCorrelation' || p.classification === 'NearIdentical',
  ).length
  score -= Math.min(highCorr * 0.8, 3)

  const maxStressImpact = Math.max(...stressTests.map((s) => Math.abs(s.expectedPortfolioImpact)))
  if (maxStressImpact > 0.15) score -= 2
  else if (maxStressImpact > 0.10) score -= 1

  score -= Math.min(extremeExposures * 0.5, 2)

  const avgCorr =
    correlatedPairs.length > 0
      ? correlatedPairs.reduce((s, p) => s + p.correlationScore, 0) / correlatedPairs.length
      : 0
  score -= avgCorr * 2

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10))
}

// ─── Main generator ───────────────────────────────────────────────────────

export async function generatePortfolioMacroSignature(
  theses: Thesis[],
  scenariosByThesis: Record<string, Scenario[]>,
  positionsByThesis: Record<string, Position | undefined>,
  isPrologisAware: boolean,
): Promise<PortfolioMacroSignature> {
  if (theses.length === 0) {
    return {
      macroDriverExposures: [],
      factorProfile: [],
      highCorrelationPairs: [],
      triggerDependencies: [],
      stressTestResults: [],
      diversificationQualityScore: 0,
      diversificationInterpretation: 'No active theses in portfolio.',
      lastCalculated: new Date(),
    }
  }

  const correlationResult = computeCorrelation({
    theses,
    scenariosByThesis,
    positionsByThesis,
    isPrologisAware,
  })

  // Compute position weights for stress tests
  const totalPositionWeight = theses.reduce(
    (s, t) => s + (positionsByThesis[t.id]?.currentSizePct ?? 0),
    0,
  )
  const equalWeight = totalPositionWeight > 0 ? 0 : 1 / Math.max(theses.length, 1)
  const prologisWeight = isPrologisAware ? 0.35 : 0

  const stressTestResults: StressTestResult[] = STRESS_KEYS.map((key) => {
    const impacts: Array<{ thesisId: string; impact: number }> = []

    for (const t of theses) {
      const rawWeight =
        totalPositionWeight > 0
          ? (positionsByThesis[t.id]?.currentSizePct ?? 0.02) / (totalPositionWeight + prologisWeight)
          : equalWeight
      const sensitivity = STRESS_SENSITIVITY[t.type]?.[key] ?? -0.03
      impacts.push({ thesisId: t.id, impact: sensitivity * rawWeight })
    }

    if (isPrologisAware) {
      const pW = prologisWeight / (totalPositionWeight + prologisWeight)
      impacts.push({ thesisId: 'prologis', impact: PROLOGIS_SENSITIVITY[key] * pW })
    }

    const portfolioImpact = impacts.reduce((s, i) => s + i.impact, 0)
    const mostImpacted = impacts
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 3)

    return {
      scenario: STRESS_LABELS[key],
      expectedPortfolioImpact: portfolioImpact,
      mostImpactedTheses: mostImpacted,
    }
  })

  const extremeExposures = correlationResult.macroDriverExposures.filter(
    (e) => e.classification === 'Extreme',
  ).length

  const diversificationQualityScore = computeDiversificationScore(
    correlationResult.correlatedPairs,
    stressTestResults,
    extremeExposures,
  )

  // API call for plain-language interpretation
  let diversificationInterpretation = ''
  try {
    const systemPrompt = `${SYSTEM_IDENTITY}

You are generating a plain-language interpretation of a portfolio macro signature for a thesis-first investment system.
Return exactly this JSON: { "interpretation": string }
The interpretation must be 2-3 sentences, specific about the dominant risk concentrations and most vulnerable scenarios.
CRITICAL: Return only valid JSON. ASCII characters only.`

    const topDrivers = correlationResult.macroDriverExposures
      .slice(0, 4)
      .map((d) => `${d.driver} (${(d.weightedExposurePct * 100).toFixed(0)}%, ${d.classification})`)
      .join(', ')

    const highCorrCount = correlationResult.correlatedPairs.filter(
      (p) => p.correlationScore >= 0.60,
    ).length

    const worstStress = stressTestResults.reduce((worst, s) =>
      s.expectedPortfolioImpact < worst.expectedPortfolioImpact ? s : worst,
    )

    const userContent = `PORTFOLIO OVERVIEW:
Active theses: ${theses.length}
Top macro driver exposures: ${topDrivers}
High-correlation pairs: ${highCorrCount}
Diversification score: ${diversificationQualityScore}/10
Worst stress test: ${worstStress.scenario} (${(worstStress.expectedPortfolioImpact * 100).toFixed(1)}% expected impact)
Prologis-Aware lens: ${isPrologisAware ? 'Active — 35% household weight included' : 'Off'}`

    const result = await callInvestmentAPI<{ interpretation: string }>(
      systemPrompt,
      userContent,
      true,
      800,
    )
    diversificationInterpretation = result.interpretation
  } catch {
    diversificationInterpretation =
      `Portfolio has ${theses.length} active theses. ` +
      `Dominant exposure: ${correlationResult.macroDriverExposures[0]?.driver ?? 'undetermined'}. ` +
      `Diversification score: ${diversificationQualityScore}/10.`
  }

  return {
    macroDriverExposures: correlationResult.macroDriverExposures,
    factorProfile: correlationResult.factorProfile,
    highCorrelationPairs: correlationResult.correlatedPairs,
    triggerDependencies: correlationResult.triggerDependencies,
    stressTestResults,
    diversificationQualityScore,
    diversificationInterpretation,
    lastCalculated: new Date(),
  }
}
