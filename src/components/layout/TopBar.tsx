import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MacroRegimeModal } from '../ui/MacroRegimeModal'
import { ConvictionReviewModal } from '../ui/ConvictionReviewModal'
import { useTopBarStore } from '../../store/topbarStore'
import { useConvictionStore } from '../../store'

export const TopBar: React.FC = () => {
  const config = useTopBarStore((s) => s.config)
  const pendingDraftCount = useConvictionStore((s) => Object.keys(s.drafts ?? {}).length)
  const navigate = useNavigate()
  const [macroOpen, setMacroOpen] = useState(false)
  const [convictionOpen, setConvictionOpen] = useState(false)

  return (
    <>
      <header style={{
        height: 56, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        background: 'transparent',
        borderBottom: '1px solid rgba(0,0,0,0.09)',
        position: 'relative', zIndex: 1,
      }}>
        {/* Left — title or back breadcrumb */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {config.backTo ? (
            <button
              onClick={() => navigate(config.backTo!)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <span style={{ fontSize: 13, color: '#8b8980' }}>←</span>
              <span style={{ fontSize: 12, color: '#8b8980' }}>
                {config.backLabel ?? 'Back'}
              </span>
              {config.crumb && (
                <>
                  <span style={{ fontSize: 12, color: '#c8c0b4' }}>·</span>
                  <span style={{ fontSize: 12, color: '#6b6960' }}>{config.crumb}</span>
                </>
              )}
            </button>
          ) : (
            <>
              <h1 style={{
                fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em',
                color: '#1a1a1f', margin: 0, lineHeight: 1,
              }}>
                {config.title}
              </h1>
              {config.crumb && (
                <p style={{ fontSize: 11.5, color: '#8b8980', margin: 0 }}>{config.crumb}</p>
              )}
            </>
          )}
        </div>

        {/* Right — screen actions + system buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {config.actions}

          {pendingDraftCount > 0 && (
            <button
              onClick={() => setConvictionOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(168,48,48,0.08)',
                border: '1px solid rgba(168,48,48,0.25)',
                borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#A83030', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#A83030', letterSpacing: '0.03em' }}>
                {pendingDraftCount} pending
              </span>
            </button>
          )}

          <button
            onClick={() => setMacroOpen(true)}
            style={{
              fontSize: 11, fontWeight: 500, color: '#8b8980',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px',
              borderRadius: 6,
            }}
            title="Edit macro regime"
          >
            Macro
          </button>
        </div>
      </header>

      {macroOpen && <MacroRegimeModal onClose={() => setMacroOpen(false)} />}
      {convictionOpen && <ConvictionReviewModal onClose={() => setConvictionOpen(false)} />}
    </>
  )
}
