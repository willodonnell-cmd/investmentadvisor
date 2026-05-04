import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useKillStore, useThesisStore, usePortfolioStore, useScenarioStore } from '../store'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { formatRelativeTime } from '../utils/formatting'
import { generatePortfolioMacroSignature } from '../api/macroSignature'
import type { KillType, KillTriggerPathway, PortfolioMacroSignature, MacroDriver, FactorType } from '../types'

// ─── Kill record helpers ───────────────────────────────────────────────────

const KILL_TYPE_LABELS: Record<KillType, string> = {
  1: 'Core Assumption Broken',
  2: 'Opportunity Closed',
  3: 'Better Expression Found',
  4: 'Superseded',
  5: 'Conviction Exhausted',
}

const KILL_TYPE_COLORS: Record<KillType, string> = {
  1: 'text-danger',
  2: 'text-warning',
  3: 'text-text-secondary',
  4: 'text-text-muted',
  5: 'text-text-muted',
}

const PATHWAY_LABELS: Record<KillTriggerPathway, string> = {
  A: 'Scheduled',
  B: 'Disconfirmer',
  C: 'Signal collapse',
  D: 'Decay forced',
}

// ─── Driver / Factor visual helpers ──────────────────────────────────────

const DRIVER_COLORS: Record<PortfolioMacroSignature['macroDriverExposures'][0]['classification'], string> = {
  Minimal:     'rgba(46,110,74,0.50)',
  Moderate:    'rgba(154,122,80,0.60)',
  Concentrated:'rgba(122,74,16,0.70)',
  Extreme:     'rgba(168,48,48,0.75)',
}

const DRIVER_TEXT: Record<PortfolioMacroSignature['macroDriverExposures'][0]['classification'], string> = {
  Minimal:     'text-success',
  Moderate:    'text-accent',
  Concentrated:'text-warning',
  Extreme:     'text-danger',
}

const FACTOR_LABELS: Record<FactorType, string> = {
  MarketBeta: 'Market Beta', Value: 'Value', Quality: 'Quality',
  Momentum: 'Momentum', Size: 'Size', Duration: 'Duration',
  Commodity: 'Commodity', Credit: 'Credit',
}

const CLASSIFICATION_DOT: Record<PortfolioMacroSignature['factorProfile'][0]['classification'], string> = {
  Balanced:             'bg-success',
  ModerateConcentration:'bg-accent',
  Concentrated:         'bg-warning',
  Extreme:              'bg-danger',
}

// ─── Trigger network SVG ──────────────────────────────────────────────────

