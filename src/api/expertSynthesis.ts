import { callInvestmentAPI, SYSTEM_IDENTITY } from './anthropic'
import { EXPERT_BENCH } from '../constants/expertBench'
import {
  Thesis, ThesisType, ThesisLens, LifecycleStage,
  ExpertVoiceId, ExpertSynthesisResult, PanelSynthesis,
  ResearchPanelReconciliation, VoiceContribution, ResearchView,
} from '../types'

// ─── Cluster and selection data ─────────────────────────────────────────────

type ClusterName =
  | 'QualityAndDuration' | 'SkepticismAndInversion' | 'MacroAndReflexivity'
  | 'ContrarianAndForensic' | 'GrowthAndDisruption' | 'RealAssetsAndCycles'
  | 'ValuationBridge'

const SKEPTIC_CLUSTER: ExpertVoiceId[] = ['Munger', 'Kahneman', 'Asness']

// Per thesis type: [primary1, primary2, secondary]
const DEFAULT_SELECTION: Record<ThesisType, [ExpertVoiceId, ExpertVoiceId, ExpertVoiceId]> = {
  LongDurationCompounder:           ['Buffett',      'Smith',        'Munger'],
  MacroRegimeShift:                 ['Soros',        'Druckenmiller','Marks'],
  DeepContrarianMispricing:         ['Burry',        'Klarman',      'Munger'],
  SpecialSituationsCatalyst:        ['Klarman',      'Greenblatt',   'Ackman'],
  CapitalAllocationQuality:         ['Buffett',      'Ackman',       'Munger'],
  MarketStructureReflexivity:       ['Soros',        'Marks',        'Asness'],
  TechnologyDisruption:             ['Wood',         'Miller',       'Kahneman'],
  RegulatoryPolicy:                 ['Soros',        'Druckenmiller','Klarman'],
  IndustryStructureConsumerBehavior:['Buffett',      'Fisher',       'Munger'],
  CapitalCycle:                     ['Zell',         'Chancellor',   'Druckenmiller'],
  OperationalTurnaround:            ['Burry',        'Greenblatt',   'Buffett'],
  RealEstatePhysicalAssets:         ['Zell',         'Chancellor',   'Marks'],
  Geopolitical:                     ['Soros',        'Druckenmiller','Zell'],
  ShortHedgeThesis:                 ['Burry',        'Klarman',      'Munger'],
  HouseholdAllocationDecision:      ['Buffett',      'Klarman',      'Zell'],
}

const STAGES_NEEDING_VALUATION: LifecycleStage[] = [
  'PressureTest', 'Actionable', 'Watch', 'Live',
]

// ─── Panel selection logic ───────────────────────────────────────────────────

interface PanelSelection {
  voices: ExpertVoiceId[]
  rules: string[]
  coverageDisclosure?: string
}

