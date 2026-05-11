import type { MispricedVariable, LifecycleStage } from './thesis'
import type { Signal } from './signal'

// The six delta categories from thesis-engine-spec.md §6.3
export type ConvictionDeltaCategory =
  | 'ConfirmingMinor'
  | 'ConfirmingMaterial'
  | 'Neutral'
  | 'ContradictingMinor'
  | 'ContradictingMaterial'
  | 'ThesisAltering'

// Recommended action after delta assessment
export type ConvictionRecommendedAction =
  | 'LogOnly'
  | 'LogAndFlag'
  | 'LogAndInitiateKillReview'

// A draft produced by the agent — not yet confirmed, not yet in the ledger
export interface ConvictionDraft {
  id: string
  thesisId: string
  thesisName: string
  thesisStage: LifecycleStage

  // The signal that triggered this comparison
  triggerSignalId: string
  triggerSignalSummary: string
  triggerSignalSource: string

  // The variable being compared
  variable: MispricedVariable

  // Core comparison output
  originalAssumption: string        // quoted verbatim from thesis.keyAssumptions
  currentStateAssessment: string    // agent's assessment of where the variable is now
  deltaCategory: ConvictionDeltaCategory
  proposedScoreChange: number       // e.g. -8, +5
  currentConvictionScore: number    // score before this change
  proposedConvictionScore: number   // currentConvictionScore + proposedScoreChange

  // Agent reasoning and recommendation
  agentReasoning: string
  recommendedAction: ConvictionRecommendedAction

  // Draft state
  createdAt: Date
  isEdited: boolean                 // true if user edited before confirming
}

// A confirmed ledger entry — written only after explicit user confirmation
export interface ConvictionLedgerEntry {
  id: string
  thesisId: string
  thesisName: string
  thesisStage: LifecycleStage

  triggerSignalId: string
  triggerSignalSummary: string
  triggerSignalSource: string

  variable: MispricedVariable

  originalAssumption: string
  currentStateAssessment: string
  deltaCategory: ConvictionDeltaCategory
  scoreChange: number
  convictionScoreBefore: number
  convictionScoreAfter: number

  agentReasoning: string
  recommendedAction: ConvictionRecommendedAction

  // Confirmation metadata — proof of human approval
  confirmedByUser: true             // always true; drafts are never written to ledger
  confirmedAt: Date
  wasEdited: boolean                // was the draft edited before confirming?
  originalDraftId: string           // reference back to the draft

  createdAt: Date                   // same as confirmedAt
}

// What the AI comparison API returns
export interface ConvictionComparisonResult {
  variable: MispricedVariable
  originalAssumption: string
  currentStateAssessment: string
  deltaCategory: ConvictionDeltaCategory
  proposedScoreChange: number
  agentReasoning: string
  recommendedAction: ConvictionRecommendedAction
}