function TriggerNetwork({
  theses,
  dependencies,
}: {
  theses: Array<{ id: string; name: string }>
  dependencies: PortfolioMacroSignature['triggerDependencies']
}) {
  const n = theses.length
  if (n === 0) return <p className="text-xs text-text-muted">No theses to display.</p>

  const W = 400, H = 260, R = 100, CX = W / 2, CY = H / 2 + 10

  const positions = theses.map((_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) }
  })

  const idToIdx = new Map(theses.map((t, i) => [t.id, i]))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#C8C0B4" />
        </marker>
      </defs>
      {dependencies.map((dep, i) => {
        const idxA = idToIdx.get(dep.thesisIdA)
        const idxB = idToIdx.get(dep.thesisIdB)
        if (idxA === undefined || idxB === undefined) return null
        const pa = positions[idxA]
        const pb = positions[idxB]
        const stroke = dep.strength === 'Structural' ? '#7A4A10' : '#C8C0B4'
        const sw = dep.strength === 'Structural' ? 2 : 1.5
        return (
          <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke={stroke} strokeWidth={sw} strokeDasharray={dep.strength === 'Structural' ? '' : '4,3'}
            markerEnd="url(#arrow)" opacity={0.7} />
        )
      })}
      {theses.map((t, i) => {
        const p = positions[i]
        const label = t.name.length > 14 ? t.name.slice(0, 13) + '…' : t.name
        const isDep = dependencies.some(
          (d) => d.thesisIdA === t.id || d.thesisIdB === t.id,
        )
        return (
          <g key={t.id}>
            <circle cx={p.x} cy={p.y} r={8}
              fill={isDep ? 'rgba(168,48,48,0.15)' : 'rgba(236,230,220,0.8)'}
              stroke={isDep ? '#A83030' : '#D8D0C4'} strokeWidth={1.5} />
            <text x={p.x} y={p.y + 20} textAnchor="middle"
              fontSize="9" fill="#A8A098" className="select-none">
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Shared card style ────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'rgba(248,244,238,0.85)',
  border: '1px solid rgba(216,208,196,0.7)',
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(60,40,10,0.05)',
}

// ─── Main screen ─────────────────────────────────────────────────────────

export const PortfolioScreen: React.FC = () => {
  const killRecordsMap = useKillStore((s) => s.killRecords)
  const thesesRecord = useThesisStore((s) => s.theses)
  const positionsRecord = usePortfolioStore((s) => s.positions)
  const scenariosRecord = useScenarioStore((s) => s.scenarios)
  const lens = usePortfolioStore((s) => s.lens)
  const setPortfolioSignature = usePortfolioStore((s) => s.setPortfolioSignature)
  const storedSignature = usePortfolioStore((s) => s.portfolioSignature)

  const [computing, setComputing] = useState(false)
  const [computeError, setComputeError] = useState<string | null>(null)
  const [pairSort, setPairSort] = useState<'score' | 'classification'>('score')
  const [showAllPairs, setShowAllPairs] = useState(false)

  const activeTheses = useMemo(
    () =>
      Object.values(thesesRecord).filter(
        (t) => !['Broken', 'Archived', 'PlayedOut'].includes(t.stage),
      ),
    [thesesRecord],
  )

  const killRecords = useMemo(
    () =>
      Object.values(killRecordsMap).sort(
        (a, b) => new Date(b.killedAt).getTime() - new Date(a.killedAt).getTime(),
      ),
    [killRecordsMap],
  )

  const typeDistribution = useMemo(() => {
    const dist: Partial<Record<KillType, number>> = {}
    for (const r of killRecords) dist[r.killType] = (dist[r.killType] ?? 0) + 1
    return dist
  }, [killRecords])

  const pathwayDistribution = useMemo(() => {
    const dist: Partial<Record<KillTriggerPathway, number>> = {}
    for (const r of killRecords) dist[r.triggerPathway] = (dist[r.triggerPathway] ?? 0) + 1
    return dist
  }, [killRecords])

  const scenariosByThesis = useMemo(() => {
    const map: Record<string, typeof scenariosRecord[string][]> = {}
    for (const sc of Object.values(scenariosRecord)) {
      if (!map[sc.linkedThesisId]) map[sc.linkedThesisId] = []
      map[sc.linkedThesisId].push(sc)
    }
    return map
  }, [scenariosRecord])

  const positionsByThesis = useMemo(() => {
    const map: Record<string, typeof positionsRecord[string] | undefined> = {}
    for (const t of activeTheses) {
      map[t.id] = Object.values(positionsRecord).find((p) => p.linkedThesisId === t.id)
    }
    return map
  }, [activeTheses, positionsRecord])

  const sig = storedSignature

  const handleCompute = async () => {
    setComputing(true)
    setComputeError(null)
    try {
      const result = await generatePortfolioMacroSignature(
        activeTheses,
        scenariosByThesis,
        positionsByThesis,
        lens === 'PrologisAware',
      )
      setPortfolioSignature(result)
    } catch (e: any) {
      setComputeError(e.message)
    } finally {
      setComputing(false)
    }
  }

  const sortedPairs = useMemo(() => {
    if (!sig) return []
    const pairs = [...sig.highCorrelationPairs]
    if (pairSort === 'score') return pairs.sort((a, b) => b.correlationScore - a.correlationScore)
    const ORDER = ['NearIdentical', 'HighCorrelation', 'ModerateCorrelation', 'LowCorrelation', 'Uncorrelated']
    return pairs.sort((a, b) => ORDER.indexOf(a.classification) - ORDER.indexOf(b.classification))
  }, [sig, pairSort])

  const visiblePairs = showAllPairs ? sortedPairs : sortedPairs.slice(0, 5)

  const CORR_COLOR: Record<string, string> = {
    NearIdentical:    'text-danger',
    HighCorrelation:  'text-warning',
    ModerateCorrelation: 'text-accent',
    LowCorrelation:   'text-text-secondary',
    Uncorrelated:     'text-text-muted',
  }

  const STRESS_STYLE = (impact: number): React.CSSProperties =>
    impact < -0.12 ? { background: 'rgba(168,48,48,0.08)', border: '1px solid rgba(168,48,48,0.25)', borderRadius: 12 } :
    impact < -0.06 ? { background: 'rgba(122,74,16,0.08)', border: '1px solid rgba(122,74,16,0.25)', borderRadius: 12 } :
    impact > 0.03  ? { background: 'rgba(46,110,74,0.08)', border: '1px solid rgba(46,110,74,0.25)', borderRadius: 12 } :
                     { ...cardStyle }

  const STRESS_TEXT = (impact: number) =>
    impact < -0.12 ? 'text-danger' :
    impact < -0.06 ? 'text-warning' :
    impact > 0.03  ? 'text-success' :
                     'text-text-secondary'

  const thesisNameById = useMemo(() => {
    const m: Record<string, string> = { prologis: 'Prologis (PLD)' }
    for (const t of activeTheses) m[t.id] = t.name
    return m
  }, [activeTheses])

  const DRIVER_LABEL: Record<string, string> = {
    AiCapexCycle: 'AI Capex', UsInterestRates: 'US Rates', CreditCycle: 'Credit Cycle',
    DollarDirection: 'Dollar', EnergyPriceLevel: 'Energy', ChinaEconomicTrajectory: 'China',
    DeglobalizationReshoring: 'Deglobalization', RegulatoryEnvironment: 'Regulatory',
    GeopoliticalRiskPremium: 'Geopolitical', ConsumerHealth: 'Consumer Health',
    LaborMarketWageDynamics: 'Labor/Wages', RealAssetRepricing: 'Real Assets',
    TechnologyAdoptionCurve: 'Tech Adoption', PoliticalEconomyFiscal: 'Fiscal/Political',
    ClimateEnergyTransition: 'Climate',
  }

  return (
    <div className="p-5 max-w-[960px] space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Portfolio Architecture</h1>
          <p className="text-xs text-text-muted mt-1 italic">
            Macro signature · correlation · stress tests · kill record
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sig && (
            <span className="text-[10px] text-text-muted">
              Computed {formatRelativeTime(sig.lastCalculated)}
            </span>
          )}
          <button
            onClick={handleCompute}
            disabled={computing || activeTheses.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-accent/90 hover:bg-accent
              disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {computing ? 'Computing…' : sig ? 'Recompute Signature' : 'Compute Signature'}
          </button>
        </div>
      </div>

      {computeError && (
        <div className="rounded-lg px-3 py-2" style={{
          background: 'rgba(168,48,48,0.08)',
          border: '1px solid rgba(168,48,48,0.25)',
        }}>
          <p className="text-xs text-danger">{computeError}</p>
        </div>
      )}

      {/* ── Active Positions ── */}
      <ErrorBoundary label="Active Positions">
        <section>
          <h2 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Active Positions</h2>
          {Object.keys(positionsRecord).length === 0 ? (
            <div className="rounded-xl px-4 py-6 text-center" style={{ border: '1.5px dashed #D8D0C4' }}>
              <p className="text-xs text-text-muted">No positions committed yet.</p>
              <p className="text-[11px] text-text-muted mt-1">
                Use the <Link to="/decision" className="text-accent hover:underline">Capital Allocation</Link> screen to commit a position from a thesis.
              </p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={cardStyle}>
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-2 text-[10px] uppercase tracking-wider text-text-muted"
                style={{ borderBottom: '1px solid rgba(216,208,196,0.6)', background: 'rgba(236,230,220,0.7)' }}>
                <span>Thesis</span>
                <span className="text-right">Type</span>
                <span className="text-right">Account</span>
                <span className="text-right">Action</span>
                <span className="text-right">Current</span>
                <span className="text-right">Target</span>
              </div>
              {Object.values(positionsRecord).map((pos) => {
                const thesis = thesesRecord[pos.linkedThesisId]
                return (
                  <div
                    key={pos.id}
                    className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-x-4 px-4 py-2.5 transition-colors items-center"
                    style={{ borderBottom: '1px solid rgba(216,208,196,0.4)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236,230,220,0.6)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/decision/${pos.linkedThesisId}`}
                        className="text-xs font-medium text-text-primary hover:text-accent transition-colors truncate block"
                      >
                        {thesis?.name ?? pos.linkedThesisId}
                      </Link>
                      <p className="text-[10px] text-text-muted mt-0.5 truncate italic">
                        {thesis?.type} · {thesis?.primaryMispricedVariable}
                      </p>
                    </div>
                    <span className="text-[11px] text-text-secondary text-right">{pos.type}</span>
                    <span className="text-[11px] text-text-muted text-right">{pos.account === 'PrologisConcentrated' ? 'PLD Acct' : pos.account}</span>
                    <span className={`text-[11px] font-medium text-right ${
                      pos.currentAction === 'Exit' || pos.currentAction === 'CoverShort' ? 'text-danger' :
                      pos.currentAction === 'Start' || pos.currentAction === 'Add' || pos.currentAction === 'InitiateShort' ? 'text-success' :
                      pos.currentAction === 'Trim' ? 'text-warning' :
                      'text-text-secondary'
                    }`}>{pos.currentAction}</span>
                    <span className="text-xs font-mono font-bold text-text-primary text-right">
                      {(pos.currentSizePct * 100).toFixed(1)}%
                    </span>
                    <span className="text-[11px] font-mono text-text-muted text-right">
                      {(pos.targetSizePct * 100).toFixed(1)}%
                    </span>
                  </div>
                )
              })}
              <div className="px-4 py-2 flex justify-between items-center" style={{ borderTop: '1px solid rgba(216,208,196,0.6)' }}>
                <span className="text-[10px] text-text-muted">
                  {Object.keys(positionsRecord).length} position{Object.keys(positionsRecord).length !== 1 ? 's' : ''}
                </span>
                <span className="text-[11px] font-mono text-text-secondary">
                  Total: {(Object.values(positionsRecord).reduce((s, p) => s + p.currentSizePct, 0) * 100).toFixed(1)}% invested
                </span>
              </div>
            </div>
          )}
        </section>
      </ErrorBoundary>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active Theses', value: activeTheses.length, color: 'text-text-primary' },
          { label: 'Total Kills', value: killRecords.length, color: 'text-danger' },
          { label: 'High Corr Pairs', value: sig ? sig.highCorrelationPairs.filter(p => p.correlationScore >= 0.60).length : '—', color: 'text-warning' },
          { label: 'Divers. Score', value: sig ? `${sig.diversificationQualityScore}/10` : '—', color: 'text-success' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...cardStyle, padding: '12px 16px', textAlign: 'center' }}>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {sig ? (
        <>
          {/* ── Section 1: Macro Driver Exposures ── */}
          <ErrorBoundary label="Macro Signature">
            <section>
              <h2 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                Macro Driver Exposures
              </h2>
              <div className="space-y-2">
                {sig.macroDriverExposures.slice(0, 7).map((e) => (
                  <div key={e.driver} className="flex items-center gap-3 rounded-lg px-3 py-2" style={cardStyle}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider w-20 flex-shrink-0 ${DRIVER_TEXT[e.classification]}`}>
                      {e.classification.slice(0, 4).toUpperCase()}
                    </span>
                    <span className="text-xs text-text-secondary w-32 flex-shrink-0">
                      {DRIVER_LABEL[e.driver] ?? e.driver}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(216,208,196,0.8)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(e.weightedExposurePct * 300, 100)}%`,
                          background: DRIVER_COLORS[e.classification],
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-text-muted w-10 text-right">
                      {(e.weightedExposurePct * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-text-muted w-32 truncate">
                      {e.linkedThesisIds.map((id) => thesisNameById[id] ?? id).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </ErrorBoundary>

          {/* ── Section 2: Factor Profile ── */}
          <ErrorBoundary label="Factor Profile">
            <section>
              <h2 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                Factor Profile
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {sig.factorProfile.map((f) => {
                  const max = 4
                  const fillPct = Math.abs(f.netScore) / max * 100
                  const positive = f.netScore >= 0
                  return (
                    <div key={f.factor} style={{ ...cardStyle, padding: 12 }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-text-muted">{FACTOR_LABELS[f.factor]}</span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${CLASSIFICATION_DOT[f.classification]}`} />
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(216,208,196,0.8)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${fillPct}%`,
                            background: positive ? 'rgba(154,122,80,0.65)' : 'rgba(168,168,160,0.45)',
                          }}
                        />
                      </div>
                      <p className={`text-xs font-bold font-mono ${Math.abs(f.netScore) > 2.5 ? 'text-warning' : 'text-text-secondary'}`}>
                        {f.netScore > 0 ? '+' : ''}{f.netScore.toFixed(1)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          </ErrorBoundary>

          {/* ── Section 3: High-Correlation Pairs ── */}
          <ErrorBoundary label="Correlation Pairs">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[10px] uppercase tracking-widest text-text-muted">
                  Correlation Pairs
                </h2>
                <div className="flex gap-1.5">
                  {(['score', 'classification'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPairSort(s)}
                      className="px-2.5 py-1 text-[10px] rounded border transition-colors"
                      style={pairSort === s ? {
                        borderColor: 'rgba(154,122,80,0.5)',
                        color: '#1A1410',
                        background: 'rgba(154,122,80,0.10)',
                      } : {
                        borderColor: '#D8D0C4',
                        color: '#A8A098',
                      }}
                    >
                      {s === 'score' ? 'By Score' : 'By Level'}
                    </button>
                  ))}
                </div>
              </div>

              {sortedPairs.length === 0 ? (
                <p className="text-xs text-text-muted">No correlated pairs detected above threshold.</p>
              ) : (
                <div className="space-y-1.5">
                  {visiblePairs.map((pair) => (
                    <div key={`${pair.thesisIdA}-${pair.thesisIdB}`}
                      className="rounded-lg px-4 py-2.5 flex items-center gap-4"
                      style={cardStyle}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary truncate">
                          <span className="text-text-primary">{thesisNameById[pair.thesisIdA] ?? '?'}</span>
                          <span className="text-text-muted mx-1.5">↔</span>
                          <span className="text-text-primary">{thesisNameById[pair.thesisIdB] ?? '?'}</span>
                        </p>
                        <p className="text-[10px] text-text-muted mt-0.5">
                          Primary driver: {pair.primaryCorrelationDriver}
                          {pair.recommendedAction && <span className="text-warning ml-2">⚠ Review</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`text-xs font-bold font-mono ${CORR_COLOR[pair.classification]}`}>
                          {pair.correlationScore.toFixed(2)}
                        </span>
                        <span className={`text-[10px] ${CORR_COLOR[pair.classification]}`}>
                          {pair.classification.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        {pair.correlationScore >= 0.60 && (
                          <span className="text-[10px] rounded px-1.5 py-0.5"
                            style={pair.intentional ? {
                              color: '#A8A098',
                              border: '1px solid #D8D0C4',
                            } : {
                              color: '#7A4A10',
                              border: '1px solid rgba(122,74,16,0.35)',
                              background: 'rgba(122,74,16,0.08)',
                            }}
                          >
                            {pair.intentional ? 'Intentional' : 'Unclassified'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {sortedPairs.length > 5 && (
                    <button
                      onClick={() => setShowAllPairs((v) => !v)}
                      className="text-xs text-text-muted hover:text-text-secondary transition-colors w-full text-center py-1"
                    >
                      {showAllPairs ? 'Show less' : `Show ${sortedPairs.length - 5} more pairs`}
                    </button>
                  )}
                </div>
              )}
            </section>
          </ErrorBoundary>

          {/* ── Section 4: Trigger Dependency Network ── */}
          <ErrorBoundary label="Trigger Network">
            <section>
              <h2 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                Trigger Dependency Network
              </h2>
              <div className="p-4" style={cardStyle}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <TriggerNetwork
                      theses={activeTheses.map((t) => ({ id: t.id, name: t.name }))}
                      dependencies={sig.triggerDependencies}
                    />
                  </div>
                  <div className="w-48 space-y-2 text-[10px] flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-0.5 bg-warning" />
                      <span className="text-text-muted">Structural dependency</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-0.5 border-t border-dashed border-border" />
                      <span className="text-text-muted">Significant dependency</span>
                    </div>
                    <div className="mt-3 space-y-1">
                      {sig.triggerDependencies.slice(0, 4).map((d, i) => (
                        <div key={i} className="text-text-muted leading-relaxed">
                          <span className={d.strength === 'Structural' ? 'text-warning' : 'text-text-secondary'}>
                            {d.strength}:
                          </span>{' '}
                          {d.upstreamCondition.slice(0, 50)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </ErrorBoundary>

          {/* ── Section 5: Stress Test Results ── */}
          <ErrorBoundary label="Stress Tests">
            <section>
              <h2 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                Stress Test Results
              </h2>
              <div className="grid grid-cols-5 gap-2">
                {sig.stressTestResults.map((st) => (
                  <div key={st.scenario} style={{ ...STRESS_STYLE(st.expectedPortfolioImpact), padding: 12 }}>
                    <p className="text-[10px] text-text-muted leading-snug mb-2">{st.scenario}</p>
                    <p className={`text-xl font-bold font-mono ${STRESS_TEXT(st.expectedPortfolioImpact)}`}>
                      {st.expectedPortfolioImpact >= 0 ? '+' : ''}
                      {(st.expectedPortfolioImpact * 100).toFixed(1)}%
                    </p>
                    {st.mostImpactedTheses.slice(0, 2).map((mi, i) => (
                      <p key={i} className="text-[10px] text-text-muted mt-1 truncate">
                        {thesisNameById[mi.thesisId] ?? mi.thesisId} ({mi.impact >= 0 ? '+' : ''}{(mi.impact * 100).toFixed(1)}%)
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </ErrorBoundary>

          {/* ── Section 6: Diversification Quality Score ── */}
          <ErrorBoundary label="Diversification Score">
            <section>
              <h2 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">
                Diversification Quality
              </h2>
              <div className="flex items-start gap-6 p-5" style={cardStyle}>
                <div className="text-center flex-shrink-0">
                  <p className="text-5xl font-bold text-text-primary">
                    {sig.diversificationQualityScore.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-text-muted mt-1">out of 10</p>
                  <div className="mt-2 w-20 h-1.5 rounded-full overflow-hidden mx-auto"
                    style={{ background: 'rgba(216,208,196,0.8)' }}>
                    <div
                      className={`h-full rounded-full ${
                        sig.diversificationQualityScore >= 7 ? 'bg-success' :
                        sig.diversificationQualityScore >= 4 ? 'bg-warning' : 'bg-danger'
                      }`}
                      style={{ width: `${sig.diversificationQualityScore * 10}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed flex-1">
                  {sig.diversificationInterpretation}
                </p>
              </div>
            </section>
          </ErrorBoundary>
        </>
      ) : (
        <div className="rounded-xl p-8 text-center" style={{ border: '1.5px dashed #D8D0C4' }}>
          <p className="text-sm text-text-secondary mb-2">No macro signature computed</p>
          <p className="text-xs text-text-muted">
            {activeTheses.length === 0
              ? 'Add active theses first.'
              : `${activeTheses.length} active ${activeTheses.length === 1 ? 'thesis' : 'theses'} ready. Click Compute Signature above.`}
          </p>
        </div>
      )}

      {/* ── Kill Record ── */}
      <ErrorBoundary label="Kill Record">
        <section>
          <h2 className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Kill Record</h2>

          {killRecords.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div style={{ ...cardStyle, padding: 16 }}>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3">By Type</p>
                <div className="space-y-2">
                  {([1, 2, 3, 4, 5] as KillType[]).map((t) => {
                    const count = typeDistribution[t] ?? 0
                    const pct = killRecords.length ? count / killRecords.length : 0
                    return (
                      <div key={t} className="flex items-center gap-2">
                        <span className={`text-[11px] font-mono w-4 ${KILL_TYPE_COLORS[t]}`}>{t}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(216,208,196,0.8)' }}>
                          <div className="h-full rounded-full bg-danger/50" style={{ width: `${pct * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-text-muted w-4 text-right">{count}</span>
                        <span className="text-[10px] text-text-muted w-32 truncate">{KILL_TYPE_LABELS[t]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ ...cardStyle, padding: 16 }}>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3">By Pathway</p>
                <div className="space-y-2">
                  {(['A', 'B', 'C', 'D'] as KillTriggerPathway[]).map((p) => {
                    const count = pathwayDistribution[p] ?? 0
                    const pct = killRecords.length ? count / killRecords.length : 0
                    return (
                      <div key={p} className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-text-muted w-4">{p}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(216,208,196,0.8)' }}>
                          <div className="h-full bg-warning/50 rounded-full" style={{ width: `${pct * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-text-muted w-4 text-right">{count}</span>
                        <span className="text-[10px] text-text-muted w-28 truncate">{PATHWAY_LABELS[p]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {killRecords.length === 0 ? (
            <div className="rounded-xl p-6" style={{ border: '1.5px dashed #D8D0C4' }}>
              <EmptyState
                title="No kills recorded"
                description="When a thesis is killed, the structured record and lessons appear here."
              />
            </div>
          ) : (
            <div className="space-y-2">
              {killRecords.map((r) => (
                <div key={r.id} className="rounded-xl px-4 py-3" style={cardStyle}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[11px] font-semibold ${KILL_TYPE_COLORS[r.killType]}`}>
                          {r.killType}. {KILL_TYPE_LABELS[r.killType]}
                        </span>
                        <span className="text-[10px] rounded px-1.5 py-0.5 text-text-muted" style={{ border: '1px solid #D8D0C4' }}>
                          {PATHWAY_LABELS[r.triggerPathway]}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-text-primary">{r.thesisName}</p>
                      <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">{r.killReason}</p>
                    </div>
                    <span className="text-[10px] text-text-muted flex-shrink-0">
                      {formatRelativeTime(r.killedAt)}
                    </span>
                  </div>
                  {r.lessonLearned && (
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(216,208,196,0.5)' }}>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Lesson</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed">{r.lessonLearned}</p>
                    </div>
                  )}
                  {r.learningRoutes.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.learningRoutes.map((lr, i) => (
                        <span key={i} className="text-[10px] rounded px-1.5 py-0.5 text-text-muted" style={{ border: '1px solid #D8D0C4' }}>
                          {lr.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </ErrorBoundary>
    </div>
  )
}
