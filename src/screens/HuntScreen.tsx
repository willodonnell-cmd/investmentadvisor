import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useVolatilityStore } from '../store/volatilityStore'
import type { VolRegime } from '../api/volatilityOverlay'
import { type HuntContext, type OpportunityBrief } from '../api/opportunityAgent'
import { type FundOpportunityBrief } from '../api/fundHuntAgent'
import { useThesisStore } from '../store/thesisStore'
import { usePortfolioStore } from '../store/portfolioStore'
import { useMacroStore } from '../store/macroStore'
import { useHuntStore } from '../store/huntStore'
import { getResolvedOpenAIModel } from '../api/openai'
import { addHuntThesisToDossier, isDuplicateInDossier } from '../utils/huntToThesis'
import { isActive } from '../utils/thesisHelpers'
import { useTopBar } from '../store/topbarStore'
import { AskAIDock } from '../components/ui/AskAIDock'
import { Sunburst } from '../components/ui/Sunburst'

type FilterAction = 'all' | 'advance_to_dossier' | 'watch' | 'pass'

const tk = {
  bg: '#ede9e0', surface: '#f5f2eb', surface2: '#e8e4d8', card: '#fbf8f1',
  ink: '#1a1a1f', ink2: '#3a3a42', muted: '#6b6960', muted2: '#8b8980',
  hairline: 'rgba(0,0,0,0.08)', hairline2: 'rgba(0,0,0,0.14)',
  sun2: '#f4922c', sun3: '#e0511a',
  green: '#2d6a4f', greenLight: 'rgba(45,106,79,0.10)',
  neg: '#9b2c1a', negLight: 'rgba(155,44,26,0.10)',
  amber: '#c4892a', amberLight: 'rgba(196,137,42,0.12)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function convColor(score: number) {
  return score >= 70 ? tk.green : score >= 45 ? tk.amber : tk.neg
}

function thesisTypePill(label: string) {
  const upper = label.toUpperCase().slice(0, 10)
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
      padding: '2px 7px', borderRadius: 3,
      background: tk.amberLight, color: '#7a4a0c',
      border: '1px solid rgba(196,137,42,0.25)',
    }}>
      {upper}
    </span>
  )
}

