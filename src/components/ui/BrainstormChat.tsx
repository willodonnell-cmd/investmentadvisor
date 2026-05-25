import React, { useState, useRef, useEffect } from 'react'

import { useBrainstormStore } from '../../store/brainstormStore'

interface Props {
  open: boolean
  onClose: () => void
  currentSpark: string
}

function buildGreeting(currentSpark: string): string {
  return currentSpark.trim()
    ? `I see you're working on: "${currentSpark.trim()}". What aspect do you want to sharpen — the transmission path, the mispriced variable, or the variant view?`
    : `What are you seeing in the market? Give me a raw observation and we'll build it into a thesis.`
}

export const BrainstormChat: React.FC<Props> = ({ open, onClose, currentSpark }) => {
  const messages = useBrainstormStore((s) => s.messages)
  const isStreaming = useBrainstormStore((s) => s.isStreaming)
  const error = useBrainstormStore((s) => s.error)
  const sendMessage = useBrainstormStore((s) => s.sendMessage)

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    const { messages: current } = useBrainstormStore.getState()
    if (current.length === 0) {
      useBrainstormStore.setState({
        messages: [{ role: 'assistant', content: buildGreeting(currentSpark) }],
      })
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, currentSpark])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    await sendMessage(text, currentSpark.trim() || undefined)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 340,
      height: 480,
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      background: '#FDFCF9',
      borderRadius: 14,
      boxShadow: '0 0 0 1px rgba(20,12,4,0.10), 0 8px 40px rgba(20,12,4,0.18)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '11px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E8E0D4',
        background: '#F5F2EC',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'linear-gradient(135deg, #C8A060, #9A7A50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth={1.6}
              style={{ width: 10, height: 10 }}>
              <path d="M2 4h10M2 7h7M2 10h5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#18140E', letterSpacing: '-0.01em' }}>
            Brainstorm with OpenAI
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 22, height: 22, borderRadius: 5,
            border: '1px solid #D8D0C4', background: 'none',
            cursor: 'pointer', color: '#A89878', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '8px 11px',
              borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              fontSize: 12,
              lineHeight: 1.5,
              color: msg.role === 'user' ? '#FDFCF9' : '#18140E',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #B89060, #9A7A50)'
                : '#EDE8E0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: '10px 10px 10px 2px',
              background: '#EDE8E0',
              display: 'flex',
              gap: 4,
              alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: '#A89878',
                  animation: 'pulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            fontSize: 11, color: '#A02828',
            background: 'rgba(160,40,40,0.07)',
            borderRadius: 7, padding: '6px 10px',
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid #E8E0D4',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
        background: '#FDFCF9',
        flexShrink: 0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          disabled={isStreaming}
          placeholder="Your thought…"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: '1px solid #D8D0C4',
            borderRadius: 8,
            padding: '7px 10px',
            fontSize: 12,
            color: '#18140E',
            background: '#F8F4EF',
            outline: 'none',
            lineHeight: 1.4,
            fontFamily: 'inherit',
            maxHeight: 80,
            overflowY: 'auto',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(154,122,80,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = '#D8D0C4')}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming}
          style={{
            width: 30, height: 30,
            borderRadius: 8,
            border: 'none',
            background: input.trim() && !isStreaming
              ? 'linear-gradient(135deg, #C8A060, #9A7A50)'
              : '#E8E0D4',
            cursor: input.trim() && !isStreaming ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth={1.8}
            style={{ width: 12, height: 12 }}>
            <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
