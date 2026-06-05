import React, { useState } from 'react'
import { useMacroStore } from '../../store'
import { useFredStore } from '../../store/fredStore'
import {
  MacroRegime,
  RealRateRegime, CreditCycleRegime, LiquidityRegime,
  RiskAppetiteRegime, DollarRegime, PolicyRegime,
} from '../../types'

function fetchAge(iso: string | null): string {
  if (!iso) return '—'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const DQ_COLORS: Record<string, string> = {
  Complete: '#2d6a4f', Partial: '#92400e', Insufficient: '#A02828',
}

function FredRegimeBanner({
  onApply,
}: {
  onApply: (updates: Partial<Omit<MacroRegime, 'userOverrides' | 'lastUpdated'>>) => void
}) {
  const { classification, isLoading, lastFetched, fetchFredData } = useFredStore()
  const [expanded, setExpanded] = useState(false)

  const dq = classification?.dataQuality ?? 'Insufficient'
  const dqColor = DQ_COLORS[dq] ?? '#A02828'

  function handleApply() {
    if (!classification?.suggestedRegime) return
    const { realRates, creditCycle, liquidity, riskAppetite } = classification.suggestedRegime
    const updates: Partial<Omit<MacroRegime, 'userOverrides' | 'lastUpdated'>> = {}
    if (realRates)    updates.realRates    = realRates
    if (creditCycle)  updates.creditCycle  = creditCycle
    if (liquidity)    updates.liquidity    = liquidity
    if (riskAppetite) updates.riskAppetite = riskAppetite
    onApply(updates)
  }

  return (
    <div style={{
      border: '1px solid #D8D0C4', borderRadius: 10,
      background: 'rgba(248,244,238,0.7)',
      overflow: 'hidden',
    }}>
      {/* Header row — always visible */}
      <div
        role="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 12px', cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dqColor, flexShrink: 0 }} />
        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: '#7A5A38', textTransform: 'uppercase' }}>
          FRED
        </span>
        <span style={{ fontSize: 10, color: '#A8A098', flex: 1 }}>
          {lastFetched ? `${dq} · ${fetchAge(lastFetched)}` : 'No data fetched'}
        </span>
        {isLoading && (
          <span style={{
            width: 10, height: 10, borderRadius: '50%',
            border: '2px solid rgba(0,0,0,0.10)',
            borderTopColor: '#f4922c',
            display: 'inline-block',
            animation: 'fredSpin 0.7s linear infinite',
            flexShrink: 0,
          }} />
        )}
        <span style={{ fontSize: 10, color: '#A8A098', transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px solid #E8E0D4' }}>
          {!classification && !isLoading && (
            <p style={{ fontSize: 11, color: '#A8A098', padding: '8px 0' }}>
              No FRED data yet. Click "Refresh" to fetch.
            </p>
          )}
          {classification && (
            <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {classification.reasoning.map((line, i) => (
                <p key={i} style={{ fontSize: 10.5, color: '#6b6860', lineHeight: 1.45 }}>{line}</p>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleApply}
              disabled={!classification || Object.keys(classification.suggestedRegime).length === 0}
              className="px-2.5 py-0.5 text-[10px] rounded-full border transition-colors"
              style={classification && Object.keys(classification.suggestedRegime).length > 0 ? {
                borderColor: 'rgba(154,122,80,0.5)',
                background: 'rgba(154,122,80,0.12)',
                color: '#7A5A38',
                fontWeight: 700,
                cursor: 'pointer',
              } : {
                borderColor: '#D8D0C4',
                color: '#A8A098',
                cursor: 'not-allowed',
              }}
            >
              Apply FRED Suggestions
            </button>
            <button
              onClick={() => fetchFredData()}
              disabled={isLoading}
              className="px-2.5 py-0.5 text-[10px] rounded-full border transition-colors"
              style={{
                borderColor: '#D8D0C4',
                color: isLoading ? '#A8A098' : '#6b6860',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Fetching…' : 'Refresh FRED Data'}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes fredSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

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

  function handleApplyFred(updates: Partial<Omit<MacroRegime, 'userOverrides' | 'lastUpdated'>>) {
    updateRegime(updates)
    setDraft((d) => ({ ...d, ...updates }))
  }

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

          <FredRegimeBanner onApply={handleApplyFred} />

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
