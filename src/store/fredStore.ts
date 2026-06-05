import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchAllFredIndicators } from '../api/fredData'
import { classifyFredSnapshot } from '../api/fredClassifier'
import { createStorage } from '../storage/persistence'
import type { FredMacroSnapshot } from '../api/fredData'
import type { FredRegimeClassification } from '../api/fredClassifier'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000

interface FredStore {
  snapshot: FredMacroSnapshot | null
  classification: FredRegimeClassification | null
  isLoading: boolean
  error: string | null
  lastFetched: string | null   // ISO timestamp

  fetchFredData: () => Promise<void>
}

export const useFredStore = create<FredStore>()(
  persist(
    (set, get) => {
      // Auto-refresh every 6 hours after store initialization
      if (typeof window !== 'undefined') {
        setInterval(() => {
          if (!get().isLoading) {
            get().fetchFredData().catch(() => {})
          }
        }, SIX_HOURS_MS)
      }

      return {
        snapshot: null,
        classification: null,
        isLoading: false,
        error: null,
        lastFetched: null,

        fetchFredData: async () => {
          if (get().isLoading) return
          set({ isLoading: true, error: null })
          try {
            const snapshot = await fetchAllFredIndicators()
            const classification = classifyFredSnapshot(snapshot)
            set({
              snapshot,
              classification,
              isLoading: false,
              lastFetched: new Date().toISOString(),
            })
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'FRED fetch failed',
            })
          }
        },
      }
    },
    {
      name: 'fred-store',
      storage: createStorage(),
    },
  ),
)
