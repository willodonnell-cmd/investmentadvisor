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
  mode: 'stocks' | 'funds'
  focusAreas: string
  isRunning: boolean
  phase: string
  progress: number
  error: string | null
  justCompleted: boolean

  stockResult: HuntResult | null
  fundResult: FundHuntResult | null

  setMode: (mode: 'stocks' | 'funds') => void
  setFocusAreas: (areas: string) => void
  startHunt: (context: HuntContext) => Promise<void>
  startFundHunt: (context: HuntContext) => Promise<void>
  clearResult: () => void
}

let completeTimer: ReturnType<typeof setTimeout> | null = null

function markComplete(set: (partial: Partial<HuntStore>) => void) {
  if (completeTimer) clearTimeout(completeTimer)
  set({ justCompleted: true, progress: 100, phase: '' })
  completeTimer = setTimeout(() => {
    set({ justCompleted: false })
    completeTimer = null
  }, 5000)
}

export const useHuntStore = create<HuntStore>()((set, get) => ({
  mode: 'stocks',
  focusAreas: '',
  isRunning: false,
  phase: '',
  progress: 0,
  error: null,
  justCompleted: false,
  stockResult: null,
  fundResult: null,

  setMode: (mode) => set({ mode }),

  setFocusAreas: (areas) => set({ focusAreas: areas }),

  clearResult: () => set({ stockResult: null, fundResult: null, error: null }),

  startHunt: async (context) => {
    if (get().isRunning) return
    set({
      isRunning: true,
      phase: 'Generating investment signals…',
      progress: 0,
      error: null,
      justCompleted: false,
      stockResult: null,
    })
    const onProgress = (phase: string, progress: number) => set({ phase, progress })
    try {
      const result = await runHunt(context, onProgress)
      set({ stockResult: result, isRunning: false })
      if (result.error) {
        set({ error: result.error })
      } else {
        markComplete(set)
      }
    } catch (err) {
      set({
        isRunning: false,
        phase: '',
        progress: 0,
        error: err instanceof Error ? err.message : 'Hunt failed',
      })
    }
  },

  startFundHunt: async (context) => {
    if (get().isRunning) return
    set({
      isRunning: true,
      phase: 'Identifying fund candidates…',
      progress: 0,
      error: null,
      justCompleted: false,
      fundResult: null,
    })
    const onProgress = (phase: string, progress: number) => set({ phase, progress })
    try {
      const result = await runFundHunt(context, onProgress)
      set({ fundResult: result, isRunning: false })
      if (result.error) {
        set({ error: result.error })
      } else {
        markComplete(set)
      }
    } catch (err) {
      set({
        isRunning: false,
        phase: '',
        progress: 0,
        error: err instanceof Error ? err.message : 'Fund hunt failed',
      })
    }
  },
}))
