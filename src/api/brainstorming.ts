import { v4 as uuid } from 'uuid'
import { applyOpenAIChatCompletionDynamicFields, callInvestmentAPI, getResolvedOpenAIModel, SYSTEM_IDENTITY } from './openai'

const CHAT_API_URL = 'https://api.openai.com/v1/chat/completions'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function buildBrainstormSystemPrompt(existingThesisNames: string[]): string {
  const avoidLine = existingThesisNames.length > 0
    ? `\n\nTheses already in the system (avoid duplicating):\n${existingThesisNames.map(n => `- ${n}`).join('\n')}`
    : ''

  return `You are an elite investment research partner with the combined knowledge of the world's greatest investors — Buffett, Munger, Lynch, Soros, Druckenmiller, Klarman, Marks, Dalio, Greenblatt, and Tepper.

Your job is to help the user develop, stress-test, and deepen investment ideas through rigorous Socratic dialogue. You are not a generalist assistant — you are a specialist in identifying mispriced securities, macro regime inflections, capital cycle dynamics, and variant perception.

RESEARCH STANDARDS:
- Always name specific companies, tickers, valuation multiples, and data points when relevant
- Identify what the market consensus believes and where you think it is wrong
- Surface non-obvious second and third-order effects
- Challenge the user's assumptions directly and adversarially
- When asked about a sector or theme, go deep: name the best-positioned companies, the most vulnerable, the key variables to watch, and what would change your view
- Reference historical analogues when they sharpen the analysis
- Be willing to say when an idea is weak and explain precisely why

CONVERSATION STYLE:
- Direct, specific, and dense with insight
- No disclaimers, no "it depends", no generic observations
- If the user's idea is underspecified, ask one sharp clarifying question then proceed
- Responses should be substantive — 150 to 400 words unless a shorter answer is genuinely complete
- Use bullet points only when listing parallel items; prefer prose for analysis

WHAT YOU ARE NOT:
- Not a compliance officer
- Not a financial advisor giving personal recommendations
- Not a generalist chatbot
- Not here to generate "spark prompts" — you are here to do real research${avoidLine}`
}

export async function sendBrainstormMessage(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
): Promise<string> {
  const model = getResolvedOpenAIModel()
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'system' as const, content: systemPrompt }, ...messages],
  }
  applyOpenAIChatCompletionDynamicFields(body, model, 2000)
  const res = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`API ${res.status}: ${JSON.stringify(err)}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}
import { Thesis, ThesisType, LifecycleStage, MispricedVariable, VariantPerceptionStrength, Trigger } from '../types'
import type { ThesisRecommendation } from '../types/paperTrack'

export interface CanvasSection {
  id: string
  title: string
  content: string
  bullets?: string[]
}

export interface ThesisCanvas {
  sections: CanvasSection[]
  bestThesisName: string
  recommendedType: ThesisType
  recommendedStage: LifecycleStage
  timeHorizonMonths: number
  qualityAssessment: 'Strong' | 'Moderate' | 'Weak'
  qualityNarrative: string
}

type ThesisCore = {
  name: string
  type: ThesisType
  stage: LifecycleStage
  statement: string
  whyNow: string
  timeHorizon: number
  transmissionPath: string
  valueCaptureMethod: string
  consensusView: string
  variantView: string
  variantPerceptionStrength: VariantPerceptionStrength
  primaryMispricedVariable: MispricedVariable
  secondaryMispricedVariables: MispricedVariable[]
  keyAssumptions: string[]
  disconfirmers: string[]
  beneficiaries: string[]
  losers: string[]
  recommendations: ThesisRecommendation[]
  triggers: Trigger[]
}

const BRAINSTORM_SYSTEM = `${SYSTEM_IDENTITY}

Your current role: Take a raw observation, theme, company, or market question and surface the structured investment thesis underneath it. Generate a Thesis Discovery Canvas that gives a rigorous, specific, actionable framework for evaluating this opportunity.`

const NORMALIZE_SYSTEM = `${SYSTEM_IDENTITY}

Your current role: Convert a Thesis Discovery Canvas into a clean, structured Thesis object. Extract and normalize all fields precisely. Return ONLY valid JSON — no preamble, no explanation, no markdown code blocks.`

export const generateCanvas = async (spark: string, existingThesisNames: string[] = []): Promise<ThesisCanvas> => {
  const avoidBlock = existingThesisNames.length > 0
    ? `\n\nEXISTING THESES — do not duplicate, re-use, or closely overlap with any of these:\n${existingThesisNames.map(n => `- ${n}`).join('\n')}\n`
    : ''

  const prompt = `Generate a 13-section Thesis Discovery Canvas for the following spark:${avoidBlock}

