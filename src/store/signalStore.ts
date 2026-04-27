import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Signal, SignalComposite } from '../types'
import { createStorage } from '../storage/persistence'

interface SignalStore {
  signals: Record<string, Signal>
  composites: Record<string, SignalComposite>

  addSignal: (signal: Signal) => void
  updateSignal: (id: string, updates: Partial<Signal>) => void
  removeSignal: (id: string) => void
  upsertComposite: (composite: SignalComposite) => void
  getSignalsByThesis: (thesisId: string) => Signal[]
  getCompositesByThesis: (thesisId: string) => SignalComposite[]
}

export const useSignalStore = create<SignalStore>()(
  persist(
    (set, get) => ({
      signals: {},
      composites: {},

      addSignal: (signal) =>
        set((state) => ({ signals: { ...state.signals, [signal.id]: signal } })),

      updateSignal: (id, updates) =>
        set((state) => {
          const existing = state.signals[id]
          if (!existing) return state
          return {
            signals: { ...state.signals, [id]: { ...existing, ...updates } },
          }
        }),

      removeSignal: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.signals
          return { signals: rest }
        }),

      upsertComposite: (composite) =>
        set((state) => ({ composites: { ...state.composites, [composite.id]: composite } })),

      getSignalsByThesis: (thesisId) =>
        Object.values(get().signals).filter((s) => s.linkedThesisId === thesisId),

      getCompositesByThesis: (thesisId) =>
        Object.values(get().composites).filter((c) => c.linkedThesisId === thesisId),
    }),
    {
      name: 'signal-store',
      storage: createStorage(),
    }
  )
)
