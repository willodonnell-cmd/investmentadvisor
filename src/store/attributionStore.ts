import { create } from 'zustand'
import type { AttributionReport } from '../types/attribution'
import { buildFullAttributionReport } from '../api/performanceAttribution'
import { usePortfolioStore } from './portfolioStore'
import { useThesisStore } from './thesisStore'

interface AttributionStore {
  report: AttributionReport | null
  isLoading: boolean
  error: string | null
  lastFetched: Date | null

  generateReport: () => Promise<void>
  clearReport: () => void
}

export const useAttributionStore = create<AttributionStore>()((set) => ({
  report: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  generateReport: async () => {
    set({ isLoading: true, error: null })
    try {
      const { positions, companies } = usePortfolioStore.getState()
      const { theses } = useThesisStore.getState()
      const report = await buildFullAttributionReport(positions, theses, companies)
      set({ report, isLoading: false, lastFetched: new Date() })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to generate report',
      })
    }
  },

  clearReport: () => set({ report: null, error: null, lastFetched: null }),
}))