function actionBadge(action: string) {
  const cfg = {
    advance_to_dossier: { label: 'Advance to Dossier', color: tk.green, bg: tk.greenLight },
    watch:              { label: 'Watch',              color: tk.amber,  bg: tk.amberLight },
    pass:               { label: 'Pass',               color: tk.muted2, bg: 'rgba(216,208,196,0.35)' },
  }[action] ?? { label: action, color: tk.muted2, bg: 'rgba(216,208,196,0.35)' }
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
      padding: '3px 9px', borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Opportunity card (stocks) ─────────────────────────────────────────────────

const StockOppCard: React.FC<{
  brief: OpportunityBrief
  onAdvance: () => void
  duplicate: boolean
  volElevated?: boolean
}> = ({ brief, onAdvance, duplicate, volElevated }) => {
  const [hovered, setHovered] = useState(false)
  const score = brief.conviction
  const color = convColor(score)
  const isTop = brief.rank === 1

  const evidencePills = [
    brief.vaultSignals?.[0] && { dot: tk.amber, text: brief.vaultSignals[0].slice(0, 40) },
    brief.insiderSignal && { dot: tk.green, text: brief.insiderSignal.slice(0, 40) },
    brief.morningstarView && { dot: tk.amber, text: `Morningstar · ${brief.morningstarView.slice(0, 30)}` },
    brief.analystConsensus && { dot: '#1e4d6b', text: brief.analystConsensus.slice(0, 40) },
  ].filter(Boolean) as { dot: string; text: string }[]

  return (
    <Link to={`/stock/${brief.ticker}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${hovered ? tk.amber + '60' : isTop ? tk.amber + '40' : tk.hairline}`,
          borderRadius: 12,
          background: isTop
            ? `linear-gradient(to right, rgba(196,137,42,0.05), ${tk.card})`
            : tk.card,
          overflow: 'hidden',
          boxShadow: hovered
            ? '0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 20px -14px rgba(0,0,0,0.18)'
            : '0 1px 0 rgba(255,255,255,0.5) inset, 0 1px 2px rgba(0,0,0,0.02)',
          transition: 'box-shadow 150ms, border-color 150ms',
          cursor: 'pointer',
        }}
      >
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 200px' }}>
        {/* Rank disc */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '18px 0',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...(isTop ? {
              background: `radial-gradient(circle at 50% 32%, rgba(255,250,235,.7) 0%, rgba(255,250,235,0) 38%), radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)`,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.4)',
            } : {
              background: tk.surface2,
              border: `1px solid ${tk.hairline}`,
            }),
          }}>
            <span style={{
              fontFamily: 'GeistMono, monospace', fontSize: 12, fontWeight: 700,
              color: isTop ? '#fff' : tk.muted2,
            }}>
              {brief.rank}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 14px 16px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 15, fontWeight: 700, color: tk.ink, letterSpacing: '0.02em' }}>
              {brief.ticker}
            </span>
            <span style={{ fontSize: 13, color: tk.ink2, fontWeight: 500 }}>
              {brief.companyName}
            </span>
            {thesisTypePill(brief.thesisType)}
            <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
              {brief.suggestedAction === 'advance_to_dossier' && !duplicate && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdvance() }}
                  style={{
                    fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
                    padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
                    background: tk.green, color: '#fff',
                  }}
                >
                  Advance to Dossier
                </button>
              )}
              {brief.suggestedAction === 'advance_to_dossier' && duplicate && (
                <span style={{ fontSize: 9.5, color: tk.muted2, fontWeight: 600 }}>In Dossier</span>
              )}
              {brief.suggestedAction !== 'advance_to_dossier' && actionBadge(brief.suggestedAction)}
            </span>
          </div>

          <p style={{ fontSize: 13, color: tk.ink2, lineHeight: 1.5, margin: 0 }}>
            {brief.thesisStatement}
          </p>

          {evidencePills.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {evidencePills.slice(0, 4).map((p, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, color: tk.ink2, fontFamily: 'GeistMono, monospace',
                  background: tk.surface, border: `1px solid ${tk.hairline}`,
                  borderRadius: 99, padding: '2px 8px',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                  {p.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Conviction column */}
        <div style={{
          borderLeft: `1px solid ${tk.hairline}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '16px 18px', gap: 8,
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: tk.muted2 }}>
            Conviction
          </span>
          <span style={{
            fontFamily: 'GeistMono, monospace', fontSize: 22, fontWeight: 600,
            color, letterSpacing: '-0.01em', lineHeight: 1,
          }}>
            {score}
          </span>
          <div style={{ width: '100%', height: 5, borderRadius: 99, background: tk.surface2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${score}%`,
              background: `linear-gradient(90deg, ${tk.sun2}, ${tk.sun3})`,
              borderRadius: 99,
            }} />
          </div>
        </div>
      </div>{/* end inner grid */}
      {volElevated && (
        <div style={{
          borderTop: `1px solid ${tk.hairline}`,
          padding: '5px 14px',
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(196,137,42,0.04)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4892a', flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, color: '#7a4a0c', fontFamily: 'GeistMono, monospace', letterSpacing: '0.005em' }}>
            Vol elevated — consider scaling entry
          </span>
        </div>
      )}
      </div>
    </Link>
  )
}

// ── Fund opportunity card ─────────────────────────────────────────────────────

const FundOppCard: React.FC<{
  brief: FundOpportunityBrief
  onAdvance: () => void
  duplicate: boolean
  volElevated?: boolean
}> = ({ brief, onAdvance, duplicate, volElevated }) => {
  const [hovered, setHovered] = useState(false)
  const score = brief.conviction
  const color = convColor(score)
  const isTop = brief.rank === 1

  const evidencePills = [
    brief.expenseRatio && { dot: tk.green, text: `ER ${brief.expenseRatio}` },
    brief.aum && { dot: '#1e4d6b', text: `AUM ${brief.aum}` },
    brief.topHoldings?.[0] && { dot: tk.amber, text: `Top: ${brief.topHoldings[0]}` },
  ].filter(Boolean) as { dot: string; text: string }[]

  return (
    <Link to={`/fund/${brief.ticker}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${hovered ? tk.amber + '60' : isTop ? tk.amber + '40' : tk.hairline}`,
          borderRadius: 12, background: isTop
            ? `linear-gradient(to right, rgba(196,137,42,0.05), ${tk.card})`
            : tk.card,
          overflow: 'hidden',
          boxShadow: hovered
            ? '0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 20px -14px rgba(0,0,0,0.18)'
            : '0 1px 0 rgba(255,255,255,0.5) inset, 0 1px 2px rgba(0,0,0,0.02)',
          transition: 'box-shadow 150ms, border-color 150ms',
          cursor: 'pointer',
        }}
      >
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 200px' }}>
        {/* Rank disc */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px 0' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            ...(isTop ? {
              background: `radial-gradient(circle at 50% 32%, rgba(255,250,235,.7) 0%, rgba(255,250,235,0) 38%), radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)`,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.4)',
            } : { background: tk.surface2, border: `1px solid ${tk.hairline}` }),
          }}>
            <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 12, fontWeight: 700, color: isTop ? '#fff' : tk.muted2 }}>
              {brief.rank}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 14px 16px 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 15, fontWeight: 700, color: tk.ink }}>
              {brief.ticker}
            </span>
            <span style={{ fontSize: 13, color: tk.ink2, fontWeight: 500 }}>{brief.fundName}</span>
            {thesisTypePill(brief.fundType)}
            <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
              {brief.suggestedAction === 'advance_to_dossier' && !duplicate && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdvance() }}
                  style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', background: tk.green, color: '#fff' }}
                >Advance to Dossier</button>
              )}
              {brief.suggestedAction === 'advance_to_dossier' && duplicate && (
                <span style={{ fontSize: 9.5, color: tk.muted2, fontWeight: 600 }}>In Dossier</span>
              )}
              {brief.suggestedAction !== 'advance_to_dossier' && actionBadge(brief.suggestedAction)}
            </span>
          </div>
          <p style={{ fontSize: 13, color: tk.ink2, lineHeight: 1.5, margin: 0 }}>{brief.regimeFit}</p>
          {evidencePills.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              {evidencePills.map((p, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10.5, color: tk.ink2, fontFamily: 'GeistMono, monospace',
                  background: tk.surface, border: `1px solid ${tk.hairline}`,
                  borderRadius: 99, padding: '2px 8px',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                  {p.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Conviction column */}
        <div style={{
          borderLeft: `1px solid ${tk.hairline}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '16px 18px', gap: 8,
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', color: tk.muted2 }}>Conviction</span>
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 22, fontWeight: 600, color, letterSpacing: '-0.01em', lineHeight: 1 }}>
            {score}
          </span>
          <div style={{ width: '100%', height: 5, borderRadius: 99, background: tk.surface2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${score}%`, background: `linear-gradient(90deg, ${tk.sun2}, ${tk.sun3})`, borderRadius: 99 }} />
          </div>
        </div>
      </div>{/* end inner grid */}
      {volElevated && (
        <div style={{
          borderTop: `1px solid ${tk.hairline}`,
          padding: '5px 14px',
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(196,137,42,0.04)',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#c4892a', flexShrink: 0 }} />
          <span style={{ fontSize: 10.5, color: '#7a4a0c', fontFamily: 'GeistMono, monospace', letterSpacing: '0.005em' }}>
            Vol elevated — consider scaling entry
          </span>
        </div>
      )}
      </div>
    </Link>
  )
}

// ── Vol regime banner ─────────────────────────────────────────────────────────

const REGIME_COLORS: Record<VolRegime, { pill: string; pillBg: string; dot: string }> = {
  Calm:     { pill: '#2d6a4f', pillBg: 'rgba(45,106,79,0.10)',   dot: '#2d6a4f' },
  Elevated: { pill: '#7a4a0c', pillBg: 'rgba(196,137,42,0.12)',  dot: '#c4892a' },
  Spike:    { pill: '#9a3a10', pillBg: 'rgba(224,81,26,0.12)',   dot: '#e0511a' },
  Crash:    { pill: '#7a1a1a', pillBg: 'rgba(155,44,26,0.12)',   dot: '#9b2c1a' },
}

const VolBanner: React.FC = () => {
  const { regime, lastFetched, isLoading, error, fetch } = useVolatilityStore()

  if (isLoading && !regime) {
    return (
      <div style={{
        marginBottom: 14, padding: '8px 14px', borderRadius: 8,
        background: tk.card, border: `1px solid ${tk.hairline}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10.5, color: tk.muted2, fontFamily: 'GeistMono, monospace' }}>
          Loading vol regime…
        </span>
      </div>
    )
  }

  if (error && !regime) {
    return (
      <div style={{
        marginBottom: 14, padding: '8px 14px', borderRadius: 8,
        background: tk.card, border: `1px solid ${tk.hairline}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10.5, color: tk.muted2, fontFamily: 'GeistMono, monospace' }}>
          Vol data unavailable
        </span>
        <button
          onClick={() => fetch()}
          style={{ fontSize: 10, color: tk.muted2, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          retry
        </button>
      </div>
    )
  }

  if (!regime) return null

  const c = REGIME_COLORS[regime.regime]
  const ago = lastFetched
    ? (() => {
        const s = Math.round((Date.now() - lastFetched) / 1000)
        if (s < 60) return `${s}s ago`
        const m = Math.round(s / 60)
        return `${m}m ago`
      })()
    : null

  return (
    <div style={{
      marginBottom: 14, padding: '9px 14px', borderRadius: 8,
      background: tk.card, border: `1px solid ${tk.hairline}`,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Regime pill */}
      <span style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
        padding: '3px 9px', borderRadius: 99,
        color: c.pill, background: c.pillBg, border: `1px solid ${c.dot}40`,
        flexShrink: 0,
      }}>
        {regime.regime}
      </span>

      {/* VIX level */}
      <span style={{
        fontFamily: 'GeistMono, monospace', fontSize: 12, fontWeight: 700, color: tk.ink,
        flexShrink: 0,
      }}>
        VIX {regime.level.toFixed(1)}
      </span>

      {/* Term structure */}
      {regime.termStructure !== 'unknown' && (
        <span style={{ fontSize: 10.5, color: tk.muted2, fontFamily: 'GeistMono, monospace', flexShrink: 0 }}>
          {regime.termStructure}
        </span>
      )}

      {/* Signal */}
      <span style={{ fontSize: 11.5, color: tk.ink2, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {regime.signal}
      </span>

      {/* Last refreshed */}
      {ago && (
        <span style={{ fontSize: 10, color: tk.muted2, fontFamily: 'GeistMono, monospace', flexShrink: 0 }}>
          {ago}
        </span>
      )}

      {/* Refresh button */}
      <button
        onClick={() => fetch()}
        disabled={isLoading}
        title="Refresh vol data"
        style={{
          background: 'none', border: 'none', cursor: isLoading ? 'default' : 'pointer',
          color: isLoading ? tk.hairline2 : tk.muted2, fontSize: 13, padding: '0 2px', flexShrink: 0,
        }}
      >
        ↻
      </button>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

interface DossierToast { ticker: string; thesisId: string; kind: 'success' | 'duplicate' }

export const HuntScreen: React.FC<{ mode: 'stocks' | 'funds' }> = ({ mode }) => {
  const stockResult = useHuntStore((s) => s.stockResult)
  const fundResult = useHuntStore((s) => s.fundResult)
  const isRunning = useHuntStore((s) => mode === 'stocks' ? s.stockRunning : s.fundRunning)
  const phase = useHuntStore((s) => mode === 'stocks' ? s.stockPhase : s.fundPhase)
  const progress = useHuntStore((s) => mode === 'stocks' ? s.stockProgress : s.fundProgress)
  const startHunt = useHuntStore((s) => s.startHunt)
  const startFundHunt = useHuntStore((s) => s.startFundHunt)
  const clearResult = useHuntStore((s) => mode === 'stocks' ? s.clearStockResult : s.clearFundResult)

  const { regime: volRegime, fetch: fetchVol } = useVolatilityStore()
  useEffect(() => { fetchVol() }, [])
  const volElevated = volRegime ? volRegime.regime !== 'Calm' : false

  const [toast, setToast] = useState<DossierToast | null>(null)
  const [filterAction, setFilterAction] = useState<FilterAction>('all')
  const [search, setSearch] = useState('')

  const title = mode === 'stocks' ? 'Search Stocks' : 'Search Funds'
  const result = mode === 'stocks' ? stockResult : fundResult

  useTopBar({
    title,
    crumb: result
      ? `${result.opportunities.length} candidates`
      : undefined,
  })

  const thesesMap = useThesisStore((s) => s.theses)
  const lens = usePortfolioStore((s) => s.lens)
  const macroRegimeObj = useMacroStore((s) => s.regime)
  const theses = useMemo(() => Object.values(thesesMap), [thesesMap])

  const macroRegime = macroRegimeObj
    ? `${macroRegimeObj.realRates} Real Rates, ${macroRegimeObj.creditCycle}, ${macroRegimeObj.liquidity} Liquidity, ${macroRegimeObj.riskAppetite} Risk Appetite, ${macroRegimeObj.dollar} Dollar, ${macroRegimeObj.policy} Policy`
    : 'High Real Rates, LateCycle, Normal Liquidity, Neutral Risk Appetite, Strong Dollar, Restrictive Policy'

  const regimeLabel = macroRegimeObj
    ? `${macroRegimeObj.creditCycle.replace('LateCycle', 'Late-cycle').replace('EarlyCycle', 'Early-cycle')} · ${macroRegimeObj.dollar.toLowerCase()} dollar · ${macroRegimeObj.policy.toLowerCase()} policy`
    : 'Late-cycle · strong dollar · restrictive policy'

  const buildContext = useCallback((): HuntContext => ({
    macroRegime,
    activeThesisSummaries: theses
      .filter((th) => isActive(th.stage))
      .slice(0, 5)
      .map((th) => `${th.ticker ?? th.name}: ${th.statement?.slice(0, 100) ?? ''}`),
    killRecordSummaries: theses.filter((th) => th.stage === 'Broken').slice(0, 5).map((th) => `${th.ticker ?? th.name}: killed`),
    portfolioExposures: ['Industrial REIT (Prologis / PLD) — very heavy concentration', 'US large-cap equities (general)'],
    targetThesisCount: 3,
  }), [theses, macroRegime])

  const isDuplicate = useCallback((ticker: string) => isDuplicateInDossier(thesesMap, ticker), [thesesMap])

  const showToast = (next: DossierToast) => { setToast(next); setTimeout(() => setToast(null), 6000) }

  const addBriefToDossier = (input: Parameters<typeof addHuntThesisToDossier>[0]) => {
    if (isDuplicate(input.ticker)) { showToast({ ticker: input.ticker, thesisId: '', kind: 'duplicate' }); return }
    const thesis = addHuntThesisToDossier(input, lens)
    showToast({ ticker: input.ticker, thesisId: thesis.id, kind: 'success' })
  }

  const handleHunt = async () => {
    const context = { ...buildContext(), focusAreas: search.trim() || undefined }
    if (mode === 'stocks') await startHunt(context)
    else await startFundHunt(context)
  }

  // Filtered opportunities
  const stockOpps = useMemo(() => {
    let opps = stockResult?.opportunities ?? []
    if (filterAction !== 'all') opps = opps.filter(o => o.suggestedAction === filterAction)
    if (search.trim()) {
      const q = search.toLowerCase()
      opps = opps.filter(o =>
        o.ticker.toLowerCase().includes(q) ||
        o.companyName.toLowerCase().includes(q) ||
        o.thesisStatement.toLowerCase().includes(q)
      )
    }
    return opps
  }, [stockResult, filterAction, search])

  const fundOpps = useMemo(() => {
    let opps = fundResult?.opportunities ?? []
    if (filterAction !== 'all') opps = opps.filter(o => o.suggestedAction === filterAction)
    if (search.trim()) {
      const q = search.toLowerCase()
      opps = opps.filter(o =>
        o.ticker.toLowerCase().includes(q) ||
        o.fundName.toLowerCase().includes(q) ||
        o.regimeFit.toLowerCase().includes(q)
      )
    }
    return opps
  }, [fundResult, filterAction, search])

  const activeOpps = mode === 'stocks' ? stockOpps : fundOpps
  const totalOpps = result?.opportunities.length ?? 0
  const advanceCount = result?.opportunities.filter(o => o.suggestedAction === 'advance_to_dossier').length ?? 0
  const watchCount = result?.opportunities.filter(o => o.suggestedAction === 'watch').length ?? 0
  const passCount = result?.opportunities.filter(o => o.suggestedAction === 'pass').length ?? 0

  return (
    <div style={{ padding: '18px 24px 60px', minWidth: 900 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
          background: tk.card, border: `1px solid ${tk.hairline2}`,
          borderRadius: 99, padding: '8px 16px',
          boxShadow: '0 10px 28px -16px rgba(0,0,0,.30), 0 2px 6px rgba(0,0,0,.06)',
          animation: 'toastIn 300ms ease',
        }}>
          <Sunburst size={16} />
          <span style={{ fontSize: 12, color: toast.kind === 'success' ? tk.green : tk.muted, fontWeight: 600 }}>
            {toast.kind === 'success' ? `${toast.ticker} added to Dossier` : 'Already in Dossier'}
          </span>
          {toast.kind === 'success' && toast.thesisId && (
            <Link to={`/thesis/${toast.thesisId}`} style={{ fontSize: 11, fontWeight: 700, color: tk.green, textDecoration: 'none' }}>
              Open →
            </Link>
          )}
          <button onClick={() => setToast(null)} style={{ fontSize: 14, color: tk.muted2, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}>×</button>
        </div>
      )}

      <VolBanner />

      {/* Search bar + filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: tk.card, border: `1px solid ${tk.hairline2}`,
          borderRadius: 8, padding: '8px 14px',
        }}>
          <span style={{ color: tk.muted2, fontSize: 13 }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ticker, company, or keyword…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: tk.ink, fontFamily: 'inherit',
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tk.muted2, fontSize: 13, padding: 0 }}>×</button>
          )}
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 10, color: tk.muted2, background: tk.surface, border: `1px solid ${tk.hairline}`, borderRadius: 4, padding: '2px 6px' }}>⌘K</span>
        </div>
        {/* Action filter chips */}
        {result && (
          <div style={{ display: 'flex', gap: 5 }}>
            {(['all', 'advance_to_dossier', 'watch', 'pass'] as const).map(f => {
              const labels: Record<FilterAction, string> = { all: 'All', advance_to_dossier: 'Advance', watch: 'Watch', pass: 'Pass' }
              const active = filterAction === f
              return (
                <button
                  key={f}
                  onClick={() => setFilterAction(f)}
                  style={{
                    padding: '6px 12px', borderRadius: 99, border: `1px solid ${active ? 'transparent' : tk.hairline}`, cursor: 'pointer',
                    fontSize: 11, fontWeight: active ? 700 : 500,
                    background: active ? tk.sun2 : tk.surface,
                    color: active ? '#fff' : tk.muted,
                    transition: 'all 120ms',
                  }}
                >
                  {labels[f]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Hunt context card */}
      <div style={{
        background: tk.surface, border: `1px solid ${tk.hairline}`,
        borderRadius: 12, marginBottom: 20, overflow: 'hidden',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 0 }}>
          <div style={{ padding: '12px 16px', borderRight: `1px solid ${tk.hairline}` }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2, marginBottom: 4 }}>REGIME</p>
            <p style={{ fontSize: 12.5, color: tk.ink2, fontWeight: 500, margin: 0, lineHeight: 1.4 }}>{regimeLabel}</p>
          </div>
          <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            {!isRunning ? (
              <button
                onClick={handleHunt}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap',
                  background: `radial-gradient(circle at 50% 32%, rgba(255,250,235,.7) 0%, rgba(255,250,235,0) 38%), radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)`,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 1px 2px rgba(0,0,0,.18)',
                }}
              >
                Hunt →
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${tk.sun2}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: tk.muted }}>{phase}</span>
              </div>
            )}
          </div>
        </div>
        {isRunning && (
          <div style={{ height: 3, background: tk.surface2 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${tk.sun2}, ${tk.sun3})`, transition: 'width 0.4s ease' }} />
          </div>
        )}
      </div>

      {/* Opportunities meta bar */}
      {result && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2 }}>
            Opportunities
          </span>
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 12, color: tk.ink2 }}>
            {totalOpps}
          </span>
          {advanceCount > 0 && (
            <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 12, color: tk.green }}>
              · {advanceCount} advance
            </span>
          )}
          {watchCount > 0 && (
            <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 12, color: tk.amber }}>
              · {watchCount} watch
            </span>
          )}
          {passCount > 0 && (
            <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 12, color: tk.muted2 }}>
              · {passCount} pass
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {result.agentNotes && (
              <span style={{ fontSize: 11, color: tk.muted, maxWidth: 360, textAlign: 'right' }}>
                {result.agentNotes.slice(0, 80)}
              </span>
            )}
            <button
              onClick={() => { clearResult(); setSearch(''); setFilterAction('all') }}
              style={{
                padding: '5px 14px', borderRadius: 99, border: `1px solid ${tk.hairline2}`,
                background: tk.surface, color: tk.muted, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                transition: 'all 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = tk.sun2; e.currentTarget.style.color = tk.sun2 }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = tk.hairline2; e.currentTarget.style.color = tk.muted }}
            >
              New hunt ↺
            </button>
          </span>
        </div>
      )}

      {/* Results list */}
      {result?.error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(155,44,26,0.08)', border: '1px solid rgba(155,44,26,0.20)', marginBottom: 16, fontSize: 12.5, color: tk.neg }}>
          {result.error}
        </div>
      )}

      {result && activeOpps.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center', border: `1.5px dashed ${tk.hairline2}`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: tk.muted2, margin: 0 }}>
            {search || filterAction !== 'all' ? 'No results match filter.' : 'No opportunities yet.'}
          </p>
        </div>
      )}

      {!result && !isRunning && (
        <div style={{ padding: '60px 24px', textAlign: 'center', border: `1.5px dashed ${tk.hairline2}`, borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: tk.muted2, margin: 0 }}>
            No results yet.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'stocks' && stockOpps.map(brief => (
          <StockOppCard
            key={brief.ticker}
            brief={brief}
            duplicate={isDuplicate(brief.ticker)}
            volElevated={volElevated}
            onAdvance={() => addBriefToDossier({
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
            })}
          />
        ))}
        {mode === 'funds' && fundOpps.map(brief => (
          <FundOppCard
            key={brief.ticker}
            brief={brief}
            duplicate={isDuplicate(brief.ticker)}
            volElevated={volElevated}
            onAdvance={() => addBriefToDossier({
              ticker: brief.ticker,
              displayName: brief.fundName,
              thesisType: brief.thesisType,
              thesisStatement: brief.regimeFit,
              transmissionPath: brief.transmissionPath,
              variantPerception: brief.variantPerception,
              vaultSignals: brief.topHoldings,
              keyRisks: brief.keyRisks,
              killConditions: brief.killConditions,
            })}
          />
        ))}
      </div>

      <AskAIDock
        context={mode === 'stocks' ? 'Search Stocks' : 'Search Funds'}
        starterQuestions={mode === 'stocks' ? [
          'Find 3 non-crowded AI-power names',
          'Contrarian short that survives +75bp?',
          'Insider buys + analyst upgrades, 30d',
          'Re-hunt: quality at 5-yr-low multiples',
        ] : [
          'Cheaper alternatives to URA?',
          'EM ex-China, single-country picks?',
          'Income ETFs that survive +100bp.',
          'Re-hunt: low-correlation, < 0.20% ER',
        ]}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
