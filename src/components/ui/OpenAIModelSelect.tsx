import React from 'react'
import { useOpenAIModelStore } from '../../store/openaiModelStore'
import {
  OPENAI_MODEL_OPTIONS,
  REASONING_EFFORT_OPTIONS,
  openAIModelUsesReasoningParams,
  type ReasoningEffortLevel,
} from '../../constants/openaiModels'

/** Controls sit on the dark sidebar — match shell tokens, not parchment inputs. */
const fieldStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.01em',
  textTransform: 'none',
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e8e6e0',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#6b6860',
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
        gap: 10,
      }}
    >
      <label
        title="OpenAI Chat Completions model for canvas, memos, and expert synthesis"
        style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
      >
        <span style={labelStyle}>Model</span>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          list="openai-model-options"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          style={fieldStyle}
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
          title="reasoning_effort on Chat Completions (GPT-5.x / o-series)"
          style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
        >
          <span style={labelStyle}>Reasoning</span>
          <select
            value={reasoningEffort}
            onChange={(e) => setReasoningEffort(e.target.value as ReasoningEffortLevel)}
            style={{ ...fieldStyle, cursor: 'pointer', colorScheme: 'dark' }}
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
