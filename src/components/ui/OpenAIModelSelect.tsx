import React from 'react'
import { useOpenAIModelStore } from '../../store/openaiModelStore'
import {
  OPENAI_MODEL_OPTIONS,
  REASONING_EFFORT_OPTIONS,
  openAIModelUsesReasoningParams,
  type ReasoningEffortLevel,
} from '../../constants/openaiModels'

const inputStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.02em',
  textTransform: 'none',
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid rgba(0,0,0,0.12)',
  background: 'rgba(255,255,255,0.85)',
  color: '#2a2824',
  width: '100%',
  boxSizing: 'border-box',
}

export const OpenAIModelSelect: React.FC = () => {
  const model = useOpenAIModelStore((s) => s.model)
  const setModel = useOpenAIModelStore((s) => s.setModel)
  const reasoningEffort = useOpenAIModelStore((s) => s.reasoningEffort)
  const setReasoningEffort = useOpenAIModelStore((s) => s.setReasoningEffort)
  const showReasoning = openAIModelUsesReasoningParams(model)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 8,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: '#a8a5a0',
      }}
    >
      <label
        title="OpenAI model used for research, memos, scenarios, and expert synthesis"
        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <span>OpenAI</span>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          list="openai-model-options"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          style={inputStyle}
        />
        <datalist id="openai-model-options">
          {OPENAI_MODEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </datalist>
      </label>

      {showReasoning && (
        <label
          title="Reasoning depth for GPT-5.x / o-series (Chat Completions reasoning_effort)"
          style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
        >
          <span>Reasoning</span>
          <select
            value={reasoningEffort}
            onChange={(e) => setReasoningEffort(e.target.value as ReasoningEffortLevel)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {REASONING_EFFORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