export const selectPanel = (thesis: Thesis, lens: ThesisLens): PanelSelection => {
  const voiceSet = new Set<ExpertVoiceId>()
  const rules: string[] = []

  // Steps 2 & 3: default selection
  const [p1, p2, sec] = DEFAULT_SELECTION[thesis.type]
  voiceSet.add(p1)
  voiceSet.add(p2)
  voiceSet.add(sec)
  rules.push(`Cluster selection: ${p1}, ${p2} (primary); ${sec} (secondary)`)

  // ── Rule G: Portfolio Hedge Panel Override ─────────────────────────────
  if (thesis.type === 'ShortHedgeThesis' && thesis.quadrant === 'TacticalPosition') {
    voiceSet.clear()
    ;(['Klarman', 'Marks', 'Asness', 'Kahneman'] as ExpertVoiceId[]).forEach(v => voiceSet.add(v))
    rules.push('Rule G: Portfolio Hedge Panel Override — fixed panel applied')
    return { voices: [...voiceSet], rules }
  }

  // ── Rule A: Mandatory Skeptic ──────────────────────────────────────────
  const hasSkeptic = [...voiceSet].some(v => SKEPTIC_CLUSTER.includes(v))
  if (!hasSkeptic) {
    voiceSet.add('Munger')
    rules.push('Rule A: Mandatory Skeptic — added Munger')
  }

  // ── Rule B: Mandatory Valuation Bridge ────────────────────────────────
  const needsValuation = STAGES_NEEDING_VALUATION.includes(thesis.stage)
  const isHedge = thesis.type === 'ShortHedgeThesis'
  if (needsValuation && !isHedge && !voiceSet.has('Damodaran')) {
    voiceSet.add('Damodaran')
    rules.push('Rule B: Valuation Bridge — added Damodaran (stage ≥ PressureTest)')
  }

  // ── Rule C: Prologis Lens Trigger ─────────────────────────────────────
  const isPrologisLens = lens === 'PrologisAware' || lens === 'CompareVsPrologis'
  const isRealAssetThesis = [
    'RealEstatePhysicalAssets', 'CapitalCycle', 'Geopolitical',
    'HouseholdAllocationDecision',
  ].includes(thesis.type)
  if (isPrologisLens && isRealAssetThesis && !voiceSet.has('Zell')) {
    voiceSet.add('Zell')
    rules.push('Rule C: Prologis Lens Trigger — added Zell (real asset thesis + Prologis lens)')
  }

  // ── Rule D: Household Allocation ──────────────────────────────────────
  if (thesis.type === 'HouseholdAllocationDecision' && !voiceSet.has('Klarman')) {
    voiceSet.add('Klarman')
    rules.push('Rule D: Household Allocation — added Klarman (capital preservation mandate)')
  }

  // ── Rule E: Short/Hedge Mandatory ────────────────────────────────────
  if (thesis.type === 'ShortHedgeThesis') {
    const hasShortVoice = voiceSet.has('Greenblatt') || voiceSet.has('Klarman')
    if (!hasShortVoice) {
      voiceSet.add('Klarman')
      rules.push('Rule E: Short/Hedge Mandatory — added Klarman')
    }
  }

  // ── Rule F: Real Asset Accounting ─────────────────────────────────────
  if (
    thesis.type === 'RealEstatePhysicalAssets' &&
    !voiceSet.has('Burry')
  ) {
    voiceSet.add('Burry')
    rules.push('Rule F: Real Asset Accounting — added Burry (accounting nuance in physical assets)')
  }

  // ── Step 5: Coverage Disclosure ───────────────────────────────────────
  let coverageDisclosure: string | undefined
  const technicalTheses: ThesisType[] = ['TechnologyDisruption', 'RegulatoryPolicy']
  if (technicalTheses.includes(thesis.type)) {
    coverageDisclosure = `Panel coverage is limited on deep technical or regulatory specificity. Panel skepticism may reflect domain limitations rather than thesis weakness.`
  }

  return { voices: [...voiceSet], rules, coverageDisclosure }
}

// ─── API call ────────────────────────────────────────────────────────────────

const EXPERT_SYSTEM = `${SYSTEM_IDENTITY}

You are the Expert Synthesis View for this investment system. Your job: voice a specific set of investors, each with a defined cognitive module, and produce a structured adversarial panel analysis. Every voice must stay strictly within their cognitive module. Do not let voices drift. The mandatory skeptic must make the hardest possible case against the thesis.`

type RawSynthesisOutput = {
  contributions: VoiceContribution[]
  panelSynthesis: PanelSynthesis
  reconciliation: ResearchPanelReconciliation
  structuralFactsLayer: ExpertSynthesisResult['structuralFactsLayer']
  coverageDisclosure?: string | null
}

