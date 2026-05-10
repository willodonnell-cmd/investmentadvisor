import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Thesis } from '../types'
import type { PaperTrack, PaperPosition, SimWindow } from '../types/paperTrack'
import { fetchTickerData, fetchCandles, refreshQuote, priceAtDaysAgo, priceAtDate, sleep } from '../api/finnhub'
import { SIM_WINDOW_DAYS } from '../types/paperTrack'

interface PaperTrackState {
  tracks: Record<string, PaperTrack>
  loading: Record<string, boolean>

  createTrack: (thesis: Thesis) => Promise<void>
  refreshTrack: (thesisId: string) => Promise<void>
  loadHistory: (thesisId: string) => Promise<void>
  overrideTicker: (thesisId: string, positionId: string, ticker: string) => Promise<void>
  setPostMortem: (thesisId: string, reason: string) => void
  computeReturn: (position: PaperPosition, window: SimWindow, thesisCreatedAt: string) => number
}

export const usePaperTrackStore = create<PaperTrackState>()(
  persist(
    (set, get) => ({
      tracks: {},
      loading: {},

      // ── Create ──────────────────────────────────────────────────────────────
      createTrack: async (thesis) => {
        if (get().tracks[thesis.id]) return
        if (!thesis.recommendations?.length) return

        set((s) => ({ loading: { ...s.loading, [thesis.id]: true } }))
        try {
          const positions: PaperPosition[] = []
          for (const rec of thesis.recommendations!) {
            const price = await refreshQuote(rec.ticker)
            const today = new Date().toISOString().slice(0, 10)
            positions.push({
              id: crypto.randomUUID(),
              ticker: rec.ticker,
              companyName: rec.companyName,
              direction: rec.direction,
              description: rec.description,
              convictionRank: rec.convictionRank,
              entryPrice: price ?? 0,
              entryDate: today,
              currentPrice: price ?? 0,
              lastUpdated: new Date().toISOString(),
              closes: [],
              isUserOverride: false,
              fetchError: !price,
            })
            if (thesis.recommendations!.length > 1) await sleep(400)
          }

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

          set((s) => ({ tracks: { ...s.tracks, [thesis.id]: track } }))
        } finally {
          set((s) => ({ loading: { ...s.loading, [thesis.id]: false } }))
        }
      },

      // ── Refresh quotes (fast, no candles) ───────────────────────────────────
      refreshTrack: async (thesisId) => {
        const track = get().tracks[thesisId]
        if (!track) return

        const updated: PaperPosition[] = []
        for (const pos of track.positions) {
          const price = await refreshQuote(pos.ticker)
          updated.push(price
            ? { ...pos, currentPrice: price, lastUpdated: new Date().toISOString() }
            : pos
          )
          if (track.positions.length > 1) await sleep(400)
        }
        set((s) => ({
          tracks: { ...s.tracks, [thesisId]: { ...track, positions: updated } },
        }))
      },

      // ── Load full candle history (slow, AV rate-limited) ────────────────────
      // Does NOT touch the store loading flag — the card stays visible.
      // Component manages its own loadingHistory local state for the button.
      loadHistory: async (thesisId) => {
        const track = get().tracks[thesisId]
        if (!track) return

        const updated: PaperPosition[] = []
        for (let i = 0; i < track.positions.length; i++) {
          const pos = track.positions[i]
          try {
            const closes = await fetchCandles(pos.ticker)
            const price = await refreshQuote(pos.ticker)
            updated.push({
              ...pos,
              closes,
              currentPrice: price ?? pos.currentPrice,
              fetchError: closes.length === 0 && !price,
              lastUpdated: new Date().toISOString(),
            })
          } catch {
            updated.push(pos)
          }
          // AV free tier: 5 req/min. fetchCandles uses 1 AV call per ticker.
          // 13s gap keeps us safely under the rate limit.
          if (i < track.positions.length - 1) await sleep(13000)
        }

        set((s) => ({
          tracks: { ...s.tracks, [thesisId]: { ...track, positions: updated } },
        }))
      },

      // ── Override ticker ──────────────────────────────────────────────────────
      overrideTicker: async (thesisId, positionId, ticker) => {
        const track = get().tracks[thesisId]
        if (!track) return

        try {
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
        } catch {
          // silent — leave position unchanged
        }
      },

      // ── Post-mortem ──────────────────────────────────────────────────────────
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

      // ── Return calculation ───────────────────────────────────────────────────
      computeReturn: (position, window, thesisCreatedAt) => {
        if (position.fetchError || position.currentPrice === 0) return NaN

        let entryPrice: number | null = null
        if (window === 'created') {
          // Prefer candle lookup; fall back to stored entryPrice (captured at track creation)
          entryPrice = priceAtDate(position.closes, thesisCreatedAt.slice(0, 10))
            ?? (position.entryPrice > 0 ? position.entryPrice : null)
        } else {
          entryPrice = priceAtDaysAgo(position.closes, SIM_WINDOW_DAYS[window]!) ?? null
        }

        if (!entryPrice || entryPrice === 0) return NaN

        const rawReturn = (position.currentPrice - entryPrice) / entryPrice
        return position.direction === 'Short' ? -rawReturn : rawReturn
      },
    }),
    {
      name: 'paper-tracks',
      partialize: (state) => ({ tracks: state.tracks }),  // never persist loading state
    },
  ),
)
