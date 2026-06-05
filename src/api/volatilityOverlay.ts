// ── Volatility Overlay ────────────────────────────────────────────────────────
// Fetches VIX + VIX3M from CBOE's official CDN (via Vite proxy to avoid CORS).
// Classifies the current vol regime and returns a plain-English signal.

export type VolRegime = 'Calm' | 'Elevated' | 'Spike' | 'Crash'
export type TermStructure = 'contango' | 'backwardation' | 'unknown'

export interface VolRegimeResult {
  level: number
  regime: VolRegime
  termStructure: TermStructure
  signal: string
}

// ── CBOE CSV fetch ────────────────────────────────────────────────────────────
// CBOE publishes daily VIX/VIX3M history at cdn.cboe.com.
// CSV format: DATE,OPEN,HIGH,LOW,CLOSE — last row is the most recent close.
// Routed through /api/cboe Vite proxy to bypass browser CORS restrictions.

async function fetchCboe(symbol: 'VIX' | 'VIX3M', timeoutMs = 10_000): Promise<number | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const url = `/api/cboe/api/global/us_indices/daily_prices/${symbol}_History.csv`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n').filter(Boolean)
    const last = lines[lines.length - 1]
    const close = parseFloat(last.split(',')[4])
    return isNaN(close) || close <= 0 ? null : close
  } catch {
    clearTimeout(timer)
    return null
  }
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
  const [vix, vix3m] = await Promise.all([
    fetchCboe('VIX'),
    fetchCboe('VIX3M'),
  ])

  if (vix === null) {
    throw new Error('Unable to fetch VIX from CBOE. Check your network connection.')
  }

  const regime = classifyRegime(vix)
  const termStructure = classifyTermStructure(vix, vix3m)
  const signal = buildSignal(regime, termStructure)

  return { level: vix, regime, termStructure, signal }
}
