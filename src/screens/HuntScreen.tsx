import React, { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  type HuntContext,
  type OpportunityBrief,
} from '../api/opportunityAgent'
import {
  type FundOpportunityBrief,
} from '../api/fundHuntAgent'
import { useThesisStore } from '../store/thesisStore'
import { usePortfolioStore } from '../store/portfolioStore'
import { useMacroStore } from '../store/macroStore'
import { useHuntStore } from '../store/huntStore'
import { getResolvedOpenAIModel } from '../api/openai'
import { createThesisFromHuntBrief, isDuplicateInDossier } from '../utils/huntToThesis'
import { isActive } from '../utils/thesisHelpers'

const tk = {
  bg: '#ede9e0', surface: '#f5f2eb', border: '#d8d0c4',
  borderLight: 'rgba(216,208,196,0.5)', amber: '#c4892a',
  amberLight: 'rgba(196,137,42,0.12)', text: '#18140e',
  textMid: '#4a3c2e', textMuted: '#8a7a6a',
  green: '#2e6e4a', greenLight: 'rgba(46,110,74,0.10)',
  red: '#a83030', redLight: 'rgba(168,48,48,0.10)',
  blue: '#1e4d6b', blueLight: 'rgba(30,77,107,0.10)',
}


interface DossierToast {
  ticker: string
  thesisId: string
  kind: 'success' | 'duplicate'
}

const ConvictionBar: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const color = score >= 70 ? tk.green : score >= 45 ? tk.amber : tk.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(216,208,196,0.5)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28, textAlign: 'right' as const }}>{score}</span>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', padding: '2px 7px', borderRadius: 4, background: color === tk.green ? tk.greenLight : color === tk.amber ? tk.amberLight : tk.redLight, color, border: `1px solid ${color}40` }}>{label}</span>
    </div>
  )
}

const EvidencePill: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = tk.blue }) => {
  const rgb = color === tk.green ? '46,110,74' : color === tk.amber ? '196,137,42' : '30,77,107'
  return (
    <div style={{ padding: '6px 11px', borderRadius: 7, background: `rgba(${rgb},0.07)`, border: `1px solid rgba(${rgb},0.20)`, display: 'flex', flexDirection: 'column' as const, gap: 2 }}>
      <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted }}>{label}</span>
      <span style={{ fontSize: 11, color: tk.textMid, lineHeight: 1.4 }}>{value}</span>
    </div>
  )
}

const ActionBadge: React.FC<{ action: 'advance_to_dossier' | 'watch' | 'pass' }> = ({ action }) => {
  const cfg = {
    advance_to_dossier: { label: 'Advance to Dossier', color: tk.green, bg: tk.greenLight },
    watch: { label: 'Watch', color: tk.amber, bg: tk.amberLight },
    pass: { label: 'Pass', color: tk.textMuted, bg: 'rgba(216,208,196,0.4)' },
  }[action] ?? { label: "Watch", color: tk.amber, bg: tk.amberLight }
  return <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', padding: '4px 11px', borderRadius: 5, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>{cfg.label}</span>
}

