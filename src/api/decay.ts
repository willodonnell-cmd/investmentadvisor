import type { Thesis, DecayClock } from '../types'
import type { Signal, SignalComposite } from '../types'
import type { ReassessmentMemo } from '../types'
import { SYSTEM_IDENTITY, callInvestmentAPI } from './anthropic'

export function computeDecayClock(
  thesis: Thesis,
  createdAt: Date,
  frozenUntil?: Date,
): DecayClock {
  const now = new Date()

  if (frozenUntil && now < new Date(frozenUntil)) {
    const frozenPct = thesis.decayClock.elapsedPct
    return {
      ...thesis.decayClock,
      isFrozen: true,
      frozenUntil,
      zone: zoneFromPct(frozenPct),
    }
  }

  const horizonMs = thesis.timeHorizon * 30 * 24 * 3600 * 1000
  const elapsedMs = now.getTime() - new Date(createdAt).getTime()
  const elapsedMonths = elapsedMs / (30 * 24 * 3600 * 1000)
  const elapsedPct = Math.min(elapsedMs / horizonMs, 1.5)

  return {
    statedHorizonMonths: thesis.timeHorizon,
    elapsedMonths: Math.round(elapsedMonths * 10) / 10,
    elapsedPct,
    zone: zoneFromPct(elapsedPct),
    isFrozen: false,
  }
}

export function zoneFromPct(pct: number): DecayClock['zone'] {
  if (pct < 0.40) return 'Green'
  if (pct < 0.60) return 'Yellow'
  if (pct < 0.80) return 'Orange'
  if (pct < 1.00) return 'Red'
  return 'Overdue'
}

export interface EvidenceDriftResult {
  score: number
  direction: Thesis['evidenceDriftDirection']
  summary: string
}

export function computeEvidenceDrift(
  composites: SignalComposite[],
  primaryVariable: string,
): EvidenceDriftResult {
  if (composites.length === 0) {
    return { score: 0, direction: 'Neutral', summary: 'No signal data collected.' }
  }

  const primaryComposite = composites.find((c) => c.variable === primaryVariable)
  const primaryScore = primaryComposite?.compositeScore ?? 0

  const otherScores = composites
    .filter((c) => c.variable !== primaryVariable)
    .map((c) => c.compositeScore)

  const otherAvg = otherScores.length
    ? otherScores.reduce((a, b) => a + b, 0) / otherScores.length
    : 0

  const blendedScore = primaryScore * 0.7 + otherAvg * 0.3
  const normalized = Math.max(-10, Math.min(10, blendedScore))

  let direction: Thesis['evidenceDriftDirection']
  if (normalized >= 3) direction = 'Positive'
  else if (normalized >= -1) direction = 'Neutral'
  else if (normalized >= -5) direction = 'Negative'
  else direction = 'SevereNegative'

  const summary =
    direction === 'Positive'
      ? 'Evidence is accumulating in favor of the thesis across primary and secondary variables.'
      : direction === 'Neutral'
      ? 'Mixed or insufficient evidence. Thesis neither affirmed nor disconfirmed.'
      : direction === 'Negative'
      ? 'Evidence is drifting against key assumptions. Reassessment warranted.'
      : 'Severe evidence breakdown. Core assumptions facing systematic disconfirmation.'

  return { score: normalized, direction, summary }
}

