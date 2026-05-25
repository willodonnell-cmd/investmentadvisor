import type { RegimeCompatibilityScore } from './macro'

export type ThesisType =
  | 'LongDurationCompounder'
  | 'MacroRegimeShift'
  | 'DeepContrarianMispricing'
  | 'SpecialSituationsCatalyst'
  | 'CapitalAllocationQuality'
  | 'MarketStructureReflexivity'
  | 'TechnologyDisruption'
  | 'RegulatoryPolicy'
  | 'IndustryStructureConsumerBehavior'
  | 'CapitalCycle'
  | 'OperationalTurnaround'
  | 'RealEstatePhysicalAssets'
  | 'Geopolitical'
  | 'ShortHedgeThesis'
  | 'HouseholdAllocationDecision'

export type LifecycleStage =
  | 'Developing'
  | 'Actionable'
  | 'Live'
  | 'PlayedOut'
  | 'Broken'
  | 'Archived'

export type MispricedVariable =
  | 'GrowthRate'
  | 'GrowthDurability'
  | 'MarginStructure'
  | 'TimingOfInflection'
  | 'CapitalIntensity'
  | 'CloseOrOutcomeProbability'
  | 'CompetitiveWinner'
  | 'ValueAccrualLocation'
  | 'RegulatoryPolicyImpact'
  | 'BalanceSheetResilience'
  | 'CapitalAllocationQuality'
  | 'MarketStructureForcedFlow'
  | 'CrowdingExpectations'
  | 'TerminalValueDuration'
  | 'ManagementExecution'

export type TriggerReadiness =
  | 'NotReady'
  | 'Building'
  | 'Accelerating'
  | 'Active'
  | 'Diminishing'

export type VariantPerceptionStrength =
  | 'ClearConsensusStrongVariant'
  | 'MixedConsensusModerateVariant'
  | 'UnclearConsensusWeakVariant'
  | 'BroadlyAgreesWithConsensus'

export type ThesisLens = 'Standalone' | 'PrologisAware' | 'CompareVsPrologis'

export interface Trigger {
  type: 'Valuation' | 'FundamentalEvidence' | 'CatalystEvent' | 'MarketStructure' | 'Management' | 'PolicyRegulatory' | 'IndustryStructure'
  description: string
  readiness: TriggerReadiness
  readinessScore: number
  isPrimary: boolean
}

export interface DecayClock {
  statedHorizonMonths: number
  elapsedMonths: number
  elapsedPct: number
  zone: 'Green' | 'Yellow' | 'Orange' | 'Red' | 'Overdue'
  isFrozen: boolean
  frozenUntil?: Date
  frozenReason?: string
}

export interface ChangeEntry {
  changedAt: Date
  field: string
  previousValue: unknown
  newValue: unknown
  reason: string
}

export interface Thesis {
  id: string
  name: string
  type: ThesisType
  stage: LifecycleStage
  statement: string
  whyNow: string
  timeHorizon: number
  transmissionPath: string
  valueCaptureMethod: string

  consensusView: string
  variantView: string
  variantPerceptionStrength: VariantPerceptionStrength
  primaryMispricedVariable: MispricedVariable
  secondaryMispricedVariables: MispricedVariable[]

  keyAssumptions: string[]
  disconfirmers: string[]
  killConditions?: string[]
  ticker?: string
  beneficiaries: string[]
  losers: string[]
  recommendations?: import('./paperTrack').ThesisRecommendation[]

  triggers: Trigger[]

  decayClock: DecayClock
  evidenceDriftScore: number
  evidenceDriftDirection: 'Positive' | 'Neutral' | 'Negative' | 'SevereNegative'

  scenarioIds: string[]
  linkedCompanyIds: string[]
  linkedSignalIds: string[]
  panelCompositionId?: string

  macroRegimeCompatibility?: RegimeCompatibilityScore

  quadrant?: 'FullConviction' | 'HoldOrWatch' | 'TacticalPosition' | 'Avoid'
  businessQualityScore?: number
  stockAttractivenessScore?: number
  scoreGap?: number

  thesisQualityScore?: number
  convictionReasoning?: string
  triggerReadinessScore?: number

  lens: ThesisLens
  changeHistory: ChangeEntry[]
  createdAt: Date
  updatedAt: Date
}
