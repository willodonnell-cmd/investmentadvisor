import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_REASONING_EFFORT,
  type ReasoningEffortLevel,
} from '../constants/openaiModels'

function modelFromEnv(): string {
  const env = (import.meta.env.VITE_OPENAI_MODEL as string | undefined)?.trim()
  return env || DEFAULT_OPENAI_MODEL
}

function isReasoningEffort(v: unknown): v is ReasoningEffortLevel {
  return v === 'low' || v === 'medium' || v === 'high'
}

function reasoningEffortFromEnv(): ReasoningEffortLevel {
  const env = (import.meta.env.VITE_OPENAI_REASONING_EFFORT as string | undefined)?.trim().toLowerCase()
  if (isReasoningEffort(env)) return env
  return DEFAULT_REASONING_EFFORT
}

interface OpenAIModelState {
  model: string
  reasoningEffort: ReasoningEffortLevel
  setModel: (model: string) => void
  setReasoningEffort: (effort: ReasoningEffortLevel) => void
}

export const useOpenAIModelStore = create<OpenAIModelState>()(
  persist(
    (set) => ({
      model: modelFromEnv(),
      reasoningEffort: reasoningEffortFromEnv(),
      setModel: (model) => {
        const m = model.trim()
        set({ model: m || DEFAULT_OPENAI_MODEL })
      },
      setReasoningEffort: (effort) => {
        set({ reasoningEffort: isReasoningEffort(effort) ? effort : DEFAULT_REASONING_EFFORT })
      },
    }),
    {
      name: 'investment-openai-settings',
      partialize: (s) => ({ model: s.model, reasoningEffort: s.reasoningEffort }),
    },
  ),
)
