import type { Thesis, MispricedVariable } from '../types/thesis'
import type { Signal, SignalDirection, SignalSpecificity } from '../types/signal'
import type { ConvictionDriver } from '../types/conviction'
import { callInvestmentAPI } from './openai'
import { useThesisStore } from '../store/thesisStore'
import { useSignalStore } from '../store/signalStore'
import { useConvictionStore } from '../store/convictionStore'
import { computeSignalWeight } from './signals'
import { mapMispricedVariable } from '../utils/huntToThesis'
import { clampConvictionScore, clampDriverMagnitude } from '../constants/convictionScoring'

export interface ProposedSignal {
  title: string
  variable: MispricedVariable
  direction: 'Confirming' | 'Disconfirming'
  sourceType: string
  whatToWatch: string
  significance: 'High' | 'Medium'
}

export interface InitialAssessment {
  convictionScore: number
  convictionReasoning: string
  proposedSignals: ProposedSignal[]
  convictionDrivers: ConvictionDriver[]
}

const VALID_MISPRICED = new Set<string>([
  'GrowthRate', 'GrowthDurability', 'MarginStructure', 'TimingOfInflection',
  'CapitalIntensity', 'CloseOrOutcomeProbability', 'CompetitiveWinner',
  'ValueAccrualLocation', 'RegulatoryPolicyImpact', 'BalanceSheetResilience',
  'CapitalAllocationQuality', 'MarketStructureForcedFlow', 'CrowdingExpectations',
  'TerminalValueDuration', 'ManagementExecution',
])

const SYSTEM_PROMPT = `You are the Dossier conviction engine. Assess a newly created investment thesis on a 0–100 scale.

SCORE CALIBRATION (use the full range; be harsh):
- 0–25: Weak — vague, unfalsifiable, or structurally broken
- 26–45: Speculative — direction plausible but thin variant or weak transmission
- 46–60: Moderate — coherent but unproven; typical developing thesis
- 61–75: Strong — sharp variant, clear mispriced variable, plausible causal path
- 76–85: Exceptional at creation — rare; requires unusual specificity and falsifiability
- 86–92: Near-ceiling — almost never assign at initial assessment
- 93–100: Maximum — virtually impossible at creation; reserved for sustained confirming evidence over time. Do NOT assign 93+ unless the thesis is extraordinary in every dimension.

Your tasks:
1. Assign an honest initial conviction score (0–100) using the calibration above.
2. Propose 2–4 specific trackable signals (concrete data sources/events, not generic "watch earnings").
3. Propose 4–8 conviction drivers: specific observable triggers that would move conviction up or down, each with a signed magnitude in points.

Driver magnitude rules (single trigger):
- Minor confirming/contradicting: ±2 to ±7
- Material confirming/contradicting: ±8 to ±15
- Thesis-altering (usually Down): −20 to −35
- Include at least 2 Up drivers and 2 Down drivers tied to this thesis's assumptions and disconfirmers.

Return ONLY valid JSON matching the schema provided.`

function mapProposedDirection(direction: string): SignalDirection {
  return direction === 'Disconfirming' ? 'Weakening' : 'Strengthening'
}

function mapProposedSpecificity(significance: string): SignalSpecificity {
  return significance === 'High' ? 'Direct-Quantifiable' : 'Indirect'
}

function normalizeProposedSignal(raw: Record<string, unknown>): ProposedSignal | null {
  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) return null

  const variableRaw = typeof raw.variable === 'string' ? raw.variable : ''
  const variable = VALID_MISPRICED.has(variableRaw)
    ? (variableRaw as MispricedVariable)
    : mapMispricedVariable(variableRaw)

  const direction = raw.direction === 'Disconfirming' ? 'Disconfirming' : 'Confirming'
  const sourceType = typeof raw.sourceType === 'string' ? raw.sourceType.trim() : 'Unknown source'
  const whatToWatch = typeof raw.whatToWatch === 'string' ? raw.whatToWatch.trim() : title
  const significance = raw.significance === 'Medium' ? 'Medium' : 'High'

  return { title, variable, direction, sourceType, whatToWatch, significance }
}

function normalizeConvictionDriver(raw: Record<string, unknown>): ConvictionDriver | null {
  const trigger = typeof raw.trigger === 'string' ? raw.trigger.trim() : ''
  if (!trigger) return null

  const direction = raw.direction === 'Down' ? 'Down' : 'Up'
  const magnitudeRaw = typeof raw.magnitude === 'number' ? raw.magnitude : 5
  const magnitude = clampDriverMagnitude(magnitudeRaw, direction)

  const variableRaw = typeof raw.variable === 'string' ? raw.variable : undefined
  const variable = variableRaw && VALID_MISPRICED.has(variableRaw)
    ? (variableRaw as MispricedVariable)
    : undefined

  return { direction, trigger, magnitude, ...(variable ? { variable } : {}) }
}

