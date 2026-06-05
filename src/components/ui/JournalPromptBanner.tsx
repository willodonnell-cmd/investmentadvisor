import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { DecisionType } from '../../types/journal'

interface Props {
  decisionType: DecisionType
  thesisId: string
  thesisName: string
  ticker?: string
  onDismiss: () => void
}

export const JournalPromptBanner: React.FC<Props> = ({
  decisionType, thesisName, ticker, onDismiss,
}) => {
  const navigate = useNavigate()

  const label = decisionType === 'exit'
    ? 'Thesis killed.'
    : 'Position committed.'

  const cta = decisionType === 'exit'
    ? 'Log an exit in your decision journal'
    : 'Log this entry decision in your journal'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(154,122,80,0.08)',
      border: '1px solid rgba(154,122,80,0.25)',
      borderRadius: 10,
      padding: '10px 16px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1f' }}>{label} </span>
        <span style={{ fontSize: 12, color: '#6b6860' }}>
          {ticker ? `${ticker} · ` : ''}{thesisName}
        </span>
      </div>
      <button
        onClick={() => { navigate('/journal'); onDismiss() }}
        style={{
          padding: '5px 12px', borderRadius: 6, border: 'none',
          background: 'rgba(154,122,80,0.18)',
          fontSize: 11, fontWeight: 600, color: '#5a4020', cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {cta} →
      </button>
      <button
        onClick={onDismiss}
        style={{
          padding: '4px 8px', borderRadius: 5,
          border: '1px solid rgba(0,0,0,0.08)',
          fontSize: 12, color: '#a8a5a0', background: 'none', cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
