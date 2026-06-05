import { sleep, refreshQuote } from './finnhub'
import type { PriceClose } from './finnhub'
import type { Position } from '../types/position'
import type { Thesis } from '../types/thesis'
import type { Company } from '../types/company'
import type {
  AttributionRecord,
  AttributionReport,
  ScoreBand,
  ScoreBandResult,
  SectorResult,
} from '../types/attribution'

const AV_KEY = import.meta.env.VITE_ALPHAVANTAGE_API_KEY as string | undefined
const AV_BASE = 'https://www.alphavantage.co/query'

// Mirrors EXCHANGE_MAP from finnhub.ts — duplicated because normalizeTickerForAV is not exported
const EXCHANGE_MAP: Record<string, string> = {
  L: 'LON', DE: 'DEX', PA: 'PAR', T: 'TSE', SW: 'SWX',
  AS: 'AMS', TO: 'TRT', AX: 'ASX', HK: 'HKG', SS: 'SHH',
  SZ: 'SHZ', KS: 'KRX', BO: 'BSE', NS: 'NSE', MC: 'BME', MI: 'MIL',
}

function normalizeForAV(ticker: string): string {
  const dot = ticker.lastIndexOf('.')
  if (dot === -1) return ticker
  const base = ticker.slice(0, dot)
  const suffix = ticker.slice(dot + 1).toUpperCase()
  const av = EXCHANGE_MAP[suffix]
  return av ? `${base}.${av}` : ticker
}

async function avFetch<T>(url: string): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
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

