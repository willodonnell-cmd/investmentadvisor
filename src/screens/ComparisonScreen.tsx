import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThesisStore } from '../store'
import { useCompareStore } from '../store/compareStore'
import { useTopBar } from '../store/topbarStore'
import { AskAIDock } from '../components/ui/AskAIDock'
import { formatHorizon } from '../utils/formatting'
import { Thesis } from '../types'
import { THESIS_TYPE_LABELS, MISPRICED_VARIABLE_LABELS } from '../constants'

// ─── Design tokens ────────────────────────────────────────────────────────────

const tk = {
  bg: '#ede9e0', surface: '#f5f2eb', surface2: '#e8e4d8', card: '#fbf8f1',
  ink: '#1a1a1f', ink2: '#3a3a42', muted: '#6b6960', muted2: '#8b8980',
  hairline: 'rgba(0,0,0,0.08)', hairline2: 'rgba(0,0,0,0.14)',
  sun2: '#f4922c', sun3: '#e0511a',
  green: '#2d6a4f', greenBg: 'rgba(45,106,79,0.04)', greenBar: 'rgba(45,106,79,0.20)',
  amberBg: 'rgba(244,146,44,0.05)', amberBar: 'rgba(244,146,44,0.30)',
  neg: '#9b2c1a', negBg: 'rgba(155,44,26,0.04)', negBar: 'rgba(155,44,26,0.25)',
  purple: '#4a1d6b', rust: '#92400e',
}

const STAGE_COLORS: Record<string, string> = {
  Developing: tk.purple, Actionable: tk.rust, Live: tk.green,
}
const STAGE_BG: Record<string, string> = {
  Developing: 'rgba(74,29,107,0.10)', Actionable: 'rgba(146,64,14,0.10)', Live: 'rgba(45,106,79,0.10)',
}

// ─── Status helpers ───────────────────────────────────────────────────────────

type CellStatus = 'same' | 'diff' | 'opposed' | 'hi' | 'lo' | 'neutral'

function cellStyle(status: CellStatus): React.CSSProperties {
  if (status === 'same') return { background: tk.greenBg, borderLeft: `2px solid ${tk.greenBar}`, paddingLeft: 14 }
  if (status === 'diff') return { background: tk.amberBg, borderLeft: `2px solid ${tk.amberBar}`, paddingLeft: 14 }
  if (status === 'hi')   return { background: tk.amberBg, borderLeft: `2px solid ${tk.amberBar}`, paddingLeft: 14 }
  if (status === 'lo')   return { background: tk.negBg,   borderLeft: `2px solid ${tk.negBar}`,   paddingLeft: 14 }
  if (status === 'opposed') return { background: tk.negBg, borderLeft: `2px solid ${tk.negBar}`, paddingLeft: 14 }
  return {}
}

function flagColor(status: CellStatus): string {
  if (status === 'same') return tk.green
  if (status === 'diff' || status === 'hi') return '#f4922c'
  if (status === 'lo' || status === 'opposed') return tk.neg
  return tk.muted2
}

function sameCheck(vals: string[]): 'same' | 'diff' {
  return new Set(vals).size === 1 ? 'same' : 'diff'
}

// ─── Comparison row definitions ───────────────────────────────────────────────

interface RowDef {
  group: string
  label: string
  render: (t: Thesis) => React.ReactNode
  status?: (theses: Thesis[]) => CellStatus[]
}

