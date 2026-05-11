import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_OPENAI_MODEL } from '../constants/openaiModels'

function modelFromEnv(): string {
  const env = (import.meta.env.VITE_OPENAI_MODEL as string | undefined)?.trim()
  return env || DEFAULT_OPENAI_MODEL
}

interface OpenAIModelState {
  model: string
  setModel: (model: string) => void
}

export const useOpenAIModelStore = create<OpenAIModelState>()(
  persist(
    (set) => ({
      model: modelFromEnv(),
      setModel: (model) => {
        const m = model.trim()
        set({ model: m || DEFAULT_OPENAI_MODEL })
      },
    }),
    {
      name: 'investment-openai-model',
      partialize: (s) => ({ model: s.model }),
    },
  ),
)