function parseAVFull(data: Record<string, unknown>): PriceClose[] {
  const series = (data['Time Series (Daily)'] ?? {}) as Record<string, Record<string, string>>
  return Object.entries(series)
    .map(([date, bars]) => ({ date, price: parseFloat(bars['4. close']) }))
    .filter((c) => !isNaN(c.price))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Full history (no 180-day window), needed for entry price lookups on older positions
async function fetchFullCandles(ticker: string): Promise<PriceClose[]> {
  if (!AV_KEY) return []
  const sym = normalizeForAV(ticker)
  const raw = await avFetch<Record<string, unknown>>(
    `${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(sym)}&apikey=${AV_KEY}&outputsize=full`,
  )
  return raw ? parseAVFull(raw) : []
}

function toDateStr(d: Date): string {
  return new Date(d).toISOString().slice(0, 10)
}

// Walk back up to 7 calendar days (covers ~5 trading days for weekends + holidays)
function priceAtDateWalkback(closes: PriceClose[], dateStr: string): number | null {
  if (closes.length === 0) return null
  const candidates = closes.filter((c) => c.date <= dateStr)
  if (candidates.length === 0) return null
  const best = candidates[candidates.length - 1]
  const diffDays = (new Date(dateStr).getTime() - new Date(best.date).getTime()) / 86_400_000
  return diffDays <= 7 ? best.price : null
}

function scoreToBand(score: number): ScoreBand {
  if (score < 2) return '0-2'
  if (score < 4) return '2-4'
  if (score < 6) return '4-6'
  if (score < 8) return '6-8'
  return '8-10'
}

function emptyReport(): AttributionReport {
  return {
    records: [],
    totalAlpha: 0,
    winRate: 0,
    portfolioReturn: null,
    spyReturn: null,
    avgHoldingDays: 0,
    byScoreBand: [],
    bySector: [],
    generatedAt: new Date(),
  }
}

export async function buildFullAttributionReport(
  positions: Record<string, Position>,
  theses: Record<string, Thesis>,
  companies: Record<string, Company>,
): Promise<AttributionReport> {
  const positionList = Object.values(positions)

  // Resolve ticker for each position: thesis.ticker > company.ticker
  const resolved = positionList.flatMap((pos) => {
    const thesis = theses[pos.linkedThesisId]
    if (!thesis) return []
    let ticker: string | undefined
    if (thesis.ticker) {
      ticker = thesis.ticker
    } else if (pos.linkedCompanyId) {
      ticker = companies[pos.linkedCompanyId]?.ticker
    }
    if (!ticker) return []
    return [{ position: pos, thesis, ticker }]
  })

  if (resolved.length === 0) return emptyReport()

  // Fetch SPY candles once
  const spyCandles = await fetchFullCandles('SPY')
  await sleep(200)

  const today = toDateStr(new Date())
  const spyTodayPrice = priceAtDateWalkback(spyCandles, today)

  const records: AttributionRecord[] = []

  for (const { position, thesis, ticker } of resolved) {
    const entryDate = toDateStr(new Date(position.openedAt))
    const holdingDays = Math.round(
      (Date.now() - new Date(position.openedAt).getTime()) / 86_400_000,
    )

    try {
      const tickerCandles = await fetchFullCandles(ticker)
      await sleep(200)

      const currentPrice = await refreshQuote(ticker)
      await sleep(200)

      const entryPrice = priceAtDateWalkback(tickerCandles, entryDate)

      let positionReturn: number | null = null
      if (entryPrice !== null && currentPrice !== null) {
        positionReturn = (currentPrice - entryPrice) / entryPrice
      }

      const spyEntryPrice = priceAtDateWalkback(spyCandles, entryDate)
      let spyReturn: number | null = null
      if (spyEntryPrice !== null && spyTodayPrice !== null) {
        spyReturn = (spyTodayPrice - spyEntryPrice) / spyEntryPrice
      }

      const alpha =
        positionReturn !== null && spyReturn !== null ? positionReturn - spyReturn : null

      records.push({
        positionId: position.id,
        thesisId: thesis.id,
        thesisName: thesis.name,
        thesisType: thesis.type,
        ticker,
        entryDate,
        holdingDays,
        entryPrice,
        currentPrice,
        positionReturn,
        spyReturn,
        alpha,
        scoreAtEntry: thesis.thesisQualityScore ?? null,
        status: position.currentAction,
      })
    } catch (err) {
      records.push({
        positionId: position.id,
        thesisId: thesis.id,
        thesisName: thesis.name,
        thesisType: thesis.type,
        ticker,
        entryDate,
        holdingDays,
        entryPrice: null,
        currentPrice: null,
        positionReturn: null,
        spyReturn: null,
        alpha: null,
        scoreAtEntry: thesis.thesisQualityScore ?? null,
        status: position.currentAction,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  // Aggregate stats
  const withAlpha = records.filter((r) => r.alpha !== null)
  const withReturn = records.filter((r) => r.positionReturn !== null)

  const totalAlpha =
    withAlpha.length > 0
      ? withAlpha.reduce((s, r) => s + r.alpha!, 0) / withAlpha.length
      : 0

  const winRate =
    withAlpha.length > 0
      ? withAlpha.filter((r) => r.alpha! > 0).length / withAlpha.length
      : 0

  const portfolioReturn =
    withReturn.length > 0
      ? withReturn.reduce((s, r) => s + r.positionReturn!, 0) / withReturn.length
      : null

  // SPY return over full window (earliest entry to today)
  let spyReturn: number | null = null
  if (records.length > 0 && spyCandles.length > 0) {
    const earliestEntry = records.reduce(
      (min, r) => (r.entryDate < min ? r.entryDate : min),
      records[0].entryDate,
    )
    const spyEntryPrice = priceAtDateWalkback(spyCandles, earliestEntry)
    if (spyEntryPrice !== null && spyTodayPrice !== null) {
      spyReturn = (spyTodayPrice - spyEntryPrice) / spyEntryPrice
    }
  }

  const avgHoldingDays =
    records.length > 0
      ? records.reduce((s, r) => s + r.holdingDays, 0) / records.length
      : 0

  // By score band
  const bandMap = new Map<ScoreBand, { total: number; count: number }>()
  for (const r of withAlpha) {
    if (r.scoreAtEntry === null) continue
    const band = scoreToBand(r.scoreAtEntry)
    const cur = bandMap.get(band) ?? { total: 0, count: 0 }
    bandMap.set(band, { total: cur.total + r.alpha!, count: cur.count + 1 })
  }
  const byScoreBand: ScoreBandResult[] = Array.from(bandMap.entries()).map(
    ([band, { total, count }]) => ({ band, avgAlpha: total / count, count }),
  )

  // By sector (thesis type)
  const sectorMap = new Map<string, { total: number; count: number }>()
  for (const r of withAlpha) {
    const cur = sectorMap.get(r.thesisType) ?? { total: 0, count: 0 }
    sectorMap.set(r.thesisType, { total: cur.total + r.alpha!, count: cur.count + 1 })
  }
  const bySector: SectorResult[] = Array.from(sectorMap.entries()).map(
    ([sector, { total, count }]) => ({
      sector: sector as SectorResult['sector'],
      avgAlpha: total / count,
      count,
    }),
  )

  return {
    records,
    totalAlpha,
    winRate,
    portfolioReturn,
    spyReturn,
    avgHoldingDays,
    byScoreBand,
    bySector,
    generatedAt: new Date(),
  }
}
