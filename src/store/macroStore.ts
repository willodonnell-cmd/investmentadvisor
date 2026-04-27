import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MacroRegime, RealRateRegime, CreditCycleRegime, LiquidityRegime, RiskAppetiteRegime, DollarRegime, PolicyRegime } from '../types'
import { createStorage } from '../storage/persistence'

const DEFAULT_REGIME: MacroRegime = {
  realRates: 'High',
  creditCycle: 'LateCycle',
  liquidity: 'Normal',
  riskAppetite: 'Neutral',
  dollar: 'Strong',
  policy: 'Restrictive',
  lastUpdated: new Date(),
  userOverrides: {},
}

interface MacroStore {
  regime: MacroRegime

  updateRegime: (updates: Partial<Omit<MacroRegime, 'userOverrides' | 'lastUpdated'>>) => void
  setUserOverride: (field: keyof Omit<MacroRegime, 'userOverrides' | 'lastUpdated'>, value: RealRateRegime | CreditCycleRegime | LiquidityRegime | RiskAppetiteRegime | DollarRegime | PolicyRegime) => void
  clearUserOverride: (field: keyof Omit<MacroRegime, 'userOverrides' | 'lastUpdated'>) => void
}

export const useMacroStore = create<MacroStore>()(
  persist(
    (set) => ({
      regime: DEFAULT_REGIME,

      updateRegime: (updates) =>
        set((state) => ({
          regime: { ...state.regime, ...updates, lastUpdated: new Date() },
        })),

      setUserOverride: (field, value) =>
        set((state) => ({
          regime: {
            ...state.regime,
            userOverrides: { ...state.regime.userOverrides, [field]: value },
            lastUpdated: new Date(),
          },
        })),

      clearUserOverride: (field) =>
        set((state) => {
          const { [field]: _, ...rest } = state.regime.userOverrides
          return { regime: { ...state.regime, userOverrides: rest, lastUpdated: new Date() } }
        }),
    }),
    {
      name: 'macro-store',
      storage: createStorage(),
    }
  )
)
