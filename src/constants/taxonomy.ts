import type { MispricedVariable } from '../types'

export const MISPRICED_VARIABLE_LABELS: Record<MispricedVariable, string> = {
  GrowthRate: 'Growth Rate',
  GrowthDurability: 'Growth Durability',
  MarginStructure: 'Margin Structure',
  TimingOfInflection: 'Timing of Inflection',
  CapitalIntensity: 'Capital Intensity',
  CloseOrOutcomeProbability: 'Close / Outcome Probability',
  CompetitiveWinner: 'Competitive Winner',
  ValueAccrualLocation: 'Value Accrual Location',
  RegulatoryPolicyImpact: 'Regulatory / Policy Impact',
  BalanceSheetResilience: 'Balance Sheet Resilience',
  CapitalAllocationQuality: 'Capital Allocation Quality',
  MarketStructureForcedFlow: 'Market Structure / Forced Flow',
  CrowdingExpectations: 'Crowding / Expectations',
  TerminalValueDuration: 'Terminal Value / Duration',
  ManagementExecution: 'Management Execution',
}

export const THESIS_TYPE_LABELS: Record<string, string> = {
  LongDurationCompounder: 'Long Duration Compounder',
  MacroRegimeShift: 'Macro Regime Shift',
  DeepContrarianMispricing: 'Deep Contrarian Mispricing',
  SpecialSituationsCatalyst: 'Special Situations / Catalyst',
  CapitalAllocationQuality: 'Capital Allocation Quality',
  MarketStructureReflexivity: 'Market Structure / Reflexivity',
  TechnologyDisruption: 'Technology Disruption',
  RegulatoryPolicy: 'Regulatory / Policy',
  IndustryStructureConsumerBehavior: 'Industry Structure / Consumer Behavior',
  CapitalCycle: 'Capital Cycle',
  OperationalTurnaround: 'Operational Turnaround',
  RealEstatePhysicalAssets: 'Real Estate / Physical Assets',
  Geopolitical: 'Geopolitical',
  ShortHedgeThesis: 'Short / Hedge',
  HouseholdAllocationDecision: 'Household Allocation Decision',
}