SPARK: ${spark}

Return ONLY a JSON object with this exact structure. No preamble, no explanation, no markdown. CRITICAL: Use straight ASCII quotes only. Replace all em dashes with hyphens. Replace all smart quotes with straight quotes. Do not use any special unicode characters inside JSON string values.

{
  "sections": [
    {"id": "rawSignal", "title": "Raw Signal / Dislocation", "content": "the specific market observation or dislocation", "bullets": ["supporting point 1", "supporting point 2"]},
    {"id": "thesisType", "title": "Thesis Type Classification", "content": "which of the 15 thesis types applies and why", "bullets": ["primary type rationale", "any secondary type overlap"]},
    {"id": "coreStatement", "title": "Core Thesis Statement", "content": "one precise sentence stating exactly what is mispriced and how it resolves"},
    {"id": "whyNow", "title": "Why Now", "content": "specific timing argument — what has changed or is changing", "bullets": ["catalyst 1", "catalyst 2", "catalyst 3"]},
    {"id": "transmissionPath", "title": "Transmission Path", "content": "the causal chain from catalyst to profit", "bullets": ["step 1", "step 2", "step 3", "step 4"]},
    {"id": "valueCaptureMethod", "title": "Value Capture Method", "content": "which vehicle or instrument best captures this opportunity and why"},
    {"id": "consensusView", "title": "Consensus View", "content": "what the market and sell-side currently believe about this situation"},
    {"id": "variantView", "title": "Variant View", "content": "your specific variant vs. the consensus — the edge", "bullets": ["key departure from consensus 1", "key departure 2"]},
    {"id": "mispricedVariable", "title": "Primary Mispriced Variable", "content": "the single variable the market is most systematically pricing wrong, and how it is mispriced"},
    {"id": "keyAssumptions", "title": "Key Assumptions", "content": "load-bearing assumptions ordered by importance", "bullets": ["assumption 1", "assumption 2", "assumption 3", "assumption 4"]},
    {"id": "disconfirmers", "title": "Disconfirmers", "content": "specific observable evidence that would break this thesis", "bullets": ["disconfirmer 1", "disconfirmer 2", "disconfirmer 3"]},
    {"id": "beneficiariesLosers", "title": "Beneficiaries & Losers", "content": "companies and sectors that win and lose from this thesis playing out", "bullets": ["Winner: company/sector — why", "Loser: company/sector — why"]},
    {"id": "triggersAssessment", "title": "Triggers & Initial Assessment", "content": "specific catalyst events that activate the thesis, plus overall quality assessment", "bullets": ["trigger 1 — readiness", "trigger 2 — readiness", "quality: Strong/Moderate/Weak — why"]}
  ],
  "bestThesisName": "short evocative 3-6 word name",
  "recommendedType": "one of: LongDurationCompounder | MacroRegimeShift | DeepContrarianMispricing | SpecialSituationsCatalyst | CapitalAllocationQuality | MarketStructureReflexivity | TechnologyDisruption | RegulatoryPolicy | IndustryStructureConsumerBehavior | CapitalCycle | OperationalTurnaround | RealEstatePhysicalAssets | Geopolitical | ShortHedgeThesis | HouseholdAllocationDecision",
  "recommendedStage": "one of: Developing | Actionable",
  "timeHorizonMonths": 18,
  "qualityAssessment": "Strong | Moderate | Weak",
  "qualityNarrative": "one sentence on thesis quality and primary risk"
}

Be specific. Be sharp. No vague statements. The transmission path must be a step-by-step causal chain. The variant view must state something the consensus is specifically wrong about.`

  return callInvestmentAPI<ThesisCanvas>(BRAINSTORM_SYSTEM, prompt, true, 12000)
}

export const normalizeCanvasToThesis = async (
  canvas: ThesisCanvas,
  spark: string,
): Promise<Thesis> => {
  const prompt = `Convert this Thesis Discovery Canvas into a structured Thesis object.

ORIGINAL SPARK: ${spark}

CANVAS:
${JSON.stringify(canvas, null, 2)}

