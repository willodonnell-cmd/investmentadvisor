import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Signal, SignalComposite } from '../types'
import { createStorage } from '../storage/persistence'
import { triggerConvictionComparison } from '../api/convictionComparison'
import { useThesisStore } from './thesisStore'

interface SignalStore {
  signals: Record<string, Signal>
  composites: Record<string, SignalComposite>
  addSignal: (signal: Signal) => void
  updateSignal: (id: string, updates: Partial<Signal>) => void
  removeSignal: (id: string) => void
  removeByThesis: (thesisId: string) => void
  upsertComposite: (composite: SignalComposite) => void
  getSignalsByThesis: (thesisId: string) => Signal[]
  getCompositesByThesis: (thesisId: string) => SignalComposite[]
}

export const useSignalStore = create<SignalStore>()(
  persist(
    (set, get) => ({
      signals: {},
      composites: {},

      addSignal: (signal) => {
        set((state) => ({ signals: { ...state.signals, [signal.id]: signal } }))
        if (signal.isProposed) return
        // Trigger conviction comparison if signal is linked to an active thesis
        const thesis = useThesisStore.getState().theses[signal.linkedThesisId]
        if (thesis) {
          triggerConvictionComparison(signal, thesis).catch(() => {
            // Fail silently — signal is already stored, comparison is best-effort
          })
        }
      },

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

      removeByThesis: (thesisId) =>
        set((state) => ({
          signals: Object.fromEntries(
            Object.entries(state.signals).filter(([, s]) => s.linkedThesisId !== thesisId),
          ),
          composites: Object.fromEntries(
            Object.entries(state.composites).filter(([, c]) => c.linkedThesisId !== thesisId),
          ),
        })),

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
