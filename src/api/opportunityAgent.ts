import { enrichFromMarket } from './marketData'
import { useOpenAIModelStore } from '../store/openaiModelStore'
import { applyOpenAIChatCompletionDynamicFields } from './openai'

export interface HuntContext {
  macroRegime: string
  activeThesisSummaries: string[]
  killRecordSummaries: string[]
  portfolioExposures: string[]
  targetThesisCount: number
  focusAreas?: string
}

export interface OpportunityBrief {
  rank: number
  ticker: string
  companyName: string
  thesisType: string
  mispricedVariable: string
  thesisStatement: string
  transmissionPath: string
  variantPerception: string
  vaultSignals: string[]
  pitchbookContext: string
  morningstarView: string
  marketMetrics: string
  insiderSignal: string
  analystConsensus: string
  advisorVerdict: string
  keyRisks: string[]
  killConditions: string[]
  conviction: number
  convictionLabel: string
  suggestedAction: 'advance_to_dossier' | 'watch' | 'pass'
  watchTriggers?: string[]
}

export interface HuntResult {
  runAt: Date
  durationMs: number
  macroRegime: string
  vaultSignalsFound: number
  candidatesEvaluated: number
  opportunities: OpportunityBrief[]
  agentNotes: string
  error?: string
}

interface VaultSignal {
  theme: string
  evidence: string[]
  sources: string[]
  suggestedThesisType: string
  confidence: 'high' | 'medium' | 'low'
}

interface CandidateTicker {
  ticker: string
  companyName: string
  thesisType: string
  mispricedVariable: string
  rationale: string
  vaultEvidence: string[]
}

const VAULT_THEMES = [
  'industrial real estate logistics demand supply chain inflection',
  'AI data center infrastructure freight trucking capacity',
  'interest rates credit cycle capital allocation opportunity',
  'energy power grid infrastructure deficit demand',
  'defense industrial build-out manufacturing reshoring',
  'earnings surprise analyst revision mispricing undervalued',
  'private equity deal flow acquisition target sector consolidation',
]

function extractJSON(text: string): any {
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first === -1 || last === -1) return null
  try { return JSON.parse(text.slice(first, last + 1)) } catch { return null }
}

function getOpenAIConfig() {
  const store = useOpenAIModelStore.getState()
  const model = store.model
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  return { model, openaiKey }
}

async function callOpenAI(messages: Array<{ role: string; content: string }>, systemPrompt: string, maxTokens: number = 3000): Promise<string> {
  const { model, openaiKey } = getOpenAIConfig()
  if (!openaiKey) throw new Error('VITE_OPENAI_API_KEY not set')

  const body: Record<string, any> = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  }

  applyOpenAIChatCompletionDynamicFields(body, model, maxTokens)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
    body: JSON.stringify(body),
  })

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

async function mineVaultSignals(macroRegime: string): Promise<VaultSignal[]> {
  try {
    const text = await callOpenAI([{
      role: 'user',
      content: `You are a systematic investment research agent analyzing macro investment signals.

Macro regime: ${macroRegime}

Based on these investment themes, generate specific actionable investment signals a sophisticated investor would find in research notes and financial literature:
${VAULT_THEMES.map((t, i) => `${i + 1}. "${t}"`).join('\n')}

Return ONLY this JSON:
{
  "signals": [
    {
      "theme": "brief theme name",
      "evidence": ["specific data point or signal"],
      "sources": ["research source type"],
      "suggestedThesisType": "one of: QualityCompounder, GrowthAtReasonablePrice, DeepContrarianMispricing, CapitalCycle, MoatExpansion, TurnaroundStory, SpecialSituationsCatalyst, MacroRegimeSensitive, OperationalLeverage, AssetBackedValue",
      "confidence": "high|medium|low"
    }
  ]
}`,
    }], 'You are a systematic investment research agent. Return only valid JSON.', 3000)
    return extractJSON(text)?.signals ?? []
  } catch { return [] }
}

