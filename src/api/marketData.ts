const FH_BASE = 'https://finnhub.io/api/v1'

function getKey(): string {
  const key = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined
  if (!key) throw new Error('VITE_FINNHUB_API_KEY not set')
  return key
}

async function fetchFinnhub<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${FH_BASE}${path}`)
  url.searchParams.set('token', getKey())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch { return null }
}

export interface MarketMetrics {
  ticker: string
  peRatio: number | null
  pbRatio: number | null
  psRatio: number | null
  roeTTM: number | null
  netMarginTTM: number | null
  revenueGrowthTTM: number | null
  debtEquity: number | null
  currentPrice: number | null
  priceChange1D: number | null
  priceChange52W: number | null
  high52W: number | null
  low52W: number | null
  beta: number | null
  dividendYield: number | null
}

export interface FundQuote {
  ticker: string
  currentPrice: number
  priceChange: number
  priceChangePct: number
  high52W: number | null
  low52W: number | null
}

export interface EarningsRecord {
  period: string
  actual: number | null
  estimate: number | null
  surprisePercent: number | null
}

export interface AnalystConsensus {
  ticker: string
  strongBuy: number
  buy: number
  hold: number
  sell: number
  strongSell: number
  consensusLabel: string
  consensusScore: number
  period: string
}

export interface InsiderSentiment {
  ticker: string
  buyCount: number
  sellCount: number
  netValue: number
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell'
  signalReason: string
  transactions: Array<{
    name: string
    transactionDate: string
    transactionType: string
    share: number
    value: number
    isPositive: boolean
  }>
}

export interface MarketEnrichment {
  ticker: string
  companyName: string
  metrics: MarketMetrics | null
  recentEarnings: EarningsRecord[]
  analystConsensus: AnalystConsensus | null
  insiderSentiment: InsiderSentiment | null
  peers: string[]
  valuationAssessment: string
  momentumAssessment: string
  insiderSignalSummary: string
  earningsTrendSummary: string
  keyMetricFlags: string[]
  fetchedAt: Date
  error?: string
}

async function fetchMetrics(ticker: string): Promise<MarketMetrics | null> {
  const [metricsRaw, quoteRaw] = await Promise.all([
    fetchFinnhub<any>('/stock/metric', { symbol: ticker, metric: 'all' }),
    fetchFinnhub<any>('/quote', { symbol: ticker }),
  ])
  if (!metricsRaw && !quoteRaw) return null
  const m = metricsRaw?.metric ?? {}
  const q = quoteRaw ?? {}
  return {
    ticker,
    peRatio: m['peBasicExclExtraTTM'] ?? m['peTTM'] ?? null,
    pbRatio: m['pbQuarterly'] ?? null,
    psRatio: m['psTTM'] ?? null,
    roeTTM: m['roeTTM'] ?? null,
    netMarginTTM: m['netProfitMarginTTM'] ?? null,
    revenueGrowthTTM: m['revenueGrowthTTMYoy'] ?? null,
    debtEquity: m['totalDebt/totalEquityQuarterly'] ?? null,
    currentPrice: q.c ?? null,
    priceChange1D: q.c && q.pc ? ((q.c - q.pc) / q.pc) * 100 : null,
    priceChange52W: m['52WeekPriceReturnDaily'] ?? null,
    high52W: m['52WeekHigh'] ?? null,
    low52W: m['52WeekLow'] ?? null,
    beta: m['beta'] ?? null,
    dividendYield: m['dividendYieldIndicatedAnnual'] ?? null,
  }
}

export async function fetchFundQuote(ticker: string): Promise<FundQuote | null> {
  const [quoteRaw, metricsRaw] = await Promise.all([
    fetchFinnhub<any>('/quote', { symbol: ticker }),
    fetchFinnhub<any>('/stock/metric', { symbol: ticker, metric: 'all' }),
  ])
  if (!quoteRaw?.c) return null
  const m = metricsRaw?.metric ?? {}
  const c = quoteRaw.c as number
  const pc = quoteRaw.pc ?? c
  return {
    ticker,
    currentPrice: c,
    priceChange: quoteRaw.d ?? (c - pc),
    priceChangePct: quoteRaw.dp ?? (pc ? ((c - pc) / pc) * 100 : 0),
    high52W: m['52WeekHigh'] ?? null,
    low52W: m['52WeekLow'] ?? null,
  }
}

async function fetchEarnings(ticker: string): Promise<EarningsRecord[]> {
  const raw = await fetchFinnhub<any[]>('/stock/earnings', { symbol: ticker, limit: '6' })
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 6).map((e: any) => ({
    period: e.period ?? '',
    actual: e.actual ?? null,
    estimate: e.estimate ?? null,
    surprisePercent: e.surprisePercent ?? null,
  }))
}

async function fetchAnalystConsensus(ticker: string): Promise<AnalystConsensus | null> {
  const raw = await fetchFinnhub<any[]>('/stock/recommendation', { symbol: ticker })
  if (!Array.isArray(raw) || raw.length === 0) return null
  const latest = raw[0]
  const total = (latest.buy ?? 0) + (latest.strongBuy ?? 0) + (latest.hold ?? 0) + (latest.sell ?? 0) + (latest.strongSell ?? 0)
  const score = total > 0
    ? ((latest.strongBuy ?? 0) * 1 + (latest.buy ?? 0) * 2 + (latest.hold ?? 0) * 3 + (latest.sell ?? 0) * 4 + (latest.strongSell ?? 0) * 5) / total
    : 3
  let consensusLabel = 'Hold'
  if (score <= 1.5) consensusLabel = 'Strong Buy'
  else if (score <= 2.5) consensusLabel = 'Buy'
  else if (score <= 3.5) consensusLabel = 'Hold'
  else if (score <= 4.5) consensusLabel = 'Sell'
  else consensusLabel = 'Strong Sell'
  return {
    ticker,
    strongBuy: latest.strongBuy ?? 0,
    buy: latest.buy ?? 0,
    hold: latest.hold ?? 0,
    sell: latest.sell ?? 0,
    strongSell: latest.strongSell ?? 0,
    consensusLabel,
    consensusScore: Math.round(score * 10) / 10,
    period: latest.period ?? '',
  }
}

async function fetchInsiderSentiment(ticker: string): Promise<InsiderSentiment | null> {
  const raw = await fetchFinnhub<any>('/stock/insider-transactions', { symbol: ticker })
  const txns: any[] = raw?.data ?? []
  if (txns.length === 0) return null
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  const recent = txns.filter((t: any) => new Date(t.transactionDate).getTime() > cutoff)
  const transactions = recent
    .filter((t: any) => t.transactionType === 'P' || t.transactionType === 'S')
    .map((t: any) => ({
      name: t.name ?? '',
      transactionDate: t.transactionDate ?? '',
      transactionType: t.transactionType ?? '',
      share: t.share ?? 0,
      value: (t.share ?? 0) * (t.price ?? 0),
      isPositive: t.transactionType === 'P',
    }))
  const purchases = transactions.filter(t => t.isPositive)
  const sales = transactions.filter(t => !t.isPositive)
  const netValue = purchases.reduce((s, t) => s + t.value, 0) - sales.reduce((s, t) => s + t.value, 0)
  let signal: InsiderSentiment['signal'] = 'neutral'
  let signalReason = 'No significant insider activity in last 90 days'
  if (purchases.length >= 3 && netValue > 500_000) { signal = 'strong_buy'; signalReason = `${purchases.length} insider purchases totaling $${(netValue / 1_000_000).toFixed(1)}M in last 90 days` }
  else if (purchases.length >= 1 && netValue > 0) { signal = 'buy'; signalReason = `${purchases.length} insider purchase(s) with net buying in last 90 days` }
  else if (sales.length >= 3 && netValue < -1_000_000) { signal = 'sell'; signalReason = `${sales.length} insider sales totaling $${(Math.abs(netValue) / 1_000_000).toFixed(1)}M in last 90 days` }
  else if (sales.length > purchases.length * 2) { signal = 'sell'; signalReason = 'Heavy insider selling relative to buying in last 90 days' }
  return { ticker, buyCount: purchases.length, sellCount: sales.length, netValue, signal, signalReason, transactions: transactions.slice(0, 10) }
}

async function fetchPeers(ticker: string): Promise<string[]> {
  const raw = await fetchFinnhub<string[]>('/stock/peers', { symbol: ticker })
  return Array.isArray(raw) ? raw.filter(p => p !== ticker).slice(0, 8) : []
}

function synthesizeValuation(m: MarketMetrics | null): string {
  if (!m) return 'No valuation data available'
  const parts: string[] = []
  if (m.peRatio !== null) parts.push(`P/E ${m.peRatio.toFixed(1)}x`)
  if (m.pbRatio !== null) parts.push(`P/B ${m.pbRatio.toFixed(1)}x`)
  if (m.psRatio !== null) parts.push(`P/S ${m.psRatio.toFixed(1)}x`)
  let note = ''
  if (m.peRatio !== null && m.peRatio > 0 && m.peRatio < 12) note = ' — historically low P/E, potential value'
  else if (m.peRatio !== null && m.peRatio > 40) note = ' — elevated P/E, requires strong growth'
  return parts.join(', ') + note || 'Valuation multiples unavailable'
}

function synthesizeMomentum(m: MarketMetrics | null, earnings: EarningsRecord[]): string {
  if (!m) return 'No momentum data available'
  const parts: string[] = []
  if (m.priceChange1D !== null) parts.push(`${m.priceChange1D >= 0 ? '+' : ''}${m.priceChange1D.toFixed(1)}% today`)
  if (m.priceChange52W !== null) parts.push(`${m.priceChange52W >= 0 ? '+' : ''}${m.priceChange52W.toFixed(0)}% 52-week`)
  if (m.currentPrice && m.high52W) { const pct = (m.currentPrice / m.high52W) * 100; if (pct < 75) parts.push(`${pct.toFixed(0)}% of 52-week high`) }
  const beats = earnings.filter(e => (e.surprisePercent ?? 0) > 0).length
  if (earnings.length >= 3 && beats >= 3) parts.push(`beat estimates ${beats}/${earnings.length} quarters`)
  return parts.join(' · ') || 'Limited momentum data'
}

function synthesizeEarningsTrend(earnings: EarningsRecord[]): string {
  if (earnings.length === 0) return 'No earnings history available'
  const recent = earnings.slice(0, 4)
  const beats = recent.filter(e => (e.surprisePercent ?? 0) > 0).length
  const avg = recent.reduce((s, e) => s + (e.surprisePercent ?? 0), 0) / recent.length
  let trend = `${beats}/${recent.length} beats in last ${recent.length} quarters`
  if (avg > 5) trend += `, avg +${avg.toFixed(1)}% surprise`
  else if (avg < -5) trend += `, avg ${avg.toFixed(1)}% surprise`
  return trend
}

function buildKeyFlags(m: MarketMetrics | null, insider: InsiderSentiment | null, analyst: AnalystConsensus | null, earnings: EarningsRecord[]): string[] {
  const flags: string[] = []
  if (insider?.signal === 'strong_buy') flags.push(`INSIDER BUY: ${insider.signalReason}`)
  if (insider?.signal === 'sell') flags.push(`INSIDER SELL: ${insider.signalReason}`)
  if (analyst) {
    const total = analyst.buy + analyst.hold + analyst.sell + analyst.strongBuy + analyst.strongSell
    const bullPct = total > 0 ? ((analyst.buy + analyst.strongBuy) / total) * 100 : 0
    if (bullPct > 75) flags.push(`ANALYST BULLISH: ${bullPct.toFixed(0)}% buy ratings (${total} analysts)`)
    if (bullPct < 25) flags.push(`ANALYST BEARISH: only ${bullPct.toFixed(0)}% buy ratings`)
  }
  if (m?.peRatio != null && m.peRatio > 0 && m.peRatio < 10) flags.push(`CHEAP: P/E ${m.peRatio.toFixed(1)}x`)
  if (m?.revenueGrowthTTM != null && m.revenueGrowthTTM > 20) flags.push(`HIGH GROWTH: revenue +${m.revenueGrowthTTM.toFixed(0)}% TTM`)
  if (m?.currentPrice && m?.low52W && m?.high52W) {
    const range = m.high52W - m.low52W
    const pos = range > 0 ? (m.currentPrice - m.low52W) / range : 0.5
    if (pos < 0.15) flags.push(`NEAR 52W LOW: potential dislocation`)
  }
  const streak = earnings.findIndex(e => (e.surprisePercent ?? 0) <= 0)
  if (streak >= 4) flags.push(`BEAT STREAK: ${streak} consecutive earnings beats`)
  return flags
}

export async function enrichFromMarket(ticker: string, companyName: string): Promise<MarketEnrichment> {
  try {
    const [metrics, earnings, analyst, insider, peers] = await Promise.all([
      fetchMetrics(ticker),
      fetchEarnings(ticker),
      fetchAnalystConsensus(ticker),
      fetchInsiderSentiment(ticker),
      fetchPeers(ticker),
    ])
    return {
      ticker, companyName, metrics, recentEarnings: earnings,
      analystConsensus: analyst, insiderSentiment: insider, peers,
      valuationAssessment: synthesizeValuation(metrics),
      momentumAssessment: synthesizeMomentum(metrics, earnings),
      insiderSignalSummary: insider?.signalReason ?? 'No recent insider activity data',
      earningsTrendSummary: synthesizeEarningsTrend(earnings),
      keyMetricFlags: buildKeyFlags(metrics, insider, analyst, earnings),
      fetchedAt: new Date(),
    }
  } catch (e: any) {
    return {
      ticker, companyName, metrics: null, recentEarnings: [],
      analystConsensus: null, insiderSentiment: null, peers: [],
      valuationAssessment: '', momentumAssessment: '',
      insiderSignalSummary: '', earningsTrendSummary: '', keyMetricFlags: [],
      fetchedAt: new Date(), error: e.message ?? 'Unknown error',
    }
  }
}
