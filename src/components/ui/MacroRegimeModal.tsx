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
  Low: '#2E6E4A', Normal: '#A8A098', High: '#A83030', Rising: '#7A4A10', Falling: '#2E6E4A',
  Expansion: '#2E6E4A', LateCycle: '#7A4A10', Contraction: '#A83030', Recovery: '#9A7A50',
  Abundant: '#2E6E4A', Tight: '#A83030',
  RiskOn: '#2E6E4A', Neutral: '#A8A098', RiskOff: '#A83030', Bifurcated: '#7A4A10',
  Strong: '#A83030', Weak: '#2E6E4A', Strengthening: '#7A4A10', Weakening: '#9A7A50',
  Permissive: '#2E6E4A', Restrictive: '#A83030', Activist: '#7A4A10',
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
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-[520px] p-6 space-y-5"
          style={{
            background: 'rgba(242,236,226,0.97)',
            border: '1px solid #D8D0C4',
            borderRadius: 14,
            boxShadow: '0 8px 40px rgba(60,40,10,0.18), 0 2px 8px rgba(60,40,10,0.10)',
          }}
        >
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
                hover:text-text-secondary transition-colors text-lg"
              style={{ background: 'rgba(60,40,10,0.06)' }}
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            {DIMS.map(({ key, label, options }) => {
              const val = draft[key]
              const color = DOT_COLORS[val] ?? '#A8A098'
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
                        className="px-2.5 py-0.5 text-[10px] rounded-full border transition-colors"
                        style={val === opt ? {
                          borderColor: 'rgba(154,122,80,0.5)',
                          background: 'rgba(154,122,80,0.12)',
                          color: '#7A5A38',
                          fontWeight: 700,
                        } : {
                          borderColor: '#D8D0C4',
                          color: '#A8A098',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2" style={{ borderTop: '1px solid #D8D0C4' }}>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-text-muted border border-border
                hover:border-accent/40 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs text-white bg-accent/90
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