Return ONLY valid JSON — no preamble, no explanation, no markdown. CRITICAL: Use straight ASCII quotes only. Replace all em dashes with hyphens. No special unicode characters in string values. Match this exact structure:

{
  "name": "evocative 3-6 word thesis name",
  "type": "ThesisType enum value",
  "stage": "LifecycleStage enum value",
  "statement": "one precise thesis sentence",
  "whyNow": "specific timing argument",
  "timeHorizon": 18,
  "transmissionPath": "step-by-step causal chain as prose",
  "valueCaptureMethod": "instrument or vehicle",
  "consensusView": "what the market believes",
  "variantView": "your specific departure from consensus",
  "variantPerceptionStrength": "ClearConsensusStrongVariant | MixedConsensusModerateVariant | UnclearConsensusWeakVariant | BroadlyAgreesWithConsensus",
  "primaryMispricedVariable": "one of: GrowthRate | GrowthDurability | MarginStructure | TimingOfInflection | CapitalIntensity | CloseOrOutcomeProbability | CompetitiveWinner | ValueAccrualLocation | RegulatoryPolicyImpact | BalanceSheetResilience | CapitalAllocationQuality | MarketStructureForcedFlow | CrowdingExpectations | TerminalValueDuration | ManagementExecution",
  "secondaryMispricedVariables": ["MispricedVariable enum value"],
  "keyAssumptions": ["assumption 1 (max 20 words)", "assumption 2", "assumption 3", "assumption 4"],
  "disconfirmers": ["disconfirmer 1 (max 20 words)", "disconfirmer 2", "disconfirmer 3", "disconfirmer 4"],
  "beneficiaries": ["company or sector (max 20 words)", "beneficiary 2", "beneficiary 3", "beneficiary 4"],
  "losers": ["loser 1 (max 20 words)", "loser 2", "loser 3", "loser 4"],
  "recommendations": [
    {
      "ticker": "TICKER",
      "companyName": "Full Company Name",
      "direction": "Long | Short",
      "description": "one sentence why (max 20 words)",
      "convictionRank": 1,
      "usListed": true
    }
  ],
  "triggers": [
    {
      "type": "Valuation | FundamentalEvidence | CatalystEvent | MarketStructure | Management | PolicyRegulatory | IndustryStructure",
      "description": "specific trigger description (max 20 words)",
      "readiness": "NotReady | Building | Accelerating | Active | Diminishing",
      "readinessScore": 30,
      "isPrimary": true
    }
  ]
}

CONCISENESS RULES: keyAssumptions max 4 items. disconfirmers max 4 items. beneficiaries max 4 items. losers max 4 items. recommendations max 6 items (mix longs from beneficiaries and shorts from losers, ranked by conviction). triggers max 3 items. Each array item max 20 words. statement, whyNow, transmissionPath, consensusView, variantView each max 60 words.

TICKER RULES — CRITICAL: Never use dot-suffix foreign exchange codes (no .DE, .CO, .L, .HK, .PA, .AS, etc.). Use tickers accessible to a US investor in this priority order:
1. NYSE/NASDAQ listed (e.g. BABA, HSBC, NVO) — set usListed: true
2. US-listed ADR (e.g. DSDVY for DSV, HLAGF for Hapag-Lloyd) — set usListed: false
3. OTC Pink Sheet (4-5 letter ticker, no dot) — set usListed: false
4. US ETF proxy if no individual ticker accessible (e.g. IYT for US trucking, KRBN for carbon) — set usListed: true
Never output a ticker that contains a period/dot. Every ticker must be tradeable from a US brokerage account.`

  const core = await callInvestmentAPI<ThesisCore>(NORMALIZE_SYSTEM, prompt, true, 4000)

  const now = new Date()
  return {
    ...core,
    id: uuid(),
    evidenceDriftScore: 0,
    evidenceDriftDirection: 'Neutral',
    scenarioIds: [],
    linkedCompanyIds: [],
    linkedSignalIds: [],
    lens: 'PrologisAware',
    changeHistory: [{
      changedAt: now,
      field: 'created',
      previousValue: null,
      newValue: 'from-canvas',
      reason: `Canvas generated from spark: "${spark.slice(0, 80)}"`,
    }],
    decayClock: {
      statedHorizonMonths: core.timeHorizon,
      elapsedMonths: 0,
      elapsedPct: 0,
      zone: 'Green',
      isFrozen: false,
    },
    createdAt: now,
    updatedAt: now,
  }
}
