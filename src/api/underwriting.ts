import { callInvestmentAPI, SYSTEM_IDENTITY } from './anthropic'
import { generateScenarios } from './scenarios'
import { generateExpertSynthesis } from './expertSynthesis'
import { computeRegimeCompatibility, COMPATIBILITY_LABELS } from './macroRegime'
import {
  Thesis, MacroRegime, Scenario,
  ExpertSynthesisResult, ResearchView, UnderwritingMemo, MemoSection,
  ThesisLens,
} from '../types'
import { MISPRICED_VARIABLE_LABELS, THESIS_TYPE_LABELS } from '../constants'
import { formatDate, formatHorizon } from '../utils/formatting'

// ─── Research View ───────────────────────────────────────────────────────────

const RESEARCH_SYSTEM = `${SYSTEM_IDENTITY}

Your current role: Produce a neutral, evidence-based research view on this investment thesis. Do not advocate. Do not moralize. Assess what the evidence supports, where it is uncertain, and what is genuinely mispriced vs. what is explained by known factors. Structured JSON output only.`

type RawResearchView = Omit<ResearchView, 'thesisId' | 'generatedAt'>

export const generateResearchView = async (thesis: Thesis): Promise<ResearchView> => {
  const prompt = `Produce a neutral, evidence-based research view on this investment thesis.

THESIS:
Name: ${thesis.name}
Type: ${thesis.type}
Statement: ${thesis.statement}
Variant View: ${thesis.variantView}
Consensus View: ${thesis.consensusView}
Primary Mispriced Variable: ${thesis.primaryMispricedVariable}
Transmission Path: ${thesis.transmissionPath}
Key Assumptions: ${thesis.keyAssumptions.join('; ')}
Disconfirmers: ${thesis.disconfirmers.join('; ')}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence neutral assessment of what the evidence actually supports",
  "evidenceBase": "description of the available evidence quality and what it covers",
  "keyStrengths": ["strength 1 grounded in evidence", "strength 2", "strength 3"],
  "keyWeaknesses": ["weakness 1 grounded in evidence", "weakness 2", "weakness 3"],
  "uncertainties": ["key uncertainty 1", "key uncertainty 2"],
  "mispricedVariableAssessment": "specific assessment of whether the primary mispriced variable is genuinely mispriced and by how much"
}`

  const raw = await callInvestmentAPI<RawResearchView>(RESEARCH_SYSTEM, prompt, true, 2000)
  return { ...raw, thesisId: thesis.id, generatedAt: new Date() }
}

// ─── Memo section builders ───────────────────────────────────────────────────

const MEMO_SYSTEM = `${SYSTEM_IDENTITY}

Your current role: Compose specific sections of a professional underwriting memo. Be direct, concise, and specific. Each section should be decision-relevant. No filler. Return ONLY valid JSON.`

type SectionApiOutput = { content: string; bullets?: string[] }

const apiSection = async (
  id: string,
  title: string,
  prompt: string,
): Promise<MemoSection> => {
  const raw = await callInvestmentAPI<SectionApiOutput>(MEMO_SYSTEM, prompt, true, 1500)
  return { id, title, content: raw.content, bullets: raw.bullets, source: 'api' }
}

// ─── Full memo orchestration ─────────────────────────────────────────────────

export interface MemoProgress {
  step: string
  done: number
  total: number
}

export interface UnderwritingMemoResult {
  memo: UnderwritingMemo
  researchView: ResearchView
  scenarios: Scenario[]
  synthesis: ExpertSynthesisResult
}

