import { Thesis } from '../types'
import { THESIS_TYPE_LABELS, MISPRICED_VARIABLE_LABELS } from '../constants'
import {
  applyOpenAIChatCompletionDynamicFields,
  callInvestmentAPI,
  getResolvedOpenAIModel,
} from './openai'

const API_URL = 'https://api.openai.com/v1/chat/completions'

export interface ResearchMessage {
  role: 'user' | 'assistant'
  content: string
}

export function buildResearchSystemPrompt(thesis: Thesis, ticker?: string): string {
  const typeLabel = THESIS_TYPE_LABELS[thesis.type] ?? thesis.type
  const mispricedLabel =
    MISPRICED_VARIABLE_LABELS[thesis.primaryMispricedVariable] ?? thesis.primaryMispricedVariable
  const tickerLine = ticker ? `Ticker: ${ticker}\n` : ''

  return `You are a rigorous investment research assistant stress-testing a thesis for Dossier.

Thesis: ${thesis.name}
Type: ${typeLabel}
${tickerLine}Stage: Developing
Thesis Statement: ${thesis.statement}
Primary Mispriced Variable: ${mispricedLabel}
Transmission Path: ${thesis.transmissionPath}
Variant Perception: ${thesis.variantView}
Consensus View: ${thesis.consensusView || 'Not specified'}
Key Assumptions: ${thesis.keyAssumptions.join(', ') || 'None yet'}
Disconfirmers: ${thesis.disconfirmers.join(', ') || 'None yet'}

Be specific, adversarial, and concrete. Reference actual thesis details. No generic investment advice.`
}

export async function generateStarterQuestions(thesis: Thesis, ticker?: string): Promise<string[]> {
  const context = buildResearchSystemPrompt(thesis, ticker)
  const result = await callInvestmentAPI<{ questions: string[] }>(
    context,
    `Based on this thesis, return exactly 4 sharp adversarial research questions specific to this thesis. Respond ONLY with JSON: { "questions": ["...", "...", "...", "..."] }. No preamble, no markdown.`,
    true,
    800,
  )

  const questions = result.questions
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Failed to parse starter questions')
  }
  return questions.slice(0, 4).map((q) => String(q).trim()).filter(Boolean)
}

export async function sendResearchMessage(
  messages: ResearchMessage[],
  systemPrompt: string,
): Promise<string> {
  const model = getResolvedOpenAIModel()
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  }
  applyOpenAIChatCompletionDynamicFields(body, model, 2000)

  const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (!key) throw new Error('VITE_OPENAI_API_KEY is not set. Add it to .env')

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
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
  return text
}
