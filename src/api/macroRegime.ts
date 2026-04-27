import { ThesisType, MacroRegime, RegimeCompatibilityScore } from '../types'

type DimScore = Partial<Record<string, -2 | -1 | 0 | 1 | 2>>

interface RegimeMap {
  realRates?: DimScore
  creditCycle?: DimScore
  liquidity?: DimScore
  riskAppetite?: DimScore
  dollar?: DimScore
  policy?: DimScore
}

const SCORING: Record<ThesisType, RegimeMap> = {
  LongDurationCompounder: {
    realRates:    { Low: 2, Falling: 2, Normal: 0, High: -2, Rising: -2 },
    creditCycle:  { Expansion: 1, Recovery: 1, LateCycle: 0, Contraction: -1 },
    liquidity:    { Abundant: 1, Normal: 0, Tight: -1 },
    riskAppetite: { RiskOn: 1, Neutral: 0, RiskOff: -1, Bifurcated: 0 },
    policy:       { Permissive: 1, Activist: 0, Restrictive: -1 },
  },
  MacroRegimeShift: {
    realRates:    { Rising: 2, Falling: 2, Normal: 0, High: 0, Low: 0 },
    creditCycle:  { LateCycle: 2, Recovery: 2, Expansion: 0, Contraction: 0 },
    liquidity:    { Abundant: 0, Normal: 0, Tight: 1 },
    riskAppetite: { Bifurcated: 2, Neutral: 1, RiskOn: 0, RiskOff: 0 },
    dollar:       { Strengthening: 2, Weakening: 2, Strong: 0, Weak: 0, Neutral: 0 },
    policy:       { Activist: 2, Permissive: 0, Restrictive: 1 },
  },
  DeepContrarianMispricing: {
    realRates:    { High: 1, Rising: 1, Normal: 0, Low: -1, Falling: -1 },
    creditCycle:  { Contraction: 2, LateCycle: 1, Recovery: 0, Expansion: -1 },
    liquidity:    { Tight: 2, Normal: 0, Abundant: -1 },
    riskAppetite: { RiskOff: 2, Bifurcated: 1, Neutral: 0, RiskOn: -1 },
    dollar:       { Strong: 1, Strengthening: 1, Neutral: 0, Weak: 0, Weakening: -1 },
    policy:       { Restrictive: 1, Activist: 0, Permissive: 0 },
  },
  SpecialSituationsCatalyst: {
    realRates:    { Normal: 1, Low: 1, Falling: 1, High: -1, Rising: -1 },
    creditCycle:  { Expansion: 2, Recovery: 1, LateCycle: 0, Contraction: -1 },
    liquidity:    { Abundant: 2, Normal: 0, Tight: -2 },
    riskAppetite: { RiskOn: 1, Neutral: 0, RiskOff: -1, Bifurcated: -1 },
    policy:       { Permissive: 1, Activist: 1, Restrictive: 0 },
  },
  CapitalAllocationQuality: {
    realRates:    { Low: 2, Falling: 1, Normal: 0, High: -1, Rising: -1 },
    creditCycle:  { Expansion: 1, Recovery: 1, LateCycle: 0, Contraction: -1 },
    liquidity:    { Abundant: 1, Normal: 0, Tight: -1 },
    riskAppetite: { RiskOn: 1, Neutral: 0, RiskOff: -1, Bifurcated: 0 },
    policy:       { Permissive: 1, Activist: 0, Restrictive: 0 },
  },
  MarketStructureReflexivity: {
    realRates:    { Rising: 2, Falling: 2, High: 1, Normal: 0, Low: 0 },
    creditCycle:  { LateCycle: 2, Contraction: 1, Expansion: 0, Recovery: 0 },
    liquidity:    { Abundant: 1, Tight: 1, Normal: 0 },
    riskAppetite: { Bifurcated: 2, RiskOff: 1, Neutral: 0, RiskOn: -1 },
    dollar:       { Strengthening: 1, Weakening: 1, Strong: 0, Weak: 0, Neutral: 0 },
    policy:       { Activist: 1, Restrictive: 1, Permissive: 0 },
  },
  TechnologyDisruption: {
    realRates:    { Low: 2, Falling: 2, Normal: 0, High: -2, Rising: -2 },
    creditCycle:  { Expansion: 2, Recovery: 1, LateCycle: -1, Contraction: -2 },
    liquidity:    { Abundant: 2, Normal: 0, Tight: -2 },
    riskAppetite: { RiskOn: 2, Neutral: 0, RiskOff: -2, Bifurcated: -1 },
    policy:       { Permissive: 1, Activist: 0, Restrictive: -1 },
  },
  RegulatoryPolicy: {
    policy:       { Activist: 2, Restrictive: 1, Permissive: -1 },
  },
  IndustryStructureConsumerBehavior: {
    realRates:    { Low: 1, Falling: 1, Normal: 0, High: -1, Rising: -1 },
    creditCycle:  { Expansion: 1, Recovery: 1, LateCycle: 0, Contraction: -1 },
    liquidity:    { Abundant: 1, Normal: 0, Tight: -1 },
    riskAppetite: { Neutral: 1, RiskOn: 0, RiskOff: 0, Bifurcated: -1 },
    dollar:       { Weak: 1, Weakening: 1, Neutral: 0, Strong: -1, Strengthening: -1 },
  },
  CapitalCycle: {
    realRates:    { High: 1, Rising: 1, Normal: 0, Low: -1, Falling: -1 },
    creditCycle:  { LateCycle: 2, Contraction: 2, Recovery: 1, Expansion: -1 },
    liquidity:    { Tight: 2, Normal: 0, Abundant: -1 },
    riskAppetite: { RiskOff: 1, Bifurcated: 1, Neutral: 0, RiskOn: -1 },
    policy:       { Restrictive: 1, Activist: 0, Permissive: 0 },
  },
  OperationalTurnaround: {
    realRates:    { Low: 1, Falling: 1, Normal: 0, High: -1, Rising: -1 },
    creditCycle:  { Recovery: 2, Expansion: 1, LateCycle: 0, Contraction: -1 },
    liquidity:    { Abundant: 1, Normal: 0, Tight: -1 },
    riskAppetite: { RiskOn: 1, Neutral: 0, RiskOff: -1, Bifurcated: 0 },
    policy:       { Permissive: 1, Activist: 0, Restrictive: 0 },
  },
  RealEstatePhysicalAssets: {
    realRates:    { Low: 2, Falling: 2, Normal: 0, High: -2, Rising: -2 },
    creditCycle:  { Expansion: 2, Recovery: 1, LateCycle: 0, Contraction: -2 },
    liquidity:    { Abundant: 2, Normal: 0, Tight: -2 },
    riskAppetite: { Neutral: 1, RiskOn: 0, RiskOff: -1, Bifurcated: -1 },
    dollar:       { Weak: 1, Weakening: 1, Neutral: 0, Strong: -1, Strengthening: -1 },
    policy:       { Permissive: 1, Restrictive: -1, Activist: 0 },
  },
  Geopolitical: {
    realRates:    { Rising: 1, High: 1, Normal: 0, Low: 0, Falling: 0 },
    creditCycle:  { LateCycle: 1, Contraction: 1, Recovery: 0, Expansion: 0 },
    liquidity:    { Tight: 1, Normal: 0, Abundant: -1 },
    riskAppetite: { RiskOff: 2, Bifurcated: 1, Neutral: 0, RiskOn: -1 },
    dollar:       { Strong: 2, Strengthening: 2, Neutral: 0, Weak: -1, Weakening: -1 },
    policy:       { Activist: 1, Restrictive: 1, Permissive: 0 },
  },
  ShortHedgeThesis: {
    realRates:    { High: 2, Rising: 2, Normal: 0, Low: -2, Falling: -2 },
    creditCycle:  { LateCycle: 2, Contraction: 2, Recovery: -1, Expansion: -2 },
    liquidity:    { Tight: 2, Normal: 0, Abundant: -2 },
    riskAppetite: { RiskOff: 2, Bifurcated: 1, Neutral: 0, RiskOn: -2 },
    dollar:       { Strong: 1, Strengthening: 1, Neutral: 0, Weak: 0, Weakening: 0 },
    policy:       { Restrictive: 1, Activist: 0, Permissive: -1 },
  },
  HouseholdAllocationDecision: {
    realRates:    { High: 1, Normal: 1, Low: 0, Rising: 0, Falling: 0 },
    creditCycle:  { Expansion: 1, Recovery: 1, LateCycle: 0, Contraction: -1 },
    liquidity:    { Abundant: 1, Normal: 0, Tight: -1 },
    riskAppetite: { Neutral: 2, RiskOn: 1, Bifurcated: 0, RiskOff: -1 },
  },
}

