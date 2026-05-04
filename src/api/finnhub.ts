const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string
const BASE = 'https://finnhub.io/api/v1'

export interface FinnhubQuote {
  c: number   // current price
  h: number   // high
  l: number   // low
  o: number   // open
  pc: number  // previous close
}

export interface FinnhubCandles {
  c: number[]  // close prices
  t: number[]  // unix timestamps
  s: string    // 'ok' | 'no_data'
}

export interface PriceClose {
  date: string   // YYYY-MM-DD
  price: number
}

export interface TickerData {
  currentPrice: number
  closes: PriceClose[]
}

async function apiFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export async function getQuote(ticker: string): Promise<FinnhubQuote | null> {
  const data = await apiFetch<FinnhubQuote>(
    `${BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${API_KEY}`,
  )
  if (!data || !data.c || data.c === 0) return null
  return data
}

export async function getCandles(
  ticker: string,
  fromUnix: number,
  toUnix: number,
): Promise<FinnhubCandles | null> {
  const data = await apiFetch<FinnhubCandles>(
    `${BASE}/stock/candle?symbol=${encodeURIComponent(ticker)}&resolution=D&from=${fromUnix}&to=${toUnix}&token=${API_KEY}`,
  )
  if (!data || data.s !== 'ok') return null
  return data
}

export async function fetchTickerData(ticker: string): Promise<TickerData | null> {
  const toUnix = Math.floor(Date.now() / 1000)
  const fromUnix = toUnix - 366 * 86400  // 1 year back

  const [quote, candles] = await Promise.all([
    getQuote(ticker),
    getCandles(ticker, fromUnix, toUnix),
  ])

  if (!quote) return null

  const closes: PriceClose[] = candles
    ? candles.t.map((t, i) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        price: candles.c[i],
      }))
    : []

  return { currentPrice: quote.c, closes }
}

export async function refreshQuote(ticker: string): Promise<number | null> {
  const quote = await getQuote(ticker)
  return quote?.c ?? null
}

export function priceAtDaysAgo(closes: PriceClose[], daysAgo: number): number | null {
  if (closes.length === 0) return null
  const target = new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10)
  const snap = closes.find((c) => c.date >= target)
  return snap?.price ?? closes[0]?.price ?? null
}

export function priceAtDate(closes: PriceClose[], dateStr: string): number | null {
  if (closes.length === 0) return null
  const snap = closes.find((c) => c.date >= dateStr)
  return snap?.price ?? closes[0]?.price ?? null
}
