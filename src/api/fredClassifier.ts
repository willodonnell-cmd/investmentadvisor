import type { MacroRegime, RealRateRegime, CreditCycleRegime, LiquidityRegime, RiskAppetiteRegime } from '../types/macro'
import type { FredMacroSnapshot } from './fredData'

export interface FredRegimeClassification {
  suggestedRegime: Partial<MacroRegime>
  confidence: 'High' | 'Medium' | 'Low'
  reasoning: string[]
  dataQuality: 'Complete' | 'Partial' | 'Insufficient'
  snapshot: FredMacroSnapshot
}

// ── Classification thresholds ──────────────────────────────────────────────

function classifyRealRates(yieldCurve: number | null): { value: RealRateRegime; reason: string } | null {
  if (yieldCurve === null) return null
  if (yieldCurve > 0.5)  return { value: 'Normal',  reason: `T10Y2Y ${yieldCurve.toFixed(2)}: normal upward-sloping curve` }
  if (yieldCurve >= 0)   return { value: 'Falling', reason: `T10Y2Y ${yieldCurve.toFixed(2)}: curve flattening, approaching inversion` }
  return                        { value: 'High',    reason: `T10Y2Y ${yieldCurve.toFixed(2)}: inverted — historically tight real-rate signal` }
}

function classifyCreditCycle(
  hy: number | null,
  ig: number | null,
): { value: CreditCycleRegime; reason: string } | null {
  if (hy === null) return null
  if (hy < 350)  return { value: 'Expansion',  reason: `HY spread ${hy.toFixed(0)} bps: benign credit environment` }
  if (hy < 450)  return { value: 'LateCycle',  reason: `HY spread ${hy.toFixed(0)} bps: widening signals late-cycle stress` }
  if (hy < 550)  return { value: 'Contraction',reason: `HY spread ${hy.toFixed(0)} bps: elevated stress, credit contracting` }
  // > 550: could be peak stress (Contraction) or recovering — default Contraction without trend data
  return               { value: 'Contraction', reason: `HY spread ${hy.toFixed(0)} bps: extreme stress — trend data needed to confirm Recovery` }
}

function classifyLiquidity(
  hy: number | null,
  ig: number | null,
): { value: LiquidityRegime; reason: string } | null {
  if (hy === null && ig === null) return null
  // IG tight <100, HY tight <350 → Abundant
  if (ig !== null && ig < 100 && hy !== null && hy < 350)
    return { value: 'Abundant', reason: `IG ${ig.toFixed(0)} bps + HY ${hy?.toFixed(0)} bps: both tight, conditions easy` }
  // Both wide → Tight
  if (ig !== null && ig > 150 && hy !== null && hy > 450)
    return { value: 'Tight', reason: `IG ${ig.toFixed(0)} bps + HY ${hy?.toFixed(0)} bps: both wide, liquidity constrained` }
  // HY wide but IG stable → Normal
  if (hy !== null && hy > 400 && ig !== null && ig < 130)
    return { value: 'Normal', reason: `HY ${hy.toFixed(0)} bps wide but IG ${ig.toFixed(0)} bps stable: mixed signal, Normal` }
  if (hy !== null)
    return { value: 'Normal', reason: `HY ${hy.toFixed(0)} bps: no extreme reading, liquidity Normal` }
  return { value: 'Normal', reason: `IG ${ig!.toFixed(0)} bps: partial data, defaulting to Normal` }
}