export const generateExpertSynthesis = async (
  thesis: Thesis,
  lens: ThesisLens,
  researchView?: ResearchView,
): Promise<ExpertSynthesisResult> => {
  const { voices, rules, coverageDisclosure } = selectPanel(thesis, lens)

  const panelLines = voices
    .map(v => `${v} (${EXPERT_BENCH[v].name}): ${EXPERT_BENCH[v].module} — "${EXPERT_BENCH[v].characteristicReasoning}"`)
    .join('\n')

  const researchContext = researchView
    ? `\nRESEARCH VIEW (neutral evidence-based assessment — use this for reconciliation):\nSummary: ${researchView.summary}\nStrengths: ${researchView.keyStrengths.join('; ')}\nWeaknesses: ${researchView.keyWeaknesses.join('; ')}\nUncertainties: ${researchView.uncertainties.join('; ')}\nMispriced Variable Assessment: ${researchView.mispricedVariableAssessment}`
    : ''

  const prompt = `You are the Expert Synthesis View for a thesis-first investment system.

Your job: Voice ${voices.length} specific investors for the thesis below. Every voice must produce the exact six-field structure. After all voices, produce the Panel Synthesis (eight fields) and the Research View vs Panel Reconciliation (six fields). Respond ONLY with valid JSON.

THESIS:
Name: ${thesis.name}
Type: ${thesis.type}
Stage: ${thesis.stage}
Statement: ${thesis.statement}
Why Now: ${thesis.whyNow}
Transmission Path: ${thesis.transmissionPath}
Consensus View: ${thesis.consensusView}
Variant View: ${thesis.variantView}
Primary Mispriced Variable: ${thesis.primaryMispricedVariable}
Key Assumptions: ${thesis.keyAssumptions.join('; ')}
Disconfirmers: ${thesis.disconfirmers.join('; ')}
${researchContext}

PANEL (voice each exactly as their module dictates — do not drift):
${panelLines}

OUTPUT FORMAT (valid JSON only, no markdown):
{
  "contributions": [
    {
      "voiceId": "string — must match exact ExpertVoiceId",
      "lensApplied": "the specific lens this voice applies, e.g. Business quality and duration lens",
      "verdict": "Endorse | Challenge | Reject | Reframe",
      "coreArgument": "2-4 sentences in this voice's reasoning style, referencing the specific thesis",
      "primaryMispricedVariableFocus": "GrowthRate | GrowthDurability | MarginStructure | TimingOfInflection | CapitalIntensity | CloseOrOutcomeProbability | CompetitiveWinner | ValueAccrualLocation | RegulatoryPolicyImpact | BalanceSheetResilience | CapitalAllocationQuality | MarketStructureForcedFlow | CrowdingExpectations | TerminalValueDuration | ManagementExecution",
      "whatWouldChangeVerdict": "specific evidence or development that would flip this voice's verdict",
      "confidence": "High | Medium | Low",
      "scenarioProbabilities": { "thesisConfirmed": 0.35, "contestedPath": 0.40, "thesisBroken": 0.25 }
    }
  ],
  "panelSynthesis": {
    "verdictDistribution": { "endorse": 0, "challenge": 0, "reject": 0, "reframe": 0 },
    "convergencePoints": ["where voices agree across opposing verdicts"],
    "divergencePoints": ["where the panel splits and on which variable"],
    "strongestArgumentFor": "the most compelling endorsing case",
    "strongestArgumentAgainst": "the most compelling challenging or rejecting case",
    "mostContestedVariable": "MispricedVariable enum value",
    "whatWouldResolveDisagreement": "specific evidence that would settle the panel",
    "panelPosture": "Constructive | Mixed | Skeptical | Hostile",
    "panelProbabilityMatrix": { "thesisConfirmed": 0.0, "contestedPath": 0.0, "thesisBroken": 0.0 }
  },
  "reconciliation": {
    "agreements": ["where research view and panel agree"],
    "disagreements": ["where they diverge and why"],
    "contestedVariable": "MispricedVariable enum value",
    "strongerEvidenceBase": "ResearchView | PanelView | Unclear",
    "lifecycleImplication": "what this reconciliation means for lifecycle stage",
    "triggerReadinessImplication": "what this means for trigger readiness"
  },
  "structuralFactsLayer": {
    "liquidity": "assessment of liquidity for this security/thesis type",
    "positionSizeFeasibility": "can a meaningful position be taken given market cap / float?",
    "executionRisk": "key execution risks beyond thesis risk",
    "timeToClose": "realistic timeline for the thesis to resolve"
  },
  "coverageDisclosure": null
}

Voice assignment:
${voices.map(v => `- ${v}: voice ONLY through the ${EXPERT_BENCH[v].module} module`).join('\n')}

scenarioProbabilities in each contribution must sum to 1.0.
panelProbabilityMatrix must be weighted average of all contribution scenarioProbabilities.`

  const raw = await callInvestmentAPI<RawSynthesisOutput>(EXPERT_SYSTEM, prompt, true, 6000)

  return {
    thesisId: thesis.id,
    selectedVoices: voices,
    selectionRules: rules,
    contributions: raw.contributions,
    panelSynthesis: raw.panelSynthesis,
    reconciliation: raw.reconciliation,
    structuralFactsLayer: raw.structuralFactsLayer,
    coverageDisclosure: raw.coverageDisclosure ?? coverageDisclosure,
    generatedAt: new Date(),
  }
}
