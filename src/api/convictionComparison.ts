import type { Signal } from '../types'
import type { Thesis } from '../types/thesis'
import type { ConvictionComparisonResult, ConvictionDraft } from '../types/conviction'
import { useConvictionStore } from '../store/convictionStore'
import { computeSignalWeight } from './signals'
import { callInvestmentAPI } from './openai'

// Minimum source quality score to trigger a conviction comparison.
// Signals below this threshold are logged but do not generate a draft.
// Matches spec §6.2: Source Quality Score >= 0.45
const QUALITY_TIER_SCORES: Record<string, number> = {
  Tier1: 1.0,
  Tier2: 0.8,
  Tier3: 0.6,
  Tier4: 0.4,
}
const MINIMUM_QUALITY_THRESHOLD = 0.45

// Specificity levels that qualify for comparison (not Tangential)
const QUALIFYING_SPECIFICITY = new Set(['Direct-Quantifiable', 'Direct-Qualitative', 'Indirect'])

/**
 * Determines whether a signal should trigger a conviction comparison.
 * Implements spec §6.2 trigger conditions.
 */
export function shouldTriggerConvictionComparison(
  signal: Signal,
  thesis: Thesis,
): boolean {
  // Must be tagged to an active thesis
  const activeStages = ['Developing', 'Actionable', 'Live']
  if (!activeStages.includes(thesis.stage)) return false

  // Signal must match a thesis variable
  const isLinkedToVariable =
    signal.variable === thesis.primaryMispricedVariable ||
    thesis.secondaryMispricedVariables.includes(signal.variable)
  if (!isLinkedToVariable) return false

  // Specificity must be direct or adjacent (not tangential)
  if (!QUALIFYING_SPECIFICITY.has(signal.specificity)) return false

  // Source quality must meet minimum threshold
  const qualityScore = QUALITY_TIER_SCORES[signal.sourceQuality] ?? 0
  if (qualityScore < MINIMUM_QUALITY_THRESHOLD) return false

  return true
}

/**
 * Finds the original assumption text for a given variable from the thesis.
 * Looks in keyAssumptions for the most relevant match.
 */
function extractOriginalAssumption(thesis: Thesis, variable: string): string {
  // Search keyAssumptions for one that references the variable name
  const variableWords = variable.replace(/([A-Z])/g, ' $1').trim().toLowerCase().split(' ')
  const match = thesis.keyAssumptions.find((a) =>
    variableWords.some((w) => a.toLowerCase().includes(w))
  )
  if (match) return match

  // Fallback: return first key assumption with a note
  if (thesis.keyAssumptions.length > 0) {
    return thesis.keyAssumptions[0]
  }

  return `Primary variable: ${variable.replace(/([A-Z])/g, ' $1').trim()}`
}

/**
 * Calls the OpenAI API to compare a new signal against the thesis's
 * original primary variable assumptions.
 * Returns a structured ConvictionComparisonResult.
 */
