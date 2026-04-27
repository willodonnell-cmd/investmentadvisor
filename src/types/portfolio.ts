import type { MacroDriverExposure } from './macro'

export type FactorType =
  | 'MarketBeta' | 'Value' | 'Quality' | 'Momentum'
  | 'Size' | 'Duration' | 'Commodity' | 'Credit'

export interface FactorExposure {
  factor: FactorType
  netScore: number
  classification: 'Balanced' | 'ModerateConcentration' | 'Concentrated' | 'Extreme'
}

export interface CorrelatedPair {
  thesisIdA: string
  thesisIdB: string
  correlationScore: number
  classification: 'Uncorrelated' | 'LowCorrelation' | 'ModerateCorrelation' | 'HighCorrelation' | 'NearIdentical'
  primaryCorrelationDriver: 'MacroDriver' | 'Factor' | 'Trigger' | 'Scenario'
  intentional?: boolean
  recommendedAction?: string
}

export interface StressTestResult {
  scenario: string
  expectedPortfolioImpact: number
  mostImpactedTheses: Array<{ thesisId: string; impact: number }>
}

export interface PortfolioMacroSignature {
  macroDriverExposures: MacroDriverExposure[]
  factorProfile: FactorExposure[]
  highCorrelationPairs: CorrelatedPair[]
  triggerDependencies: Array<{
    thesisIdA: string
    thesisIdB: string
    strength: 'Significant' | 'Structural'
    upstreamCondition: string
  }>
  stressTestResults: StressTestResult[]
  diversificationQualityScore: number
  diversificationInterpretation: string
  lastCalculated: Date
}