export function shouldTriggerReassessment(
  decayClock: DecayClock,
  driftDirection: Thesis['evidenceDriftDirection'],
  lastReassessmentAt?: Date,
): { shouldTrigger: boolean; reason: string; pathway: 'A' | 'B' | 'C' | 'D' } {
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000
  const recentReassessment =
    lastReassessmentAt && new Date(lastReassessmentAt).getTime() > thirtyDaysAgo

  if (recentReassessment) {
    return { shouldTrigger: false, reason: 'Reassessment completed within past 30 days.', pathway: 'A' }
  }

  if (driftDirection === 'SevereNegative') {
    return {
      shouldTrigger: true,
      reason: 'Severe negative evidence drift detected across key variables.',
      pathway: 'B',
    }
  }

  if (decayClock.zone === 'Overdue') {
    return {
      shouldTrigger: true,
      reason: 'Thesis horizon has expired. Forced reassessment required.',
      pathway: 'D',
    }
  }

  if (decayClock.zone === 'Red') {
    return {
      shouldTrigger: true,
      reason: 'Decay clock in Red zone (80-100% elapsed). Scheduled reassessment due.',
      pathway: 'A',
    }
  }

  if (driftDirection === 'Negative' && decayClock.zone !== 'Green') {
    return {
      shouldTrigger: true,
      reason: 'Negative evidence drift combined with elevated decay clock warrants review.',
      pathway: 'B',
    }
  }

  return { shouldTrigger: false, reason: 'Thesis within normal conviction parameters.', pathway: 'A' }
}

export async function generateReassessmentMemo(
  thesis: Thesis,
  signals: Signal[],
  composites: SignalComposite[],
  triggerReason: string,
  pathway: 'A' | 'B' | 'C' | 'D',
): Promise<ReassessmentMemo> {
  const PATHWAY_LABELS = { A: 'Scheduled', B: 'Disconfirmer triggered', C: 'Signal collapse', D: 'Forced by decay' }

  const systemPrompt = `${SYSTEM_IDENTITY}

You are generating a formal reassessment memo for a thesis that has triggered a review protocol.
Pathway: ${pathway} (${PATHWAY_LABELS[pathway]}).
Your output must be a JSON object with exactly these keys:
{
  "decision": "Reaffirm" | "Reduce" | "Kill" | "Convert",
  "trigger": string (one sentence describing what triggered this reassessment),
  "evidence": string (2-3 sentences summarizing the evidence state),
  "recommendation": string (2-3 sentences, specific and actionable),
  "keyRisks": string[] (3-4 items, each under 20 words),
  "killRationale": string | null (required if decision is Kill, null otherwise)
}
CRITICAL: Return only valid JSON. No preamble, no explanation. ASCII characters only.`

  const signalSummary = signals
    .filter((s) => s.linkedThesisId === thesis.id)
    .slice(-10)
    .map((s) => `${s.variable}: ${s.direction} (${s.sourceQuality}, ${s.specificity})`)
    .join('; ')

  const compositeSummary = composites
    .map((c) => `${c.variable}: score ${c.compositeScore.toFixed(1)} (${c.direction})`)
    .join('; ')

  const userContent = `THESIS: ${thesis.name}
TYPE: ${thesis.type}
STAGE: ${thesis.stage}
HORIZON: ${thesis.timeHorizon}mo (${thesis.decayClock.elapsedPct * 100 | 0}% elapsed, zone: ${thesis.decayClock.zone})
EVIDENCE DRIFT: ${thesis.evidenceDriftDirection}
TRIGGER REASON: ${triggerReason}
KEY ASSUMPTIONS: ${thesis.keyAssumptions.join('; ')}
DISCONFIRMERS: ${thesis.disconfirmers.join('; ')}
RECENT SIGNALS: ${signalSummary || 'None recorded'}
COMPOSITES: ${compositeSummary || 'No composites computed'}`

  const result = await callInvestmentAPI<{
    decision: ReassessmentMemo['decision']
    trigger: string
    evidence: string
    recommendation: string
    keyRisks: string[]
    killRationale?: string
  }>(systemPrompt, userContent, true, 2000)

  return {
    thesisId: thesis.id,
    decision: result.decision,
    trigger: result.trigger,
    evidence: result.evidence,
    recommendation: result.recommendation,
    keyRisks: result.keyRisks ?? [],
    killRationale: result.killRationale ?? undefined,
    generatedAt: new Date(),
  }
}
