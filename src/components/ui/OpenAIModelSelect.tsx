import React from 'react'
import { useOpenAIModelStore } from '../../store/openaiModelStore'
import { OPENAI_MODEL_OPTIONS } from '../../constants/openaiModels'

export const OpenAIModelSelect: React.FC = () => {
  const model = useOpenAIModelStore((s) => s.model)
  const setModel = useOpenAIModelStore((s) => s.setModel)
  const known = OPENAI_MODEL_OPTIONS.some((o) => o.value === model)

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#a8a5a0',
      }}
      title="OpenAI model used for research, memos, scenarios, and expert synthesis"
    >
      <span>OpenAI</span>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.02em',
          textTransform: 'none',
          padding: '4px 8px',
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.12)',
          background: 'rgba(255,255,255,0.85)',
          color: '#2a2824',
          maxWidth: 220,
          cursor: 'pointer',
        }}
      >
        {!known && (
          <option value={model}>{model} (current)</option>
        )}
        {OPENAI_MODEL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
