import { create } from 'zustand'
import { getVolRegime, type VolRegimeResult } from '../api/volatilityOverlay'

const REFRESH_MS = 15 * 60 * 1000 // 15 minutes

interface VolatilityStore {
  regime: VolRegimeResult | null
  lastFetched: number | null
  isLoading: boolean
  error: string | null
  fetch: () => Promise<void>
}

let refreshTimer: ReturnType<typeof setInterval> | null = null

export const useVolatilityStore = create<VolatilityStore>()((set, get) => {
  // Auto-refresh every 15 min (singleton timer)
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => { get().fetch() }, REFRESH_MS)

  return {
    regime: null,
    lastFetched: null,
    isLoading: false,
    error: null,

    fetch: async () => {
      if (get().isLoading) return
      set({ isLoading: true, error: null })
      try {
        const result = await getVolRegime()
        set({ regime: result, lastFetched: Date.now(), isLoading: false })
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to fetch vol data',
        })
      }
    },
  }
})
