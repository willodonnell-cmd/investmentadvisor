import { fetchFundQuote, type FundQuote } from './marketData'
import { useOpenAIModelStore } from '../store/openaiModelStore'
import { applyOpenAIChatCompletionDynamicFields } from './openai'
import type { HuntContext } from './opportunityAgent'

export interface FundOpportunityBrief {
  rank: number
  ticker: string
  fundName: string
  fundType: 'ETF' | 'IndexFund' | 'ActiveETF'
  category: string
  expenseRatio: string
  aum: string
  thesisType: string
  regimeFit: string
  transmissionPath: string
  variantPerception: string
  topHoldings: string[]
  concentrationRisk: string
  liquidityAssessment: string
  advisorVerdict: string
  keyRisks: string[]
  killConditions: string[]
  conviction: number
  convictionLabel: string
  suggestedAction: 'advance_to_dossier' | 'watch' | 'pass'
  watchTriggers?: string[]
  currentPrice: number
  priceChange: number
  priceChangePct: number
}

export interface FundHuntResult {
  runAt: Date
  durationMs: number
  macroRegime: string
  candidatesEvaluated: number
  opportunities: FundOpportunityBrief[]
  agentNotes: string
  error?: string
}

interface FundCandidate {
  ticker: string
  fundName: string
  fundType: 'ETF' | 'IndexFund' | 'ActiveETF'
  category: string
  thesisType: string
  rationale: string
}

const FUND_ADVISOR_SYSTEM = `You are the Dossier fund underwriting engine embodying 18 legendary investors: Buffett, Munger, Lynch, Soros, Druckenmiller, Simons, Klarman, Marks, Dalio, Tepper, Robertson, Tudor Jones, Icahn, Zell, Templeton, Schloss, Greenblatt, Ackman.

Evaluate this ETF/index fund for a sophisticated individual investor in the context of the current macro regime. Be specific and adversarial. Consider expense ratios, concentration risk, liquidity, regime fit, and whether cheaper or better alternatives exist.

Return only valid JSON.`

function extractJSON(text: string): Record<string, unknown> | null {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1) return null
  try {
    return JSON.parse(text.slice(first, last + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

function getOpenAIConfig() {
  const store = useOpenAIModelStore.getState()
  const model = store.model
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  return { model, openaiKey }
}

async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  maxTokens = 3000,
): Promise<string> {
  const { model, openaiKey } = getOpenAIConfig()
  if (!openaiKey) throw new Error('VITE_OPENAI_API_KEY not set')

  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  }
  applyOpenAIChatCompletionDynamicFields(body, model, maxTokens)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify(body),
  })

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

export async function identifyFundCandidates(
  macroRegime: string,
  focusAreas: string | undefined,
  context: HuntContext,
): Promise<FundCandidate[]> {
  try {
    const text = await callOpenAI([{
      role: 'user',
      content: `Macro regime: ${macroRegime}
${focusAreas ? `User focus: ${focusAreas}` : ''}

Existing portfolio exposures (avoid overlap):
${context.portfolioExposures.join('\n')}

Active theses (avoid duplication):
${context.activeThesisSummaries.join('\n')}

Identify 5-7 specific ETF or index fund tickers that best capture this macro regime.
Consider: regime fit, expense ratio, liquidity, diversification vs concentration.
Prefer liquid, widely-held funds. Name real tickers (e.g. VTI, IWM, TLT, XLE, SMH).

Return ONLY JSON:
{
  "candidates": [
    {
      "ticker": "VTI",
      "fundName": "Vanguard Total Stock Market ETF",
      "fundType": "ETF",
      "category": "US Broad Market",
      "thesisType": "MacroRegimeShift",
      "rationale": "why this fund fits the regime"
    }
  ]
}`,
    }], 'You are the Dossier fund selection engine. Return only valid JSON with 5-7 candidates.', 2500)

    const parsed = extractJSON(text)
    const candidates = parsed?.candidates
    return Array.isArray(candidates) ? candidates as FundCandidate[] : []
  } catch {
    return []
  }
}

