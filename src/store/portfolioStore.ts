import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Position, Company, PortfolioMacroSignature, ThesisLens } from '../types'
import { createStorage } from '../storage/persistence'

interface PortfolioStore {
  positions: Record<string, Position>
  companies: Record<string, Company>
  portfolioSignature: PortfolioMacroSignature | null
  lens: ThesisLens

  addPosition: (position: Position) => void
  updatePosition: (id: string, updates: Partial<Position>) => void
  removePosition: (id: string) => void
  addCompany: (company: Company) => void
  updateCompany: (id: string, updates: Partial<Company>) => void
  removeCompany: (id: string) => void
  setLens: (lens: ThesisLens) => void
  setPortfolioSignature: (sig: PortfolioMacroSignature) => void
  getPositionsByThesis: (thesisId: string) => Position[]
  getCompaniesByThesis: (thesisId: string) => Company[]
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      positions: {},
      companies: {},
      portfolioSignature: null,
      lens: 'PrologisAware',

      addPosition: (position) =>
        set((state) => ({ positions: { ...state.positions, [position.id]: position } })),

      updatePosition: (id, updates) =>
        set((state) => {
          const existing = state.positions[id]
          if (!existing) return state
          return {
            positions: {
              ...state.positions,
              [id]: { ...existing, ...updates, updatedAt: new Date() },
            },
          }
        }),

      removePosition: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.positions
          return { positions: rest }
        }),

      addCompany: (company) =>
        set((state) => ({ companies: { ...state.companies, [company.id]: company } })),

      updateCompany: (id, updates) =>
        set((state) => {
          const existing = state.companies[id]
          if (!existing) return state
          return {
            companies: {
              ...state.companies,
              [id]: { ...existing, ...updates, updatedAt: new Date() },
            },
          }
        }),

      removeCompany: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.companies
          return { companies: rest }
        }),

      setLens: (lens) => set({ lens }),

      setPortfolioSignature: (sig) => set({ portfolioSignature: sig }),

      getPositionsByThesis: (thesisId) =>
        Object.values(get().positions).filter((p) => p.linkedThesisId === thesisId),

      getCompaniesByThesis: (thesisId) =>
        Object.values(get().companies).filter((c) => c.linkedThesisId === thesisId),
    }),
    {
      name: 'portfolio-store',
      storage: createStorage(),
    }
  )
)
