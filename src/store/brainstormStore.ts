import { create } from 'zustand'
import {
  buildBrainstormSystemPrompt,
  sendBrainstormMessage,
  type ChatMessage,
} from '../api/brainstorming'
import { useThesisStore } from './thesisStore'

interface BrainstormStore {
  messages: ChatMessage[]
  isStreaming: boolean
  currentThesisId: string | null
  currentThesisName: string | null
  error: string | null

  sendMessage: (userMessage: string, thesisContext?: string) => Promise<void>
  clearConversation: () => void
  setThesis: (id: string, name: string) => void
}

export const useBrainstormStore = create<BrainstormStore>()((set, get) => ({
  messages: [],
  isStreaming: false,
  currentThesisId: null,
  currentThesisName: null,
  error: null,

  setThesis: (id, name) => set({ currentThesisId: id, currentThesisName: name }),

  clearConversation: () => set({
    messages: [],
    error: null,
    isStreaming: false,
  }),

  sendMessage: async (userMessage, thesisContext) => {
    if (get().isStreaming) return

    const text = userMessage.trim()
    if (!text) return

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
    if (!apiKey) {
      set({ error: 'VITE_OPENAI_API_KEY not set' })
      return
    }

    const existingThesisNames = Object.values(useThesisStore.getState().theses).map(t => t.name)
    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...get().messages, userMsg]
    set({ messages: next, isStreaming: true, error: null })

    let systemPrompt = buildBrainstormSystemPrompt(existingThesisNames)
    const context = thesisContext?.trim() || get().currentThesisName?.trim()
    if (context) {
      systemPrompt += `\n\nThe user is brainstorming in the context of: ${context}`
    }

    try {
      const reply = await sendBrainstormMessage(next, systemPrompt, apiKey)
      set({
        messages: [...next, { role: 'assistant', content: reply }],
        isStreaming: false,
      })
    } catch (err) {
      set({
        isStreaming: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  },
}))