function classifyRiskAppetite(
  ism: number | null,
  hy: number | null,
): { value: RiskAppetiteRegime; reason: string } | null {
  if (ism === null && hy === null) return null
  if (ism !== null && hy !== null) {
    if (ism > 52 && hy < 400) return { value: 'RiskOn',      reason: `ISM ${ism.toFixed(1)} (expanding) + HY ${hy.toFixed(0)} bps tight: risk-on` }
    if (ism < 48 && hy > 450) return { value: 'RiskOff',     reason: `ISM ${ism.toFixed(1)} (contracting) + HY ${hy.toFixed(0)} bps wide: risk-off` }
    // Divergence: economy growing but credit stressed, or vice-versa
    if (ism > 52 && hy > 450) return { value: 'Bifurcated',  reason: `ISM ${ism.toFixed(1)} expanding but HY ${hy.toFixed(0)} bps wide: bifurcated signal` }
    if (ism < 48 && hy < 350) return { value: 'Bifurcated',  reason: `ISM ${ism.toFixed(1)} weak but HY ${hy.toFixed(0)} bps tight: bifurcated signal` }
    return                           { value: 'Neutral',      reason: `ISM ${ism.toFixed(1)} mid-range + HY ${hy.toFixed(0)} bps: neutral conditions` }
  }
  // Single-indicator fallbacks
  if (ism !== null) {
    if (ism > 52) return { value: 'RiskOn',  reason: `ISM ${ism.toFixed(1)} above 52: expansion suggests risk-on (credit data unavailable)` }
    if (ism < 48) return { value: 'RiskOff', reason: `ISM ${ism.toFixed(1)} below 48: contraction suggests risk-off (credit data unavailable)` }
    return              { value: 'Neutral',  reason: `ISM ${ism.toFixed(1)} in neutral zone 48-52` }
  }
  if (hy !== null) {
    if (hy < 350) return { value: 'RiskOn',  reason: `HY ${hy.toFixed(0)} bps tight: credit suggests risk-on (ISM unavailable)` }
    if (hy > 450) return { value: 'RiskOff', reason: `HY ${hy.toFixed(0)} bps wide: credit suggests risk-off (ISM unavailable)` }
    return              { value: 'Neutral',  reason: `HY ${hy.toFixed(0)} bps: mid-range, neutral` }
  }
  return null
}

// ── Main classifier ───────────────────────────────────────────────────────────

export function classifyFredSnapshot(snapshot: FredMacroSnapshot): FredRegimeClassification {
  try {
    const availableCount = [
      snapshot.yieldCurveSpread,
      snapshot.hySpread,
      snapshot.ismPmi,
      snapshot.initialClaims,
      snapshot.igSpread,
    ].filter((v) => v !== null).length

    const dataQuality: FredRegimeClassification['dataQuality'] =
      snapshot.errors.length === 0 ? 'Complete'
      : availableCount >= 3         ? 'Partial'
      :                               'Insufficient'

    if (dataQuality === 'Insufficient') {
      return {
        suggestedRegime: {},
        confidence: 'Low',
        reasoning: ['Insufficient FRED data to classify regime — check network or try refreshing'],
        dataQuality,
        snapshot,
      }
    }

    const realRatesResult    = classifyRealRates(snapshot.yieldCurveSpread)
    const creditCycleResult  = classifyCreditCycle(snapshot.hySpread, snapshot.igSpread)
    const liquidityResult    = classifyLiquidity(snapshot.hySpread, snapshot.igSpread)
    const riskAppetiteResult = classifyRiskAppetite(snapshot.ismPmi, snapshot.hySpread)

    const suggestedRegime: Partial<MacroRegime> = {}
    const reasoning: string[] = []

    if (realRatesResult)    { suggestedRegime.realRates    = realRatesResult.value;    reasoning.push(`Real Rates → ${realRatesResult.value}: ${realRatesResult.reason}`) }
    else                                                                                 reasoning.push('Real Rates → (no T10Y2Y data)')

    if (creditCycleResult)  { suggestedRegime.creditCycle  = creditCycleResult.value;  reasoning.push(`Credit Cycle → ${creditCycleResult.value}: ${creditCycleResult.reason}`) }
    else                                                                                 reasoning.push('Credit Cycle → (no HY spread data)')

    if (liquidityResult)    { suggestedRegime.liquidity    = liquidityResult.value;    reasoning.push(`Liquidity → ${liquidityResult.value}: ${liquidityResult.reason}`) }
    else                                                                                 reasoning.push('Liquidity → (insufficient spread data)')

    if (riskAppetiteResult) { suggestedRegime.riskAppetite = riskAppetiteResult.value; reasoning.push(`Risk Appetite → ${riskAppetiteResult.value}: ${riskAppetiteResult.reason}`) }
    else                                                                                 reasoning.push('Risk Appetite → (no ISM or HY data)')

    // Dollar and Policy intentionally not classified from FRED data
    reasoning.push('Dollar → not classified (no FRED proxy; manually set)')
    reasoning.push('Policy → not classified (Fed data is ambiguous; manually set)')

    const classifiedCount = [realRatesResult, creditCycleResult, liquidityResult, riskAppetiteResult].filter(Boolean).length
    const confidence: FredRegimeClassification['confidence'] =
      classifiedCount === 4 ? 'High'
      : classifiedCount >= 2  ? 'Medium'
      :                         'Low'

    return { suggestedRegime, confidence, reasoning, dataQuality, snapshot }
  } catch {
    // Classifier must never throw
    return {
      suggestedRegime: {},
      confidence: 'Low',
      reasoning: ['Classification failed unexpectedly'],
      dataQuality: 'Insufficient',
      snapshot,
    }
  }
}
