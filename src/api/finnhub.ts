// ── Finnhub (quotes) ────────────────────────────────────────────────────────
const FH_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string
const FH_BASE = 'https://finnhub.io/api/v1'

// ── Alpha Vantage (history + international quotes) ───────────────────────────
const AV_KEY = import.meta.env.VITE_ALPHAVANTAGE_API_KEY as string | undefined
const AV_BASE = 'https://www.alphavantage.co/query'

export interface PriceClose {
  date: string   // YYYY-MM-DD
  price: number
}

export interface TickerData {
  currentPrice: number
  closes: PriceClose[]
}

// ── Yahoo-format exchange suffix → Alpha Vantage exchange suffix ─────────────
const EXCHANGE_MAP: Record<string, string> = {
  L:   'LON',  // London
  DE:  'DEX',  // Deutsche Börse XETRA
  PA:  'PAR',  // Euronext Paris
  T:   'TSE',  // Tokyo
  SW:  'SWX',  // SIX Swiss
  AS:  'AMS',  // Euronext Amsterdam
  TO:  'TRT',  // Toronto
  AX:  'ASX',  // Australia
  HK:  'HKG',  // Hong Kong
  SS:  'SHH',  // Shanghai
  SZ:  'SHZ',  // Shenzhen
  KS:  'KRX',  // Korea
  BO:  'BSE',  // Bombay
  NS:  'NSE',  // NSE India
  MC:  'BME',  // Madrid
  MI:  'MIL',  // Milan
}

function normalizeTickerForAV(ticker: string): string {
  const dot = ticker.lastIndexOf('.')
  if (dot === -1) return ticker
  const base = ticker.slice(0, dot)
  const suffix = ticker.slice(dot + 1).toUpperCase()
  const av = EXCHANGE_MAP[suffix]
  return av ? `${base}.${av}` : ticker
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function apiFetch<T>(url: string, timeoutMs = 15000): Promise<T | null> {
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

// ── Quotes ───────────────────────────────────────────────────────────────────

interface FinnhubQuote { c: number; pc: number }

async function getQuoteFinnhub(ticker: string): Promise<number | null> {
  const data = await apiFetch<FinnhubQuote>(
    `${FH_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${FH_KEY}`,
  )
  if (!data?.c || data.c === 0) return null
  return data.c
}

async function getQuoteAV(ticker: string): Promise<number | null> {
  if (!AV_KEY) return null
  const sym = normalizeTickerForAV(ticker)
  const data = await apiFetch<Record<string, Record<string, string>>>(
    `${AV_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${AV_KEY}`,
  )
  const price = parseFloat(data?.['Global Quote']?.['05. price'] ?? '')
  return isNaN(price) || price <= 0 ? null : price
}

export async function refreshQuote(ticker: string): Promise<number | null> {
  // Finnhub works for US stocks; for international (dot in ticker) go straight to AV
  if (!ticker.includes('.')) {
    const fh = await getQuoteFinnhub(ticker)
    if (fh) return fh
  }
  return getQuoteAV(ticker)
}

// ── Historical candles ────────────────────────────────────────────────────────

function parseAVDaily(data: Record<string, unknown>): PriceClose[] {
  const series = (data['Time Series (Daily)'] ?? {}) as Record<string, Record<string, string>>
  const cutoff = new Date(Date.now() - 180 * 86_400_000).toISOString().slice(0, 10)
  return Object.entries(series)
    .filter(([date]) => date >= cutoff)
    .map(([date, bars]) => ({ date, price: parseFloat(bars['4. close']) }))
    .filter((c) => !isNaN(c.price))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function fetchCandles(ticker: string): Promise<PriceClose[]> {
  if (!AV_KEY) {
    console.warn('[AV] No API key — set VITE_ALPHAVANTAGE_API_KEY in .env')
    return []
  }
  const sym = normalizeTickerForAV(ticker)

  // full outputsize covers ~20yr; we filter to 180 days in parseAVDaily
  const dailyRaw = await apiFetch<Record<string, unknown>>(
    `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(sym)}&apikey=${AV_KEY}&outputsize=full`,
  )
  const daily = dailyRaw ? parseAVDaily(dailyRaw) : []
  console.log(`[AV] ${ticker}: ${daily.length} daily closes (6m window)`)
  return daily
}

export async function fetchTickerData(ticker: string): Promise<TickerData | null> {
  const price = await refreshQuote(ticker)
  if (!price) {
    console.warn(`[fetchTickerData] No quote for ${ticker}`)
    return null
  }
  const closes = await fetchCandles(ticker)
  return { currentPrice: price, closes }
}

// ── Price lookup helpers ──────────────────────────────────────────────────────

export function priceAtDaysAgo(closes: PriceClose[], daysAgo: number): number | null {
  if (closes.length === 0) return null
  const target = new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10)
  return closes.find((c) => c.date >= target)?.price ?? null
}

export function priceAtDate(closes: PriceClose[], dateStr: string): number | null {
  if (closes.length === 0) return null
  return closes.find((c) => c.date >= dateStr)?.price ?? closes[0]?.price ?? null
}
