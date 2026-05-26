// ── Volatility Overlay ────────────────────────────────────────────────────────
// Fetches VIX + VIX3M, classifies the current vol regime, and returns a
// plain-English signal. Used by the Hunt screen's vol banner.

export type VolRegime = 'Calm' | 'Elevated' | 'Spike' | 'Crash'
export type TermStructure = 'contango' | 'backwardation' | 'unknown'

export interface VolRegimeResult {
  level: number
  regime: VolRegime
  termStructure: TermStructure
  signal: string
}

// ── HTTP helper (mirrors apiFetch in finnhub.ts) ──────────────────────────────

async function apiFetch<T>(url: string, timeoutMs = 10_000): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ── Finnhub ───────────────────────────────────────────────────────────────────

const FH_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string
const FH_BASE = 'https://finnhub.io/api/v1'

interface FinnhubQuote { c: number; pc: number }

async function fetchVixFinnhub(): Promise<number | null> {
  const data = await apiFetch<FinnhubQuote>(
    `${FH_BASE}/quote?symbol=CBOE:VIX&token=${FH_KEY}`,
  )
  if (!data?.c || data.c === 0) return null
  return data.c
}

// ── Yahoo Finance fallback ────────────────────────────────────────────────────

interface YahooChart {
  chart: { result?: Array<{ meta: { regularMarketPrice: number } }> }
}

async function fetchYahoo(ticker: string): Promise<number | null> {
  const data = await apiFetch<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`,
  )
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
  return typeof price === 'number' && price > 0 ? price : null
}

// ── Regime logic ──────────────────────────────────────────────────────────────

function classifyRegime(vix: number): VolRegime {
  if (vix < 15) return 'Calm'
  if (vix < 25) return 'Elevated'
  if (vix < 35) return 'Spike'
  return 'Crash'
}

function classifyTermStructure(vix: number, vix3m: number | null): TermStructure {
  if (vix3m === null) return 'unknown'
  // VIX < VIX3M → contango (calm); VIX > VIX3M → backwardation (stress)
  return vix < vix3m ? 'contango' : 'backwardation'
}

function buildSignal(regime: VolRegime, termStructure: TermStructure): string {
  const ts =
    termStructure === 'backwardation' ? ' · term structure in backwardation (acute stress)'
    : termStructure === 'contango'   ? ' · term structure in contango (near-term calm)'
    : ''

  switch (regime) {
    case 'Calm':
      return `Market vol benign${ts} — standard entry conditions apply.`
    case 'Elevated':
      return `Vol elevated${ts} — consider scaling entries on Hunt results.`
    case 'Spike':
      return `Vol spike detected${ts} — stress may be creating asymmetric entry windows.`
    case 'Crash':
      return `Crash-level vol${ts} — disciplined scaling only; avoid catching falling knives.`
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getVolRegime(): Promise<VolRegimeResult> {
  // Fetch VIX and VIX3M concurrently
  const [vixFromFH, vix3m] = await Promise.all([
    fetchVixFinnhub(),
    fetchYahoo('^VIX3M'),
  ])

  // Finnhub first, Yahoo fallback for spot VIX
  const vix = vixFromFH ?? (await fetchYahoo('^VIX'))

  if (vix === null) {
    throw new Error('Unable to fetch VIX from Finnhub (CBOE:VIX) or Yahoo Finance (^VIX)')
  }

  const regime = classifyRegime(vix)
  const termStructure = classifyTermStructure(vix, vix3m)
  const signal = buildSignal(regime, termStructure)

  return { level: vix, regime, termStructure, signal }
}
