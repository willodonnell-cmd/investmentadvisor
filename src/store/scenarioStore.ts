import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Scenario } from '../types'
import { createStorage } from '../storage/persistence'

interface ScenarioStore {
  scenarios: Record<string, Scenario>

  upsertScenario: (scenario: Scenario) => void
  upsertMany: (scenarios: Scenario[]) => void
  removeScenario: (id: string) => void
  removeByThesis: (thesisId: string) => void
  updateProbability: (id: string, probability: number) => void
  getByThesis: (thesisId: string) => Scenario[]
}

export const useScenarioStore = create<ScenarioStore>()(
  persist(
    (set, get) => ({
      scenarios: {},

      upsertScenario: (scenario) =>
        set((s) => ({ scenarios: { ...s.scenarios, [scenario.id]: scenario } })),

      upsertMany: (list) =>
        set((s) => ({
          scenarios: list.reduce((acc, sc) => ({ ...acc, [sc.id]: sc }), s.scenarios),
        })),

      removeScenario: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.scenarios
          return { scenarios: rest }
        }),

      removeByThesis: (thesisId) =>
        set((s) => ({
          scenarios: Object.fromEntries(
            Object.entries(s.scenarios).filter(([, sc]) => sc.linkedThesisId !== thesisId)
          ),
        })),

      updateProbability: (id, probability) =>
        set((s) => {
          const sc = s.scenarios[id]
          if (!sc) return s
          return { scenarios: { ...s.scenarios, [id]: { ...sc, probability, updatedAt: new Date() } } }
        }),

      getByThesis: (thesisId) =>
        Object.values(get().scenarios).filter((sc) => sc.linkedThesisId === thesisId),
    }),
    { name: 'scenario-store', storage: createStorage() }
  )
)
