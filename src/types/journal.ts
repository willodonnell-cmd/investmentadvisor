export type DecisionType = 'entry' | 'exit' | 'trim' | 'hold' | 'pass'
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very-high'
export type PredictionOutcome = 'pending' | 'correct' | 'incorrect' | 'partially-correct'

export interface JournalEntry {
  id: string
  createdAt: string                         // ISO 8601
  decisionType: DecisionType
  ticker: string | null
  thesisId: string | null
  thesisName: string | null
  thesisScoreAtDecision: number | null
  macroRegimeAtDecision: string | null
  variantPerceptionStatement: string
  explicitPrediction: string
  confidenceLevel: ConfidenceLevel
  predictionTimeframe: string
  capitalDeployed: number | null
  reviewedAt: string | null                 // ISO 8601
  reviewNotes: string | null
  predictionOutcome: PredictionOutcome
  lessonsLearned: string | null
}
