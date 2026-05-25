import { useOpenAIModelStore } from '../store/openaiModelStore'
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_REASONING_EFFORT,
  openAIModelUsesReasoningParams,
  type ReasoningEffortLevel,
} from '../constants/openaiModels'

const API_URL = 'https://api.openai.com/v1/chat/completions'

const getKey = (): string => {
  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (!key) throw new Error('VITE_OPENAI_API_KEY is not set. Add it to .env')
  return key
}

/** Model from the desk selector (persisted); falls back if unset. */
export const getResolvedOpenAIModel = (): string => {
  const fromStore = useOpenAIModelStore.getState().model?.trim()
  if (fromStore) return fromStore
  const fromEnv = (import.meta.env.VITE_OPENAI_MODEL as string | undefined)?.trim()
  return fromEnv || DEFAULT_OPENAI_MODEL
}

/** Persisted reasoning effort for GPT-5.x / o-series Chat Completions (`reasoning_effort`). */
export const getResolvedReasoningEffort = (): ReasoningEffortLevel => {
  const fromStore = useOpenAIModelStore.getState().reasoningEffort
  if (fromStore === 'low' || fromStore === 'medium' || fromStore === 'high') return fromStore
  const fromEnv = (import.meta.env.VITE_OPENAI_REASONING_EFFORT as string | undefined)?.trim().toLowerCase()
  if (fromEnv === 'low' || fromEnv === 'medium' || fromEnv === 'high') return fromEnv
  return DEFAULT_REASONING_EFFORT
}

/** Mutates `body` with token limit + optional `reasoning_effort` for the resolved model. */
export function applyOpenAIChatCompletionDynamicFields(
  body: Record<string, unknown>,
  model: string,
  maxTokens: number,
): void {
  if (openAIModelUsesReasoningParams(model)) {
    body.max_completion_tokens = maxTokens
    body.reasoning_effort = getResolvedReasoningEffort()
  } else {
    body.max_tokens = maxTokens
  }
}

export const SYSTEM_IDENTITY = `You are a thesis-first investment research analyst embedded in a professional investment system.

Core principles — never violate:
- No floating stock opinions. Every company appears as an expression of a thesis.
- No thesis without a transmission path. Specify exactly how money is made.
- No thesis without a mispriced variable. Identify what the market is systematically pricing wrong.
- Best business ≠ best stock. These are separate, scored objects.
- Variant perception is formal. State the consensus view explicitly, then your variant.
- Kill vague enthusiasm. Prefer sharp judgment. Be explicit about uncertainty.
- Every kill is a learning event. Disconfirmers are as important as assumptions.`

export const callInvestmentAPI = async <T = string>(
  systemPrompt: string,
  userContent: string,
  structuredOutput = false,
  maxTokens = 4000,
): Promise<T> => {
  const model = getResolvedOpenAIModel()
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  }
  applyOpenAIChatCompletionDynamicFields(body, model, maxTokens)
  if (structuredOutput && !model.startsWith('gpt-5')) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`API error ${response.status}: ${JSON.stringify(err)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  const text = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('OpenAI returned empty content')

  if (structuredOutput) {
    try {
      const firstBrace = text.indexOf('{')
      const firstBracket = text.indexOf('[')
      let start: number
      if (firstBrace === -1) start = firstBracket
      else if (firstBracket === -1) start = firstBrace
      else start = Math.min(firstBrace, firstBracket)
      if (start === -1) throw new Error('No JSON object found in response')

      const lastBrace = text.lastIndexOf('}')
      const lastBracket = text.lastIndexOf(']')
      const end = Math.max(lastBrace, lastBracket)
      if (end === -1) throw new Error('No JSON closing found in response')

      const slice = text.slice(start, end + 1)
      const sanitized = slice
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      const parsed = JSON.parse(sanitized)
      return parsed as T
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('PARSE FAILED at:', message)
      throw new Error(`Structured output parse failed: ${message}. Raw: ${text.slice(0, 300)}`)
    }
  }

  return text as unknown as T
}
