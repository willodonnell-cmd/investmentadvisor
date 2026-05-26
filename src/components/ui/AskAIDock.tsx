import React, { useState, useRef, useEffect } from 'react'
import { Sunburst } from './Sunburst'

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface AskAIDockProps {
  context: string           // e.g. "about this thesis"
  starterQuestions?: string[]
  onAsk?: (question: string) => Promise<string>
}

export const AskAIDock: React.FC<AskAIDockProps> = ({
  context,
  starterQuestions = [],
  onAsk,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const question = text.trim()
    setMessages((m) => [...m, { role: 'user', text: question }])
    setInput('')
    setLoading(true)
    try {
      const reply = onAsk ? await onAsk(question) : `Thinking about: "${question}"…`
      setMessages((m) => [...m, { role: 'ai', text: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'ai', text: 'Something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleStarter = (q: string) => {
    setExpanded(true)
    void send(q)
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 360,
      zIndex: 100,
      borderRadius: 12,
      background: '#fbf8f1',
      border: '1px solid rgba(0,0,0,0.10)',
      boxShadow: '0 12px 32px -16px rgba(0,0,0,.25), 0 2px 6px rgba(0,0,0,.06)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '10px 14px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid rgba(0,0,0,0.07)' : 'none',
        }}
      >
        <Sunburst size={20} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1f' }}>Ask AI</span>
        <span style={{ fontSize: 11, color: '#8b8980', marginLeft: 2 }}>{context}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8b8980' }}>
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded && (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              maxHeight: 340,
              overflowY: 'auto',
              padding: messages.length === 0 ? '14px 14px 8px' : '10px 14px',
            }}
          >
            {messages.length === 0 ? (
              <div>
                <p style={{ fontSize: 12, color: '#6b6960', marginBottom: 12, lineHeight: 1.5 }}>
                  Ask anything about {context.replace('about ', '')}.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {starterQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleStarter(q)}
                      style={{
                        textAlign: 'left',
                        background: '#f5f2eb',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 8,
                        padding: '7px 11px',
                        fontSize: 11.5,
                        color: '#3a3a42',
                        cursor: 'pointer',
                        lineHeight: 1.4,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: 7,
                    }}
                  >
                    {m.role === 'ai' && <Sunburst size={18} />}
                    <div style={{
                      maxWidth: '85%',
                      padding: '7px 11px',
                      borderRadius: 8,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: m.role === 'user' ? '#fbf8f1' : '#1a1a1f',
                      background: m.role === 'user' ? '#1a1a1f' : '#f5f2eb',
                      border: m.role === 'ai' ? '1px solid rgba(0,0,0,0.07)' : 'none',
                    }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    <Sunburst size={18} />
                    <span style={{ fontSize: 11, color: '#8b8980' }}>Thinking…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            display: 'flex',
            gap: 7,
            padding: '8px 10px 10px',
            borderTop: '1px solid rgba(0,0,0,0.07)',
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input) } }}
              placeholder="Ask a question…"
              style={{
                flex: 1,
                background: '#f5f2eb',
                border: '1px solid rgba(0,0,0,0.10)',
                borderRadius: 7,
                padding: '6px 10px',
                fontSize: 12,
                color: '#1a1a1f',
                outline: 'none',
              }}
            />
            <button
              onClick={() => void send(input)}
              disabled={!input.trim() || loading}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: 'none',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                fontSize: 12,
                fontWeight: 600,
                color: '#fbf8f1',
                background: 'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)',
                opacity: input.trim() && !loading ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  )
}