async function sweepPitchBook(vaultSignals: VaultSignal[], macroRegime: string): Promise<string> {
  try {
    const signalSummary = vaultSignals.map(s => `${s.theme}: ${s.evidence.slice(0, 2).join('; ')}`).join('\n')
    return await callOpenAI([{
      role: 'user',
      content: `Macro regime: ${macroRegime}

Vault signals:
${signalSummary}

You are an institutional investment research agent. Based on these signals and the current macro regime, write a 300-word research brief identifying:
- Specific public equities that appear undervalued (name real tickers and approximate valuations)
- Private market sector trends confirming or contradicting these themes
- Any consensus views to fade

Be specific — name tickers, valuations, data points. No generic observations. Flag anything that looks like consensus.`,
    }], 'You are an institutional investment research agent. Be specific — name tickers, valuations, data points. No generic observations.', 2000)
  } catch { return 'Research sweep unavailable' }
}

async function selectCandidates(vaultSignals: VaultSignal[], researchBrief: string, context: HuntContext): Promise<CandidateTicker[]> {
  try {
    const text = await callOpenAI([{
      role: 'user',
      content: `Vault signals:\n${JSON.stringify(vaultSignals, null, 2)}\n\nResearch brief:\n${researchBrief}\n\nPrioritize names where multiple signals converge. Be decisive. Name real tickers.`,
    }], `You are the Opportunity Selection Engine for Dossier. Select 4-6 specific ticker candidates.

Avoid heavy overlap with these existing exposures:
${context.portfolioExposures.join('\n')}

Do not duplicate these active theses:
${context.activeThesisSummaries.join('\n')}

Do not resurrect these killed theses without new evidence:
${context.killRecordSummaries.slice(0, 5).join('\n')}

Macro regime: ${context.macroRegime}
${context.focusAreas ? `User focus: ${context.focusAreas}` : ''}

Return ONLY JSON: { "candidates": [{ "ticker": "...", "companyName": "...", "thesisType": "...", "mispricedVariable": "...", "rationale": "...", "vaultEvidence": ["..."] }] }`, 4000)
    return JSON.parse(text)?.candidates ?? extractJSON(text)?.candidates ?? []
  } catch { return [] }
}

async function underwriteOpportunity(
  candidate: CandidateTicker,
  marketData: Awaited<ReturnType<typeof enrichFromMarket>>,
  researchBrief: string,
  context: HuntContext,
): Promise<OpportunityBrief | null> {
  try {
    const marketSummary = [
      marketData.valuationAssessment,
      marketData.momentumAssessment,
      marketData.earningsTrendSummary,
      ...marketData.keyMetricFlags,
    ].filter(Boolean).join('\n')

    const text = await callOpenAI([{
      role: 'user',
      content: `Underwrite this opportunity:

Ticker: ${candidate.ticker} (${candidate.companyName})
Thesis Type: ${candidate.thesisType}
Mispriced Variable: ${candidate.mispricedVariable}
Rationale: ${candidate.rationale}
Vault Evidence: ${candidate.vaultEvidence.join('; ')}

Market Data (Finnhub):
${marketSummary}

Research Brief:
${researchBrief.slice(0, 800)}

Macro regime: ${context.macroRegime}
Existing exposures: ${context.portfolioExposures.join(', ')}

Run the 18-voice advisor panel — Buffett, Munger, Lynch, Soros, Druckenmiller, Simons, Klarman, Marks, Dalio, Tepper, Robertson, Tudor Jones, Icahn, Zell, Templeton, Schloss, Greenblatt, Ackman — and synthesize their verdict in 2-3 sentences.

Return ONLY this JSON:
{
  "thesisStatement": "2-3 sentences, specific and falsifiable",
  "transmissionPath": "how the mispricing corrects and generates returns",
  "variantPerception": "what you believe that consensus does not",
  "advisorVerdict": "synthesized 18-voice panel verdict",
  "keyRisks": ["risk 1", "risk 2", "risk 3"],
  "killConditions": ["kill if X", "kill if Y"],
  "conviction": 72,
  "convictionLabel": "High",
  "suggestedAction": "advance_to_dossier",
  "watchTriggers": ["trigger if watch"]
}`,
    }], 'You are the Dossier underwriting engine embodying 18 legendary investors. Be specific and adversarial. Return only valid JSON.', 2500)

    const json = extractJSON(text)
    if (!json) return null

    const analyst = marketData.analystConsensus
    const analystStr = analyst
      ? `${analyst.consensusLabel} (${analyst.strongBuy + analyst.buy} buy / ${analyst.hold} hold / ${analyst.sell + analyst.strongSell} sell)`
      : 'No analyst data'

    const mView = researchBrief.split(/[.!?]+/).filter(s =>
      s.toLowerCase().includes(candidate.ticker.toLowerCase()) ||
      s.toLowerCase().includes('morningstar') ||
      s.toLowerCase().includes('fair value')
    ).slice(0, 2).join('. ').trim() || 'See full research brief'

    return {
      rank: 0,
      ticker: candidate.ticker,
      companyName: candidate.companyName,
      thesisType: candidate.thesisType,
      mispricedVariable: candidate.mispricedVariable,
      thesisStatement: json.thesisStatement ?? '',
      transmissionPath: json.transmissionPath ?? '',
      variantPerception: json.variantPerception ?? '',
      vaultSignals: candidate.vaultEvidence,
      pitchbookContext: researchBrief.slice(0, 400),
      morningstarView: mView,
      marketMetrics: marketSummary,
      insiderSignal: marketData.insiderSignalSummary,
      analystConsensus: analystStr,
      advisorVerdict: json.advisorVerdict ?? '',
      keyRisks: json.keyRisks ?? [],
      killConditions: json.killConditions ?? [],
      conviction: json.conviction ?? 50,
      convictionLabel: json.convictionLabel ?? 'Medium',
      suggestedAction: json.suggestedAction ?? 'watch',
      watchTriggers: json.watchTriggers,
    }
  } catch { return null }
}

