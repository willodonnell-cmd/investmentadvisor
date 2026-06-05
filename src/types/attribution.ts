import type { ThesisType } from './thesis'
import type { PositionAction } from './position'

export type ScoreBand = '0-2' | '2-4' | '4-6' | '6-8' | '8-10'

export interface AttributionRecord {
  positionId: string
  thesisId: string
  thesisName: string
  thesisType: ThesisType
  ticker: string
  entryDate: string         // YYYY-MM-DD from position.openedAt
  holdingDays: number
  entryPrice: number | null
  currentPrice: number | null
  positionReturn: number | null  // decimal (0.12 = 12%)
  spyReturn: number | null       // SPY return for same holding window
  alpha: number | null           // positionReturn - spyReturn
  scoreAtEntry: number | null    // thesis.thesisQualityScore proxy
  status: PositionAction
  error?: string
}

export interface ScoreBandResult {
  band: ScoreBand
  avgAlpha: number
  count: number
}

export interface SectorResult {
  sector: ThesisType
  avgAlpha: number
  count: number
}

export interface AttributionReport {
  records: AttributionRecord[]
  totalAlpha: number            // avg alpha across records with data
  winRate: number               // fraction of records where alpha > 0
  portfolioReturn: number | null  // avg position return across records with data
  spyReturn: number | null      // SPY return over full report window (earliest entry to now)
  avgHoldingDays: number
  byScoreBand: ScoreBandResult[]
  bySector: SectorResult[]
  generatedAt: Date
}
