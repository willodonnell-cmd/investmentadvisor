import React, { useEffect, useState, useMemo } from 'react'
import { useThesisStore } from '../store'
import { usePaperTrackStore } from '../store/paperTrackStore'
import type { PaperTrack, PaperPosition, SimWindow } from '../types/paperTrack'
import { SIM_WINDOW_LABELS, SIM_WINDOW_DAYS } from '../types/paperTrack'
import { useTopBar } from '../store/topbarStore'
import { AskAIDock } from '../components/ui/AskAIDock'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPct(n: number) {
  if (isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${(n * 100).toFixed(2)}%`
}

function fmtPrice(n: number) {
  return n > 0 ? `$${n.toFixed(2)}` : '—'
}

function returnColor(n: number) {
  if (isNaN(n)) return '#A89878'
  if (n > 0.005) return '#1E7042'
  if (n < -0.005) return '#A02828'
  return '#706050'
}

const CHART_COLORS = [
  '#f4922c', '#2d6a4f', '#4a1d6b', '#9b2c1a', '#1e4d6b',
  '#c4692a', '#3a8058', '#6b2fa0', '#c44a30', '#2d6b8a',
]

function buildChartData(tracks: PaperTrack[]) {
  const tracksWithData = tracks.filter(t =>
    t.positions.some(p => p.closes.length > 0 && !p.fetchError && p.entryPrice > 0)
  )
  if (!tracksWithData.length) return []

  const allDates = new Set<string>()
  tracksWithData.forEach(track => {
    track.positions.forEach(pos => {
      pos.closes.forEach(c => allDates.add(c.date))
    })
  })

  const sortedDates = Array.from(allDates).sort()

  return sortedDates.map(date => {
    const point: Record<string, unknown> = { date: date.slice(5) } // MM-DD
    tracksWithData.forEach(track => {
      const rets = track.positions
        .filter(p => !p.fetchError && p.entryPrice > 0)
        .map(p => {
          const close = p.closes.find(c => c.date === date)
          if (!close) return null
          const raw = (close.price - p.entryPrice) / p.entryPrice
          return p.direction === 'Short' ? -raw : raw
        })
        .filter((r): r is number => r !== null)
      if (rets.length) {
        point[track.thesisId] = +(rets.reduce((a, b) => a + b, 0) / rets.length * 100).toFixed(2)
      }
    })
    return point
  })
}

const PerformanceChart: React.FC<{ tracks: PaperTrack[] }> = ({ tracks }) => {
  const hasHistory = tracks.some(t => t.positions.some(p => p.closes.length > 0))
  const data = useMemo(() => buildChartData(tracks), [tracks])

  if (!hasHistory || !data.length) {
    return (
      <div style={{
        height: 180, borderRadius: 10,
        background: 'rgba(248,244,238,0.85)', border: '1px solid rgba(216,208,196,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6,
      }}>
        <p style={{ fontSize: 13, color: '#a8a5a0', fontWeight: 500 }}>No history loaded</p>
        <p style={{ fontSize: 11, color: '#c8c0b4' }}>Click "Load History" on a track to view the chart</p>
      </div>
    )
  }

  const activeTracks = tracks.filter(t =>
    t.positions.some(p => p.closes.length > 0 && !p.fetchError)
  )

  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden',
      background: 'rgba(248,244,238,0.85)', border: '1px solid rgba(216,208,196,0.7)',
      padding: '14px 4px 10px 0',
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a5a0', marginBottom: 12, paddingLeft: 16 }}>
        Cumulative Return (%)
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(216,208,196,0.5)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#a8a5a0' }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(216,208,196,0.6)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#a8a5a0' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
            width={46}
          />
          <ReferenceLine y={0} stroke="rgba(0,0,0,0.18)" strokeDasharray="4 2" />
          <Tooltip
            contentStyle={{ background: 'rgba(248,244,238,0.97)', border: '1px solid rgba(216,208,196,0.8)', borderRadius: 8, fontSize: 11 }}
            formatter={(v: number, name: string) => {
              const track = activeTracks.find(t => t.thesisId === name)
              return [`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, track?.thesisName ?? name]
            }}
          />
          {activeTracks.map((track, i) => (
            <Line
              key={track.thesisId}
              type="monotone"
              dataKey={track.thesisId}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', paddingLeft: 16, marginTop: 10 }}>
        {activeTracks.map((track, i) => (
          <div key={track.thesisId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 2, borderRadius: 1, background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#6b6860' }}>{track.thesisName}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Ticker Override Modal ────────────────────────────────────────────────────

function TickerOverrideModal({
  position,
  onSave,
  onClose,
}: {
  position: PaperPosition
  onSave: (ticker: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(position.ticker)
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(20,12,4,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#FDFCF9', borderRadius: 12, padding: 24, minWidth: 320,
        boxShadow: '0 0 0 1px rgba(20,12,4,0.10), 0 8px 40px rgba(20,12,4,0.20)',
      }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#A89878', marginBottom: 8 }}>
          Override Ticker
        </p>
        <p style={{ fontSize: 12, color: '#706050', marginBottom: 16 }}>
          {position.companyName} — {position.description}
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="e.g. PLD"
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid #D8D0C4', fontSize: 13, fontWeight: 600,
            letterSpacing: '0.05em', color: '#18140E', background: '#F8F4EF',
            outline: 'none', marginBottom: 16,
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSave(value.trim()) }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '6px 14px', borderRadius: 7, border: '1px solid #D8D0C4',
            fontSize: 12, color: '#706050', background: 'none', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={() => value.trim() && onSave(value.trim())} style={{
            padding: '6px 14px', borderRadius: 7, border: 'none',
            background: 'linear-gradient(135deg, #C8A060, #A07840)',
            fontSize: 12, color: '#1A1208', fontWeight: 600, cursor: 'pointer',
          }}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Position Row ─────────────────────────────────────────────────────────────

function PositionRow({
  position,
  ret,
  onOverride,
}: {
  position: PaperPosition
  ret: number
  onOverride: () => void
}) {
  const color = returnColor(ret)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '90px 1fr 60px 80px 80px 80px 28px',
      gap: 8, alignItems: 'center',
      padding: '8px 16px',
      borderBottom: '1px solid rgba(20,12,4,0.05)',
    }}>
      {/* Ticker + direction */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '1px 5px',
          borderRadius: 4,
          background: position.direction === 'Long' ? 'rgba(30,112,66,0.10)' : 'rgba(160,40,40,0.10)',
          color: position.direction === 'Long' ? '#1E7042' : '#A02828',
        }}>
          {position.direction === 'Long' ? 'L' : 'S'}
        </span>
        <span
          title={position.ticker.includes('.') ? 'International ticker — priced via Alpha Vantage' : undefined}
          style={{ fontSize: 12, fontWeight: 700, color: '#18140E', letterSpacing: '0.02em' }}
        >
          {position.ticker}
          {position.isUserOverride && (
            <span style={{ fontSize: 9, color: '#A89878', marginLeft: 3 }}>✎</span>
          )}
        </span>
      </div>

      {/* Description */}
      <span style={{ fontSize: 11, color: '#706050', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {position.companyName}
      </span>

      {/* Conviction rank */}
      <span style={{ fontSize: 10, color: '#A89878', textAlign: 'center' }}>
        #{position.convictionRank}
      </span>

      {/* Entry */}
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#706050', textAlign: 'right' }}>
        {position.fetchError ? '—' : fmtPrice(position.entryPrice)}
      </span>

      {/* Current */}
      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#18140E', fontWeight: 600, textAlign: 'right' }}>
        {position.fetchError ? 'Error' : fmtPrice(position.currentPrice)}
      </span>

      {/* Return */}
      <span
        title={isNaN(ret) && !position.fetchError ? 'No historical price data for this window' : undefined}
        style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color, textAlign: 'right' }}
      >
        {position.fetchError ? 'Error' : fmtPct(ret)}
      </span>

      {/* Override button */}
      <button
        onClick={onOverride}
        title="Override ticker"
        style={{
          width: 22, height: 22, borderRadius: 5, border: '1px solid #D8D0C4',
          background: 'none', cursor: 'pointer', fontSize: 11, color: '#A89878',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ✎
      </button>
    </div>
  )
}

// ─── Track Card ───────────────────────────────────────────────────────────────

function TrackCard({ track }: { track: PaperTrack }) {
  const { computeReturn, overrideTicker, refreshTrack, loadHistory } = usePaperTrackStore()
  const [window, setWindow] = useState<SimWindow>('created')
  const [overriding, setOverriding] = useState<PaperPosition | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyProgress, setHistoryProgress] = useState(0)

  const longs = track.positions.filter((p) => p.direction === 'Long')
  const shorts = track.positions.filter((p) => p.direction === 'Short')

  const returns = track.positions.reduce<Record<string, number>>((acc, p) => {
    acc[p.id] = computeReturn(p, window, track.thesisCreatedAt)
    return acc
  }, {})

  const avgReturn = (positions: PaperPosition[]) => {
    const valid = positions.filter((p) => !p.fetchError && !isNaN(returns[p.id]))
    if (!valid.length) return null
    return valid.reduce((s, p) => s + returns[p.id], 0) / valid.length
  }

  const longAvg = avgReturn(longs)
  const shortAvg = avgReturn(shorts)
  const netAvg = (() => {
    const all = track.positions.filter((p) => !p.fetchError)
    if (!all.length) return null
    return all.reduce((s, p) => s + returns[p.id], 0) / all.length
  })()

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshTrack(track.thesisId)
    setRefreshing(false)
  }

  const handleLoadHistory = async () => {
    setLoadingHistory(true)
    setHistoryProgress(0)
    const total = track.positions.length
    // Tick progress every 13s per ticker (matches AV rate-limit sleep in store)
    const interval = setInterval(() => {
      setHistoryProgress((p) => Math.min(p + 1, total))
    }, 13000)
    try {
      await loadHistory(track.thesisId)
    } finally {
      clearInterval(interval)
      setHistoryProgress(total)
      setLoadingHistory(false)
    }
  }

  const staleDate = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10)
  const missingHistory = track.positions.some(
    (p) => !p.fetchError && (
      p.closes.length === 0 ||
      p.closes[p.closes.length - 1].date < staleDate
    )
  )

  const isPostMortem = track.status === 'PostMortem'

  return (
    <>
      {overriding && (
        <TickerOverrideModal
          position={overriding}
          onClose={() => setOverriding(null)}
          onSave={async (ticker) => {
            await overrideTicker(track.thesisId, overriding.id, ticker)
            setOverriding(null)
          }}
        />
      )}

      <div style={{
        background: '#FDFCF9',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(20,12,4,0.06), 0 1px 3px rgba(20,12,4,0.06), 0 4px 16px rgba(20,12,4,0.08)',
        opacity: isPostMortem ? 0.75 : 1,
      }}>
        {/* Card header */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid rgba(20,12,4,0.07)',
          background: isPostMortem ? 'rgba(160,40,40,0.04)' : '#FDFCF9',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {isPostMortem && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                  background: 'rgba(160,40,40,0.10)', color: '#A02828', borderRadius: 4, padding: '2px 6px',
                }}>
                  Post-Mortem
                </span>
              )}
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#18140E', fontFamily: 'DM Serif Display, serif' }}>
                {track.thesisName}
              </h3>
            </div>
            <p style={{ fontSize: 10, color: '#A89878' }}>
              Entered Actionable {new Date(track.actionableAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}{Math.floor((Date.now() - new Date(track.actionableAt).getTime()) / 86_400_000)}d
              {isPostMortem && track.postMortemReason && ` · ${track.postMortemReason}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Window selector */}
            <div style={{
              display: 'flex', gap: 2,
              background: 'rgba(20,12,4,0.04)', border: '1px solid rgba(20,12,4,0.10)',
              borderRadius: 8, padding: 3,
            }}>
              {(Object.keys(SIM_WINDOW_LABELS) as SimWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => setWindow(w)}
                  style={{
                    padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontSize: 10, fontWeight: 600,
                    background: window === w ? '#FDFCF9' : 'transparent',
                    color: window === w ? '#18140E' : '#A89878',
                    boxShadow: window === w ? '0 1px 3px rgba(20,12,4,0.10)' : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {SIM_WINDOW_LABELS[w]}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh prices"
              style={{
                width: 28, height: 28, borderRadius: 7, border: '1px solid #D8D0C4',
                background: 'none', cursor: refreshing ? 'default' : 'pointer',
                fontSize: 13, color: refreshing ? '#D8D0C4' : '#A89878',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* No history warning */}
        {missingHistory && (
          <div style={{
            padding: '8px 16px', fontSize: 11, color: '#7A4A10',
            background: 'rgba(122,74,16,0.06)', borderBottom: '1px solid rgba(122,74,16,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <span>
              {loadingHistory
                ? `Loading ticker ${historyProgress + 1} of ${track.positions.length}… (~13s each)`
                : 'Price history not loaded — 30d / 60d / 6m / 1y windows need this.'}
            </span>
            <button
              onClick={handleLoadHistory}
              disabled={loadingHistory}
              style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(122,74,16,0.35)',
                background: 'rgba(122,74,16,0.10)', color: '#7A4A10',
                fontSize: 11, fontWeight: 600, cursor: loadingHistory ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              {loadingHistory ? 'Loading…' : 'Load History'}
            </button>
          </div>
        )}

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 60px 80px 80px 80px 28px',
          gap: 8, padding: '6px 16px',
          background: '#F5F2EC', borderBottom: '1px solid rgba(20,12,4,0.07)',
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#A89878',
        }}>
          <span>Ticker</span>
          <span>Name</span>
          <span style={{ textAlign: 'center' }}>Conv.</span>
          <span style={{ textAlign: 'right' }}>Entry</span>
          <span style={{ textAlign: 'right' }}>Current</span>
          <span style={{ textAlign: 'right' }}>Return</span>
          <span />
        </div>

        {/* Longs */}
        {longs.length > 0 && (
          <div>
            <div style={{ padding: '5px 16px 3px', background: 'rgba(30,112,66,0.04)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1E7042' }}>
                Long
              </span>
            </div>
            {longs.map((p) => (
              <PositionRow key={p.id} position={p} ret={returns[p.id]} onOverride={() => setOverriding(p)} />
            ))}
          </div>
        )}

        {/* Shorts */}
        {shorts.length > 0 && (
          <div>
            <div style={{ padding: '5px 16px 3px', background: 'rgba(160,40,40,0.04)' }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A02828' }}>
                Short
              </span>
            </div>
            {shorts.map((p) => (
              <PositionRow key={p.id} position={p} ret={returns[p.id]} onOverride={() => setOverriding(p)} />
            ))}
          </div>
        )}

        {/* Aggregate row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 1, borderTop: '1px solid rgba(20,12,4,0.08)',
        }}>
          {[
            { label: 'Longs', value: longAvg, color: '#1E7042' },
            { label: 'Shorts', value: shortAvg, color: '#A02828' },
            { label: 'Net Combined', value: netAvg, color: netAvg !== null ? returnColor(netAvg) : '#706050' },
          ].map(({ label, value, color }, i) => (
            <div key={label} style={{
              padding: '10px 16px',
              background: i === 2 ? 'rgba(20,12,4,0.025)' : 'transparent',
              borderRight: i < 2 ? '1px solid rgba(20,12,4,0.06)' : 'none',
            }}>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#A89878', marginBottom: 4 }}>
                {label}
              </p>
              <p style={{ fontSize: 16, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: value !== null ? color : '#D8D0C4' }}>
                {value !== null ? fmtPct(value) : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const PaperTrackerScreen: React.FC = () => {
  const thesesRecord = useThesisStore((s) => s.theses)
  const { tracks, createTrack, loading, refreshTrack } = usePaperTrackStore()

  useTopBar({
    title: 'Performance',
    crumb: 'Thesis-linked · vs. cost basis',
  })

  const actionableTheses = Object.values(thesesRecord).filter(
    (t) => t.stage === 'Actionable' || t.stage === 'Live' || t.stage === 'Broken' || t.stage === 'PlayedOut' || t.stage === 'Killed',
  )

  useEffect(() => {
    const tracked = Object.values(thesesRecord).filter(
      (t) => t.stage === 'Actionable' || t.stage === 'Live',
    )
    tracked.forEach((t) => {
      if (!tracks[t.id] && t.recommendations?.length) {
        createTrack(t)
      } else if (tracks[t.id]) {
        refreshTrack(t.id)
      }
    })
  }, [])

  const activeTracks = useMemo(() =>
    actionableTheses.map((t) => tracks[t.id]).filter(Boolean) as PaperTrack[],
    [actionableTheses, tracks]
  )

  const hasNoRecommendations = actionableTheses.some(
    (t) => !t.recommendations?.length && !tracks[t.id],
  )

  // Compute headline metrics
  const allPositions = activeTracks.flatMap(t => t.positions)
  const totalPositions = allPositions.length
  const { computeReturn } = usePaperTrackStore.getState()

  const trackNetReturns = activeTracks.map(track => {
    const rets = track.positions
      .filter(p => !p.fetchError && p.entryPrice > 0)
      .map(p => {
        const r = computeReturn(p, 'created', track.thesisCreatedAt)
        return isNaN(r) ? null : r
      })
      .filter((r): r is number => r !== null)
    return { track, avg: rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : NaN }
  }).filter(x => !isNaN(x.avg))

  const sortedByReturn = [...trackNetReturns].sort((a, b) => b.avg - a.avg)
  const bestTrack = sortedByReturn[0]
  const worstTrack = sortedByReturn[sortedByReturn.length - 1]
  const portfolioAvg = trackNetReturns.length
    ? trackNetReturns.reduce((s, x) => s + x.avg, 0) / trackNetReturns.length
    : NaN

  const postMortemTracks = activeTracks.filter(t => t.status === 'PostMortem')

  // Derived headline metrics
  const hitRate = postMortemTracks.length > 0
    ? Math.round((postMortemTracks.filter(t => {
        const rets = t.positions.filter(p => !p.fetchError && p.entryPrice > 0)
          .map(p => computeReturn(p, 'created', t.thesisCreatedAt))
          .filter(r => !isNaN(r))
        return rets.length > 0 && rets.reduce((a, b) => a + b, 0) / rets.length > 0
      }).length / postMortemTracks.length) * 100)
    : null

  const pfMetrics = [
    {
      label: 'Portfolio avg', key: 'avg',
      value: isNaN(portfolioAvg) ? '—' : `${portfolioAvg >= 0 ? '+' : ''}${(portfolioAvg * 100).toFixed(1)}`,
      unit: isNaN(portfolioAvg) ? '' : '%',
      ctx: `${activeTracks.length} active track${activeTracks.length !== 1 ? 's' : ''}`,
      pos: !isNaN(portfolioAvg) && portfolioAvg > 0, neg: !isNaN(portfolioAvg) && portfolioAvg < 0,
    },
    {
      label: 'Best track', key: 'best',
      value: bestTrack ? `+${(bestTrack.avg * 100).toFixed(1)}` : '—',
      unit: bestTrack ? '%' : '',
      ctx: bestTrack ? bestTrack.track.thesisName.slice(0, 22) : 'no data yet',
      pos: !!bestTrack, neg: false,
    },
    {
      label: 'Worst track', key: 'worst',
      value: worstTrack && worstTrack.avg < 0 ? `${(worstTrack.avg * 100).toFixed(1)}` : '—',
      unit: worstTrack && worstTrack.avg < 0 ? '%' : '',
      ctx: worstTrack && worstTrack.avg < 0 ? worstTrack.track.thesisName.slice(0, 22) : 'no losers yet',
      pos: false, neg: !!worstTrack && worstTrack.avg < 0,
    },
    {
      label: 'Hit rate', key: 'hit',
      value: hitRate != null ? String(hitRate) : '—',
      unit: hitRate != null ? '%' : '',
      ctx: `${postMortemTracks.length} closed`,
      pos: (hitRate ?? 0) >= 60, neg: (hitRate ?? 100) < 40 && hitRate != null,
    },
    {
      label: 'Positions', key: 'positions',
      value: String(totalPositions),
      unit: '',
      ctx: `${activeTracks.length} tracks`,
      pos: false, neg: false,
    },
    {
      label: 'Data source', key: 'source',
      value: 'Finnhub',
      unit: '',
      ctx: 'AV fallback',
      pos: false, neg: false,
    },
  ]

  return (
    <>

      {/* ── pf-summary: 6-cell headline metrics ── */}
      <div style={{
        margin: '14px 24px 0',
        display: 'flex', borderRadius: 12, overflow: 'hidden',
        background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.08)',
        position: 'relative',
      }}>
        <div style={{ width: 4, flexShrink: 0, background: 'linear-gradient(to bottom, #ffd87a 0%, #f4922c 35%, #e0511a 70%, #a01a0c 100%)' }} />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {pfMetrics.map((cell, i) => (
            <div key={cell.key} style={{
              padding: '18px 20px', borderRight: i < 5 ? '1px solid rgba(0,0,0,0.08)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{ fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#8b8980', fontWeight: 700 }}>
                {cell.label}
              </span>
              <span style={{
                fontFamily: 'GeistMono, monospace', fontSize: 22, fontWeight: 600,
                color: cell.pos ? '#2d6a4f' : cell.neg ? '#9b2c1a' : '#1a1a1f',
                letterSpacing: '-0.01em', lineHeight: 1,
              }}>
                {cell.value}<small style={{ fontSize: 12, color: '#8b8980', fontWeight: 400, marginLeft: 3 }}>{cell.unit}</small>
              </span>
              <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 10.5, color: '#6b6960', letterSpacing: '0.005em' }}>
                {cell.ctx}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── pf-chart: chart + per-track period selector ── */}
      {activeTracks.length > 0 && (
        <div style={{
          margin: '22px 24px 0',
          background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12,
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#1a1a1f' }}>
              Cumulative return
            </h2>
            <span style={{ fontSize: 12, color: '#6b6960', fontWeight: 400 }}>thesis-level · since open</span>
          </div>
          <PerformanceChart tracks={activeTracks} />
        </div>
      )}

      {hasNoRecommendations && (
        <div style={{
          margin: '14px 24px 0',
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(122,74,16,0.06)', border: '1px solid rgba(122,74,16,0.18)',
          fontSize: 11, color: '#7A4A10',
        }}>
          Some theses were created before ticker recommendations were added. Open each thesis in Brainstorm to regenerate, or add tickers manually via the ✎ button.
        </div>
      )}

      {/* ── pf-grid: active + closed ── */}
      {actionableTheses.length === 0 ? (
        <div style={{
          margin: '22px 24px',
          height: 200, borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.14)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <p style={{ fontSize: 14, color: '#8b8980', margin: 0 }}>No theses in Actionable</p>
          <p style={{ fontSize: 11, color: '#c8c0b4', margin: 0 }}>Move a thesis to Actionable stage to start tracking</p>
        </div>
      ) : (
        <div style={{
          margin: '22px 24px 60px',
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14,
        }}>
          {/* Active positions card */}
          <div style={{ background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'baseline', gap: 12,
            }}>
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#1a1a1f' }}>
                Active positions
              </h2>
              <span style={{ fontSize: 11, color: '#6b6960' }}>
                {activeTracks.filter(t => t.status === 'Active').length} tracks
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {actionableTheses.map((thesis) => {
                const track = tracks[thesis.id]
                const isLoading = loading[thesis.id]
                if (track?.status === 'PostMortem') return null
                if (isLoading) {
                  return (
                    <div key={thesis.id} style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, color: '#8b8980' }}>Loading {thesis.name}…</span>
                    </div>
                  )
                }
                if (!track) {
                  return (
                    <div key={thesis.id} style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <p style={{ fontSize: 13, color: '#1a1a1f', fontWeight: 600, margin: '0 0 3px' }}>{thesis.name}</p>
                      <p style={{ fontSize: 11, color: '#8b8980', margin: 0 }}>No tickers found. Regenerate in Brainstorm or add manually via ✎.</p>
                    </div>
                  )
                }
                return <TrackCard key={thesis.id} track={track} />
              })}
            </div>
          </div>

          {/* Recently closed card */}
          <div style={{ background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'baseline', gap: 12,
            }}>
              <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#1a1a1f' }}>
                Recently closed
              </h2>
              <span style={{ fontSize: 11, color: '#6b6960' }}>
                {postMortemTracks.length} track{postMortemTracks.length !== 1 ? 's' : ''}
              </span>
            </div>
            {postMortemTracks.length === 0 ? (
              <div style={{ padding: '32px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 12, color: '#8b8980', margin: 0, textAlign: 'center' }}>No closed tracks yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {postMortemTracks.map(track => (
                  <TrackCard key={track.thesisId} track={track} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    <AskAIDock
      context="Performance Tracker"
      starterQuestions={[
        'Which thesis has the best risk-adjusted return?',
        'Are any positions showing divergence from their thesis?',
        'How does portfolio performance correlate with macro regime shifts?',
        'Which positions should be reassessed based on performance?',
      ]}
    />
    </>
  )
}
