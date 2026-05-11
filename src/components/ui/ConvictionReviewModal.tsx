import React, { useState } from 'react'
import { useConvictionStore } from '../../store/convictionStore'
import type { ConvictionDraft, ConvictionDeltaCategory, ConvictionRecommendedAction } from '../../types/conviction'

// ─── Delta category display config ───────────────────────────────────────────

const DELTA_CONFIG: Record<ConvictionDeltaCategory, {
  label: string
  color: string
  bg: string
  border: string
  scorePrefix: string
}> = {
  ConfirmingMaterial:    { label: 'Confirming — Material',    color: '#1E6640', bg: 'rgba(30,102,64,0.08)',  border: 'rgba(30,102,64,0.25)',  scorePrefix: '+' },
  ConfirmingMinor:       { label: 'Confirming — Minor',       color: '#2E6E4A', bg: 'rgba(46,110,74,0.07)',  border: 'rgba(46,110,74,0.20)',  scorePrefix: '+' },
  Neutral:               { label: 'Neutral',                  color: '#706050', bg: 'rgba(20,12,4,0.05)',    border: 'rgba(20,12,4,0.15)',    scorePrefix: '' },
  ContradictingMinor:    { label: 'Contradicting — Minor',    color: '#7A4A10', bg: 'rgba(122,74,16,0.08)', border: 'rgba(122,74,16,0.25)', scorePrefix: '' },
  ContradictingMaterial: { label: 'Contradicting — Material', color: '#A83030', bg: 'rgba(168,48,48,0.08)', border: 'rgba(168,48,48,0.25)', scorePrefix: '' },
  ThesisAltering:        { label: 'Thesis-Altering',          color: '#8B1A1A', bg: 'rgba(139,26,26,0.10)', border: 'rgba(139,26,26,0.35)', scorePrefix: '' },
}

const ACTION_CONFIG: Record<ConvictionRecommendedAction, { label: string; color: string }> = {
  LogOnly:                    { label: 'Log Only',                     color: '#706050' },
  LogAndFlag:                 { label: 'Log + Flag for Review',        color: '#7A4A10' },
  LogAndInitiateKillReview:   { label: 'Log + Initiate Kill Review',   color: '#A83030' },
}

// ─── Score change visual ──────────────────────────────────────────────────────