export async function runHunt(
  context: HuntContext,
  onProgress?: (phase: string, progress: number) => void,
): Promise<HuntResult> {
  const startTime = Date.now()
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined

  if (!openaiKey) return { runAt: new Date(), durationMs: 0, macroRegime: context.macroRegime, vaultSignalsFound: 0, candidatesEvaluated: 0, opportunities: [], agentNotes: '', error: 'VITE_OPENAI_API_KEY not set — add it to .env' }

  onProgress?.('Generating investment signals…', 10)
  const vaultSignals = await mineVaultSignals(context.macroRegime)

  onProgress?.('Building research brief…', 25)
  const researchBrief = await sweepPitchBook(vaultSignals, context.macroRegime)

  onProgress?.('Identifying candidates…', 40)
  const candidates = await selectCandidates(vaultSignals, researchBrief, context)

  if (candidates.length === 0) {
    return { runAt: new Date(), durationMs: Date.now() - startTime, macroRegime: context.macroRegime, vaultSignalsFound: vaultSignals.length, candidatesEvaluated: 0, opportunities: [], agentNotes: 'No candidates identified', error: 'No candidates found — try adding focus areas' }
  }

  onProgress?.('Fetching market data…', 55)
  const marketDataMap = new Map<string, Awaited<ReturnType<typeof enrichFromMarket>>>()
  await Promise.all(candidates.map(async c => {
    marketDataMap.set(c.ticker, await enrichFromMarket(c.ticker, c.companyName))
  }))

  onProgress?.('Underwriting opportunities…', 70)
  const results = await Promise.allSettled(
    candidates.slice(0, context.targetThesisCount + 1).map(async (candidate) => {
      const md = marketDataMap.get(candidate.ticker)
      if (!md) return null
      return underwriteOpportunity(candidate, md, researchBrief, context)
    }),
  )
  const briefs = results
    .filter((r): r is PromiseFulfilledResult<OpportunityBrief | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((b): b is OpportunityBrief => b !== null)

  onProgress?.('Finalizing results…', 95)
  briefs.sort((a, b) => b.conviction - a.conviction)
  briefs.forEach((b, i) => { b.rank = i + 1 })

  const highConf = vaultSignals.filter(s => s.confidence === 'high').length
  const advanced = briefs.filter(b => b.suggestedAction === 'advance_to_dossier').length

  return {
    runAt: new Date(),
    durationMs: Date.now() - startTime,
    macroRegime: context.macroRegime,
    vaultSignalsFound: vaultSignals.length,
    candidatesEvaluated: candidates.length,
    opportunities: briefs.slice(0, context.targetThesisCount),
    agentNotes: `Found ${vaultSignals.length} vault signals (${highConf} high confidence). Evaluated ${candidates.length} candidates. ${advanced} of ${briefs.length} recommended for immediate Dossier advancement.`,
  }
}