export const computeRegimeCompatibility = (
  thesisType: ThesisType,
  regime: MacroRegime,
): RegimeCompatibilityScore => {
  const table = SCORING[thesisType]
  if (!table) return 'Mixed'

  const dims = ['realRates', 'creditCycle', 'liquidity', 'riskAppetite', 'dollar', 'policy'] as const
  let score = 0

  for (const dim of dims) {
    const dimTable = table[dim]
    if (!dimTable) continue
    const override = (regime.userOverrides as Record<string, string | undefined>)[dim]
    const val = override ?? (regime[dim] as string)
    score += (dimTable[val] ?? 0)
  }

  if (score >= 4) return 'StrongTailwind'
  if (score >= 2) return 'Tailwind'
  if (score >= -1) return 'Mixed'
  if (score >= -3) return 'Headwind'
  return 'StrongHeadwind'
}

export const COMPATIBILITY_COLORS: Record<RegimeCompatibilityScore, string> = {
  StrongTailwind: '#4ade80',
  Tailwind:       '#86efac',
  Mixed:          '#888888',
  Headwind:       '#fb923c',
  StrongHeadwind: '#f87171',
}

export const COMPATIBILITY_LABELS: Record<RegimeCompatibilityScore, string> = {
  StrongTailwind: 'Strong Tailwind',
  Tailwind:       'Tailwind',
  Mixed:          'Mixed',
  Headwind:       'Headwind',
  StrongHeadwind: 'Strong Headwind',
}
