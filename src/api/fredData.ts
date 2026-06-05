// ── FRED public CSV API ──────────────────────────────────────────────────────
const FRED_BASE = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id='

export interface FredObservation {
  date: string    // YYYY-MM-DD
  value: number
}

export interface FredMacroSnapshot {
  yieldCurveSpread: number | null   // T10Y2Y, positive = normal, negative = inverted
  hySpread: number | null           // BAMLH0A0HYM2, bps. Normal ~300, stress >500
  ismPmi: number | null             // NAPM, above 50 = expansion
  initialClaims: number | null      // IC4WSA, thousands. Rising = deteriorating
  retailSales: number | null        // RSAFS, billions
  igSpread: number | null           // BAMLC0A0CM, bps
  fetchedAt: string                 // ISO timestamp
  errors: string[]                  // series IDs that failed
}

async function fredFetch(url: string, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return res.text()
  } catch {
    clearTimeout(timer)
    return null
  }
}

// Parse FRED CSV: header row DATE,VALUE followed by data rows.
// "." means missing — skip it. Returns most recent non-null observation.
function parseFredCsv(csv: string): FredObservation | null {
  const lines = csv.split('\n').map((l) => l.trim()).filter(Boolean)
  // lines[0] is the header "DATE,VALUE"
  for (let i = lines.length - 1; i >= 1; i--) {
    const [date, valueStr] = lines[i].split(',')
    if (!date || !valueStr || valueStr === '.') continue
    const value = parseFloat(valueStr)
    if (isNaN(value)) continue
    return { date: date.trim(), value }
  }
  return null
}

export async function fetchFredSeries(seriesId: string): Promise<FredObservation | null> {
  const csv = await fredFetch(`${FRED_BASE}${encodeURIComponent(seriesId)}`)
  if (!csv) return null
  return parseFredCsv(csv)
}

const SERIES = [
  { id: 'T10Y2Y',       key: 'yieldCurveSpread' },
  { id: 'BAMLH0A0HYM2', key: 'hySpread' },
  { id: 'NAPM',         key: 'ismPmi' },
  { id: 'IC4WSA',       key: 'initialClaims' },
  { id: 'RSAFS',        key: 'retailSales' },
  { id: 'BAMLC0A0CM',   key: 'igSpread' },
] as const

type SnapshotKey = (typeof SERIES)[number]['key']

export async function fetchAllFredIndicators(): Promise<FredMacroSnapshot> {
  const results = await Promise.allSettled(SERIES.map((s) => fetchFredSeries(s.id)))

  const snapshot: FredMacroSnapshot = {
    yieldCurveSpread: null,
    hySpread: null,
    ismPmi: null,
    initialClaims: null,
    retailSales: null,
    igSpread: null,
    fetchedAt: new Date().toISOString(),
    errors: [],
  }

  for (let i = 0; i < SERIES.length; i++) {
    const r = results[i]
    const key = SERIES[i].key as SnapshotKey
    if (r.status === 'fulfilled' && r.value !== null) {
      snapshot[key] = r.value.value
    } else {
      snapshot.errors.push(SERIES[i].id)
    }
  }

  return snapshot
}
