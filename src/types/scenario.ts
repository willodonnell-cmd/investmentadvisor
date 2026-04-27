import type { MispricedVariable } from './thesis'

export type ScenarioType = 'ThesisConfirmed' | 'ContestedPath' | 'ThesisBroken'

export interface Scenario {
  id: string
  linkedThesisId: string
  type: ScenarioType
  name: string
  coreNarrative: string
  keyAssumptions: string[]
  causalChain: string[]
  confirmingEvidence: string[]
  disconfirmingEvidence: string[]
  shiftTriggers: {
    towardConfirmed?: string
    towardBroken?: string
  }
  returnRangeMin: number
  returnRangeMax: number
  probability: number
  momentumScore: number
  primaryMispricedVariableFocus?: MispricedVariable
  baseRateAnchor?: number
  createdAt: Date
  updatedAt: Date
}
