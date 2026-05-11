/** Default for thesis research, memos, and structured JSON — GPT-5.x + reasoning_effort in app. */
export const DEFAULT_OPENAI_MODEL = 'gpt-5.5'

/** User-selectable reasoning for models that support `reasoning_effort` on Chat Completions. */
export type ReasoningEffortLevel = 'low' | 'medium' | 'high'

export const DEFAULT_REASONING_EFFORT: ReasoningEffortLevel = 'medium'

export const REASONING_EFFORT_OPTIONS: { value: ReasoningEffortLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium (default)' },
  { value: 'high', label: 'High' },
]

/** GPT-5.x and o-series: use `max_completion_tokens` + optional `reasoning_effort` per OpenAI Chat Completions. */
export function openAIModelUsesReasoningParams(model: string): boolean {
  const m = model.trim().toLowerCase()
  return m.startsWith('gpt-5') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')
}

export const OPENAI_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'gpt-5.5', label: 'GPT-5.5 — frontier (default)' },
  { value: 'gpt-5.5-2026-04-23', label: 'GPT-5.5 snapshot (2026-04-23)' },
  { value: 'gpt-5.4', label: 'GPT-5.4' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 mini' },
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 nano' },
  { value: 'gpt-4o', label: 'GPT-4o — legacy' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini — faster, cheaper' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 nano — fastest/cheapest' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (legacy)' },
]

const PRESET_MODEL_IDS = new Set(OPENAI_MODEL_OPTIONS.map((o) => o.value))

export function isPresetOpenAIModel(model: string): boolean {
  return PRESET_MODEL_IDS.has(model.trim())
}
