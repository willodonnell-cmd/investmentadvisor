/** Default for thesis research, memos, and structured JSON — strong reasoning and tool-style outputs. */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o'

export const OPENAI_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'gpt-4o', label: 'GPT-4o (recommended default)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini — faster, cheaper' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
]
