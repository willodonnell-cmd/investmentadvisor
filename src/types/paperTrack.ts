export type SimWindow = '30d' | '60d' | '6m' | 'created'

export const SIM_WINDOW_LABELS: Record<SimWindow, string> = {
  '30d':    '30 Days',
  '60d':    '60 Days',
  '6m':     '6 Months',
  'created': 'Since Created',
}

export const SIM_WINDOW_DAYS: Partial<Record<SimWindow, number>> = {
  '30d': 30,
  '60d': 60,
  '6m':  180,
}

export interface PriceClose {
  date: string   // YYYY-MM-DD
  price: number
}

export interface PaperPosition {
  id: string
  ticker: string
  companyName: string
  direction: 'Long' | 'Short'
  description: string
  convictionRank: number
  entryPrice: number       // price when thesis entered Watch
  entryDate: string        // YYYY-MM-DD
  currentPrice: number
  lastUpdated: string      // ISO string
  closes: PriceClose[]     // up to 6 months of daily closes for window simulation
  isUserOverride: boolean
  fetchError: boolean
}

export interface PaperTrack {
  id: string
  thesisId: string
  thesisName: string
  watchedAt: string        // ISO string — when thesis entered Watch
  thesisCreatedAt: string  // ISO string — for 'created' window
  status: 'Active' | 'PostMortem'
  postMortemReason?: string
  positions: PaperPosition[]
}

export interface ThesisRecommendation {
  ticker: string
  companyName: string
  direction: 'Long' | 'Short'
  description: string
  convictionRank: number
}
