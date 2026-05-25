import { Thesis, ThesisType, MispricedVariable, ThesisLens } from '../types'
import { createPlaceholderThesis } from './thesisHelpers'
import { useThesisStore } from '../store/thesisStore'
import { initializeThesis } from '../api/thesisInitializer'

const VALID_THESIS_TYPES = new Set<string>([
  'LongDurationCompounder', 'MacroRegimeShift', 'DeepContrarianMispricing',
  'SpecialSituationsCatalyst', 'CapitalAllocationQuality', 'MarketStructureReflexivity',
  'TechnologyDisruption', 'RegulatoryPolicy', 'IndustryStructureConsumerBehavior',
  'CapitalCycle', 'OperationalTurnaround', 'RealEstatePhysicalAssets',
  'Geopolitical', 'ShortHedgeThesis', 'HouseholdAllocationDecision',
])

const VALID_MISPRICED = new Set<string>([
  'GrowthRate', 'GrowthDurability', 'MarginStructure', 'TimingOfInflection',
  'CapitalIntensity', 'CloseOrOutcomeProbability', 'CompetitiveWinner',
  'ValueAccrualLocation', 'RegulatoryPolicyImpact', 'BalanceSheetResilience',
  'CapitalAllocationQuality', 'MarketStructureForcedFlow', 'CrowdingExpectations',
  'TerminalValueDuration', 'ManagementExecution',
])

export function mapThesisType(raw: string): ThesisType {
  if (VALID_THESIS_TYPES.has(raw)) return raw as ThesisType
  const lower = raw.toLowerCase()
  if (lower.includes('macro') || lower.includes('regime')) return 'MacroRegimeShift'
  if (lower.includes('contrarian') || lower.includes('mispric')) return 'DeepContrarianMispricing'
  if (lower.includes('capital cycle')) return 'CapitalCycle'
  if (lower.includes('catalyst') || lower.includes('special')) return 'SpecialSituationsCatalyst'
  if (lower.includes('turnaround')) return 'OperationalTurnaround'
  if (lower.includes('real estate') || lower.includes('physical')) return 'RealEstatePhysicalAssets'
  if (lower.includes('technology') || lower.includes('disruption')) return 'TechnologyDisruption'
  if (lower.includes('household') || lower.includes('allocation')) return 'HouseholdAllocationDecision'
  return 'MacroRegimeShift'
}

export function mapMispricedVariable(raw: string): MispricedVariable {
  if (VALID_MISPRICED.has(raw)) return raw as MispricedVariable
  const lower = raw.toLowerCase()
  if (lower.includes('crowd') || lower.includes('expectation')) return 'CrowdingExpectations'
  if (lower.includes('growth')) return 'GrowthRate'
  if (lower.includes('duration') || lower.includes('terminal')) return 'TerminalValueDuration'
  if (lower.includes('flow') || lower.includes('structure')) return 'MarketStructureForcedFlow'
  return 'CrowdingExpectations'
}

export interface HuntBriefInput {
  ticker: string
  displayName: string
  thesisType: string
  mispricedVariable?: string
  thesisStatement: string
  transmissionPath: string
  variantPerception: string
  vaultSignals: string[]
  keyRisks: string[]
  killConditions?: string[]
}

export function createThesisFromHuntBrief(
  brief: HuntBriefInput,
  lens: ThesisLens,
): Thesis {
  const base = createPlaceholderThesis(
    `${brief.displayName} — ${brief.thesisType}`,
    mapThesisType(brief.thesisType),
    mapMispricedVariable(brief.mispricedVariable ?? 'CrowdingExpectations'),
  )
  return {
    ...base,
    stage: 'Developing',
    statement: brief.thesisStatement,
    transmissionPath: brief.transmissionPath,
    variantView: brief.variantPerception,
    keyAssumptions: brief.vaultSignals,
    disconfirmers: brief.keyRisks,
    killConditions: brief.killConditions ?? [],
    ticker: brief.ticker,
    lens,
  }
}

export function addHuntThesisToDossier(
  brief: HuntBriefInput,
  lens: ThesisLens,
): Thesis {
  const thesis = createThesisFromHuntBrief(brief, lens)
  useThesisStore.getState().addThesis(thesis)
  initializeThesis(thesis).catch(() => {
    // Fail silently — thesis is already stored
  })
  return thesis
}

export function isDuplicateInDossier(
  theses: Record<string, Thesis>,
  ticker: string,
): boolean {
  const normalized = ticker.trim().toUpperCase()
  if (!normalized) return false
  return Object.values(theses).some((th) => {
    if (th.ticker?.trim().toUpperCase() === normalized) return true
    const nameUpper = th.name.toUpperCase()
    return nameUpper.startsWith(`${normalized} `) || nameUpper.includes(`(${normalized})`)
  })
}
