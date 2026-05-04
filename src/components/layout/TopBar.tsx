import React, { useState } from 'react'
import { LensSelector } from '../ui/LensSelector'
import { MacroRegimeModal } from '../ui/MacroRegimeModal'
import { useMacroStore } from '../../store'

const REGIME_DOTS = [
  { key: 'realRates'    as const, label: 'Rates'    },
  { key: 'creditCycle'  as const, label: 'Credit'   },
  { key: 'liquidity'    as const, label: 'Liquidity' },
  { key: 'riskAppetite' as const, label: 'Risk'     },
  { key: 'dollar'       as const, label: 'Dollar'   },
  { key: 'policy'       as const, label: 'Policy'   },
]

const REGIME_COLORS: Record<string, string> = {
  Low: 'green', Normal: 'neutral', High: 'red',
  Rising: 'amber', Falling: 'green',
  Expansion: 'green', LateCycle: 'amber', Contraction: 'red', Recovery: 'amber',
  Abundant: 'green', Tight: 'red',
  RiskOn: 'green', Neutral: 'neutral', RiskOff: 'red', Bifurcated: 'amber',
  Strong: 'red', Weak: 'green', Strengthening: 'amber', Weakening: 'amber',
  Permissive: 'green', Restrictive: 'red', Activist: 'amber',
}

const PILL_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  green:   { bg: 'rgba(30,112,66,0.10)',  color: '#1E7042', dot: '#1E7042' },
  amber:   { bg: 'rgba(138,74,8,0.10)',   color: '#8A4A08', dot: '#8A4A08' },
  red:     { bg: 'rgba(160,40,40,0.10)',  color: '#A02828', dot: '#A02828' },
  neutral: { bg: 'transparent',           color: '#A89878', dot: '#A89878' },
}

const REGIME_LABELS: Record<string, string> = {
  Low: 'Rates Low', Normal: 'Rates Normal', High: 'Rates High',
  Rising: 'Rising', Falling: 'Falling',
  Expansion: 'Expansion', LateCycle: 'Late Cycle',
  Contraction: 'Contraction', Recovery: 'Recovery',
  Abundant: 'Abundant', Tight: 'Tight',
  RiskOn: 'Risk On', Neutral: 'Neutral', RiskOff: 'Risk Off', Bifurcated: 'Bifurcated',
  Strong: 'Strong', Weak: 'Weak', Strengthening: 'Strengthening', Weakening: 'Weakening',
  Permissive: 'Easy Policy', Restrictive: 'Restrictive', Activist: 'Activist',
}

export const TopBar: React.FC = () => {
  const { regime } = useMacroStore()
  const [macroOpen, setMacroOpen] = useState(false)

  return (
    <>
      <header
        style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(253,252,249,0.94)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 1px 0 rgba(20,12,4,0.08), 0 2px 12px rgba(20,12,4,0.05)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <LensSelector />

        <button
          onClick={() => setMacroOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
          title="Edit macro regime"
        >
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: '#A89878',
          }}>
            Macro Regime
          </span>

          <div className="macro-panel">
            {REGIME_DOTS.map(({ key, label }) => {
              const value = regime[key] as string
              const colorKey = REGIME_COLORS[value] ?? 'neutral'
              const style = PILL_STYLES[colorKey]
              const displayLabel = REGIME_LABELS[value] ?? value

              return (
                <div
                  key={key}
                  className="mpill"
                  style={{ background: style.bg, color: style.color }}
                  title={`${label}: ${value}`}
                >
                  <div className="mpill-dot" style={{ background: style.dot }} />
                  {displayLabel}
                </div>
              )
            })}
          </div>
        </button>
      </header>

      {macroOpen && <MacroRegimeModal onClose={() => setMacroOpen(false)} />}
    </>
  )
}
