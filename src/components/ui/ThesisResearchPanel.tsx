import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Thesis } from '../../types'
import { useThesisStore, usePortfolioStore } from '../../store'
import {
  buildResearchSystemPrompt,
  generateStarterQuestions,
  sendResearchMessage,
  ResearchMessage,
} from '../../api/thesisResearch'

const ACCENT = '#ff6b6b'
const SURFACE = 'rgba(248,244,238,0.85)'
const SURFACE_BORDER = 'rgba(216,208,196,0.7)'

type SaveTarget = 'keyAssumptions' | 'disconfirmers' | 'killConditions'

interface Props {
  thesis: Thesis
  active: boolean
}

const SAVE_OPTIONS: { target: SaveTarget; label: string }[] = [
  { target: 'keyAssumptions', label: 'Save as key assumption' },
  { target: 'disconfirmers', label: 'Save as disconfirmer' },
  { target: 'killConditions', label: 'Save as kill condition' },
]

function truncate(text: string, max = 200): string {
  const trimmed = text.trim()
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max - 1) + '…'
}

export const ThesisResearchPanel: React.FC<Props> = ({ thesis, active }) => {
  const updateThesis = useThesisStore((s) => s.updateThesis)
  const advanceLifecycle = useThesisStore((s) => s.advanceLifecycle)
  const getCompaniesByThesis = usePortfolioStore((s) => s.getCompaniesByThesis)

  const [messages, setMessages] = useState<ResearchMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [starterQuestions, setStarterQuestions] = useState<string[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questionsError, setQuestionsError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [savePickerIdx, setSavePickerIdx] = useState<number | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const prevActiveRef = useRef(false)

  const resolveTicker = useCallback((): string | undefined => {
    if (thesis.ticker) return thesis.ticker
    const companies = getCompaniesByThesis(thesis.id)
    return companies[0]?.ticker
  }, [thesis.ticker, thesis.id, getCompaniesByThesis])

  const systemPrompt = buildResearchSystemPrompt(thesis, resolveTicker())

  const loadStarterQuestions = useCallback(async () => {
    setLoadingQuestions(true)
    setQuestionsError(null)
    try {
      const questions = await generateStarterQuestions(thesis, resolveTicker())
      setStarterQuestions(questions)
    } catch (e) {
      setQuestionsError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoadingQuestions(false)
    }
  }, [thesis, resolveTicker])

  // Reset session when tab closes; load questions when tab opens
  useEffect(() => {
    if (active && !prevActiveRef.current) {
      setMessages([])
      setInput('')
      setChatError(null)
      setSavePickerIdx(null)
      loadStarterQuestions()
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    if (!active && prevActiveRef.current) {
      setMessages([])
      setInput('')
      setStarterQuestions([])
      setChatError(null)
      setSavePickerIdx(null)
    }
    prevActiveRef.current = active
  }, [active, loadStarterQuestions])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendUserMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const next: ResearchMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setLoading(true)
    setChatError(null)
    setSavePickerIdx(null)

    try {
      const reply = await sendResearchMessage(next, systemPrompt)
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleSend = () => sendUserMessage(input)

  const handleSave = (idx: number, target: SaveTarget) => {
    const content = truncate(messages[idx].content)
    const current = thesis[target] ?? []
    updateThesis(thesis.id, { [target]: [...current, content] })
    setSavePickerIdx(null)
  }

  const handleAdvance = () => {
    if (messages.length === 0) {
      if (!confirm("You haven't researched this thesis yet. Advance anyway?")) return
    }
    advanceLifecycle(thesis.id, 'Actionable', 'Advanced from Research tab')
  }

  return (
    <div className="space-y-4">
      {/* Starter questions */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: SURFACE,
          border: `1px solid ${SURFACE_BORDER}`,
          boxShadow: '0 1px 4px rgba(60,40,10,0.05)',
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            Starter Questions
          </h2>
          <button
            onClick={loadStarterQuestions}
            disabled={loadingQuestions}
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
            title="Regenerate questions"
          >
            {loadingQuestions ? 'Generating…' : '↺ Regenerate'}
          </button>
        </div>

        {questionsError && (
          <p className="text-[10px] text-danger">{questionsError}</p>
        )}

        {loadingQuestions && starterQuestions.length === 0 ? (
          <div className="flex gap-1.5 py-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-7 rounded-full animate-pulse"
                style={{ width: `${80 + i * 30}px`, background: 'rgba(216,208,196,0.5)' }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {starterQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => sendUserMessage(q)}
                disabled={loading}
                className="text-left text-[11px] leading-snug px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                style={{
                  background: 'rgba(255,107,107,0.08)',
                  border: '1px solid rgba(255,107,107,0.25)',
                  color: '#6b6860',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,107,107,0.14)'
                  e.currentTarget.style.borderColor = 'rgba(255,107,107,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,107,107,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(255,107,107,0.25)'
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat window */}
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          background: SURFACE,
          border: `1px solid ${SURFACE_BORDER}`,
          boxShadow: '0 1px 4px rgba(60,40,10,0.05)',
          minHeight: 360,
          maxHeight: 480,
        }}
      >
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ minHeight: 280 }}>
          {messages.length === 0 && !loading && (
            <p className="text-xs text-text-muted text-center py-8">
              Ask a question or click a starter chip above to begin stress-testing this thesis.
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="relative group max-w-[85%]">
                <div
                  className="px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words"
                  style={
                    msg.role === 'user'
                      ? {
                          background: ACCENT,
                          color: '#fff',
                          borderRadius: '10px 10px 2px 10px',
                        }
                      : {
                          background: 'rgba(242,236,226,0.97)',
                          border: '1px solid #D8D0C4',
                          color: '#1a1a1f',
                          borderRadius: '10px 10px 10px 2px',
                          boxShadow: '0 1px 4px rgba(60,40,10,0.05)',
                        }
                  }
                >
                  {msg.content}
                </div>

                {msg.role === 'assistant' && (
                  <div className="relative mt-1">
                    <button
                      onClick={() => setSavePickerIdx(savePickerIdx === i ? null : i)}
                      className="text-[10px] text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
                      title="Save to thesis"
                    >
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={1.5}
                        style={{ width: 11, height: 11 }}>
                        <path d="M3 1h8v10H3z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 1V0h4v1M7 10v2" strokeLinecap="round" />
                      </svg>
                      Save
                    </button>

                    {savePickerIdx === i && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setSavePickerIdx(null)}
                        />
                        <div
                          className="absolute left-0 top-full mt-1 z-20 rounded-lg shadow-xl py-1 min-w-[180px]"
                          style={{
                            background: 'rgba(242,236,226,0.97)',
                            border: '1px solid #D8D0C4',
                            boxShadow: '0 8px 30px rgba(60,40,10,0.15)',
                          }}
                        >
                          {SAVE_OPTIONS.map(({ target, label }) => (
                            <button
                              key={target}
                              onClick={() => handleSave(i, target)}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(216,208,196,0.5)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className="px-3 py-2 flex gap-1 items-center"
                style={{
                  background: 'rgba(242,236,226,0.97)',
                  border: '1px solid #D8D0C4',
                  borderRadius: '10px 10px 10px 2px',
                }}
              >
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-full animate-pulse"
                    style={{
                      width: 5,
                      height: 5,
                      background: '#A89878',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {chatError && (
            <p className="text-[10px] text-danger px-1">{chatError}</p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          className="p-3 flex gap-2 items-end flex-shrink-0"
          style={{ borderTop: `1px solid ${SURFACE_BORDER}`, background: 'rgba(248,244,238,0.95)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={loading}
            placeholder="Ask about assumptions, disconfirmers, transmission path…"
            rows={2}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
            style={{
              background: 'rgba(216,208,196,0.35)',
              border: '1px solid #D8D0C4',
              lineHeight: 1.4,
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-3 py-2 text-xs font-semibold text-white rounded-lg transition-opacity disabled:opacity-40 flex-shrink-0"
            style={{ background: ACCENT }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Advance button */}
      <div className="flex justify-end pt-1">
        <button
          onClick={handleAdvance}
          className="px-4 py-2 text-xs font-semibold text-white rounded-xl transition-opacity hover:opacity-90"
          style={{ background: ACCENT }}
        >
          Advance to Actionable →
        </button>
      </div>
    </div>
  )
}
