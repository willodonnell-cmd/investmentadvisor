import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createStorage } from '../storage/persistence'

interface CompareStore {
  slots: string[]  // thesis ids, no max
  addSlot: (thesisId: string) => void
  removeSlot: (thesisId: string) => void
  swapSlots: (idA: string, idB: string) => void
  clearAll: () => void
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      slots: [],

      addSlot: (thesisId) => {
        if (get().slots.includes(thesisId)) return
        set((s) => ({ slots: [...s.slots, thesisId] }))
      },

      removeSlot: (thesisId) =>
        set((s) => ({ slots: s.slots.filter((id) => id !== thesisId) })),

      swapSlots: (idA, idB) =>
        set((s) => {
          const slots = [...s.slots]
          const iA = slots.indexOf(idA)
          const iB = slots.indexOf(idB)
          if (iA === -1 || iB === -1) return s
          ;[slots[iA], slots[iB]] = [slots[iB], slots[iA]]
          return { slots }
        }),

      clearAll: () => set({ slots: [] }),
    }),
    {
      name: 'compare-store',
      storage: createStorage(),
    }
  )
)
