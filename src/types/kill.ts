export type KillType = 1 | 2 | 3 | 4 | 5
// 1: Core Assumption Broken
// 2: Opportunity Closed
// 3: Better Expression Found
// 4: Superseded
// 5: Conviction Exhausted

export type KillTriggerPathway = 'A' | 'B' | 'C' | 'D'
// A: Scheduled reassessment
// B: Disconfirmer triggered
// C: Signal collapse
// D: Forced by decay clock

export type LearningRouteType =
  | 'FrameworkUpdate'
  | 'MentalModelRefinement'
  | 'NewWatchlistItem'
  | 'ProcessImprovement'
  | 'None'

export interface LearningSignal {
  type: LearningRouteType
  description: string
}

export interface KillRecord {
  id: string
  thesisId: string
  thesisName: string
  killType: KillType
  triggerPathway: KillTriggerPathway
  killReason: string
  brokenAssumption?: string
  lessonLearned: string
  learningRoutes: LearningSignal[]
  capitalReallocatedTo?: string
  killedAt: Date
}

export interface KillClassificationResult {
  recommendedType: KillType
  confidence: 'High' | 'Medium' | 'Low'
  challengeQuestions: string[]
  pathway: KillTriggerPathway
}