export const generateUnderwritingMemo = async (
  thesis: Thesis,
  regime: MacroRegime,
  lens: ThesisLens,
  opts: {
    existingResearchView?: ResearchView
    existingSynthesis?: ExpertSynthesisResult
    existingScenarios?: Scenario[]
    onProgress?: (p: MemoProgress) => void
  } = {},
): Promise<UnderwritingMemoResult> => {
  const notify = (step: string, done: number, total: number) =>
    opts.onProgress?.({ step, done, total })

  const TOTAL = 6
  let done = 0

  // ── Step 1: Research View ─────────────────────────────────────────────
  notify('Generating Research View…', done, TOTAL)
  const researchView = opts.existingResearchView ?? await generateResearchView(thesis)
  done++

  // ── Step 2: Scenarios ─────────────────────────────────────────────────
  notify('Building Scenario Framework…', done, TOTAL)
  const scenarios = opts.existingScenarios?.length
    ? opts.existingScenarios
    : await generateScenarios(thesis)
  done++

  // ── Step 3: Expert Synthesis ──────────────────────────────────────────
  notify('Running Expert Synthesis…', done, TOTAL)
  const synthesis = opts.existingSynthesis
    ?? await generateExpertSynthesis(thesis, lens, researchView)
  done++

  // ── Step 4-6: API memo sections ───────────────────────────────────────
  notify('Composing Valuation Framework…', done, TOTAL)
  const compatibility = computeRegimeCompatibility(thesis.type, regime)

  const valuationSection = await apiSection(
    'valuation', 'Valuation Framework',
    `Write the Valuation Framework section of an underwriting memo for this thesis.

Thesis: ${thesis.name} (${thesis.type})
Statement: ${thesis.statement}
Primary mispriced variable: ${MISPRICED_VARIABLE_LABELS[thesis.primaryMispricedVariable]}
Transmission path: ${thesis.transmissionPath}
Value capture method: ${thesis.valueCaptureMethod}

Return JSON: { "content": "2-3 paragraph valuation narrative — what framework applies, what assumptions are baked into the current price, what's required to justify the thesis at current valuations", "bullets": ["key valuation point 1", "key valuation point 2", "key valuation point 3"] }`,
  )
  done++

  notify('Composing Capital Allocation Context…', done, TOTAL)
  const allocationSection = await apiSection(
    'allocation', 'Capital Allocation Context',
    `Write the Capital Allocation Context section for this thesis, taking into account the Prologis-Aware lens (user has significant concentrated Prologis exposure — primary macro drivers: real asset repricing, US interest rates, consumer health).

Thesis: ${thesis.name}
Type: ${thesis.type}
Lens: ${lens}
Macro compatibility: ${COMPATIBILITY_LABELS[compatibility]}
Beneficiaries: ${thesis.beneficiaries.join(', ')}
Losers: ${thesis.losers.join(', ')}

Return JSON: { "content": "paragraph on how this thesis fits in a portfolio context with Prologis concentration, overlap risks, diversification benefit or correlation risk", "bullets": ["key allocation consideration 1", "key allocation consideration 2"] }`,
  )
  done++

  notify('Composing Action View…', done, TOTAL)
  const confirmedScenario = scenarios.find(s => s.type === 'ThesisConfirmed')
  const brokenScenario = scenarios.find(s => s.type === 'ThesisBroken')

  const actionSection = await apiSection(
    'action', 'Action Recommendation & Kill Conditions',
    `Write the Action Recommendation and Kill Conditions section of an underwriting memo.

Thesis: ${thesis.name} (${thesis.type})
Stage: ${thesis.stage}
Expert panel posture: ${synthesis.panelSynthesis.panelPosture}
Strongest argument for: ${synthesis.panelSynthesis.strongestArgumentFor}
Strongest argument against: ${synthesis.panelSynthesis.strongestArgumentAgainst}
Primary trigger readiness: ${thesis.triggers.find(t => t.isPrimary)?.readiness ?? 'NotReady'}
ThesisConfirmed scenario: ${confirmedScenario?.name ?? 'not yet defined'} (${((confirmedScenario?.probability ?? 0) * 100).toFixed(0)}%)
ThesisBroken scenario: ${brokenScenario?.name ?? 'not yet defined'} (${((brokenScenario?.probability ?? 0) * 100).toFixed(0)}%)

Return JSON: { "content": "recommended action with rationale (1-2 sentences)", "bullets": ["action: Start/Watch/Hold/etc.", "sizing note: initial position guidance", "kill condition 1 — specific observable trigger", "kill condition 2", "monitor: key variable to track"] }`,
  )
  done++

  notify('Assembling memo…', done, TOTAL)

  // ── Assemble all sections from thesis data ────────────────────────────
  const thesisSections: MemoSection[] = [
    {
      id: 'summary', title: 'Thesis Summary', source: 'thesis',
      content: `${thesis.name} — ${THESIS_TYPE_LABELS[thesis.type] ?? thesis.type} | Stage: ${thesis.stage} | Horizon: ${formatHorizon(thesis.timeHorizon)} | Created: ${formatDate(thesis.createdAt)}`,
      bullets: [thesis.statement, thesis.whyNow].filter(Boolean),
    },
    {
      id: 'variant', title: 'Variant Perception & Market Edge', source: 'thesis',
      content: `Variant Perception Strength: ${thesis.variantPerceptionStrength.replace(/([A-Z])/g, ' $1').trim()} · Primary Mispriced Variable: ${MISPRICED_VARIABLE_LABELS[thesis.primaryMispricedVariable]}`,
      bullets: [
        thesis.consensusView ? `Consensus: ${thesis.consensusView}` : null,
        thesis.variantView ? `Variant: ${thesis.variantView}` : null,
      ].filter((x): x is string => Boolean(x)),
    },
    {
      id: 'transmission', title: 'Transmission Path Analysis', source: 'thesis',
      content: thesis.transmissionPath || 'Transmission path not yet defined.',
      bullets: thesis.valueCaptureMethod ? [`Value capture: ${thesis.valueCaptureMethod}`] : undefined,
    },
    {
      id: 'research', title: 'Research View', source: 'researchView',
      content: researchView.summary,
      bullets: [
        ...researchView.keyStrengths.map(s => `✓ ${s}`),
        ...researchView.keyWeaknesses.map(w => `⚠ ${w}`),
        ...researchView.uncertainties.map(u => `? ${u}`),
      ],
    },
    {
      id: 'macro', title: 'Macro Regime Context', source: 'macroRegime',
      content: `Current macro regime compatibility: ${COMPATIBILITY_LABELS[compatibility]}. Rates: ${regime.realRates} · Credit: ${regime.creditCycle} · Liquidity: ${regime.liquidity} · Risk: ${regime.riskAppetite} · Dollar: ${regime.dollar} · Policy: ${regime.policy}`,
      bullets: thesis.macroRegimeCompatibility ? [`Standing compatibility: ${thesis.macroRegimeCompatibility}`] : undefined,
    },
    {
      id: 'assumptions', title: 'Key Assumptions Review', source: 'thesis',
      content: 'Load-bearing assumptions ordered by importance.',
      bullets: thesis.keyAssumptions,
    },
    {
      id: 'disconfirmers', title: 'Disconfirmer Assessment', source: 'thesis',
      content: 'Observable evidence that would break this thesis.',
      bullets: thesis.disconfirmers,
    },
    {
      id: 'scenarios', title: 'Narrative Scenario Framework', source: 'scenarios',
      content: scenarios.length === 3
        ? `Three named scenarios with probabilities summing to ${scenarios.reduce((s, sc) => s + sc.probability, 0).toFixed(2)}`
        : 'Scenarios not yet generated.',
      bullets: scenarios.map(sc =>
        `${sc.name} (${sc.type}) — ${(sc.probability * 100).toFixed(0)}% · Returns: ${sc.returnRangeMin}% to ${sc.returnRangeMax}%`
      ),
    },
    {
      id: 'expertSynthesis', title: 'Expert Synthesis Summary', source: 'expertSynthesis',
      content: `Panel posture: ${synthesis.panelSynthesis.panelPosture} | Most contested: ${MISPRICED_VARIABLE_LABELS[synthesis.panelSynthesis.mostContestedVariable] ?? synthesis.panelSynthesis.mostContestedVariable}`,
      bullets: [
        synthesis.panelSynthesis.strongestArgumentFor,
        `AGAINST: ${synthesis.panelSynthesis.strongestArgumentAgainst}`,
        synthesis.panelSynthesis.whatWouldResolveDisagreement,
      ],
    },
    valuationSection,
    allocationSection,
    {
      id: 'triggers', title: 'Trigger & Catalyst Assessment', source: 'thesis',
      content: `${thesis.triggers.length} triggers defined.`,
      bullets: thesis.triggers.map(t =>
        `${t.isPrimary ? '[Primary] ' : ''}${t.type}: ${t.description} — ${t.readiness} (${t.readinessScore}/100)`
      ),
    },
    {
      id: 'decay', title: 'Conviction Decay Analysis', source: 'thesis',
      content: `Decay clock: ${thesis.decayClock.zone} zone · ${Math.round(thesis.decayClock.elapsedPct)}% elapsed of ${formatHorizon(thesis.decayClock.statedHorizonMonths)} horizon · Evidence drift: ${thesis.evidenceDriftDirection} (${thesis.evidenceDriftScore > 0 ? '+' : ''}${thesis.evidenceDriftScore})`,
      bullets: thesis.decayClock.isFrozen
        ? [`Clock frozen until ${thesis.decayClock.frozenUntil ? formatDate(thesis.decayClock.frozenUntil) : 'unknown'}: ${thesis.decayClock.frozenReason}`]
        : undefined,
    },
    actionSection,
  ]

  return {
    memo: {
      thesisId: thesis.id,
      sections: thesisSections,
      status: 'complete',
      generatedAt: new Date(),
    },
    researchView,
    scenarios,
    synthesis,
  }
}
