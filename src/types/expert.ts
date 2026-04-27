import type { MispricedVariable } from './thesis'

export type ExpertVoiceId =
  | 'Buffett' | 'Munger' | 'Fisher' | 'Smith'
  | 'Soros' | 'Druckenmiller' | 'Marks'
  | 'Burry' | 'Klarman' | 'Greenblatt'
  | 'Miller' | 'Wood' | 'Ackman'
  | 'Zell' | 'Chancellor'
  | 'Asness' | 'Kahneman' | 'Damodaran'

export type VerdictType = 'Endorse' | 'Challenge' | 'Reject' | 'Reframe'

export type PanelPosture = 'Constructive' | 'Mixed' | 'Skeptical' | 'Hostile'

export interface VoiceContribution {
  voiceId: ExpertVoiceId
  lensApplied: string
  verdict: VerdictType
  coreArgument: string
  primaryMispricedVariableFocus: MispricedVariable
  whatWouldChangeVerdict: string
  confidence: 'High' | 'Medium' | 'Low'
  scenarioProbabilities?: {
    thesisConfirmed: number
    contestedPath: number
    thesisBroken: number
  }
}

export interface PanelComposition {
  id: string
  linkedThesisId: string
  selectedVoices: ExpertVoiceId[]
  selectionRules: string[]
  contributions: VoiceContribution[]
  verdictDistribution: {
    endorse: number
    challenge: number
    reject: number
    reframe: number
  }
  convergencePoints: string[]
  divergencePoints: string[]
  mostContestedVariable: MispricedVariable
  whatWouldResolveDisagreement: string
  panelPosture: PanelPosture
  panelProbabilityMatrix?: {
    thesisConfirmed: number
    contestedPath: number
    thesisBroken: number
  }
  coverageDisclosure?: string
  structuralFactsLayer: {
    liquidity: string
    positionSizeFeasibility: string
    executionRisk: string
    timeToClose: string
  }
  generatedAt: Date
}

// ─── Phase 3 additions ──────────────────────────────────────────────────────

export interface PanelSynthesis {
  verdictDistribution: { endorse: number; challenge: number; reject: number; reframe: number }
  convergencePoints: string[]
  divergencePoints: string[]
  strongestArgumentFor: string
  strongestArgumentAgainst: string
  mostContestedVariable: MispricedVariable
  whatWouldResolveDisagreement: string
  panelPosture: PanelPosture
  panelProbabilityMatrix?: {
    thesisConfirmed: number
    contestedPath: number
    thesisBroken: number
  }
}

export interface ResearchPanelReconciliation {
  agreements: string[]
  disagreements: string[]
  contestedVariable: MispricedVariable
  strongerEvidenceBase: 'ResearchView' | 'PanelView' | 'Unclear'
  lifecycleImplication: string
  triggerReadinessImplication: string
}

export interface ExpertSynthesisResult {
  thesisId: string
  selectedVoices: ExpertVoiceId[]
  selectionRules: string[]
  contributions: VoiceContribution[]
  panelSynthesis: PanelSynthesis
  reconciliation?: ResearchPanelReconciliation
  structuralFactsLayer: {
    liquidity: string
    positionSizeFeasibility: string
    executionRisk: string
    timeToClose: string
  }
  coverageDisclosure?: string
  generatedAt: Date
}
