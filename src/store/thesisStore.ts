import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Thesis, LifecycleStage } from '../types'
import { createStorage } from '../storage/persistence'
import {
  LIFECYCLE_STORE_VERSION,
  migrateThesisPersisted,
} from '../storage/lifecycleMigration'

interface ThesisStore {
  theses: Record<string, Thesis>
  activeThesisId: string | null
  justPromotedId: string | null

  addThesis: (thesis: Thesis) => void
  updateThesis: (id: string, updates: Partial<Thesis>) => void
  removeThesis: (id: string) => void
  setActiveThesis: (id: string | null) => void
  advanceLifecycle: (id: string, stage: LifecycleStage, reason: string) => void
  promoteToDeveloping: (thesis: Thesis) => void
  clearJustPromoted: () => void
  getActiveTheses: () => Thesis[]
  getThesisByStage: (stage: LifecycleStage) => Thesis[]
}

export const useThesisStore = create<ThesisStore>()(
  persist(
    (set, get) => ({
      theses: {},
      activeThesisId: null,
      justPromotedId: null,

      addThesis: (thesis) =>
        set((state) => ({ theses: { ...state.theses, [thesis.id]: thesis } })),

      updateThesis: (id, updates) =>
        set((state) => {
          const existing = state.theses[id]
          if (!existing) return state
          return {
            theses: {
              ...state.theses,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: new Date(),
                changeHistory: [
                  ...existing.changeHistory,
                  {
                    changedAt: new Date(),
                    field: Object.keys(updates).join(', '),
                    previousValue: null,
                    newValue: updates,
                    reason: 'User update',
                  },
                ],
              },
            },
          }
        }),

      removeThesis: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.theses
          return { theses: rest }
        }),

      setActiveThesis: (id) => set({ activeThesisId: id }),

      promoteToDeveloping: (thesis) =>
        set((state) => ({
          theses: { ...state.theses, [thesis.id]: { ...thesis, stage: 'Developing', promotedAt: new Date() } },
          justPromotedId: thesis.id,
        })),

      clearJustPromoted: () => set({ justPromotedId: null }),

      advanceLifecycle: (id, stage, reason) => {
        const thesis = get().theses[id]
        if (!thesis) return
        set((state) => ({
          theses: {
            ...state.theses,
            [id]: {
              ...thesis,
              stage,
              updatedAt: new Date(),
              changeHistory: [
                ...thesis.changeHistory,
                {
                  changedAt: new Date(),
                  field: 'stage',
                  previousValue: thesis.stage,
                  newValue: stage,
                  reason,
                },
              ],
            },
          },
        }))
      },

      getActiveTheses: () =>
        Object.values(get().theses).filter(
          (t) => !['Killed', 'Archived', 'PlayedOut', 'Broken'].includes(t.stage)
        ),

      getThesisByStage: (stage) =>
        Object.values(get().theses).filter((t) => t.stage === stage),
    }),
    {
      name: 'thesis-store',
      storage: createStorage(),
      version: LIFECYCLE_STORE_VERSION,
      migrate: migrateThesisPersisted,
    }
  )
)
