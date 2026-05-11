import type { Thesis, KillRecord, KillClassificationResult, KillType, KillTriggerPathway, LearningSignal } from '../types'
import type { Signal, SignalComposite } from '../types'
import { SYSTEM_IDENTITY, callInvestmentAPI } from './openai'

const KILL_TYPE_LABELS: Record<KillType, string> = {
  1: 'Core Assumption Broken',
  2: 'Opportunity Closed',
  3: 'Better Expression Found',
  4: 'Superseded',
  5: 'Conviction Exhausted',
}

const PATHWAY_LABELS: Record<KillTriggerPathway, string> = {
  A: 'Scheduled reassessment',
  B: 'Disconfirmer triggered',
  C: 'Signal collapse',
  D: 'Forced by decay clock',
}

export async function classifyKill(
  thesis: Thesis,
  signals: Signal[],
  composites: SignalComposite[],
  pathway: KillTriggerPathway,
): Promise<KillClassificationResult> {
  const systemPrompt = `${SYSTEM_IDENTITY}

You are classifying the kill type for a dying thesis. The five kill types are:
1 = Core Assumption Broken: A foundational assumption has been definitively falsified
2 = Opportunity Closed: The mispricing has been recognized or the catalyst has passed
3 = Better Expression Found: A superior vehicle for the same thesis exists
4 = Superseded: The macro or structural condition has fundamentally shifted
5 = Conviction Exhausted: Insufficient evidence accumulation within the time horizon

Return exactly this JSON:
{
  "recommendedType": 1 | 2 | 3 | 4 | 5,
  "confidence": "High" | "Medium" | "Low",
  "challengeQuestions": string[] (3 questions, each under 25 words, that must be answered before killing),
  "pathway": "${pathway}"
}
CRITICAL: Return only valid JSON. No preamble. ASCII only.`

  const recentSignals = signals
    .filter((s) => s.linkedThesisId === thesis.id)
    .slice(-8)
    .map((s) => `${s.variable}: ${s.direction} (${s.specificity})`)
    .join('; ')

  const userContent = `THESIS: ${thesis.name} [${thesis.type}]
STAGE: ${thesis.stage}
DECAY: ${thesis.decayClock.zone} (${(thesis.decayClock.elapsedPct * 100) | 0}% elapsed)
EVIDENCE DRIFT: ${thesis.evidenceDriftDirection}
KILL PATHWAY: ${pathway} (${PATHWAY_LABELS[pathway]})
PRIMARY MISPRICED VARIABLE: ${thesis.primaryMispricedVariable}
KEY ASSUMPTIONS: ${thesis.keyAssumptions.join('; ')}
DISCONFIRMERS: ${thesis.disconfirmers.join('; ')}
RECENT SIGNALS: ${recentSignals || 'None'}
COMPOSITES: ${composites.map((c) => `${c.variable}: ${c.compositeScore.toFixed(1)}`).join('; ')}`

  const result = await callInvestmentAPI<{
    recommendedType: KillType
    confidence: 'High' | 'Medium' | 'Low'
    challengeQuestions: string[]
    pathway: KillTriggerPathway
  }>(systemPrompt, userContent, true, 1500)

  return {
    recommendedType: result.recommendedType,
    confidence: result.confidence,
    challengeQuestions: result.challengeQuestions ?? [],
    pathway: result.pathway ?? pathway,
  }
}

export async function generateKillMemo(
  thesis: Thesis,
  killType: KillType,
  pathway: KillTriggerPathway,
  killReason: string,
  brokenAssumption: string | undefined,
  signals: Signal[],
  composites: SignalComposite[],
): Promise<Omit<KillRecord, 'id' | 'killedAt'>> {
  const systemPrompt = `${SYSTEM_IDENTITY}

You are writing the kill memo for a thesis that has been formally terminated.
Kill type: ${killType} (${KILL_TYPE_LABELS[killType]})
Pathway: ${pathway} (${PATHWAY_LABELS[pathway]})

Return exactly this JSON:
{
  "lessonLearned": string (2-3 sentences, specific to what this kill teaches),
  "learningRoutes": [
    {
      "type": "FrameworkUpdate" | "MentalModelRefinement" | "NewWatchlistItem" | "ProcessImprovement" | "None",
      "description": string (under 25 words)
    }
  ],
  "capitalReallocatedTo": string | null (suggested reallocation thesis type or null)
}
Generate 2-3 learning routes. CRITICAL: Return only valid JSON. ASCII only.`

  const recentSignals = signals
    .filter((s) => s.linkedThesisId === thesis.id)
    .slice(-6)
    .map((s) => `${s.variable}: ${s.direction}`)
    .join('; ')

  const userContent = `THESIS: ${thesis.name} [${thesis.type}]
KILL TYPE: ${killType} - ${KILL_TYPE_LABELS[killType]}
KILL REASON: ${killReason}
BROKEN ASSUMPTION: ${brokenAssumption ?? 'Not applicable'}
PRIMARY VARIABLE: ${thesis.primaryMispricedVariable}
TIME ELAPSED: ${thesis.decayClock.elapsedMonths}mo of ${thesis.decayClock.statedHorizonMonths}mo
EVIDENCE DRIFT: ${thesis.evidenceDriftDirection}
RECENT SIGNALS: ${recentSignals || 'None'}
VARIANT VIEW: ${thesis.variantView}`

  const result = await callInvestmentAPI<{
    lessonLearned: string
    learningRoutes: LearningSignal[]
    capitalReallocatedTo?: string
  }>(systemPrompt, userContent, true, 1500)

  return {
    thesisId: thesis.id,
    thesisName: thesis.name,
    killType,
    triggerPathway: pathway,
    killReason,
    brokenAssumption,
    lessonLearned: result.lessonLearned,
    learningRoutes: result.learningRoutes ?? [],
    capitalReallocatedTo: result.capitalReallocatedTo ?? undefined,
  }
}

export function buildKillRecord(
  partial: Omit<KillRecord, 'id' | 'killedAt'>,
): KillRecord {
  return {
    ...partial,
    id: `kill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    killedAt: new Date(),
  }
}
