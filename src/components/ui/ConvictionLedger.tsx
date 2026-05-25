import React, { useState } from 'react'
import { useConvictionStore } from '../../store/convictionStore'
import { initializeThesis } from '../../api/thesisInitializer'
import { useThesisStore } from '../../store/thesisStore'
import { ConvictionReviewModal } from './ConvictionReviewModal'
import type { ConvictionDriver, ConvictionLedgerEntry, ConvictionDeltaCategory } from '../../types/conviction'
import type { ConvictionInitStatus } from '../../types/thesis'
import {
  CONVICTION_DELTA_MAGNITUDES,
  CONVICTION_SCORE_CALIBRATION,
  formatMagnitude,
} from '../../constants/convictionScoring'
import { resolveConvictionDisplay } from '../../hooks/useThesisBackgroundJobs'

// ─── Display config ───────────────────────────────────────────────────────────

const DELTA_CONFIG: Record<ConvictionDeltaCategory, {
  label: string
  color: string
  bg: string
  border: string
}> = {
  ConfirmingMaterial:    { label: 'Confirming — Material',    color: '#1E6640', bg: 'rgba(30,102,64,0.08)',  border: 'rgba(30,102,64,0.20)'  },
  ConfirmingMinor:       { label: 'Confirming — Minor',       color: '#2E6E4A', bg: 'rgba(46,110,74,0.07)',  border: 'rgba(46,110,74,0.18)'  },
  Neutral:               { label: 'Neutral',                  color: '#706050', bg: 'rgba(20,12,4,0.04)',    border: 'rgba(20,12,4,0.12)'    },
  ContradictingMinor:    { label: 'Contradicting — Minor',    color: '#7A4A10', bg: 'rgba(122,74,16,0.08)', border: 'rgba(122,74,16,0.22)'  },
  ContradictingMaterial: { label: 'Contradicting — Material', color: '#A83030', bg: 'rgba(168,48,48,0.08)', border: 'rgba(168,48,48,0.22)'  },
  ThesisAltering:        { label: 'Thesis-Altering',          color: '#8B1A1A', bg: 'rgba(139,26,26,0.10)', border: 'rgba(139,26,26,0.30)'  },
}

const ACTION_LABELS: Record<string, string> = {
  LogOnly:                  'Log Only',
  LogAndFlag:               'Log + Flag',
  LogAndInitiateKillReview: 'Kill Review',
}

const ACTION_COLORS: Record<string, string> = {
  LogOnly:                  '#A89878',
  LogAndFlag:               '#7A4A10',
  LogAndInitiateKillReview: '#A83030',
}

// ─── Score pill ───────────────────────────────────────────────────────────────

function ScorePill({ change }: { change: number }) {
  const isPositive = change > 0
  const isNegative = change < 0
  const color = isPositive ? '#1E6640' : isNegative ? '#A83030' : '#706050'
  const bg = isPositive ? 'rgba(30,102,64,0.10)' : isNegative ? 'rgba(168,48,48,0.10)' : 'rgba(20,12,4,0.05)'
  const border = isPositive ? 'rgba(30,102,64,0.22)' : isNegative ? 'rgba(168,48,48,0.22)' : 'rgba(20,12,4,0.12)'

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
      color, background: bg, border: `1px solid ${border}`,
      borderRadius: 5, padding: '2px 7px', flexShrink: 0,
    }}>
      {isPositive ? '+' : ''}{change}
    </span>
  )
}

// ─── Single ledger entry row ──────────────────────────────────────────────────