const ROWS: RowDef[] = [
  // ── Status ──
  {
    group: 'Status',
    label: 'Stage',
    render: (t) => (
      <span style={{
        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        padding: '3px 9px', borderRadius: 99,
        color: STAGE_COLORS[t.stage] ?? tk.muted2,
        background: STAGE_BG[t.stage] ?? 'rgba(216,208,196,0.3)',
        border: `1px solid ${(STAGE_COLORS[t.stage] ?? '#a8a5a0') + '50'}`,
      }}>
        {t.stage}
      </span>
    ),
    status: (theses) => {
      const vals = theses.map(t => t.stage)
      const s = sameCheck(vals)
      return vals.map(() => s)
    },
  },
  {
    group: 'Status',
    label: 'Type',
    render: (t) => (
      <span style={{ fontSize: 11, fontWeight: 600, color: tk.ink2 }}>
        {THESIS_TYPE_LABELS[t.type] ?? t.type}
      </span>
    ),
    status: (theses) => {
      const s = sameCheck(theses.map(t => t.type))
      return theses.map(() => s)
    },
  },
  {
    group: 'Status',
    label: 'Horizon',
    render: (t) => (
      <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 13, fontWeight: 600, color: tk.ink }}>
        {formatHorizon(t.timeHorizon)}
      </span>
    ),
    status: (theses) => {
      const vals = theses.map(t => t.timeHorizon)
      const max = Math.max(...vals); const min = Math.min(...vals)
      if (max === min) return vals.map(() => 'same' as CellStatus)
      return vals.map(v => v === max ? 'hi' : v === min ? 'lo' : 'neutral')
    },
  },
  {
    group: 'Status',
    label: 'Conviction',
    render: (t) => {
      const score = t.thesisQualityScore
      if (score == null) return <span style={{ fontSize: 11, color: tk.muted2 }}>—</span>
      const color = score >= 7 ? tk.green : score >= 4 ? '#f4922c' : tk.neg
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, height: 4, borderRadius: 2, background: tk.surface2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(score / 10) * 100}%`, background: color, borderRadius: 2 }} />
          </div>
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 13, fontWeight: 600, color }}>{score * 10}<small style={{ fontSize: 10, color: tk.muted2, fontWeight: 400 }}>/100</small></span>
        </div>
      )
    },
    status: (theses) => {
      const vals = theses.map(t => t.thesisQualityScore ?? 0)
      const max = Math.max(...vals); const min = Math.min(...vals)
      if (max === min) return theses.map(() => 'same' as CellStatus)
      return vals.map(v => v === max ? 'hi' : v === min ? 'lo' : 'neutral')
    },
  },
  // ── Content ──
  {
    group: 'Content',
    label: 'Mispriced Variable',
    render: (t) => (
      <span style={{ fontSize: 11, color: '#f4922c', fontWeight: 600 }}>
        {MISPRICED_VARIABLE_LABELS[t.primaryMispricedVariable] ?? t.primaryMispricedVariable.replace(/([A-Z])/g, ' $1').trim()}
      </span>
    ),
    status: (theses) => {
      const s = sameCheck(theses.map(t => t.primaryMispricedVariable))
      return theses.map(() => s)
    },
  },
  {
    group: 'Content',
    label: 'Statement',
    render: (t) => (
      <p style={{ fontSize: 12.5, color: tk.ink2, lineHeight: 1.55, margin: 0 }}>
        {t.statement || <span style={{ color: tk.muted2, fontStyle: 'italic' }}>—</span>}
      </p>
    ),
  },
  {
    group: 'Content',
    label: 'Transmission Path',
    render: (t) => (
      <p style={{ fontSize: 12.5, color: tk.muted, lineHeight: 1.55, margin: 0 }}>
        {t.transmissionPath || <span style={{ fontStyle: 'italic' }}>—</span>}
      </p>
    ),
  },
  {
    group: 'Content',
    label: 'Why Now',
    render: (t) => (
      <p style={{ fontSize: 12.5, color: tk.ink2, lineHeight: 1.55, margin: 0 }}>
        {t.whyNow || <span style={{ color: tk.muted2, fontStyle: 'italic' }}>—</span>}
      </p>
    ),
  },
  // ── Risk ──
  {
    group: 'Risk',
    label: 'Key Assumptions',
    render: (t) => (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {t.keyAssumptions.length === 0
          ? <span style={{ fontSize: 11, color: tk.muted2, fontStyle: 'italic' }}>—</span>
          : t.keyAssumptions.map((a, i) => (
            <li key={i} style={{ display: 'flex', gap: 6, fontSize: 12.5, color: tk.ink2, lineHeight: 1.4 }}>
              <span style={{ color: tk.muted2, flexShrink: 0 }}>·</span>{a}
            </li>
          ))}
      </ul>
    ),
  },
  {
    group: 'Risk',
    label: 'Disconfirmers',
    render: (t) => (
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {t.disconfirmers.length === 0
          ? <span style={{ fontSize: 11, color: tk.muted2, fontStyle: 'italic' }}>—</span>
          : t.disconfirmers.map((d, i) => (
            <li key={i} style={{ display: 'flex', gap: 6, fontSize: 12.5, color: tk.neg, lineHeight: 1.4 }}>
              <span style={{ color: tk.neg + '60', flexShrink: 0 }}>·</span>{d}
            </li>
          ))}
      </ul>
    ),
  },
  {
    group: 'Risk',
    label: 'Evidence Drift',
    render: (t) => {
      const dir = t.evidenceDriftDirection
      const score = t.evidenceDriftScore
      const color = dir === 'Positive' ? tk.green : dir === 'Negative' || dir === 'SevereNegative' ? tk.neg : tk.muted
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 13, fontWeight: 600, color }}>
            {score > 0 ? '+' : ''}{score}
          </span>
          <span style={{ fontSize: 10, color }}>{dir}</span>
        </div>
      )
    },
    status: (theses) => {
      const vals = theses.map(t => t.evidenceDriftScore)
      const max = Math.max(...vals); const min = Math.min(...vals)
      if (max === min) return theses.map(() => 'neutral' as CellStatus)
      return vals.map(v => v === max ? 'hi' : v === min ? 'lo' : 'neutral')
    },
  },
]

const ROW_GROUPS = ROWS.reduce<Array<{ group: string; rows: RowDef[]; startIdx: number }>>((acc, row, i) => {
  if (!acc.length || acc[acc.length - 1].group !== row.group) {
    acc.push({ group: row.group, rows: [row], startIdx: i })
  } else {
    acc[acc.length - 1].rows.push(row)
  }
  return acc
}, [])

// ─── Stage badge ──────────────────────────────────────────────────────────────

const StageBadge: React.FC<{ stage: string }> = ({ stage }) => (
  <span style={{
    fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
    padding: '2px 8px', borderRadius: 99,
    color: STAGE_COLORS[stage] ?? tk.muted2,
    background: STAGE_BG[stage] ?? 'rgba(216,208,196,0.3)',
    border: `1px solid ${(STAGE_COLORS[stage] ?? '#a8a5a0') + '50'}`,
  }}>
    {stage}
  </span>
)

// ─── Slot card ────────────────────────────────────────────────────────────────

const SlotCard: React.FC<{
  label: 'A' | 'B'
  thesis?: Thesis
  onAdd: () => void
  onRemove: () => void
  onOpen: () => void
  onSwap?: () => void
}> = ({ label, thesis, onAdd, onRemove, onOpen, onSwap }) => {
  const [hovered, setHovered] = useState(false)

  if (!thesis) {
    return (
      <div
        onClick={onAdd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: tk.card,
          border: `1px dashed ${hovered ? tk.ink2 : tk.hairline2}`,
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', color: hovered ? tk.ink2 : tk.muted,
          fontSize: 12.5, fontWeight: 500,
          transition: 'border-color 150ms, color 150ms',
          minHeight: 56,
        }}
      >
        <span style={{
          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: tk.muted2, padding: '2px 7px', borderRadius: 4,
          background: tk.surface2, border: `1px solid ${tk.hairline2}`, flexShrink: 0,
        }}>{label}</span>
        <span>Add thesis {label}</span>
      </div>
    )
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: tk.card,
        border: `1px solid ${hovered ? tk.ink2 : tk.hairline2}`,
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'border-color 150ms',
      }}
    >
      <span style={{
        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: tk.muted2, padding: '2px 7px', borderRadius: 4,
        background: tk.surface2, border: `1px solid ${tk.hairline2}`, flexShrink: 0,
      }}>{label}</span>

      <span style={{
        fontFamily: 'GeistMono, monospace', fontSize: 13, fontWeight: 700, color: tk.ink,
        letterSpacing: '0.04em', flexShrink: 0,
      }}>
        {thesis.ticker ?? '—'}
      </span>

      <span style={{
        fontSize: 12, color: tk.ink2, fontWeight: 500, flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {thesis.name}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {[
          { label: '↗', title: 'Open', onClick: onOpen },
          ...(onSwap ? [{ label: '⇄', title: 'Swap', onClick: onSwap }] : []),
          { label: '×', title: 'Remove', onClick: onRemove },
        ].map(btn => (
          <button
            key={btn.title}
            title={btn.title}
            onClick={btn.onClick}
            style={{
              appearance: 'none', border: `1px solid ${tk.hairline2}`, background: 'transparent',
              color: tk.muted, padding: '3px 7px', borderRadius: 5, cursor: 'pointer',
              fontSize: 12, fontWeight: 500, lineHeight: 1,
              transition: 'color 100ms, border-color 100ms, background 100ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = tk.ink; e.currentTarget.style.borderColor = tk.ink2; e.currentTarget.style.background = tk.surface }}
            onMouseLeave={e => { e.currentTarget.style.color = tk.muted; e.currentTarget.style.borderColor = tk.hairline2; e.currentTarget.style.background = 'transparent' }}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Thesis picker modal ──────────────────────────────────────────────────────

const ThesisPicker: React.FC<{
  thesesMap: Record<string, Thesis>
  excluded: string[]
  onSelect: (id: string) => void
  onClose: () => void
}> = ({ thesesMap, excluded, onSelect, onClose }) => {
  const [query, setQuery] = useState('')
  const available = Object.values(thesesMap).filter(t => !excluded.includes(t.id))
  const filtered = query.trim()
    ? available.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
    : available

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
        width: 320, borderRadius: 10, overflow: 'hidden',
        background: tk.card, border: `1px solid ${tk.hairline2}`,
        boxShadow: '0 8px 24px rgba(60,40,10,0.14)',
      }}>
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${tk.hairline}` }}>
          <input
            autoFocus
            type="text"
            placeholder="Search theses…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', background: 'rgba(0,0,0,0.04)', border: `1px solid ${tk.hairline2}`,
              borderRadius: 6, padding: '5px 9px', fontSize: 12, color: tk.ink, outline: 'none',
            }}
          />
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <p style={{ padding: '14px 14px', fontSize: 12, color: tk.muted2, textAlign: 'center' }}>No theses available</p>
          ) : filtered.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.id); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '10px 14px',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: `1px solid ${tk.hairline}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,146,44,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: STAGE_COLORS[t.stage] ?? tk.muted2 }} />
              <span style={{ fontSize: 12, color: tk.ink, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.name}
              </span>
              <StageBadge stage={t.stage} />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Summary stat card ────────────────────────────────────────────────────────

const StatCard: React.FC<{ thesis: Thesis }> = ({ thesis }) => {
  const conviction = thesis.thesisQualityScore != null ? `${thesis.thesisQualityScore * 10}/100` : '—'
  const horizon = formatHorizon(thesis.timeHorizon)
  const expReturn = '—'

  const metrics = [
    { k: 'Conviction', v: conviction, pos: (thesis.thesisQualityScore ?? 0) >= 7 },
    { k: 'Horizon', v: horizon, pos: false },
    { k: 'Type', v: THESIS_TYPE_LABELS[thesis.type] ?? thesis.type, pos: false },
    { k: 'Exp. return', v: expReturn, pos: true },
  ]

  return (
    <div style={{
      background: tk.card, border: `1px solid ${tk.hairline}`, borderRadius: 10,
      padding: '14px 18px',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px',
    }}>
      {metrics.map(m => (
        <div key={m.k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2, fontWeight: 700 }}>
            {m.k}
          </span>
          <span style={{
            fontFamily: m.k === 'Type' ? undefined : 'GeistMono, monospace',
            fontSize: 15, color: m.pos ? tk.green : tk.ink, fontWeight: 600, letterSpacing: '-0.005em',
          }}>
            {m.v}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Comparison table ─────────────────────────────────────────────────────────

const ComparisonTable: React.FC<{ theses: [Thesis, Thesis] }> = ({ theses }) => {
  const [a, b] = theses
  const LABEL = 240

  return (
    <div style={{
      background: tk.card, border: `1px solid ${tk.hairline}`, borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{
        display: 'grid', gridTemplateColumns: `${LABEL}px 1fr 1fr`,
        borderBottom: `1px solid ${tk.hairline}`,
        background: tk.surface, position: 'sticky', top: 0, zIndex: 1,
      }}>
        <div style={{ padding: '18px 18px', borderRight: `1px solid ${tk.hairline}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2, fontWeight: 700 }}>Overview</span>
          <span style={{ fontSize: 11, color: tk.muted }}>Click ↗ to open detail</span>
        </div>
        {theses.map((t, i) => (
          <div key={t.id} style={{
            padding: '18px 20px', borderRight: i === 0 ? `1px solid ${tk.hairline}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120,
            background: tk.card,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 14, fontWeight: 700, color: tk.ink, letterSpacing: '0.04em' }}>
                {t.ticker ?? '—'}
              </span>
              <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 10, color: tk.muted2, letterSpacing: '0.04em' }}>
                #{String(i + 1).padStart(3, '0')}
              </span>
              <StageBadge stage={t.stage} />
            </div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.005em', color: tk.ink, lineHeight: 1.3 }}>
              {t.name}
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: tk.muted, lineHeight: 1.5 }}>
              {t.statement?.slice(0, 120) ?? ''}
            </p>
          </div>
        ))}
      </div>

      {/* Body rows */}
      {ROW_GROUPS.map(({ group, rows }) => (
        <React.Fragment key={group}>
          <div style={{
            display: 'grid', gridTemplateColumns: `${LABEL}px 1fr 1fr`,
            background: 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${tk.hairline}`,
          }}>
            <div style={{ padding: '7px 18px', gridColumn: '1 / -1' }}>
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c8b090' }}>
                {group}
              </span>
            </div>
          </div>
          {rows.map((row) => {
            const statuses = row.status ? row.status(theses) : theses.map(() => 'neutral' as CellStatus)
            return (
              <div key={row.label} style={{
                display: 'grid', gridTemplateColumns: `${LABEL}px 1fr 1fr`,
                borderBottom: `1px solid ${tk.hairline}`,
              }}>
                <div style={{
                  padding: '12px 18px', borderRight: `1px solid ${tk.hairline}`,
                  background: tk.surface,
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tk.ink, letterSpacing: '0.06em', textTransform: 'uppercase', lineHeight: 1 }}>
                    {row.label}
                  </span>
                  {statuses[0] !== 'neutral' && (
                    <span style={{
                      fontFamily: 'GeistMono, monospace', fontSize: 9.5, fontWeight: 600,
                      color: flagColor(statuses[0]), textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {statuses[0] === 'same' ? 'Same' : statuses[0] === 'hi' || statuses[0] === 'lo' ? 'Differs' : statuses[0]}
                    </span>
                  )}
                </div>
                {theses.map((t, i) => (
                  <div key={t.id} style={{
                    padding: '12px 18px',
                    borderRight: i === 0 ? `1px solid ${tk.hairline}` : 'none',
                    ...cellStyle(statuses[i]),
                  }}>
                    {row.render(t)}
                  </div>
                ))}
              </div>
            )
          })}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const ComparisonScreen: React.FC = () => {
  const thesesMap = useThesisStore(s => s.theses)
  const { slots, addSlot, removeSlot, clearAll } = useCompareStore()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState<'A' | 'B' | null>(null)

  const [thesisA, thesisB] = useMemo(() => [
    slots[0] ? thesesMap[slots[0]] : undefined,
    slots[1] ? thesesMap[slots[1]] : undefined,
  ], [slots, thesesMap])

  const selectedCount = [thesisA, thesisB].filter(Boolean).length

  useTopBar({
    title: `Compare${selectedCount > 0 ? ` (${selectedCount})` : ''}`,
    crumb: selectedCount === 2
      ? '2 theses'
      : 'Select two theses',
  })

  const LABEL = 240

  return (
    <>
    <div style={{ paddingBottom: 60 }}>

      {/* ── cp-slots ── */}
      <div style={{
        margin: '14px 24px 0',
        display: 'grid', gridTemplateColumns: `${LABEL}px 1fr 1fr`, gap: 14, alignItems: 'stretch',
      }}>
        {/* Left label col */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 6px' }}>
          <span style={{ fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2, fontWeight: 700 }}>
            Comparing
          </span>
          <span style={{ fontSize: 13, color: tk.ink, fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.3 }}>
            {selectedCount === 2 ? 'Ready' : selectedCount === 1 ? 'Add second' : 'Select two'}
          </span>
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 10.5, color: tk.muted, letterSpacing: '0.005em' }}>
            color = similarity
          </span>
        </div>

        {/* Slot A */}
        <div style={{ position: 'relative' }}>
          <SlotCard
            label="A"
            thesis={thesisA}
            onAdd={() => setPickerOpen('A')}
            onRemove={() => removeSlot(slots[0])}
            onOpen={() => navigate(`/thesis/${slots[0]}`)}
            onSwap={thesisA && thesisB ? () => {
              const [a, b] = [...slots]
              clearAll(); addSlot(b); addSlot(a)
            } : undefined}
          />
          {pickerOpen === 'A' && (
            <ThesisPicker
              thesesMap={thesesMap}
              excluded={slots}
              onSelect={addSlot}
              onClose={() => setPickerOpen(null)}
            />
          )}
        </div>

        {/* Slot B */}
        <div style={{ position: 'relative' }}>
          <SlotCard
            label="B"
            thesis={thesisB}
            onAdd={() => setPickerOpen('B')}
            onRemove={() => removeSlot(slots[1])}
            onOpen={() => navigate(`/thesis/${slots[1]}`)}
          />
          {pickerOpen === 'B' && (
            <ThesisPicker
              thesesMap={thesesMap}
              excluded={slots}
              onSelect={addSlot}
              onClose={() => setPickerOpen(null)}
            />
          )}
        </div>
      </div>

      {/* ── cp-summary ── */}
      {thesisA && thesisB && (
        <div style={{
          margin: '16px 24px 0',
          display: 'grid', gridTemplateColumns: `${LABEL}px 1fr 1fr`, gap: 14, alignItems: 'stretch',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
            <span style={{ fontSize: 10.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: tk.muted2, fontWeight: 700 }}>
              Headline metrics
            </span>
          </div>
          <StatCard thesis={thesisA} />
          <StatCard thesis={thesisB} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!thesisA && !thesisB && (
        <div style={{
          margin: '16px 24px', height: 200, borderRadius: 12,
          border: `1.5px dashed ${tk.hairline2}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <p style={{ fontSize: 14, color: tk.muted2, margin: 0 }}>No theses selected.</p>
        </div>
      )}

      {thesisA && !thesisB && (
        <div style={{
          margin: '16px 24px', height: 100, borderRadius: 12,
          border: `1.5px dashed ${tk.hairline2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 13, color: tk.muted2, margin: 0 }}>Add a second thesis to compare.</p>
        </div>
      )}

      {/* ── Comparison table ── */}
      {thesisA && thesisB && (
        <div style={{ margin: '22px 24px 60px' }}>
          <ComparisonTable theses={[thesisA, thesisB]} />
        </div>
      )}

    </div>

    <AskAIDock
      context="Thesis Comparison"
      starterQuestions={[
        'Which thesis has the stronger variant perception?',
        'Are these theses correlated in their macro drivers?',
        'Which thesis has the better risk/reward based on disconfirmers?',
        'How do the transmission paths differ across these theses?',
      ]}
    />
    </>
  )
}
