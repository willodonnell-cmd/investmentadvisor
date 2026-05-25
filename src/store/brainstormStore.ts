import { create } from 'zustand'
import {
  buildBrainstormSystemPrompt,
  sendBrainstormMessage,
  generateCanvas as generateCanvasApi,
  normalizeCanvasToThesis,
  type ChatMessage,
  type ThesisCanvas,
} from '../api/brainstorming'
import { startThesisBackgroundJobs } from '../api/startThesisBackgroundJobs'
import { useThesisStore } from './thesisStore'

export type BrainstormPhase = 'idle' | 'generating' | 'canvas' | 'normalizing' | 'error'

interface BrainstormStore {
  messages: ChatMessage[]
  isStreaming: boolean
  currentThesisId: string | null
  currentThesisName: string | null
  error: string | null

  phase: BrainstormPhase
  spark: string
  canvas: ThesisCanvas | null
  canvasError: string | null
  justCompleted: boolean
  lastCreatedThesisId: string | null

  setSpark: (spark: string) => void
  sendMessage: (userMessage: string, thesisContext?: string) => Promise<void>
  clearConversation: () => void
  setThesis: (id: string, name: string) => void
  generateCanvas: () => Promise<void>
  advanceToThesis: () => Promise<string | null>
  resetCanvas: () => void
}

let completeTimer: ReturnType<typeof setTimeout> | null = null

function markComplete(set: (partial: Partial<BrainstormStore>) => void) {
  if (completeTimer) clearTimeout(completeTimer)
  set({ justCompleted: true })
  completeTimer = setTimeout(() => {
    set({ justCompleted: false })
    completeTimer = null
  }, 5000)
}

export const useBrainstormStore = create<BrainstormStore>()((set, get) => ({
  messages: [],
  isStreaming: false,
  currentThesisId: null,
  currentThesisName: null,
  error: null,

  phase: 'idle',
  spark: '',
  canvas: null,
  canvasError: null,
  justCompleted: false,
  lastCreatedThesisId: null,

  setSpark: (spark) => set({ spark }),

  setThesis: (id, name) => set({ currentThesisId: id, currentThesisName: name }),

  clearConversation: () => set({
    messages: [],
    error: null,
    isStreaming: false,
  }),

  resetCanvas: () => set({
    phase: 'idle',
    spark: '',
    canvas: null,
    canvasError: null,
    lastCreatedThesisId: null,
    justCompleted: false,
  }),

  generateCanvas: async () => {
    const spark = get().spark.trim()
    const phase = get().phase
    if (!spark || phase === 'generating' || phase === 'normalizing') return

    const existingThesisNames = Object.values(useThesisStore.getState().theses).map(t => t.name)
    set({
      phase: 'generating',
      canvas: null,
      canvasError: null,
      justCompleted: false,
      lastCreatedThesisId: null,
    })

    try {
      const result = await generateCanvasApi(spark, existingThesisNames)
      set({ canvas: result, phase: 'canvas' })
      markComplete(set)
    } catch (err) {
      set({
        phase: 'error',
        canvasError: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  },

  advanceToThesis: async () => {
    const { canvas, spark, phase } = get()
    if (!canvas || phase === 'normalizing') return null

    set({ phase: 'normalizing', canvasError: null, justCompleted: false })

    try {
      const thesis = await normalizeCanvasToThesis(canvas, spark.trim())
      const thesisWithPending = { ...thesis, convictionInitStatus: 'pending' as const }
      useThesisStore.getState().addThesis(thesisWithPending)

      // Fire and forget — staggered background jobs after thesis is created from canvas
      startThesisBackgroundJobs(thesisWithPending)

      set({ phase: 'canvas', lastCreatedThesisId: thesis.id })
      markComplete(set)
      return thesis.id
    } catch (err) {
      set({
        phase: 'canvas',
        canvasError: err instanceof Error ? err.message : 'Unknown error',
      })
      return null
    }
  },

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
    set({ messages: next, isStreaming: true, error: null, justCompleted: false })

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
      markComplete(set)
    } catch (err) {
      set({
        isStreaming: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  },
}))

export const isBrainstormCanvasRunning = (phase: BrainstormPhase): boolean =>
  phase === 'generating' || phase === 'normalizing'

export const brainstormPhaseLabel = (phase: BrainstormPhase, streaming: boolean): string => {
  if (phase === 'generating') return 'Generating canvas…'
  if (phase === 'normalizing') return 'Building thesis…'
  if (streaming) return 'Brainstorm response in progress'
  return 'Brainstorm complete'
}
