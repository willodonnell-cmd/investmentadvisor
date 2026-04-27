export interface ResearchView {
  thesisId: string
  summary: string
  evidenceBase: string
  keyStrengths: string[]
  keyWeaknesses: string[]
  uncertainties: string[]
  mispricedVariableAssessment: string
  generatedAt: Date
}

export type MemoSectionSource = 'thesis' | 'macroRegime' | 'scenarios' | 'expertSynthesis' | 'researchView' | 'api'

export interface MemoSection {
  id: string
  title: string
  content: string
  bullets?: string[]
  source: MemoSectionSource
}

export interface UnderwritingMemo {
  thesisId: string
  sections: MemoSection[]
  status: 'partial' | 'complete'
  generatedAt: Date
}

export type ReassessmentDecision = 'Reaffirm' | 'Reduce' | 'Kill' | 'Convert'

export interface ReassessmentMemo {
  thesisId: string
  decision: ReassessmentDecision
  trigger: string
  evidence: string
  recommendation: string
  keyRisks: string[]
  killRationale?: string
  generatedAt: Date
}