function ScoreChangeBar({
  before,
  after,
  change,
}: {
  before: number
  after: number
  change: number
}) {
  const isPositive = change > 0
  const isNegative = change < 0
  const barColor = isPositive ? '#2E6E4A' : isNegative ? '#A83030' : '#9A7A50'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Before score */}
      <div style={{ textAlign: 'center', minWidth: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#18140E', fontFamily: 'monospace' }}>
          {before}
        </div>
        <div style={{ fontSize: 9, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Before
        </div>
      </div>

      {/* Arrow + change */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ flex: 1, height: 2, background: '#E8E0D4', borderRadius: 2, position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              height: '100%',
              borderRadius: 2,
              background: barColor,
              left: isNegative ? `${after}%` : `${before}%`,
              width: `${Math.abs(change)}%`,
            }}
          />
        </div>
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: barColor,
          fontFamily: 'monospace',
          minWidth: 36,
          textAlign: 'center',
        }}>
          {change > 0 ? `+${change}` : change}
        </span>
      </div>

      {/* After score */}
      <div style={{ textAlign: 'center', minWidth: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#18140E', fontFamily: 'monospace' }}>
          {after}
        </div>
        <div style={{ fontSize: 9, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          After
        </div>
      </div>
    </div>
  )
}

// ─── Single draft review panel ────────────────────────────────────────────────

function DraftReviewPanel({
  draft,
  onConfirm,
  onDiscard,
}: {
  draft: ConvictionDraft
  onConfirm: (draftId: string, edits?: Partial<ConvictionDraft>) => void
  onDiscard: (draftId: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedAssessment, setEditedAssessment] = useState(draft.currentStateAssessment)
  const [editedReasoning, setEditedReasoning] = useState(draft.agentReasoning)
  const [editedScoreChange, setEditedScoreChange] = useState(draft.proposedScoreChange)
  const [editedDelta, setEditedDelta] = useState<ConvictionDeltaCategory>(draft.deltaCategory)
  const [editedAction, setEditedAction] = useState<ConvictionRecommendedAction>(draft.recommendedAction)

  const proposedAfter = Math.max(10, Math.min(100, draft.currentConvictionScore + editedScoreChange))
  const delta = DELTA_CONFIG[editedDelta]
  const action = ACTION_CONFIG[editedAction]

  const handleConfirm = () => {
    const edits = isEditing ? {
      currentStateAssessment: editedAssessment,
      agentReasoning: editedReasoning,
      proposedScoreChange: editedScoreChange,
      deltaCategory: editedDelta,
      recommendedAction: editedAction,
    } : undefined
    onConfirm(draft.id, edits)
  }

  const variableLabel = draft.variable.replace(/([A-Z])/g, ' $1').trim()
  const createdAt = new Date(draft.createdAt)
  const timeStr = createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <div style={{
      background: '#FDFCF9',
      borderRadius: 12,
      border: '1px solid rgba(20,12,4,0.09)',
      boxShadow: '0 2px 12px rgba(20,12,4,0.07), 0 1px 3px rgba(20,12,4,0.05)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(20,12,4,0.07)',
        background: '#F8F4EF',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: '#9A7A50',
            }}>
              Conviction Update Draft
            </span>
            <span style={{ fontSize: 10, color: '#B8B0A4' }}>·</span>
            <span style={{ fontSize: 10, color: '#B8B0A4' }}>{dateStr} at {timeStr}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#18140E' }}>
            {draft.thesisName}
          </div>
          <div style={{ fontSize: 11, color: '#9A7A50', marginTop: 2 }}>
            Variable: <span style={{ fontWeight: 600 }}>{variableLabel}</span>
            &nbsp;·&nbsp;
            Stage: {draft.thesisStage}
          </div>
        </div>

        {/* Delta badge */}
        <div style={{
          padding: '4px 10px',
          borderRadius: 6,
          background: delta.bg,
          border: `1px solid ${delta.border}`,
          color: delta.color,
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
        }}>
          {delta.label}
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Trigger signal */}
        <div>
          <div style={{ fontSize: 10, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Trigger Signal
          </div>
          <div style={{
            fontSize: 12, color: '#4A3C2E',
            background: 'rgba(20,12,4,0.03)',
            border: '1px solid rgba(20,12,4,0.07)',
            borderRadius: 6, padding: '7px 10px',
          }}>
            {draft.triggerSignalSummary}
          </div>
        </div>

        {/* Original assumption */}
        <div>
          <div style={{ fontSize: 10, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Original Assumption
          </div>
          <div style={{
            fontSize: 12, color: '#4A3C2E', fontStyle: 'italic',
            borderLeft: '2px solid #D8C8A8',
            paddingLeft: 10,
            lineHeight: 1.5,
          }}>
            "{draft.originalAssumption}"
          </div>
        </div>

        {/* Current state assessment */}
        <div>
          <div style={{ fontSize: 10, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Current State Assessment
          </div>
          {isEditing ? (
            <textarea
              value={editedAssessment}
              onChange={(e) => setEditedAssessment(e.target.value)}
              rows={3}
              style={{
                width: '100%', fontSize: 12, color: '#18140E',
                background: '#FDFCF9', border: '1px solid rgba(154,122,80,0.40)',
                borderRadius: 6, padding: '7px 10px', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <div style={{ fontSize: 12, color: '#4A3C2E', lineHeight: 1.55 }}>
              {editedAssessment}
            </div>
          )}
        </div>

        {/* Agent reasoning */}
        <div>
          <div style={{ fontSize: 10, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Agent Reasoning
          </div>
          {isEditing ? (
            <textarea
              value={editedReasoning}
              onChange={(e) => setEditedReasoning(e.target.value)}
              rows={3}
              style={{
                width: '100%', fontSize: 12, color: '#18140E',
                background: '#FDFCF9', border: '1px solid rgba(154,122,80,0.40)',
                borderRadius: 6, padding: '7px 10px', resize: 'vertical',
                fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <div style={{ fontSize: 12, color: '#4A3C2E', lineHeight: 1.55 }}>
              {editedReasoning}
            </div>
          )}
        </div>

        {/* Score change */}
        <div>
          <div style={{ fontSize: 10, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Conviction Score Impact
          </div>
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: '#706050' }}>Score change:</span>
              <input
                type="number"
                min={-35}
                max={15}
                value={editedScoreChange}
                onChange={(e) => setEditedScoreChange(parseInt(e.target.value) || 0)}
                style={{
                  width: 72, fontSize: 13, fontFamily: 'monospace', fontWeight: 700,
                  color: '#18140E', background: '#FDFCF9',
                  border: '1px solid rgba(154,122,80,0.40)',
                  borderRadius: 6, padding: '4px 8px', outline: 'none', textAlign: 'center',
                }}
              />
              <span style={{ fontSize: 12, color: '#706050' }}>
                → New score: <strong>{proposedAfter}</strong>
              </span>
            </div>
          ) : (
            <ScoreChangeBar
              before={draft.currentConvictionScore}
              after={proposedAfter}
              change={editedScoreChange}
            />
          )}
        </div>

        {/* Recommended action */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          background: 'rgba(20,12,4,0.03)',
          borderRadius: 6,
          border: '1px solid rgba(20,12,4,0.07)',
        }}>
          <span style={{ fontSize: 10, color: '#A89878', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recommended action:
          </span>
          {isEditing ? (
            <select
              value={editedAction}
              onChange={(e) => setEditedAction(e.target.value as ConvictionRecommendedAction)}
              style={{
                fontSize: 11, fontWeight: 600, color: '#18140E',
                background: '#FDFCF9', border: '1px solid rgba(154,122,80,0.40)',
                borderRadius: 4, padding: '2px 6px', outline: 'none',
              }}
            >
              <option value="LogOnly">Log Only</option>
              <option value="LogAndFlag">Log + Flag for Review</option>
              <option value="LogAndInitiateKillReview">Log + Initiate Kill Review</option>
            </select>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: action.color }}>
              {action.label}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          {/* Confirm */}
          <button
            onClick={handleConfirm}
            style={{
              flex: 1, padding: '9px 16px',
              background: 'linear-gradient(to right, #2E6E4A, #1E5A3A)',
              color: '#fff', fontSize: 12, fontWeight: 600,
              border: 'none', borderRadius: 7, cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Confirm & Write to Ledger
          </button>

          {/* Edit toggle */}
          <button
            onClick={() => setIsEditing((v) => !v)}
            style={{
              padding: '9px 14px',
              background: isEditing ? 'rgba(154,122,80,0.15)' : 'rgba(20,12,4,0.05)',
              color: isEditing ? '#7A5A38' : '#706050',
              fontSize: 12, fontWeight: 500,
              border: `1px solid ${isEditing ? 'rgba(154,122,80,0.35)' : 'rgba(20,12,4,0.12)'}`,
              borderRadius: 7, cursor: 'pointer',
            }}
          >
            {isEditing ? 'Done Editing' : 'Edit'}
          </button>

          {/* Discard */}
          <button
            onClick={() => onDiscard(draft.id)}
            style={{
              padding: '9px 14px',
              background: 'transparent',
              color: '#A89878',
              fontSize: 12, fontWeight: 500,
              border: '1px solid rgba(20,12,4,0.10)',
              borderRadius: 7, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#A83030')}
            onMouseLeave={e => (e.currentTarget.style.color = '#A89878')}
          >
            Discard
          </button>
        </div>

        {/* Confirmation notice */}
        <div style={{ fontSize: 10, color: '#B8B0A4', textAlign: 'center', lineHeight: 1.4 }}>
          No entry is written to the conviction ledger without your explicit confirmation.
        </div>
      </div>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface ConvictionReviewModalProps {
  thesisId?: string   // if provided, shows only drafts for this thesis
  onClose: () => void
}

export const ConvictionReviewModal: React.FC<ConvictionReviewModalProps> = ({
  thesisId,
  onClose,
}) => {
  const drafts = useConvictionStore((s) => s.drafts)
  const confirmDraft = useConvictionStore((s) => s.confirmDraft)
  const dismissDraft = useConvictionStore((s) => s.dismissDraft)

  const visibleDrafts = Object.values(drafts)
    .filter((d) => !thesisId || d.thesisId === thesisId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleConfirm = (draftId: string, edits?: Partial<ConvictionDraft>) => {
    confirmDraft(draftId, edits)
  }

  const handleDiscard = (draftId: string) => {
    dismissDraft(draftId)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(10,8,4,0.60)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '48px 24px',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 640,
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#F0EDE8', margin: 0 }}>
              Conviction Review
            </h2>
            <p style={{ fontSize: 11, color: '#A89878', margin: '3px 0 0' }}>
              {visibleDrafts.length} pending {visibleDrafts.length === 1 ? 'draft' : 'drafts'} awaiting your review
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: '#A89878', fontSize: 18, cursor: 'pointer',
              width: 32, height: 32, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {visibleDrafts.length === 0 ? (
          <div style={{
            background: '#FDFCF9', borderRadius: 12,
            border: '1px solid rgba(20,12,4,0.09)',
            padding: '32px 24px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: '#9A7A50', margin: 0 }}>
              No pending conviction drafts.
            </p>
            <p style={{ fontSize: 11, color: '#B8B0A4', margin: '6px 0 0' }}>
              Drafts appear here when a new signal lands against an active thesis variable.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visibleDrafts.map((draft) => (
              <DraftReviewPanel
                key={draft.id}
                draft={draft}
                onConfirm={handleConfirm}
                onDiscard={handleDiscard}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