const OpportunityCard: React.FC<{
  brief: OpportunityBrief
  onAdvance: (b: OpportunityBrief) => void
  duplicate?: boolean
}> = ({ brief, onAdvance, duplicate }) => {
  const [expanded, setExpanded] = useState(brief.rank === 1)
  return (
    <div style={{ border: `1px solid ${brief.rank === 1 ? tk.amber : tk.border}`, borderRadius: 12, background: tk.surface, overflow: 'hidden', boxShadow: brief.rank === 1 ? `0 0 0 1px rgba(196,137,42,0.15), 0 4px 20px rgba(0,0,0,0.06)` : '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '16px 20px', cursor: 'pointer', background: brief.rank === 1 ? 'rgba(196,137,42,0.04)' : 'transparent', borderBottom: expanded ? `1px solid ${tk.borderLight}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: brief.rank === 1 ? tk.amber : 'rgba(216,208,196,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: brief.rank === 1 ? '#fff' : tk.textMuted }}>{brief.rank}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: tk.text }}>{brief.ticker}</span>
            <span style={{ fontSize: 12, color: tk.textMid }}>{brief.companyName}</span>
            <span style={{ fontSize: 9, color: tk.textMuted, padding: '2px 7px', borderRadius: 4, background: tk.amberLight, border: `1px solid rgba(196,137,42,0.2)` }}>{brief.thesisType}</span>
            <div style={{ marginLeft: 'auto' }}><ActionBadge action={brief.suggestedAction} /></div>
          </div>
          <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.6, margin: '0 0 10px' }}>{brief.thesisStatement}</p>
          <ConvictionBar score={brief.conviction} label={brief.convictionLabel} />
        </div>
        <span style={{ fontSize: 14, color: tk.textMuted, flexShrink: 0, marginTop: 4 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' as const, gap: 18 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 10 }}>Evidence Chain</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {brief.vaultSignals.length > 0 && <EvidencePill label="Your Vault" value={brief.vaultSignals[0]} color={tk.amber} />}
              {brief.insiderSignal && brief.insiderSignal !== 'No recent insider activity data' && (
                <EvidencePill label="Insider Signal" value={brief.insiderSignal} color={brief.insiderSignal.includes('purchase') || brief.insiderSignal.includes('buying') ? tk.green : tk.red} />
              )}
              {brief.analystConsensus && <EvidencePill label="Analyst Consensus" value={brief.analystConsensus} color={tk.blue} />}
              {brief.morningstarView && brief.morningstarView !== 'See full research brief' && (
                <EvidencePill label="Morningstar" value={brief.morningstarView.slice(0, 120)} color={tk.amber} />
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Transmission Path</p>
              <p style={{ fontSize: 11, color: tk.textMid, lineHeight: 1.6, margin: 0 }}>{brief.transmissionPath}</p>
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Variant Perception</p>
              <p style={{ fontSize: 11, color: tk.textMid, lineHeight: 1.6, margin: 0 }}>{brief.variantPerception}</p>
            </div>
          </div>

          {brief.marketMetrics && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Market Data (Finnhub)</p>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(242,236,226,0.6)', border: `1px solid ${tk.borderLight}`, fontSize: 11, color: tk.textMid, lineHeight: 1.7, whiteSpace: 'pre-line' as const }}>{brief.marketMetrics}</div>
            </div>
          )}

          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>18-Voice Advisor Panel</p>
            <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(26,26,31,0.04)', border: `1px solid ${tk.borderLight}`, fontSize: 12, color: tk.textMid, lineHeight: 1.7, fontStyle: 'italic' }}>"{brief.advisorVerdict}"</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.red, marginBottom: 6 }}>Key Risks</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {brief.keyRisks.map((r, i) => <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: tk.textMid, lineHeight: 1.5 }}><span style={{ color: tk.red, flexShrink: 0 }}>⚠</span>{r}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Kill Conditions</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {brief.killConditions.map((k, i) => <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: tk.textMid, lineHeight: 1.5 }}><span style={{ color: tk.textMuted, flexShrink: 0 }}>✕</span>{k}</li>)}
              </ul>
            </div>
          </div>

          {brief.suggestedAction === 'watch' && brief.watchTriggers && brief.watchTriggers.length > 0 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.amber, marginBottom: 6 }}>Watch Triggers — advance when...</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {brief.watchTriggers.map((wt, i) => <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: tk.textMid, lineHeight: 1.5 }}><span style={{ color: tk.amber, flexShrink: 0 }}>→</span>{wt}</li>)}
              </ul>
            </div>
          )}

          {brief.suggestedAction === 'advance_to_dossier' && (
            duplicate ? (
              <span style={{ fontSize: 11, color: tk.textMuted, fontWeight: 600 }}>Already in Dossier</span>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onAdvance(brief) }} style={{ padding: '10px 20px', borderRadius: 8, background: `linear-gradient(135deg, ${tk.amber}, #b07820)`, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', alignSelf: 'flex-start', boxShadow: '0 2px 8px rgba(196,137,42,0.3)' }}>
                Add to Dossier →
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

const FundOpportunityCard: React.FC<{
  brief: FundOpportunityBrief
  onAdvance: (b: FundOpportunityBrief) => void
  duplicate?: boolean
}> = ({ brief, onAdvance, duplicate }) => {
  const [expanded, setExpanded] = useState(brief.rank === 1)
  const topHoldingsStr = brief.topHoldings.slice(0, 5).join(', ') || 'Not available'
  const liquidityAum = `Liquidity: ${brief.liquidityAssessment} · AUM: ${brief.aum}`

  return (
    <div style={{ border: `1px solid ${brief.rank === 1 ? tk.amber : tk.border}`, borderRadius: 12, background: tk.surface, overflow: 'hidden', boxShadow: brief.rank === 1 ? `0 0 0 1px rgba(196,137,42,0.15), 0 4px 20px rgba(0,0,0,0.06)` : '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding: '16px 20px', cursor: 'pointer', background: brief.rank === 1 ? 'rgba(196,137,42,0.04)' : 'transparent', borderBottom: expanded ? `1px solid ${tk.borderLight}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, background: brief.rank === 1 ? tk.amber : 'rgba(216,208,196,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: brief.rank === 1 ? '#fff' : tk.textMuted }}>{brief.rank}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 800, color: tk.text }}>{brief.ticker}</span>
            <span style={{ fontSize: 12, color: tk.textMid }}>{brief.fundName}</span>
            <span style={{ fontSize: 9, color: tk.textMuted, padding: '2px 7px', borderRadius: 4, background: tk.amberLight, border: `1px solid rgba(196,137,42,0.2)` }}>{brief.fundType}</span>
            <div style={{ marginLeft: 'auto' }}><ActionBadge action={brief.suggestedAction} /></div>
          </div>
          <p style={{ fontSize: 12, color: tk.textMid, lineHeight: 1.6, margin: '0 0 10px' }}>{brief.regimeFit}</p>
          <ConvictionBar score={brief.conviction} label={brief.convictionLabel} />
        </div>
        <span style={{ fontSize: 14, color: tk.textMuted, flexShrink: 0, marginTop: 4 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column' as const, gap: 18 }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 10 }}>Evidence Chain</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              <EvidencePill label="Regime Fit" value={brief.regimeFit.slice(0, 120)} color={tk.amber} />
              <EvidencePill label="Expense Ratio" value={brief.expenseRatio} color={tk.blue} />
              <EvidencePill label="Top Holdings" value={topHoldingsStr.slice(0, 120)} color={tk.green} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Transmission Path</p>
              <p style={{ fontSize: 11, color: tk.textMid, lineHeight: 1.6, margin: 0 }}>{brief.transmissionPath}</p>
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Variant Perception</p>
              <p style={{ fontSize: 11, color: tk.textMid, lineHeight: 1.6, margin: 0 }}>{brief.variantPerception}</p>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Liquidity & AUM</p>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(242,236,226,0.6)', border: `1px solid ${tk.borderLight}`, fontSize: 11, color: tk.textMid, lineHeight: 1.7 }}>
              {liquidityAum}
              <br />
              Price: ${brief.currentPrice.toFixed(2)} ({brief.priceChangePct >= 0 ? '+' : ''}{brief.priceChangePct.toFixed(2)}%)
              {brief.concentrationRisk && <> · Concentration: {brief.concentrationRisk}</>}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>18-Voice Advisor Panel</p>
            <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(26,26,31,0.04)', border: `1px solid ${tk.borderLight}`, fontSize: 12, color: tk.textMid, lineHeight: 1.7, fontStyle: 'italic' }}>"{brief.advisorVerdict}"</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.red, marginBottom: 6 }}>Key Risks</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {brief.keyRisks.map((r, i) => <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: tk.textMid, lineHeight: 1.5 }}><span style={{ color: tk.red, flexShrink: 0 }}>⚠</span>{r}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 6 }}>Kill Conditions</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {brief.killConditions.map((k, i) => <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: tk.textMid, lineHeight: 1.5 }}><span style={{ color: tk.textMuted, flexShrink: 0 }}>✕</span>{k}</li>)}
              </ul>
            </div>
          </div>

          {brief.suggestedAction === 'watch' && brief.watchTriggers && brief.watchTriggers.length > 0 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.amber, marginBottom: 6 }}>Watch Triggers — advance when...</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                {brief.watchTriggers.map((wt, i) => <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: tk.textMid, lineHeight: 1.5 }}><span style={{ color: tk.amber, flexShrink: 0 }}>→</span>{wt}</li>)}
              </ul>
            </div>
          )}

          {brief.suggestedAction === 'advance_to_dossier' && (
            duplicate ? (
              <span style={{ fontSize: 11, color: tk.textMuted, fontWeight: 600 }}>Already in Dossier</span>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onAdvance(brief) }} style={{ padding: '10px 20px', borderRadius: 8, background: `linear-gradient(135deg, ${tk.amber}, #b07820)`, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', alignSelf: 'flex-start', boxShadow: '0 2px 8px rgba(196,137,42,0.3)' }}>
                Add to Dossier →
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

export const HuntScreen: React.FC = () => {
  const mode = useHuntStore((s) => s.mode)
  const setMode = useHuntStore((s) => s.setMode)
  const stockResult = useHuntStore((s) => s.stockResult)
  const fundResult = useHuntStore((s) => s.fundResult)
  const isRunning = useHuntStore((s) => s.isRunning)
  const phase = useHuntStore((s) => s.phase)
  const progress = useHuntStore((s) => s.progress)
  const focusAreas = useHuntStore((s) => s.focusAreas)
  const setFocusAreas = useHuntStore((s) => s.setFocusAreas)
  const startHunt = useHuntStore((s) => s.startHunt)
  const startFundHunt = useHuntStore((s) => s.startFundHunt)
  const [toast, setToast] = useState<DossierToast | null>(null)

  const thesesMap = useThesisStore((s) => s.theses)
  const addThesis = useThesisStore((s) => s.addThesis)
  const lens = usePortfolioStore((s) => s.lens)
  const macroRegimeObj = useMacroStore((s) => s.regime)

  const theses = useMemo(() => Object.values(thesesMap), [thesesMap])

  const macroRegime = macroRegimeObj
    ? `${macroRegimeObj.realRates} Real Rates, ${macroRegimeObj.creditCycle}, ${macroRegimeObj.liquidity} Liquidity, ${macroRegimeObj.riskAppetite} Risk Appetite, ${macroRegimeObj.dollar} Dollar, ${macroRegimeObj.policy} Policy`
    : 'High Real Rates, LateCycle, Normal Liquidity, Neutral Risk Appetite, Strong Dollar, Restrictive Policy'

  const buildContext = useCallback((): HuntContext => ({
    macroRegime,
    activeThesisSummaries: theses
      .filter((th) => isActive(th.stage))
      .slice(0, 5)
      .map((th) => `${th.ticker ?? th.name}: ${th.statement?.slice(0, 100) ?? ''}`),
    killRecordSummaries: theses
      .filter((th) => th.stage === 'Broken')
      .slice(0, 5)
      .map((th) => `${th.ticker ?? th.name}: killed`),
    portfolioExposures: ['Industrial REIT (Prologis / PLD) — very heavy concentration', 'US large-cap equities (general)'],
    targetThesisCount: 3,
    focusAreas: focusAreas.trim() || undefined,
  }), [theses, macroRegime, focusAreas])

  const isDuplicate = useCallback((ticker: string) =>
    isDuplicateInDossier(thesesMap, ticker), [thesesMap])

  const showToast = (next: DossierToast) => {
    setToast(next)
    setTimeout(() => setToast(null), 6000)
  }

  const addBriefToDossier = (input: {
    ticker: string
    displayName: string
    thesisType: string
    mispricedVariable?: string
    thesisStatement: string
    transmissionPath: string
    variantPerception: string
    vaultSignals: string[]
    keyRisks: string[]
    killConditions?: string[]
  }) => {
    if (isDuplicate(input.ticker)) {
      showToast({ ticker: input.ticker, thesisId: '', kind: 'duplicate' })
      return
    }
    const thesis = createThesisFromHuntBrief(input, lens)
    addThesis(thesis)
    showToast({ ticker: input.ticker, thesisId: thesis.id, kind: 'success' })
  }

  const handleStockAdvance = (brief: OpportunityBrief) => {
    addBriefToDossier({
      ticker: brief.ticker,
      displayName: brief.companyName,
      thesisType: brief.thesisType,
      mispricedVariable: brief.mispricedVariable,
      thesisStatement: brief.thesisStatement,
      transmissionPath: brief.transmissionPath,
      variantPerception: brief.variantPerception,
      vaultSignals: brief.vaultSignals,
      keyRisks: brief.keyRisks,
      killConditions: brief.killConditions,
    })
  }

  const handleFundAdvance = (brief: FundOpportunityBrief) => {
    addBriefToDossier({
      ticker: brief.ticker,
      displayName: brief.fundName,
      thesisType: brief.thesisType,
      thesisStatement: brief.regimeFit,
      transmissionPath: brief.transmissionPath,
      variantPerception: brief.variantPerception,
      vaultSignals: brief.topHoldings,
      keyRisks: brief.keyRisks,
      killConditions: brief.killConditions,
    })
  }

  const handleHunt = async () => {
    const context = buildContext()
    if (mode === 'stocks') {
      await startHunt(context)
    } else {
      await startFundHunt(context)
    }
  }

  const result = mode === 'stocks' ? stockResult : fundResult

  return (
    <div style={{ minHeight: '100vh', background: tk.bg, padding: '32px 40px', fontFamily: 'Geist, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {toast && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: toast.kind === 'success' ? tk.greenLight : 'rgba(216,208,196,0.5)',
            border: `1px solid ${toast.kind === 'success' ? 'rgba(46,110,74,0.35)' : tk.border}`,
          }}>
            <span style={{ fontSize: 12, color: toast.kind === 'success' ? tk.green : tk.textMid, fontWeight: 600 }}>
              {toast.kind === 'success'
                ? `${toast.ticker} added to Dossier → Developing`
                : 'Already in Dossier'}
            </span>
            {toast.kind === 'success' && toast.thesisId && (
              <Link
                to={`/thesis/${toast.thesisId}`}
                style={{ fontSize: 11, fontWeight: 700, color: tk.green, textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                View thesis →
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${tk.amber}, #b07820)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(196,137,42,0.3)' }}>
            <span style={{ fontSize: 16 }}>⚡</span>
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: tk.text, margin: 0, letterSpacing: '-0.02em' }}>Opportunity Agent</h1>
            <p style={{ fontSize: 12, color: tk.textMuted, margin: 0 }}>Hunts while you're busy. Returns fully underwritten thesis drafts.</p>
          </div>
          <div style={{ display: 'inline-flex', background: '#f5f2eb', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['stocks', 'funds'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: mode === m ? 600 : 500,
                  color: mode === m ? '#1a1a1f' : '#6b6860',
                  border: 'none',
                  background: mode === m ? '#e8e4d8' : 'transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {!isRunning && (
          <div style={{ padding: '16px 20px', borderRadius: 10, background: tk.surface, border: `1px solid ${tk.border}`, marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: tk.textMuted, marginBottom: 10 }}>Hunt Context</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 10, color: tk.textMuted, marginBottom: 3 }}>Macro Regime</p>
                <p style={{ fontSize: 12, color: tk.textMid, fontWeight: 500, margin: 0 }}>{macroRegime}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: tk.textMuted, marginBottom: 3 }}>Data Sources</p>
                <p style={{ fontSize: 12, color: tk.textMid, margin: 0 }}>Finnhub · OpenAI ({getResolvedOpenAIModel()})</p>
              </div>
            </div>
            <p style={{ fontSize: 10, color: tk.textMuted, marginBottom: 5 }}>Focus Areas (optional)</p>
            <input
              type="text"
              value={focusAreas}
              onChange={e => setFocusAreas(e.target.value)}
              placeholder={mode === 'stocks'
                ? "e.g. 'freight infrastructure, defense supply chain, energy transition'"
                : "e.g. 'rate-sensitive bonds, small-cap value, international diversification'"}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: `1px solid ${tk.border}`, background: tk.bg, fontSize: 12, color: tk.text, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
        )}

        <div style={{ marginBottom: 32 }}>
          {!isRunning ? (
            <button onClick={handleHunt} style={{ padding: '14px 32px', borderRadius: 10, background: `linear-gradient(135deg, ${tk.amber}, #b07820)`, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#fff', boxShadow: '0 4px 16px rgba(196,137,42,0.35)' }}>
              Hunt for me →
            </button>
          ) : (
            <div style={{ padding: '16px 24px', borderRadius: 10, background: tk.surface, border: `1px solid ${tk.border}`, display: 'flex', flexDirection: 'column' as const, gap: 12, maxWidth: 480 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${tk.amber}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: tk.textMid }}>{phase}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(216,208,196,0.5)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: tk.amber, borderRadius: 2, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}
        </div>

        {result && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${tk.borderLight}` }}>
              {mode === 'stocks' && stockResult && ([
                { label: 'Vault Signals', value: String(stockResult.vaultSignalsFound), hi: false },
                { label: 'Candidates', value: String(stockResult.candidatesEvaluated), hi: false },
                { label: 'Opportunities', value: String(stockResult.opportunities.length), hi: true },
                { label: 'Duration', value: `${(stockResult.durationMs / 1000).toFixed(0)}s`, hi: false },
              ] as const).map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <div style={{ width: 1, height: 36, background: tk.borderLight }} />}
                  <div>
                    <span style={{ fontSize: 9, color: tk.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>{stat.label}</span>
                    <p style={{ fontSize: 20, fontWeight: 800, color: stat.hi ? tk.amber : tk.text, margin: '2px 0 0', fontFamily: 'monospace' }}>{stat.value}</p>
                  </div>
                </React.Fragment>
              ))}
              {mode === 'funds' && fundResult && ([
                { label: 'Candidates', value: String(fundResult.candidatesEvaluated), hi: false },
                { label: 'Opportunities', value: String(fundResult.opportunities.length), hi: true },
                { label: 'Duration', value: `${(fundResult.durationMs / 1000).toFixed(0)}s`, hi: false },
              ] as const).map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <div style={{ width: 1, height: 36, background: tk.borderLight }} />}
                  <div>
                    <span style={{ fontSize: 9, color: tk.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>{stat.label}</span>
                    <p style={{ fontSize: 20, fontWeight: 800, color: stat.hi ? tk.amber : tk.text, margin: '2px 0 0', fontFamily: 'monospace' }}>{stat.value}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {result.agentNotes && (
              <div style={{ padding: '10px 16px', borderRadius: 8, background: tk.blueLight, border: `1px solid rgba(30,77,107,0.2)`, marginBottom: 20, fontSize: 11, color: tk.textMid, lineHeight: 1.6 }}>
                <span style={{ fontWeight: 700, color: tk.blue }}>Agent: </span>{result.agentNotes}
              </div>
            )}

            {result.error && (
              <div style={{ padding: '12px 16px', borderRadius: 8, background: tk.redLight, border: `1px solid rgba(168,48,48,0.25)`, marginBottom: 20, fontSize: 12, color: tk.red }}>{result.error}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
              {mode === 'stocks' && stockResult?.opportunities.map(brief => (
                <OpportunityCard
                  key={brief.ticker}
                  brief={brief}
                  onAdvance={handleStockAdvance}
                  duplicate={isDuplicate(brief.ticker)}
                />
              ))}
              {mode === 'funds' && fundResult?.opportunities.map(brief => (
                <FundOpportunityCard
                  key={brief.ticker}
                  brief={brief}
                  onAdvance={handleFundAdvance}
                  duplicate={isDuplicate(brief.ticker)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
