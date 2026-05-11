import React, { useState } from 'react'
import { LensSelector } from '../ui/LensSelector'
import { MacroRegimeModal } from '../ui/MacroRegimeModal'
import { ConvictionReviewModal } from '../ui/ConvictionReviewModal'
import { useMacroStore, useConvictionStore } from '../../store'

const REGIME_DOTS = [
  { key: 'realRates'    as const, label: 'Rates'    },
  { key: 'creditCycle'  as const, label: 'Credit'   },
  { key: 'liquidity'    as const, label: 'Liquidity' },
  { key: 'riskAppetite' as const, label: 'Risk'     },
  { key: 'dollar'       as const, label: 'Dollar'   },
  { key: 'policy'       as const, label: 'Policy'   },
]

const REGIME_DOT_COLORS: Record<string, string> = {
  Low: '#2d6a4f', Normal: '#a8a5a0', High: '#b91c1c',
  Rising: '#92400e', Falling: '#2d6a4f',
  Expansion: '#2d6a4f', LateCycle: '#92400e', Contraction: '#b91c1c', Recovery: '#92400e',
  Abundant: '#2d6a4f', Tight: '#b91c1c',
  RiskOn: '#2d6a4f', Neutral: '#a8a5a0', RiskOff: '#b91c1c', Bifurcated: '#92400e',
  Strong: '#2d6a4f', Weak: '#b91c1c', Strengthening: '#92400e', Weakening: '#92400e',
  Permissive: '#2d6a4f', Restrictive: '#1e3a5f', Activist: '#92400e',
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
  const pendingDraftCount = useConvictionStore((s) => s.getPendingDraftCount())
  const [macroOpen, setMacroOpen] = useState(false)
  const [convictionOpen, setConvictionOpen] = useState(false)

  return (
    <>
      <header style={{
        height: 56,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        background: 'transparent',
        borderBottom: '1px solid rgba(0,0,0,0.15)',
        position: 'relative',
        zIndex: 1,
      }}>
        <LensSelector />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Conviction review button — only visible when drafts are pending */}
          {pendingDraftCount > 0 && (
            <button
              onClick={() => setConvictionOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(168,48,48,0.08)',
                border: '1px solid rgba(168,48,48,0.25)',
                borderRadius: 6, padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#A83030', flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: '#A83030', letterSpacing: '0.03em',
              }}>
                {pendingDraftCount} conviction {pendingDraftCount === 1 ? 'draft' : 'drafts'} pending
              </span>
            </button>
          )}

          {/* Macro regime button */}
          <button
            onClick={() => setMacroOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
            title="Edit macro regime"
          >
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: '#a8a5a0',
            }}>
              Macro Regime
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {REGIME_DOTS.map(({ key, label }) => {
                const value = regime[key] as string
                const dotColor = REGIME_DOT_COLORS[value] ?? '#a8a5a0'
                const displayLabel = REGIME_LABELS[value] ?? value

                return (
                  <div key={key} className="regime-tag" title={`${label}: ${value}`}>
                    <div className="regime-dot" style={{ background: dotColor }} />
                    <span style={{ color: dotColor }}>{displayLabel}</span>
                  </div>
                )
              })}
            </div>
          </button>

        </div>
      </header>

      {macroOpen && <MacroRegimeModal onClose={() => setMacroOpen(false)} />}
      {convictionOpen && <ConvictionReviewModal onClose={() => setConvictionOpen(false)} />}
    </>
  )
}