export async function underwriteFund(
  candidate: FundCandidate,
  quoteData: FundQuote,
  context: HuntContext,
): Promise<FundOpportunityBrief | null> {
  try {
    const quoteSummary = [
      `Price: $${quoteData.currentPrice.toFixed(2)}`,
      `Change: ${quoteData.priceChange >= 0 ? '+' : ''}${quoteData.priceChange.toFixed(2)} (${quoteData.priceChangePct.toFixed(2)}%)`,
      quoteData.high52W != null ? `52W High: $${quoteData.high52W.toFixed(2)}` : '',
      quoteData.low52W != null ? `52W Low: $${quoteData.low52W.toFixed(2)}` : '',
    ].filter(Boolean).join('\n')

    const text = await callOpenAI([{
      role: 'user',
      content: `Underwrite this fund:

Ticker: ${candidate.ticker} (${candidate.fundName})
Fund Type: ${candidate.fundType}
Category: ${candidate.category}
Thesis Type: ${candidate.thesisType}
Rationale: ${candidate.rationale}

Quote Data (Finnhub):
${quoteSummary}

Macro regime: ${context.macroRegime}
Existing exposures: ${context.portfolioExposures.join(', ')}

Return ONLY this JSON:
{
  "regimeFit": "how this fund captures the macro regime",
  "transmissionPath": "how regime tailwind flows through to returns",
  "variantPerception": "what market is missing about this fund",
  "advisorVerdict": "synthesized 18-voice panel verdict in 2-3 sentences",
  "topHoldings": ["holding1", "holding2", "holding3"],
  "concentrationRisk": "assessment of concentration",
  "liquidityAssessment": "spread and volume assessment",
  "expenseRatio": "e.g. 0.03%",
  "aum": "e.g. $350B",
  "keyRisks": ["risk 1", "risk 2"],
  "killConditions": ["kill if expense ratio gap closes", "kill if top holdings exceed 60%"],
  "conviction": 72,
  "convictionLabel": "High",
  "suggestedAction": "advance_to_dossier",
  "watchTriggers": ["trigger if watch"]
}`,
    }], FUND_ADVISOR_SYSTEM, 2500)

    const json = extractJSON(text)
    if (!json) return null

    return {
      rank: 0,
      ticker: candidate.ticker,
      fundName: candidate.fundName,
      fundType: candidate.fundType,
      category: candidate.category,
      expenseRatio: String(json.expenseRatio ?? 'Unknown'),
      aum: String(json.aum ?? 'Unknown'),
      thesisType: candidate.thesisType,
      regimeFit: String(json.regimeFit ?? ''),
      transmissionPath: String(json.transmissionPath ?? ''),
      variantPerception: String(json.variantPerception ?? ''),
      topHoldings: Array.isArray(json.topHoldings) ? json.topHoldings.map(String) : [],
      concentrationRisk: String(json.concentrationRisk ?? ''),
      liquidityAssessment: String(json.liquidityAssessment ?? ''),
      advisorVerdict: String(json.advisorVerdict ?? ''),
      keyRisks: Array.isArray(json.keyRisks) ? json.keyRisks.map(String) : [],
      killConditions: Array.isArray(json.killConditions) ? json.killConditions.map(String) : [],
      conviction: typeof json.conviction === 'number' ? json.conviction : 50,
      convictionLabel: String(json.convictionLabel ?? 'Medium'),
      suggestedAction: (json.suggestedAction as FundOpportunityBrief['suggestedAction']) ?? 'watch',
      watchTriggers: Array.isArray(json.watchTriggers) ? json.watchTriggers.map(String) : undefined,
      currentPrice: quoteData.currentPrice,
      priceChange: quoteData.priceChange,
      priceChangePct: quoteData.priceChangePct,
    }
  } catch {
    return null
  }
}

export async function runFundHunt(
  context: HuntContext,
  onProgress?: (phase: string, progress: number) => void,
): Promise<FundHuntResult> {
  const startTime = Date.now()
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  if (!openaiKey) {
    return {
      runAt: new Date(),
      durationMs: 0,
      macroRegime: context.macroRegime,
      candidatesEvaluated: 0,
      opportunities: [],
      agentNotes: '',
      error: 'VITE_OPENAI_API_KEY not set — add it to .env',
    }
  }

  onProgress?.('Identifying fund candidates…', 40)
  const candidates = await identifyFundCandidates(
    context.macroRegime,
    context.focusAreas,
    context,
  )

  if (candidates.length === 0) {
    return {
      runAt: new Date(),
      durationMs: Date.now() - startTime,
      macroRegime: context.macroRegime,
      candidatesEvaluated: 0,
      opportunities: [],
      agentNotes: 'No fund candidates identified',
      error: 'No fund candidates found — try adding focus areas',
    }
  }

  onProgress?.('Fetching market data…', 55)
  const quoteMap = new Map<string, FundQuote>()
  await Promise.all(candidates.map(async (c) => {
    const quote = await fetchFundQuote(c.ticker)
    if (quote) quoteMap.set(c.ticker, quote)
  }))

  onProgress?.('Underwriting opportunities…', 70)
  const results = await Promise.allSettled(
    candidates.slice(0, context.targetThesisCount + 2).map(async (candidate) => {
      const quote = quoteMap.get(candidate.ticker)
      if (!quote) return null
      return underwriteFund(candidate, quote, context)
    }),
  )
  const briefs = results
    .filter((r): r is PromiseFulfilledResult<FundOpportunityBrief | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((b): b is FundOpportunityBrief => b !== null)

  onProgress?.('Finalizing results…', 95)
  briefs.sort((a, b) => b.conviction - a.conviction)
  briefs.forEach((b, i) => { b.rank = i + 1 })

  const advanced = briefs.filter((b) => b.suggestedAction === 'advance_to_dossier').length

  return {
    runAt: new Date(),
    durationMs: Date.now() - startTime,
    macroRegime: context.macroRegime,
    candidatesEvaluated: candidates.length,
    opportunities: briefs.slice(0, context.targetThesisCount),
    agentNotes: `Evaluated ${candidates.length} fund candidates. ${advanced} of ${briefs.length} recommended for immediate Dossier advancement.`,
  }
}