function buildThesisContext(thesis: Thesis): string {
  return `Assess this newly created investment thesis and return JSON.

Thesis name: ${thesis.name}
Type: ${thesis.type}
Stage: ${thesis.stage}
Statement: ${thesis.statement}
Why now: ${thesis.whyNow}
Transmission path: ${thesis.transmissionPath}
Consensus view: ${thesis.consensusView}
Variant view: ${thesis.variantView}
Primary mispriced variable: ${thesis.primaryMispricedVariable}
Secondary mispriced variables: ${thesis.secondaryMispricedVariables.join(', ') || 'none'}
Key assumptions: ${thesis.keyAssumptions.join('; ') || 'none'}
Disconfirmers: ${thesis.disconfirmers.join('; ') || 'none'}
${thesis.ticker ? `Ticker: ${thesis.ticker}` : ''}

Return this exact JSON structure:
{
  "convictionScore": <integer 0-100>,
  "convictionReasoning": "<2-3 sentences explaining the score using the calibration bands>",
  "proposedSignals": [
    {
      "title": "<one sentence, specific and concrete>",
      "variable": "<MispricedVariable enum value>",
      "direction": "<Confirming or Disconfirming>",
      "sourceType": "<e.g. Earnings call, Fed minutes>",
      "whatToWatch": "<exactly what to look for>",
      "significance": "<High or Medium>"
    }
  ],
  "convictionDrivers": [
    {
      "direction": "<Up or Down>",
      "trigger": "<specific observable event or data point>",
      "magnitude": <integer points, positive number; sign implied by direction>,
      "variable": "<optional MispricedVariable enum value>"
    }
  ]
}`
}

function createProposedSignalObject(thesisId: string, proposed: ProposedSignal): Signal {
  const direction = mapProposedDirection(proposed.direction)
  const specificity = mapProposedSpecificity(proposed.significance)
  const signal: Signal = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    linkedThesisId: thesisId,
    variable: proposed.variable,
    scenarioTag: 'Neutral',
    direction,
    sourceQuality: 'Proposed',
    sourceIndependent: false,
    specificity,
    weight: 0,
    title: proposed.title,
    notes: `${proposed.whatToWatch} (Source: ${proposed.sourceType})`,
    observedAt: new Date(),
    createdAt: new Date(),
    isProposed: true,
    proposedDirection: proposed.direction,
    proposedSourceType: proposed.sourceType,
    proposedSignificance: proposed.significance,
  }
  signal.weight = computeSignalWeight(signal)
  return signal
}

export async function runThesisInitialization(thesis: Thesis): Promise<InitialAssessment | null> {
  console.log("[thesisInitializer] runThesisInitialization called, thesis.id:", thesis.id)
  const raw = await callInvestmentAPI<Record<string, unknown>>(
    SYSTEM_PROMPT,
    buildThesisContext(thesis),
    true,
    6000,
  )

  const convictionScore = clampConvictionScore(
    typeof raw.convictionScore === 'number' ? raw.convictionScore : 50,
  )
  const convictionReasoning =
    typeof raw.convictionReasoning === 'string'
      ? raw.convictionReasoning.trim()
      : 'Initial assessment pending review.'

  const proposedRaw = Array.isArray(raw.proposedSignals) ? raw.proposedSignals : []
  const proposedSignals = proposedRaw
    .map((item) => (item && typeof item === 'object' ? normalizeProposedSignal(item as Record<string, unknown>) : null))
    .filter((s): s is ProposedSignal => s !== null)
    .slice(0, 4)

  const driversRaw = Array.isArray(raw.convictionDrivers) ? raw.convictionDrivers : []
  const convictionDrivers = driversRaw
    .map((item) => (item && typeof item === 'object' ? normalizeConvictionDriver(item as Record<string, unknown>) : null))
    .filter((d): d is ConvictionDriver => d !== null)
    .slice(0, 8)

  console.log("[thesisInitializer] raw result:", JSON.stringify({ convictionScore, convictionReasoning, proposedSignals, convictionDrivers }))
  return { convictionScore, convictionReasoning, proposedSignals, convictionDrivers }
}

export async function initializeThesis(thesis: Thesis): Promise<void> {
  try {
    console.log("[thesisInitializer] starting for", thesis.id)
    const assessment = await runThesisInitialization(thesis)
    console.log("[thesisInitializer] assessment:", JSON.stringify(assessment))
    if (!assessment) {
      useThesisStore.getState().updateThesis(thesis.id, { convictionInitStatus: 'failed' })
      return
    }

    useThesisStore.getState().updateThesis(thesis.id, {
      thesisQualityScore: assessment.convictionScore,
      convictionReasoning: assessment.convictionReasoning,
      convictionDrivers: assessment.convictionDrivers,
      convictionInitStatus: 'complete',
    })
    useConvictionStore.getState().setInitialConvictionScore(thesis.id, assessment.convictionScore)

    const { addSignal } = useSignalStore.getState()
    for (const proposed of assessment.proposedSignals) {
      addSignal(createProposedSignalObject(thesis.id, proposed))
    }
  } catch (err) {
    console.error("[thesisInitializer] failed:", err)
    useThesisStore.getState().updateThesis(thesis.id, { convictionInitStatus: 'failed' })
  }
}
