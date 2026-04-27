import React, { useState } from 'react'
import { useMacroStore } from '../../store'
import {
  MacroRegime,
  RealRateRegime, CreditCycleRegime, LiquidityRegime,
  RiskAppetiteRegime, DollarRegime, PolicyRegime,
} from '../../types'

type DimKey = keyof Omit<MacroRegime, 'lastUpdated' | 'userOverrides'>

const DIMS: { key: DimKey; label: string; options: string[] }[] = [
  { key: 'realRates',    label: 'Real Rates',    options: ['Low', 'Falling', 'Normal', 'Rising', 'High'] },
  { key: 'creditCycle', label: 'Credit Cycle',   options: ['Recovery', 'Expansion', 'LateCycle', 'Contraction'] },
  { key: 'liquidity',   label: 'Liquidity',      options: ['Abundant', 'Normal', 'Tight'] },
  { key: 'riskAppetite',label: 'Risk Appetite',  options: ['RiskOn', 'Neutral', 'Bifurcated', 'RiskOff'] },
  { key: 'dollar',      label: 'Dollar',         options: ['Weak', 'Weakening', 'Neutral', 'Strengthening', 'Strong'] },
  { key: 'policy',      label: 'Policy',         options: ['Permissive', 'Activist', 'Restrictive'] },
]

const DOT_COLORS: Record<string, string> = {
  Low: '#4ade80', Normal: '#888888', High: '#f87171', Rising: '#fb923c', Falling: '#4ade80',
  Expansion: '#4ade80', LateCycle: '#fb923c', Contraction: '#f87171', Recovery: '#facc15',
  Abundant: '#4ade80', Tight: '#f87171',
  RiskOn: '#4ade80', Neutral: '#888888', RiskOff: '#f87171', Bifurcated: '#fb923c',
  Strong: '#f87171', Weak: '#4ade80', Strengthening: '#fb923c', Weakening: '#facc15',
  Permissive: '#4ade80', Restrictive: '#f87171', Activist: '#fb923c',
}

export const MacroRegimeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { regime, updateRegime } = useMacroStore()

  const [draft, setDraft] = useState<Record<DimKey, string>>({
    realRates:    regime.realRates,
    creditCycle:  regime.creditCycle,
    liquidity:    regime.liquidity,
    riskAppetite: regime.riskAppetite,
    dollar:       regime.dollar,
    policy:       regime.policy,
  })

  const handleSave = () => {
    updateRegime({
      realRates:    draft.realRates    as RealRateRegime,
      creditCycle:  draft.creditCycle  as CreditCycleRegime,
      liquidity:    draft.liquidity    as LiquidityRegime,
      riskAppetite: draft.riskAppetite as RiskAppetiteRegime,
      dollar:       draft.dollar       as DollarRegime,
      policy:       draft.policy       as PolicyRegime,
    })
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-[520px] bg-surface-2 border border-border rounded-2xl shadow-2xl p-6 space-y-5">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-text-primary">Macro Regime</h2>
              <p className="text-[10px] text-text-muted mt-0.5">
                Last updated: {new Date(regime.lastUpdated).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted
                hover:text-text-secondary hover:bg-[#222] transition-colors text-lg"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {DIMS.map(({ key, label, options }) => {
              const val = draft[key]
              const color = DOT_COLORS[val] ?? '#555'
              return (
                <div key={key} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-text-secondary w-24 flex-shrink-0">{label}</span>
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setDraft((d) => ({ ...d, [key]: opt }))}
                        className={`px-2.5 py-0.5 text-[10px] rounded-full border transition-colors ${
                          val === opt
                            ? 'border-accent/50 bg-accent/10 text-accent font-semibold'
                            : 'border-border text-text-muted hover:border-[#3a3a3a] hover:text-text-secondary'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-text-muted border border-border
                hover:border-[#3a3a3a] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs text-text-primary bg-accent/90
                hover:bg-accent rounded-lg transition-colors font-semibold"
            >
              Save
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