export async function runConvictionComparison(
  signal: Signal,
  thesis: Thesis,
  currentConvictionScore: number,
): Promise<ConvictionComparisonResult> {
  const originalAssumption = extractOriginalAssumption(thesis, signal.variable)
  const variableLabel = signal.variable.replace(/([A-Z])/g, ' $1').trim()

  const systemPrompt = `You are the conviction comparison engine for a thesis-first investment system.

Your job is to compare a new incoming signal against a thesis's original assumption for a specific variable, assess the delta, and produce a structured conviction update draft.

Rules:
- Be precise and direct. No padding.
- The delta category must be one of exactly: ConfirmingMinor, ConfirmingMaterial, Neutral, ContradictingMinor, ContradictingMaterial, ThesisAltering
- Score changes: ConfirmingMaterial +8 to +15, ConfirmingMinor +2 to +7, Neutral 0, ContradictingMinor -2 to -7, ContradictingMaterial -8 to -15, ThesisAltering -20 to -35
- recommendedAction must be one of: LogOnly, LogAndFlag, LogAndInitiateKillReview
- Use LogAndInitiateKillReview only for ThesisAltering deltas
- Use LogAndFlag for ContradictingMaterial
- Use LogOnly for everything else
- currentStateAssessment: 2-4 sentences max
- agentReasoning: 2-4 sentences max
- Return ONLY valid JSON. No preamble, no markdown, no explanation.`

  const userContent = `Thesis: "${thesis.name}"
Type: ${thesis.type}
Stage: ${thesis.stage}
Current conviction score: ${currentConvictionScore}/100

Variable being assessed: ${variableLabel}
Original assumption: "${originalAssumption}"

Incoming signal:
- Summary: ${signal.variable} is ${signal.direction}
- Source quality: ${signal.sourceQuality}
- Specificity: ${signal.specificity}
- Independent source: ${signal.sourceIndependent}
- Signal weight: ${computeSignalWeight(signal).toFixed(3)}

Thesis context:
- Statement: ${thesis.statement}
- Variant view: ${thesis.variantView}
- Disconfirmers: ${thesis.disconfirmers.join('; ')}

Respond with this exact JSON structure:
{
  "variable": "${signal.variable}",
  "originalAssumption": "<quote the original assumption verbatim>",
  "currentStateAssessment": "<2-4 sentence assessment of where this variable stands now given the signal>",
  "deltaCategory": "<one of the six categories>",
  "proposedScoreChange": <integer, positive or negative>,
  "agentReasoning": "<2-4 sentences explaining the delta and score change>",
  "recommendedAction": "<LogOnly | LogAndFlag | LogAndInitiateKillReview>"
}`

  try {
    return await callInvestmentAPI<ConvictionComparisonResult>(
      systemPrompt,
      userContent,
      true,
      1000,
    )
  } catch {
    // Fallback if parsing fails — return a neutral draft so nothing is lost
    return {
      variable: signal.variable,
      originalAssumption,
      currentStateAssessment: 'Agent comparison failed to parse. Please review manually.',
      deltaCategory: 'Neutral',
      proposedScoreChange: 0,
      agentReasoning: 'Structured output parsing error. Raw signal has been preserved.',
      recommendedAction: 'LogOnly',
    }
  }
}

/**
 * Full conviction comparison workflow.
 * Called when a new signal is ingested against an active thesis.
 * Checks trigger conditions, runs AI comparison, creates a pending draft.
 * Does NOT write to the ledger — that requires explicit user confirmation.
 */
export async function triggerConvictionComparison(
  signal: Signal,
  thesis: Thesis,
): Promise<ConvictionDraft | null> {
  // Check trigger conditions first
  if (!shouldTriggerConvictionComparison(signal, thesis)) return null

  const store = useConvictionStore.getState()
  const currentScore = store.getConvictionScore(thesis.id)

  // Run the AI comparison
  const result = await runConvictionComparison(signal, thesis, currentScore)

  // Create a pending draft — not yet in the ledger
  const draft: ConvictionDraft = {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    thesisId: thesis.id,
    thesisName: thesis.name,
    thesisStage: thesis.stage,

    triggerSignalId: signal.id,
    triggerSignalSummary: `${signal.variable} signal (${signal.direction}, ${signal.sourceQuality})`,
    triggerSignalSource: signal.sourceQuality,

    variable: signal.variable,

    originalAssumption: result.originalAssumption,
    currentStateAssessment: result.currentStateAssessment,
    deltaCategory: result.deltaCategory,
    proposedScoreChange: result.proposedScoreChange,
    currentConvictionScore: currentScore,
    proposedConvictionScore: Math.max(10, Math.min(100, currentScore + result.proposedScoreChange)),

    agentReasoning: result.agentReasoning,
    recommendedAction: result.recommendedAction,

    createdAt: new Date(),
    isEdited: false,
  }

  // Add to pending drafts — surfaces in ConvictionReviewModal
  store.addDraft(draft)

  return draft
}
