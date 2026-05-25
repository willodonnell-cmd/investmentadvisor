import type { MispricedVariable } from './thesis'

export type SourceQualityTier = 'Tier1' | 'Tier2' | 'Tier3' | 'Tier4' | 'Proposed'

export type SignalDirection = 'Strengthening' | 'Neutral' | 'Weakening'

export type SignalSpecificity = 'Direct-Quantifiable' | 'Direct-Qualitative' | 'Indirect' | 'Tangential'

export type SignalScenarioTag = 'ThesisConfirmed' | 'ContestedPath' | 'ThesisBroken' | 'Neutral'

export interface Signal {
  id: string
  linkedThesisId: string
  linkedCompanyId?: string
  variable: MispricedVariable
  scenarioTag: SignalScenarioTag
  direction: SignalDirection
  sourceQuality: SourceQualityTier
  sourceIndependent: boolean
  specificity: SignalSpecificity
  weight: number
  title: string
  notes?: string
  observedAt: Date
  createdAt: Date
  isProposed?: boolean
  proposedDirection?: 'Confirming' | 'Disconfirming'
  proposedSourceType?: string
  proposedSignificance?: 'High' | 'Medium'
}

export interface SignalComposite {
  id: string
  linkedThesisId: string
  variable: MispricedVariable
  compositeScore: number
  signalCount: number
  recentWeightedScore: number
  direction: SignalDirection
  lastUpdated: Date
}

export interface ConvergenceAlert {
  thesisId: string
  variable: MispricedVariable
  direction: SignalDirection
  signalCount: number
  detectedAt: Date
  multiplier: number
}

export interface DivergenceFlag {
  thesisId: string
  variable: MispricedVariable
  conflictingDirections: SignalDirection[]
  detectedAt: Date
}
