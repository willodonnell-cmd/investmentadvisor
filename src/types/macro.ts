export type RealRateRegime = 'Low' | 'Normal' | 'High' | 'Rising' | 'Falling'
export type CreditCycleRegime = 'Expansion' | 'LateCycle' | 'Contraction' | 'Recovery'
export type LiquidityRegime = 'Abundant' | 'Normal' | 'Tight'
export type RiskAppetiteRegime = 'RiskOn' | 'Neutral' | 'RiskOff' | 'Bifurcated'
export type DollarRegime = 'Strong' | 'Neutral' | 'Weak' | 'Strengthening' | 'Weakening'
export type PolicyRegime = 'Permissive' | 'Restrictive' | 'Activist'

export type RegimeCompatibilityScore =
  | 'StrongTailwind'
  | 'Tailwind'
  | 'Mixed'
  | 'Headwind'
  | 'StrongHeadwind'

export type MacroDriver =
  | 'AiCapexCycle'
  | 'UsInterestRates'
  | 'CreditCycle'
  | 'DollarDirection'
  | 'EnergyPriceLevel'
  | 'ChinaEconomicTrajectory'
  | 'DeglobalizationReshoring'
  | 'RegulatoryEnvironment'
  | 'GeopoliticalRiskPremium'
  | 'ConsumerHealth'
  | 'LaborMarketWageDynamics'
  | 'RealAssetRepricing'
  | 'TechnologyAdoptionCurve'
  | 'PoliticalEconomyFiscal'
  | 'ClimateEnergyTransition'

export interface MacroRegime {
  realRates: RealRateRegime
  creditCycle: CreditCycleRegime
  liquidity: LiquidityRegime
  riskAppetite: RiskAppetiteRegime
  dollar: DollarRegime
  policy: PolicyRegime
  lastUpdated: Date
  userOverrides: Partial<{
    realRates: RealRateRegime
    creditCycle: CreditCycleRegime
    liquidity: LiquidityRegime
    riskAppetite: RiskAppetiteRegime
    dollar: DollarRegime
    policy: PolicyRegime
  }>
}

export interface MacroDriverExposure {
  driver: MacroDriver
  weightedExposurePct: number
  linkedThesisIds: string[]
  classification: 'Minimal' | 'Moderate' | 'Concentrated' | 'Extreme'
}
