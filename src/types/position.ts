export type PositionType = 'Long' | 'Short' | 'Paired' | 'Hedge'

export type AccountType = 'Taxable' | 'IRA401k' | 'Roth' | 'PrologisConcentrated'

export type PositionAction =
  | 'DoNotOwn' | 'Watch' | 'Start' | 'Add' | 'Hold' | 'Trim' | 'Exit'
  | 'RotateToBetterExpression'
  | 'InitiateShort' | 'CoverShort'
  | 'EstablishPair' | 'UnwindPair'
  | 'AddHedge' | 'RollHedge' | 'RemoveHedge'

export type SizingRung =
  | 'WatchOnly'
  | 'StarterPosition'
  | 'HalfPosition'
  | 'FullPosition'
  | 'OverweightConviction'
  | 'TrimmedCore'
  | 'Exit'

export interface SizingOutput {
  sizingBand: [number, number]
  targetSizePct: number
  startingSizePct: number
  rung: SizingRung
  anchorSize: number
  combinedModifier: number
  boundedModifier: number
  modifierBreakdown: {
    underwritingQuality: number
    variantPerception: number
    triggerReadiness: number
    quadrant: number
    convictionDecay: number
    macroRegime: number
  }
  portfolioConstraints: {
    overlapPenalty: number
    concentrationAdjustment: number
    capitalSourceAdjustment: number
    macroDriverConcentration: number
  }
  rationale: string
  whatWouldIncreaseSize: string[]
  whatWouldDecreaseSize: string[]
  whatWouldTriggerExit: string[]
}

export interface Position {
  id: string
  linkedThesisId: string
  linkedCompanyId?: string
  type: PositionType
  currentAction: PositionAction
  currentSizePct: number
  targetSizePct: number
  sizingOutput?: SizingOutput
  account: AccountType
  isIntentionalCorrelation: boolean
  capitalSource?: string
  openedAt: Date
  updatedAt: Date
}
