export type BusinessQualityDimension =
  | 'MoatDepth'
  | 'ManagementQuality'
  | 'BalanceSheet'
  | 'ReturnOnCapital'
  | 'CompetitivePositioning'
  | 'EarningsQuality'
  | 'BusinessRisk'

export type StockAttractiveDimension =
  | 'ValuationVsHistory'
  | 'ValuationVsPeers'
  | 'ExpectedReturn'
  | 'EarningsGrowth'
  | 'SentimentPositioning'
  | 'TechnicalSetup'
  | 'CatalystProximity'
  | 'RiskRewardAsymmetry'

export type Quadrant = 'FullConviction' | 'HoldOrWatch' | 'TacticalPosition' | 'Avoid'

export interface ScoredDimensions {
  dimensions: Record<string, number>
  total: number
  generatedAt: Date
}

export interface Company {
  id: string
  ticker: string
  name: string
  linkedThesisId: string
  roleInThesis: string
  businessQualityScore: ScoredDimensions
  stockAttractivenessScore: ScoredDimensions
  quadrant: Quadrant
  scoreGap: number
  catalysts: string[]
  createdAt: Date
  updatedAt: Date
}
