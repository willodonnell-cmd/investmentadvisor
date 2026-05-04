import React, { useEffect, useState } from 'react'
import { useThesisStore } from '../store'
import { usePaperTrackStore } from '../store/paperTrackStore'
import type { PaperTrack, PaperPosition, SimWindow } from '../types/paperTrack'
import { SIM_WINDOW_LABELS } from '../types/paperTrack'

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
        <span style={{ fontSize: 12, fontWeight: 700, color: '#18140E', letterSpacing: '0.02em' }}>
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
  const { computeReturn, overrideTicker, refreshTrack } = usePaperTrackStore()
  const [window, setWindow] = useState<SimWindow>('created')
  const [overriding, setOverriding] = useState<PaperPosition | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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
              Entered Watch {new Date(track.watchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        {track.positions.length > 0 && track.positions.every((p) => p.closes.length === 0 && !p.fetchError) && (
          <div style={{
            padding: '8px 16px', fontSize: 11, color: '#7A4A10',
            background: 'rgba(122,74,16,0.06)', borderBottom: '1px solid rgba(122,74,16,0.12)',
          }}>
            Historical candle data unavailable — simulation windows showing "—". Current prices are live. Refresh to retry.
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
  const { tracks, createTrack, loading } = usePaperTrackStore()

  const watchTheses = Object.values(thesesRecord).filter(
    (t) => t.stage === 'Watch' || t.stage === 'Live' || t.stage === 'Broken' || t.stage === 'PlayedOut',
  )

  // Auto-create tracks for Watch theses that don't have one yet
  useEffect(() => {
    const watchOnly = Object.values(thesesRecord).filter((t) => t.stage === 'Watch')
    watchOnly.forEach((t) => {
      if (!tracks[t.id] && t.recommendations?.length) {
        createTrack(t)
      }
    })
  }, [thesesRecord])

  const activeTracks = watchTheses
    .map((t) => tracks[t.id])
    .filter(Boolean) as PaperTrack[]

  const hasNoRecommendations = watchTheses.some(
    (t) => !t.recommendations?.length && !tracks[t.id],
  )

  return (
    <div className="p-5 space-y-5 max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#18140E', letterSpacing: '-0.015em' }}>
            Paper Tracker
          </h1>
          <p style={{ fontSize: 12, color: '#706050', marginTop: 2 }}>
            Simulated performance for Watch theses · prices via Finnhub
          </p>
        </div>
        <div style={{ fontSize: 11, color: '#A89878' }}>
          {activeTracks.length} {activeTracks.length === 1 ? 'thesis' : 'theses'} tracked
        </div>
      </div>

      {hasNoRecommendations && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: 'rgba(122,74,16,0.06)', border: '1px solid rgba(122,74,16,0.18)',
          fontSize: 11, color: '#7A4A10',
        }}>
          Some Watch theses were created before ticker recommendations were added. Open each thesis in Brainstorm to regenerate, or add tickers manually via the ✎ button.
        </div>
      )}

      {watchTheses.length === 0 ? (
        <div style={{
          height: 200, borderRadius: 12,
          border: '1.5px dashed #D8D0C4',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <p style={{ fontSize: 14, color: '#A89878', fontFamily: 'DM Serif Display, serif' }}>No theses in Watch</p>
          <p style={{ fontSize: 11, color: '#C8C0B4' }}>Move a thesis to Watch stage to start paper tracking</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {watchTheses.map((thesis) => {
            const track = tracks[thesis.id]
            const isLoading = loading[thesis.id]

            if (isLoading) {
              return (
                <div key={thesis.id} style={{
                  background: '#FDFCF9', borderRadius: 12, padding: 40,
                  boxShadow: '0 0 0 1px rgba(20,12,4,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 12, color: '#A89878' }}>Fetching prices for {thesis.name}…</span>
                </div>
              )
            }

            if (!track) {
              return (
                <div key={thesis.id} style={{
                  background: '#FDFCF9', borderRadius: 12, padding: 24,
                  boxShadow: '0 0 0 1px rgba(20,12,4,0.06)',
                }}>
                  <p style={{ fontSize: 13, color: '#18140E', fontWeight: 600, marginBottom: 4 }}>{thesis.name}</p>
                  <p style={{ fontSize: 11, color: '#A89878' }}>
                    No ticker recommendations found. Regenerate this thesis in Brainstorm to get auto-recommendations.
                  </p>
                </div>
              )
            }

            return <TrackCard key={thesis.id} track={track} />
          })}
        </div>
      )}
    </div>
  )
}
