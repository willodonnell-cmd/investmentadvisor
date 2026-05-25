import type { Thesis, MispricedVariable } from '../types/thesis'
import type { Signal, SignalDirection, SignalSpecificity } from '../types/signal'
import { callInvestmentAPI } from './openai'
import { useThesisStore } from '../store/thesisStore'
import { useSignalStore } from '../store/signalStore'
import { useConvictionStore } from '../store/convictionStore'
import { computeSignalWeight } from './signals'
import { mapMispricedVariable } from '../utils/huntToThesis'

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
}

const VALID_MISPRICED = new Set<string>([
  'GrowthRate', 'GrowthDurability', 'MarginStructure', 'TimingOfInflection',
  'CapitalIntensity', 'CloseOrOutcomeProbability', 'CompetitiveWinner',
  'ValueAccrualLocation', 'RegulatoryPolicyImpact', 'BalanceSheetResilience',
  'CapitalAllocationQuality', 'MarketStructureForcedFlow', 'CrowdingExpectations',
  'TerminalValueDuration', 'ManagementExecution',
])

const SYSTEM_PROMPT = `You are the Dossier conviction engine. Your job is to assess a newly created investment thesis and:
1. Assign an honest initial conviction score (30-75). Never above 75 — conviction above 75 must be earned through evidence. Score based on: thesis specificity and falsifiability, variant perception clarity, macro regime fit, transmission path plausibility, and quality of the mispriced variable identification. Be harsh — a vague thesis gets 35, a sharp well-articulated thesis gets 65-70.
2. Propose 2-4 specific trackable signals. Each signal must be: tied to a specific data source or event, concrete enough that you would know when you've observed it, and directly relevant to confirming or disconfirming the primary mispriced variable. No generic signals like "watch earnings" — name the specific company, metric, or event.

Return ONLY valid JSON matching the schema provided.`

function clampConvictionScore(score: number): number {
  return Math.max(30, Math.min(75, Math.round(score)))
}

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
  "convictionScore": <integer 30-75>,
  "convictionReasoning": "<2-3 sentences explaining the score>",
  "proposedSignals": [
    {
      "title": "<one sentence, specific and concrete>",
      "variable": "<one of the MispricedVariable enum values, e.g. GrowthDurability>",
      "direction": "<Confirming or Disconfirming>",
      "sourceType": "<e.g. Earnings call, Fed minutes, Industry data release>",
      "whatToWatch": "<exactly what to look for>",
      "significance": "<High or Medium>"
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
    2000,
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

  console.log("[thesisInitializer] raw result:", JSON.stringify({ convictionScore, convictionReasoning, proposedSignals }))
  return { convictionScore, convictionReasoning, proposedSignals }
}

export async function initializeThesis(thesis: Thesis): Promise<void> {
  try {
    console.log("[thesisInitializer] starting for", thesis.id)
    const assessment = await runThesisInitialization(thesis)
    console.log("[thesisInitializer] assessment:", JSON.stringify(assessment))
    if (!assessment) return

    useThesisStore.getState().updateThesis(thesis.id, {
      thesisQualityScore: assessment.convictionScore,
      convictionReasoning: assessment.convictionReasoning,
    })
    useConvictionStore.getState().setInitialConvictionScore(thesis.id, assessment.convictionScore)

    const { addSignal } = useSignalStore.getState()
    for (const proposed of assessment.proposedSignals) {
      addSignal(createProposedSignalObject(thesis.id, proposed))
    }
  } catch (err) {
    console.error("[thesisInitializer] failed:", err)
  }
}
