import { v4 as uuid } from 'uuid'
import { Thesis, ThesisType, LifecycleStage, MispricedVariable } from '../types'

export const TERMINAL_STAGES: LifecycleStage[] = ['Broken', 'Archived', 'PlayedOut']
export const ACTIVE_STAGES: LifecycleStage[] = ['Developing', 'Actionable', 'Live']

export const isTerminal = (stage: LifecycleStage): boolean =>
  TERMINAL_STAGES.includes(stage)

export const isActive = (stage: LifecycleStage): boolean =>
  ACTIVE_STAGES.includes(stage)

export const LIFECYCLE_ORDER: LifecycleStage[] = [
  'Developing', 'Actionable', 'Live',
  'PlayedOut', 'Broken', 'Archived',
]

export const canAdvanceTo = (from: LifecycleStage, to: LifecycleStage): boolean => {
  if (isTerminal(from)) return false
  return LIFECYCLE_ORDER.indexOf(to) > LIFECYCLE_ORDER.indexOf(from)
}

export const createPlaceholderThesis = (
  name: string,
  type: ThesisType,
  primaryVariable: MispricedVariable
): Thesis => ({
  id: uuid(),
  name,
  type,
  stage: 'Developing',
  statement: '',
  whyNow: '',
  timeHorizon: 24,
  transmissionPath: '',
  valueCaptureMethod: '',
  consensusView: '',
  variantView: '',
  variantPerceptionStrength: 'UnclearConsensusWeakVariant',
  primaryMispricedVariable: primaryVariable,
  secondaryMispricedVariables: [],
  keyAssumptions: [],
  disconfirmers: [],
  killConditions: [],
  beneficiaries: [],
  losers: [],
  triggers: [],
  decayClock: {
    statedHorizonMonths: 24,
    elapsedMonths: 0,
    elapsedPct: 0,
    zone: 'Green',
    isFrozen: false,
  },
  evidenceDriftScore: 0,
  evidenceDriftDirection: 'Neutral',
  scenarioIds: [],
  linkedCompanyIds: [],
  linkedSignalIds: [],
  lens: 'PrologisAware',
  changeHistory: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})
