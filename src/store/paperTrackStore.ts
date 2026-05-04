import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Thesis } from '../types'
import type { PaperTrack, PaperPosition, SimWindow } from '../types/paperTrack'
import { fetchTickerData, refreshQuote, priceAtDaysAgo, priceAtDate } from '../api/finnhub'
import { SIM_WINDOW_DAYS } from '../types/paperTrack'

interface PaperTrackState {
  tracks: Record<string, PaperTrack>  // keyed by thesisId
  loading: Record<string, boolean>

  createTrack: (thesis: Thesis) => Promise<void>
  refreshTrack: (thesisId: string) => Promise<void>
  overrideTicker: (thesisId: string, positionId: string, ticker: string) => Promise<void>
  setPostMortem: (thesisId: string, reason: string) => void
  computeReturn: (position: PaperPosition, window: SimWindow, thesisCreatedAt: string) => number
}

export const usePaperTrackStore = create<PaperTrackState>()(
  persist(
    (set, get) => ({
      tracks: {},
      loading: {},

      createTrack: async (thesis) => {
        if (get().tracks[thesis.id]) return
        if (!thesis.recommendations?.length) return

        set((s) => ({ loading: { ...s.loading, [thesis.id]: true } }))

        const positions = await Promise.all(
          thesis.recommendations.map(async (rec) => {
            const data = await fetchTickerData(rec.ticker)
            const today = new Date().toISOString().slice(0, 10)
            const pos: PaperPosition = {
              id: crypto.randomUUID(),
              ticker: rec.ticker,
              companyName: rec.companyName,
              direction: rec.direction,
              description: rec.description,
              convictionRank: rec.convictionRank,
              entryPrice: data?.currentPrice ?? 0,
              entryDate: today,
              currentPrice: data?.currentPrice ?? 0,
              lastUpdated: new Date().toISOString(),
              closes: data?.closes ?? [],
              isUserOverride: false,
              fetchError: !data,
            }
            return pos
          }),
        )

        const track: PaperTrack = {
          id: crypto.randomUUID(),
          thesisId: thesis.id,
          thesisName: thesis.name,
          watchedAt: new Date().toISOString(),
          thesisCreatedAt: thesis.createdAt instanceof Date
            ? thesis.createdAt.toISOString()
            : String(thesis.createdAt),
          status: 'Active',
          positions,
        }

        set((s) => ({
          tracks: { ...s.tracks, [thesis.id]: track },
          loading: { ...s.loading, [thesis.id]: false },
        }))
      },

      refreshTrack: async (thesisId) => {
        const track = get().tracks[thesisId]
        if (!track) return

        set((s) => ({ loading: { ...s.loading, [thesisId]: true } }))

        const updated = await Promise.all(
          track.positions.map(async (pos) => {
            const price = await refreshQuote(pos.ticker)
            return price
              ? { ...pos, currentPrice: price, lastUpdated: new Date().toISOString() }
              : pos
          }),
        )

        set((s) => ({
          tracks: {
            ...s.tracks,
            [thesisId]: { ...track, positions: updated },
          },
          loading: { ...s.loading, [thesisId]: false },
        }))
      },

      overrideTicker: async (thesisId, positionId, ticker) => {
        const track = get().tracks[thesisId]
        if (!track) return

        const data = await fetchTickerData(ticker)
        const today = new Date().toISOString().slice(0, 10)

        set((s) => ({
          tracks: {
            ...s.tracks,
            [thesisId]: {
              ...track,
              positions: track.positions.map((p) =>
                p.id === positionId
                  ? {
                      ...p,
                      ticker,
                      entryPrice: data?.currentPrice ?? p.entryPrice,
                      entryDate: today,
                      currentPrice: data?.currentPrice ?? p.currentPrice,
                      closes: data?.closes ?? [],
                      lastUpdated: new Date().toISOString(),
                      isUserOverride: true,
                      fetchError: !data,
                    }
                  : p,
              ),
            },
          },
        }))
      },

      setPostMortem: (thesisId, reason) => {
        const track = get().tracks[thesisId]
        if (!track) return
        set((s) => ({
          tracks: {
            ...s.tracks,
            [thesisId]: { ...track, status: 'PostMortem', postMortemReason: reason },
          },
        }))
      },

      computeReturn: (position, window, thesisCreatedAt) => {
        if (position.fetchError || position.currentPrice === 0) return NaN

        let entryPrice: number | null = null

        if (window === 'created') {
          const dateStr = thesisCreatedAt.slice(0, 10)
          entryPrice = priceAtDate(position.closes, dateStr)
        } else {
          const days = SIM_WINDOW_DAYS[window]!
          entryPrice = priceAtDaysAgo(position.closes, days)
        }

        // No historical data available for this window
        if (!entryPrice || entryPrice === 0) return NaN

        const rawReturn = (position.currentPrice - entryPrice) / entryPrice
        return position.direction === 'Short' ? -rawReturn : rawReturn
      },
    }),
    { name: 'paper-tracks' },
  ),
)
