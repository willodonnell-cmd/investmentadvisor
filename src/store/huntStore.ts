import { create } from 'zustand'
import {
  runHunt,
  type HuntContext,
  type HuntResult,
} from '../api/opportunityAgent'
import {
  runFundHunt,
  type FundHuntResult,
} from '../api/fundHuntAgent'

interface HuntStore {
  // Stock hunt — fully independent
  stockFocusAreas: string
  stockRunning: boolean
  stockPhase: string
  stockProgress: number
  stockResult: HuntResult | null

  // Fund hunt — fully independent
  fundFocusAreas: string
  fundRunning: boolean
  fundPhase: string
  fundProgress: number
  fundResult: FundHuntResult | null

  setStockFocusAreas: (areas: string) => void
  setFundFocusAreas: (areas: string) => void
  startHunt: (context: HuntContext) => Promise<void>
  startFundHunt: (context: HuntContext) => Promise<void>
  clearStockResult: () => void
  clearFundResult: () => void
  clearResult: () => void
}

export const useHuntStore = create<HuntStore>()((set, get) => ({
  stockFocusAreas: '',
  stockRunning: false,
  stockPhase: '',
  stockProgress: 0,
  stockResult: null,

  fundFocusAreas: '',
  fundRunning: false,
  fundPhase: '',
  fundProgress: 0,
  fundResult: null,

  setStockFocusAreas: (areas) => set({ stockFocusAreas: areas }),
  setFundFocusAreas: (areas) => set({ fundFocusAreas: areas }),

  clearStockResult: () => set({ stockResult: null }),
  clearFundResult: () => set({ fundResult: null }),
  clearResult: () => set({ stockResult: null, fundResult: null }),

  startHunt: async (context) => {
    if (get().stockRunning) return
    set({ stockRunning: true, stockPhase: 'Generating investment signals…', stockProgress: 0, stockResult: null })
    const onProgress = (phase: string, progress: number) => set({ stockPhase: phase, stockProgress: progress })
    try {
      const result = await runHunt(context, onProgress)
      set({ stockResult: result, stockRunning: false, stockProgress: 100, stockPhase: '' })
    } catch (err) {
      set({ stockRunning: false, stockPhase: '', stockProgress: 0 })
    }
  },

  startFundHunt: async (context) => {
    if (get().fundRunning) return
    set({ fundRunning: true, fundPhase: 'Identifying fund candidates…', fundProgress: 0, fundResult: null })
    const onProgress = (phase: string, progress: number) => set({ fundPhase: phase, fundProgress: progress })
    try {
      const result = await runFundHunt(context, onProgress)
      set({ fundResult: result, fundRunning: false, fundProgress: 100, fundPhase: '' })
    } catch (err) {
      set({ fundRunning: false, fundPhase: '', fundProgress: 0 })
    }
  },
}))