function LedgerEntryRow({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: ConvictionLedgerEntry
  isExpanded: boolean
  onToggle: () => void
}) {
  const delta = DELTA_CONFIG[entry.deltaCategory]
  const variableLabel = entry.variable.replace(/([A-Z])/g, ' $1').trim()
  const confirmedAt = new Date(entry.confirmedAt)
  const dateStr = confirmedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = confirmedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      borderBottom: '1px solid rgba(20,12,4,0.06)',
    }}>
      {/* Summary row — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: '1fr 140px 60px 80px 28px',
          gap: 12,
          alignItems: 'center',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.1s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(20,12,4,0.03)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Variable + date */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#18140E' }}>
              {variableLabel}
            </span>
            {entry.wasEdited && (
              <span style={{
                fontSize: 9, color: '#9A7A50',
                background: 'rgba(154,122,80,0.10)',
                border: '1px solid rgba(154,122,80,0.25)',
                borderRadius: 3, padding: '1px 4px',
              }}>
                edited
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#A89878' }}>{dateStr} · {timeStr}</span>
        </div>

        {/* Delta badge */}
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: delta.color, background: delta.bg,
          border: `1px solid ${delta.border}`,
          borderRadius: 5, padding: '3px 8px',
          textAlign: 'center',
        }}>
          {delta.label}
        </span>

        {/* Score change */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ScorePill change={entry.scoreChange} />
        </div>

        {/* Score after */}
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#18140E' }}>
            {entry.convictionScoreAfter}
          </span>
          <span style={{ fontSize: 10, color: '#A89878' }}>/100</span>
        </div>

        {/* Expand chevron */}
        <span style={{
          fontSize: 12, color: '#A89878',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s ease',
          display: 'flex', justifyContent: 'center',
        }}>
          ▾
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{
          padding: '0 14px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Trigger signal */}
          <div style={{
            fontSize: 11, color: '#706050',
            background: 'rgba(20,12,4,0.03)',
            border: '1px solid rgba(20,12,4,0.07)',
            borderRadius: 6, padding: '6px 10px',
          }}>
            <span style={{ color: '#A89878', fontWeight: 600 }}>Signal: </span>
            {entry.triggerSignalSummary}
          </div>

          {/* Original assumption */}
          <div>
            <div style={{ fontSize: 9, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Original Assumption
            </div>
            <div style={{
              fontSize: 11, color: '#4A3C2E', fontStyle: 'italic',
              borderLeft: '2px solid #D8C8A8', paddingLeft: 9, lineHeight: 1.5,
            }}>
              "{entry.originalAssumption}"
            </div>
          </div>

          {/* Current state assessment */}
          <div>
            <div style={{ fontSize: 9, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Assessment at Time of Entry
            </div>
            <div style={{ fontSize: 11, color: '#4A3C2E', lineHeight: 1.55 }}>
              {entry.currentStateAssessment}
            </div>
          </div>

          {/* Agent reasoning */}
          <div>
            <div style={{ fontSize: 9, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Agent Reasoning
            </div>
            <div style={{ fontSize: 11, color: '#4A3C2E', lineHeight: 1.55 }}>
              {entry.agentReasoning}
            </div>
          </div>

          {/* Footer meta */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            paddingTop: 6, borderTop: '1px solid rgba(20,12,4,0.06)',
          }}>
            <span style={{ fontSize: 10, color: '#A89878' }}>
              Score: <strong style={{ fontFamily: 'monospace', color: '#706050' }}>{entry.convictionScoreBefore}</strong>
              {' → '}
              <strong style={{ fontFamily: 'monospace', color: '#18140E' }}>{entry.convictionScoreAfter}</strong>
            </span>
            <span style={{ fontSize: 10, color: '#B8B0A4' }}>·</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: ACTION_COLORS[entry.recommendedAction] ?? '#A89878',
            }}>
              {ACTION_LABELS[entry.recommendedAction] ?? entry.recommendedAction}
            </span>
            <span style={{ fontSize: 10, color: '#B8B0A4' }}>·</span>
            <span style={{ fontSize: 10, color: '#A89878' }}>
              Confirmed by Will Jarvis
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Conviction drivers + reference ──────────────────────────────────────────

function DriverRow({ driver }: { driver: ConvictionDriver }) {
  const isUp = driver.direction === 'Up'
  const color = isUp ? '#1E6640' : '#A83030'
  const bg = isUp ? 'rgba(30,102,64,0.08)' : 'rgba(168,48,48,0.08)'
  const border = isUp ? 'rgba(30,102,64,0.20)' : 'rgba(168,48,48,0.22)'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '8px 10px',
      borderRadius: 8,
      background: bg,
      border: `1px solid ${border}`,
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
        color, flexShrink: 0, minWidth: 36, textAlign: 'right',
      }}>
        {formatMagnitude(driver.magnitude)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: '#18140E', margin: 0, lineHeight: 1.45 }}>
          {driver.trigger}
        </p>
        {driver.variable && (
          <p style={{ fontSize: 10, color: '#A89878', margin: '3px 0 0' }}>
            {driver.variable.replace(/([A-Z])/g, ' $1').trim()}
          </p>
        )}
      </div>
    </div>
  )
}

function ConvictionReferencePanel({
  drivers,
}: {
  drivers?: ConvictionDriver[]
}) {
  const [showReference, setShowReference] = useState(false)
  const upDrivers = (drivers ?? []).filter((d) => d.direction === 'Up')
  const downDrivers = (drivers ?? []).filter((d) => d.direction === 'Down')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {drivers && drivers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{
            fontSize: 9, fontWeight: 600, color: '#A89878',
            textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
          }}>
            What moves conviction on this thesis
          </p>
          {upDrivers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#1E6640' }}>↑ Up</span>
              {upDrivers.map((d, i) => <DriverRow key={`up-${i}`} driver={d} />)}
            </div>
          )}
          {downDrivers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#A83030' }}>↓ Down</span>
              {downDrivers.map((d, i) => <DriverRow key={`down-${i}`} driver={d} />)}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowReference((v) => !v)}
        style={{
          alignSelf: 'flex-start',
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: 10,
          fontWeight: 600,
          color: '#9A7A50',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        {showReference ? 'Hide' : 'Show'} score scale & signal magnitudes
      </button>

      {showReference && (
        <div style={{
          borderRadius: 10,
          overflow: 'hidden',
          background: '#FDFCF9',
          boxShadow: '0 0 0 1px rgba(20,12,4,0.07)',
        }}>
          <div style={{ padding: '10px 12px', background: '#F5F2EC', borderBottom: '1px solid rgba(20,12,4,0.07)' }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
              Initial score calibration (0–100)
            </p>
            {CONVICTION_SCORE_CALIBRATION.map((band) => (
              <div key={band.label} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 10, lineHeight: 1.4 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#706050', minWidth: 52, flexShrink: 0 }}>
                  {band.range[0]}–{band.range[1]}
                </span>
                <span style={{ fontWeight: 600, color: '#18140E', minWidth: 88, flexShrink: 0 }}>{band.label}</span>
                <span style={{ color: '#A89878' }}>{band.description}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 12px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
              Signal-triggered changes (when confirmed)
            </p>
            {(Object.entries(CONVICTION_DELTA_MAGNITUDES) as [ConvictionDeltaCategory, typeof CONVICTION_DELTA_MAGNITUDES[ConvictionDeltaCategory]][]).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 10, lineHeight: 1.4 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#706050', minWidth: 52, flexShrink: 0 }}>
                  {cfg.range[0] === cfg.range[1]
                    ? '0'
                    : cfg.range[0] < 0
                      ? `${cfg.range[0]} to ${cfg.range[1]}`
                      : `+${cfg.range[0]} to +${cfg.range[1]}`}
                </span>
                <span style={{ fontWeight: 600, color: '#18140E', minWidth: 140, flexShrink: 0 }}>{cfg.label}</span>
                <span style={{ color: '#A89878' }}>{cfg.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ConvictionLedgerProps {
  thesisId: string
  convictionReasoning?: string
  thesisQualityScore?: number
  convictionDrivers?: ConvictionDriver[]
  convictionInitStatus?: ConvictionInitStatus
  convictionRunning?: boolean
}

export const ConvictionLedger: React.FC<ConvictionLedgerProps> = ({
  thesisId,
  convictionReasoning,
  thesisQualityScore,
  convictionDrivers,
  convictionInitStatus,
  convictionRunning = false,
}) => {
  const storedScore = useConvictionStore((s) => s.convictionScores[thesisId])
  const drafts = useConvictionStore((s) =>
    Object.values(s.drafts).filter((d) => d.thesisId === thesisId)
  )
  const entries = useConvictionStore((s) =>
    Object.values(s.ledger)
      .filter((e) => e.thesisId === thesisId)
      .sort((a, b) => new Date(b.confirmedAt).getTime() - new Date(a.confirmedAt).getTime())
  )
  const thesis = useThesisStore((s) => s.theses[thesisId])

  const thesisMeta = thesis ?? {
    convictionInitStatus,
    thesisQualityScore,
    convictionReasoning,
  }
  const { displayScore, isAssessing, isFailed } = resolveConvictionDisplay(thesisMeta, storedScore)
  const showAssessing = isAssessing || convictionRunning
  const pendingDrafts = drafts

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id))

  // Score trend — difference between first and last confirmed entry
  const scoreTrend = entries.length >= 2
    ? entries[0].convictionScoreAfter - entries[entries.length - 1].convictionScoreAfter
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Current conviction score */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
            }}>
              {showAssessing ? (
                <>
                  <span style={{
                    fontSize: 18, fontWeight: 600, fontStyle: 'italic',
                    color: '#A89878',
                  }}>
                    Assessing…
                  </span>
                </>
              ) : displayScore !== undefined ? (
                <>
                  <span style={{
                    fontSize: 26, fontWeight: 800, fontFamily: 'monospace',
                    color: displayScore >= 70 ? '#1E6640' : displayScore >= 50 ? '#7A4A10' : '#A83030',
                  }}>
                    {displayScore}
                  </span>
                  <span style={{ fontSize: 12, color: '#A89878' }}>/100</span>
                </>
              ) : (
                <span style={{ fontSize: 18, fontWeight: 600, color: '#A89878' }}>—</span>
              )}
            </div>

            {/* Trend */}
            {scoreTrend !== null && (
              <span style={{
                fontSize: 11, fontWeight: 600, fontFamily: 'monospace',
                color: scoreTrend > 0 ? '#1E6640' : scoreTrend < 0 ? '#A83030' : '#706050',
              }}>
                {scoreTrend > 0 ? `+${scoreTrend}` : scoreTrend} since inception
              </span>
            )}

            <span style={{ fontSize: 10, color: '#B8B0A4' }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {isFailed && (
            <p style={{ fontSize: 11, color: '#A83030', lineHeight: 1.5, margin: 0, maxWidth: 560 }}>
              Initial assessment failed.
              {thesis && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => {
                      useThesisStore.getState().updateThesis(thesisId, { convictionInitStatus: 'pending' })
                      void initializeThesis(thesis).catch(() => {})
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#7A4A10',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Retry
                  </button>
                </>
              )}
            </p>
          )}

          {convictionReasoning && (
            <p style={{ fontSize: 11, color: '#A89878', lineHeight: 1.5, margin: 0, maxWidth: 560 }}>
              {convictionReasoning}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Pending drafts button */}
          {pendingDrafts.length > 0 && (
            <button
              onClick={() => setReviewOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(168,48,48,0.08)',
                border: '1px solid rgba(168,48,48,0.25)',
                borderRadius: 6, padding: '5px 11px',
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#A83030', flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A83030' }}>
                {pendingDrafts.length} pending
              </span>
            </button>
          )}
        </div>
      </div>

      <ConvictionReferencePanel drivers={convictionDrivers} />

      {/* Ledger table */}
      {entries.length === 0 ? (
        <div style={{
          borderRadius: 10,
          border: '1.5px dashed rgba(20,12,4,0.12)',
          padding: '28px 20px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 12, color: '#9A7A50', margin: 0 }}>
            No conviction entries yet.
          </p>
          <p style={{ fontSize: 11, color: '#B8B0A4', margin: '5px 0 0' }}>
            Entries appear here when a signal lands against this thesis and you confirm the draft.
          </p>
        </div>
      ) : (
        <div style={{
          borderRadius: 10,
          overflow: 'hidden',
          background: '#FDFCF9',
          boxShadow: '0 0 0 1px rgba(20,12,4,0.07), 0 1px 3px rgba(20,12,4,0.05), 0 4px 12px rgba(20,12,4,0.06)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 60px 80px 28px',
            gap: 12,
            padding: '7px 14px',
            background: '#F5F2EC',
            borderBottom: '1px solid rgba(20,12,4,0.07)',
          }}>
            {['Variable · Date', 'Delta', 'Change', 'Score', ''].map((h, i) => (
              <span key={i} style={{
                fontSize: 9, fontWeight: 600, color: '#A89878',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                textAlign: i >= 2 ? 'center' : 'left',
              }}>
                {h}
              </span>
            ))}
          </div>

          {/* Entries */}
          {entries.map((entry) => (
            <LedgerEntryRow
              key={entry.id}
              entry={entry}
              isExpanded={expandedId === entry.id}
              onToggle={() => toggleExpand(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Conviction review modal */}
      {reviewOpen && (
        <ConvictionReviewModal
          thesisId={thesisId}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </div>
  )
}
