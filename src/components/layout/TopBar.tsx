import React, { useState } from 'react'
import { LensSelector } from '../ui/LensSelector'
import { MacroRegimeModal } from '../ui/MacroRegimeModal'
import { useMacroStore } from '../../store'

const REGIME_DOT_CONFIG = [
  { key: 'realRates' as const, label: 'Rates' },
  { key: 'creditCycle' as const, label: 'Credit' },
  { key: 'liquidity' as const, label: 'Liquidity' },
  { key: 'riskAppetite' as const, label: 'Risk' },
  { key: 'dollar' as const, label: 'Dollar' },
  { key: 'policy' as const, label: 'Policy' },
]

const REGIME_DOT_COLORS: Record<string, string> = {
  // Real rates
  Low:     '#4ade80',
  Normal:  '#888888',
  High:    '#f87171',
  Rising:  '#fb923c',
  Falling: '#4ade80',
  // Credit
  Expansion:  '#4ade80',
  LateCycle:  '#fb923c',
  Contraction:'#f87171',
  Recovery:   '#facc15',
  // Liquidity
  Abundant: '#4ade80',
  Tight:    '#f87171',
  // Risk appetite
  RiskOn:     '#4ade80',
  Neutral:    '#888888',
  RiskOff:    '#f87171',
  Bifurcated: '#fb923c',
  // Dollar
  Strong:      '#f87171',
  Weak:        '#4ade80',
  Strengthening:'#fb923c',
  Weakening:   '#facc15',
  // Policy
  Permissive:  '#4ade80',
  Restrictive: '#f87171',
  Activist:    '#fb923c',
}

export const TopBar: React.FC = () => {
  const { regime } = useMacroStore()
  const [macroModalOpen, setMacroModalOpen] = useState(false)

  return (
    <>
      <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background flex-shrink-0">
        <LensSelector />

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">Macro</span>
          <button
            onClick={() => setMacroModalOpen(true)}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            title="Edit macro regime"
          >
            {REGIME_DOT_CONFIG.map(({ key, label }) => {
              const value = regime[key] as string
              const color = REGIME_DOT_COLORS[value] ?? '#555555'
              return (
                <div key={key} className="flex flex-col items-center gap-0.5 group relative">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="absolute top-full mt-1 px-1.5 py-0.5 bg-surface-2 text-text-primary text-[10px] rounded border border-border
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {label}: {value}
                  </span>
                </div>
              )
            })}
          </button>
        </div>
      </header>

      {macroModalOpen && <MacroRegimeModal onClose={() => setMacroModalOpen(false)} />}
    </>
  )
}
