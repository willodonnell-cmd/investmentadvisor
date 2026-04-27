const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const getKey = (): string => {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY is not set. Add it to .env')
  return key
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
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`API error ${response.status}: ${JSON.stringify(err)}`)
  }

  const data = await response.json()
  const text: string = data.content
    .map((b: { type: string; text?: string }) => b.text ?? '')
    .join('')

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
    } catch (e: any) {
      console.error('PARSE FAILED at:', e.message)
      throw new Error(`Structured output parse failed: ${e.message}. Raw: ${text.slice(0, 300)}`)
    }
  }

  return text as unknown as T
}
