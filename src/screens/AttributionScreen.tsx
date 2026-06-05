import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts'
import { useAttributionStore } from '../store/attributionStore'
import type { AttributionRecord } from '../types/attribution'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(n: number | null): string {
  if (n === null) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(2)}%`
}

function fmtPrice(n: number | null): string {
  return n !== null ? `$${n.toFixed(2)}` : '—'
}

function alphaColor(alpha: number | null): string {
  if (alpha === null) return '#a8a5a0'
  if (alpha > 0) return '#1E7042'
  if (alpha < 0) return '#A02828'
  return '#706050'
}

function alphaBarColor(alpha: number): string {
  return alpha >= 0 ? '#2d6a4f' : '#9b2c1a'
}

type SortKey = 'ticker' | 'entryDate' | 'holdingDays' | 'positionReturn' | 'spyReturn' | 'alpha' | 'scoreAtEntry'
type SortDir = 'asc' | 'desc'

function sortRecords(records: AttributionRecord[], key: SortKey, dir: SortDir): AttributionRecord[] {
  return [...records].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    let cmp = 0
    if (typeof av === 'string' && typeof bv === 'string') {
      cmp = av.localeCompare(bv)
    } else if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: '#f5f2eb',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase', color: '#a8a5a0', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1f', fontFamily: 'GeistMono, monospace', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11, color: '#a8a5a0', marginTop: 4 }}>{sub}</p>
      )}
    </div>
  )
}

// ─── Sort Header Cell ─────────────────────────────────────────────────────────

function SortTh({
  label, sortKey, active, dir, onSort,
}: {
  label: string
  sortKey: SortKey
  active: boolean
  dir: SortDir
  onSort: (k: SortKey) => void
}) {
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '8px 12px',
        textAlign: 'left',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color: active ? '#1a1a1f' : '#a8a5a0',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const AttributionScreen: React.FC = () => {
  const navigate = useNavigate()
  const { report, isLoading, error, lastFetched, generateReport, clearReport } = useAttributionStore()
  const [sortKey, setSortKey] = useState<SortKey>('alpha')
  const [sortDir, setSortDir] = useState<SortDir>('desc')


  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortedRecords = report ? sortRecords(report.records, sortKey, sortDir) : []

  // ── Empty / Loading state ────────────────────────────────────────────────────

  if (!report && !isLoading) {
    return (
      <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p style={{ fontSize: 14, color: '#6b6860', fontWeight: 500, textAlign: 'center' }}>
          Run attribution to compare each position's return against SPY over its holding period.
        </p>
        {error && (
          <p style={{ fontSize: 12, color: '#A02828', background: 'rgba(160,40,40,0.07)', border: '1px solid rgba(160,40,40,0.15)', borderRadius: 8, padding: '8px 14px' }}>
            {error}
          </p>
        )}
        <button
          onClick={generateReport}
          style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #C8A060, #A07840)',
            fontSize: 13, fontWeight: 600, color: '#1A1208', cursor: 'pointer',
          }}
        >
          Generate Report
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div style={{ padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '3px solid rgba(0,0,0,0.08)',
          borderTopColor: '#f4922c',
          animation: 'attrSpin 0.8s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: '#6b6860' }}>Fetching price data…</p>
        <style>{`@keyframes attrSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Charts data ──────────────────────────────────────────────────────────────

  const bandChartData = (report?.byScoreBand ?? []).map((b) => ({
    name: b.band,
    alpha: parseFloat((b.avgAlpha * 100).toFixed(2)),
    count: b.count,
  }))

  const sectorChartData = (report?.bySector ?? [])
    .sort((a, b) => b.avgAlpha - a.avgAlpha)
    .map((s) => ({
      name: s.sector.replace(/([A-Z])/g, ' $1').trim().slice(0, 22),
      alpha: parseFloat((s.avgAlpha * 100).toFixed(2)),
      count: s.count,
    }))

  const pctFormatter = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }} />
        {lastFetched && (
          <span style={{ fontSize: 11, color: '#a8a5a0' }}>
            Updated {lastFetched.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={clearReport}
          style={{
            padding: '6px 14px', borderRadius: 7,
            border: '1px solid rgba(0,0,0,0.12)',
            fontSize: 11, color: '#6b6860', background: 'none', cursor: 'pointer',
          }}
        >
          Clear
        </button>
        <button
          onClick={generateReport}
          disabled={isLoading}
          style={{
            padding: '6px 14px', borderRadius: 7, border: 'none',
            background: 'linear-gradient(135deg, #C8A060, #A07840)',
            fontSize: 11, fontWeight: 600, color: '#1A1208', cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12 }}>
        <StatCard
          label="Total Alpha"
          value={fmtPct(report?.totalAlpha ?? null)}
          sub="avg alpha vs SPY"
        />
        <StatCard
          label="Win Rate"
          value={report ? `${(report.winRate * 100).toFixed(0)}%` : '—'}
          sub="positions beating SPY"
        />
        <StatCard
          label="Portfolio vs SPY"
          value={report ? `${fmtPct(report.portfolioReturn)} / ${fmtPct(report.spyReturn)}` : '—'}
          sub="avg position / SPY (full window)"
        />
        <StatCard
          label="Avg Holding"
          value={report ? `${Math.round(report.avgHoldingDays)}d` : '—'}
          sub="average days held"
        />
      </div>

      {/* Charts row */}
      {(bandChartData.length > 0 || sectorChartData.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Alpha by score band */}
          <div style={{
            background: '#f5f2eb',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 12,
            padding: '16px 20px',
          }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#a8a5a0', marginBottom: 14 }}>
              Alpha by Score Band
            </p>
            {bandChartData.length === 0 ? (
              <p style={{ fontSize: 12, color: '#a8a5a0', textAlign: 'center', padding: '24px 0' }}>No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={bandChartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a8a5a0' }} tickLine={false} axisLine={{ stroke: 'rgba(0,0,0,0.10)' }} />
                  <YAxis tickFormatter={pctFormatter} tick={{ fontSize: 9, fill: '#a8a5a0' }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip
                    formatter={(v: unknown) => [`${(v as number) > 0 ? '+' : ''}${(v as number).toFixed(2)}%`, 'Avg Alpha']}
                    contentStyle={{ background: '#f5f2eb', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="alpha" radius={[4, 4, 0, 0]}>
                    {bandChartData.map((entry, i) => (
                      <Cell key={i} fill={alphaBarColor(entry.alpha)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Alpha by sector */}
          <div style={{
            background: '#f5f2eb',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 12,
            padding: '16px 20px',
          }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#a8a5a0', marginBottom: 14 }}>
              Alpha by Thesis Type
            </p>
            {sectorChartData.length === 0 ? (
              <p style={{ fontSize: 12, color: '#a8a5a0', textAlign: 'center', padding: '24px 0' }}>No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={sectorChartData} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                  <XAxis type="number" tickFormatter={pctFormatter} tick={{ fontSize: 9, fill: '#a8a5a0' }} tickLine={false} axisLine={{ stroke: 'rgba(0,0,0,0.10)' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#6b6860' }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip
                    formatter={(v: unknown) => [`${(v as number) > 0 ? '+' : ''}${(v as number).toFixed(2)}%`, 'Avg Alpha']}
                    contentStyle={{ background: '#f5f2eb', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="alpha" radius={[0, 4, 4, 0]}>
                    {sectorChartData.map((entry, i) => (
                      <Cell key={i} fill={alphaBarColor(entry.alpha)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Position table */}
      <div style={{
        background: '#f5f2eb',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
              <SortTh label="Ticker" sortKey="ticker" active={sortKey === 'ticker'} dir={sortDir} onSort={handleSort} />
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#a8a5a0', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>
                Thesis
              </th>
              <SortTh label="Entry" sortKey="entryDate" active={sortKey === 'entryDate'} dir={sortDir} onSort={handleSort} />
              <SortTh label="Days" sortKey="holdingDays" active={sortKey === 'holdingDays'} dir={sortDir} onSort={handleSort} />
              <SortTh label="Return" sortKey="positionReturn" active={sortKey === 'positionReturn'} dir={sortDir} onSort={handleSort} />
              <SortTh label="SPY" sortKey="spyReturn" active={sortKey === 'spyReturn'} dir={sortDir} onSort={handleSort} />
              <SortTh label="Alpha" sortKey="alpha" active={sortKey === 'alpha'} dir={sortDir} onSort={handleSort} />
              <SortTh label="Score" sortKey="scoreAtEntry" active={sortKey === 'scoreAtEntry'} dir={sortDir} onSort={handleSort} />
              <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#a8a5a0', borderBottom: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: '#a8a5a0' }}>
                  No positions with tickers found
                </td>
              </tr>
            )}
            {sortedRecords.map((r) => (
              <tr
                key={r.positionId}
                onClick={() => navigate(`/thesis/${r.thesisId}`)}
                style={{
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  transition: 'background 100ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.025)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                {/* Ticker */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1f', fontFamily: 'GeistMono, monospace', letterSpacing: '0.02em' }}>
                    {r.ticker}
                  </span>
                  {r.error && (
                    <span title={r.error} style={{ marginLeft: 6, fontSize: 10, color: '#A02828' }}>⚠</span>
                  )}
                </td>
                {/* Thesis name */}
                <td style={{ padding: '9px 12px', maxWidth: 180 }}>
                  <span style={{ fontSize: 12, color: '#6b6860', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {r.thesisName}
                  </span>
                </td>
                {/* Entry date */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, color: '#a8a5a0', fontFamily: 'GeistMono, monospace' }}>
                    {r.entryDate}
                  </span>
                </td>
                {/* Holding days */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, color: '#6b6860', fontFamily: 'GeistMono, monospace' }}>
                    {r.holdingDays}d
                  </span>
                </td>
                {/* Position return */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, fontFamily: 'GeistMono, monospace', color: alphaColor(r.positionReturn), fontWeight: 600 }}>
                    {fmtPct(r.positionReturn)}
                  </span>
                </td>
                {/* SPY return */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, fontFamily: 'GeistMono, monospace', color: '#6b6860' }}>
                    {fmtPct(r.spyReturn)}
                  </span>
                </td>
                {/* Alpha */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    fontSize: 12, fontFamily: 'GeistMono, monospace', fontWeight: 700,
                    color: alphaColor(r.alpha),
                    background: r.alpha !== null
                      ? r.alpha > 0 ? 'rgba(30,112,66,0.08)' : r.alpha < 0 ? 'rgba(160,40,40,0.08)' : 'transparent'
                      : 'transparent',
                    padding: r.alpha !== null ? '2px 6px' : undefined,
                    borderRadius: 4,
                  }}>
                    {fmtPct(r.alpha)}
                  </span>
                </td>
                {/* Score at entry */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, color: '#6b6860', fontFamily: 'GeistMono, monospace' }}>
                    {r.scoreAtEntry !== null ? r.scoreAtEntry.toFixed(1) : '—'}
                  </span>
                </td>
                {/* Status */}
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                    color: '#6b6860',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: 4,
                    padding: '2px 6px',
                    whiteSpace: 'nowrap',
                  }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report && report.records.length > 0 && (
        <p style={{ fontSize: 10, color: '#c8c0b4', textAlign: 'right' }}>
          {report.records.filter((r) => r.error).length > 0
            ? `${report.records.filter((r) => r.error).length} position(s) could not be priced`
            : `${report.records.length} position(s)`}
        </p>
      )}
    </div>
  )
}
