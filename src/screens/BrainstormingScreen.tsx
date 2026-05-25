import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThesisStore } from '../store'
import { useBrainstormStore } from '../store/brainstormStore'
import { CanvasSectionCard } from '../components/ui/CanvasSectionCard'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { Badge } from '../components/ui/Badge'
import { BrainstormChat } from '../components/ui/BrainstormChat'
import { THESIS_TYPE_LABELS } from '../constants'

const QUALITY_STYLES: Record<string, React.CSSProperties> = {
  Strong:   { color: '#2E6E4A', background: 'rgba(46,110,74,0.10)', border: '1px solid rgba(46,110,74,0.30)' },
  Moderate: { color: '#7A4A10', background: 'rgba(122,74,16,0.10)', border: '1px solid rgba(122,74,16,0.30)' },
  Weak:     { color: '#A83030', background: 'rgba(168,48,48,0.10)', border: '1px solid rgba(168,48,48,0.30)' },
}

const SPARK_POOL = [
  'Reshoring of semiconductor manufacturing to the US',
  'AI energy demand creating a power infrastructure supercycle',
  'The Japanese yield curve control regime is breaking down',
  'Consumer private label acceleration is permanently re-rating branded CPG',
  'European defense spending ramp is a decade-long capital cycle',
  'GLP-1 drugs are structurally impacting food, retail, and healthcare',
  'US commercial real estate refinancing wall creates distressed opportunity',
  'Onshoring of critical minerals supply chain benefits domestic miners',
  'China stimulus is underpriced by Western investors',
  'Private credit is crowding out banks in middle-market lending',
  'Nuclear energy renaissance driven by AI data center power demand',
  'Aging demographics in Japan create structural insurance tailwinds',
  'Dollar weakening cycle benefits emerging market debt',
  'Retail media networks are structurally taking share from traditional ad budgets',
  'Copper scarcity thesis as electrification accelerates',
  'Water infrastructure spend is a multi-decade underinvestment opportunity',
  'Nearshoring to Mexico benefits industrial REITs and logistics',
  'LNG export capacity creates a new US energy export regime',
  'Small modular reactors reach commercialization inflection',
  'De-dollarization creates demand for gold as reserve asset',
]

function sparksOverlapThesis(spark: string, thesisNames: string[]): boolean {
  const significant = (s: string) => s.toLowerCase().split(/\W+/).filter(w => w.length > 4)
  const sparkWords = new Set(significant(spark))
  return thesisNames.some(name => significant(name).some(w => sparkWords.has(w)))
}

function pickFour(pool: string[], exclude: string[], thesisNames: string[] = []): string[] {
  const available = pool.filter(s => !exclude.includes(s) && !sparksOverlapThesis(s, thesisNames))
  const source = available.length >= 4 ? available : pool.filter(s => !exclude.includes(s))
  const shuffled = [...(source.length >= 4 ? source : pool)].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 4)
}

export const BrainstormingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { theses } = useThesisStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const spark = useBrainstormStore((s) => s.spark)
  const setSpark = useBrainstormStore((s) => s.setSpark)
  const phase = useBrainstormStore((s) => s.phase)
  const canvas = useBrainstormStore((s) => s.canvas)
  const canvasError = useBrainstormStore((s) => s.canvasError)
  const generateCanvas = useBrainstormStore((s) => s.generateCanvas)
  const advanceToThesis = useBrainstormStore((s) => s.advanceToThesis)
  const resetCanvas = useBrainstormStore((s) => s.resetCanvas)

  const existingThesisNames = Object.values(theses).map(t => t.name)

  const [expandAll, setExpandAll] = useState(false)
  const [visibleSparks, setVisibleSparks] = useState(() => pickFour(SPARK_POOL, [], existingThesisNames))
  const [chatOpen, setChatOpen] = useState(false)

  const refreshSparks = useCallback(() => {
    setVisibleSparks(prev => pickFour(SPARK_POOL, prev, existingThesisNames))
  }, [existingThesisNames])

  const handleGenerate = () => {
    if (!spark.trim()) return
    setExpandAll(false)
    void generateCanvas()
  }

  const handleAdvanceToThesis = async () => {
    if (!canvas) return
    const thesisId = await advanceToThesis()
    if (thesisId) navigate(`/thesis/${thesisId}`)
  }

  const handleReset = () => {
    resetCanvas()
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  return (
    <div className="min-h-full p-5 max-w-[800px]">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Brainstorming</h1>
          <p className="text-xs text-text-muted mt-1 italic">Spark → Canvas → Thesis</p>
        </div>
        <button
          onClick={() => setChatOpen(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
            border transition-colors"
          style={{
            color: chatOpen ? '#FDFCF9' : '#9A7A50',
            borderColor: chatOpen ? 'transparent' : 'rgba(154,122,80,0.35)',
            background: chatOpen
              ? 'linear-gradient(135deg, #C8A060, #9A7A50)'
              : 'rgba(154,122,80,0.06)',
          }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
            style={{ width: 11, height: 11 }}>
            <path d="M14 9.5a5 5 0 01-5 5H4l-2 1.5V9.5a5 5 0 015-5h2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2.5a3 3 0 00-3-3" strokeLinecap="round"/>
            <circle cx="13" cy="3" r="2.5" fill="currentColor" stroke="none" opacity="0.5"/>
          </svg>
          {chatOpen ? 'Close chat' : 'Brainstorm with OpenAI'}
        </button>
      </div>

      {/* Spark Input */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
          Spark
        </label>
        <textarea
          ref={textareaRef}
          value={spark}
          onChange={(e) => setSpark(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
          }}
          disabled={phase === 'generating' || phase === 'normalizing'}
          placeholder="Type a theme, question, company, or market dislocation…"
          rows={3}
          className="w-full text-sm text-text-primary
            placeholder:text-text-muted focus:outline-none resize-none
            transition-colors disabled:opacity-50 leading-relaxed"
          style={{
            background: 'rgba(248,244,238,0.85)',
            border: '1px solid #D8D0C4',
            borderRadius: 10,
            padding: '12px 16px',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = 'rgba(154,122,80,0.5)')}
          onBlur={e => (e.currentTarget.style.borderColor = '#D8D0C4')}
        />

        {phase === 'idle' && !spark && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {visibleSparks.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setSpark(ex); textareaRef.current?.focus() }}
                  className="text-[11px] text-text-muted hover:text-text-secondary border border-border
                    hover:border-accent/40 rounded-lg px-2.5 py-1 transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
            <button
              onClick={refreshSparks}
              className="mt-2 flex items-center gap-1 text-[11px] text-text-muted
                hover:text-accent transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
                style={{ width: 11, height: 11 }}>
                <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2"/>
                <path d="M13.5 2.5v2.5H11"/>
              </svg>
              New ideas
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-text-muted">⌘↵ to generate</span>
          <div className="flex gap-2">
            {(phase === 'canvas' || phase === 'error') && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary
                  border border-border hover:border-accent/40 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={!spark.trim() || phase === 'generating' || phase === 'normalizing'}
              className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 hover:bg-accent/20
                text-accent text-xs font-semibold rounded-lg border border-accent/20
                transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {phase === 'generating' && <LoadingSpinner size="sm" />}
              {phase === 'generating' ? 'Generating canvas…' : 'Generate Canvas'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {canvasError && (
        <div className="mb-6 px-4 py-3 rounded-xl" style={{
          background: 'rgba(168,48,48,0.08)',
          border: '1px solid rgba(168,48,48,0.25)',
        }}>
          <p className="text-xs font-semibold text-danger mb-1">Error</p>
          <p className="text-xs text-danger/70 font-mono break-all">{canvasError}</p>
        </div>
      )}

      {/* Generating skeleton */}
      {phase === 'generating' && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-xl animate-pulse"
              style={{
                background: 'rgba(216,208,196,0.5)',
                border: '1px solid rgba(216,208,196,0.7)',
                opacity: 1 - i * 0.12,
              }}
            />
          ))}
          <p className="text-xs text-text-muted text-center pt-2">
            Generating 13-section Thesis Discovery Canvas…
          </p>
        </div>
      )}

      {/* Canvas */}
      {canvas && (phase === 'canvas' || phase === 'normalizing') && (
        <div className="space-y-4">
          {/* Canvas header */}
          <div className="flex items-start justify-between gap-4 pb-4" style={{ borderBottom: '1px solid #D8D0C4' }}>
            <div>
              <h2 className="text-base font-bold text-text-primary">{canvas.bestThesisName}</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  label={THESIS_TYPE_LABELS[canvas.recommendedType] ?? canvas.recommendedType}
                  variant="muted"
                />
                <Badge label={canvas.recommendedStage} variant="muted" />
                <Badge label={`${canvas.timeHorizonMonths}mo`} variant="muted" />
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded"
                  style={QUALITY_STYLES[canvas.qualityAssessment]}
                >
                  {canvas.qualityAssessment}
                </span>
              </div>
              {canvas.qualityNarrative && (
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  {canvas.qualityNarrative}
                </p>
              )}
            </div>
            <button
              onClick={() => setExpandAll((v) => !v)}
              className="flex-shrink-0 text-[11px] text-text-muted hover:text-text-secondary
                border border-border hover:border-accent/40 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              {expandAll ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            {canvas.sections.map((section, i) => (
              <CanvasSectionCard
                key={section.id}
                section={section}
                defaultOpen={expandAll || i < 3}
              />
            ))}
          </div>

          {/* Advance to Thesis */}
          <div className="pt-4" style={{ borderTop: '1px solid #D8D0C4' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Advance to Thesis</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Normalizes the canvas into a structured Thesis object and saves it.
                </p>
              </div>
              <button
                onClick={handleAdvanceToThesis}
                disabled={phase === 'normalizing'}
                className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#9A7A50', boxShadow: '0 4px 12px rgba(154,122,80,0.25)' }}
              >
                {phase === 'normalizing' && <LoadingSpinner size="sm" />}
                {phase === 'normalizing' ? 'Building thesis…' : 'Advance to Thesis →'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BrainstormChat
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentSpark={spark}
      />
    </div>
  )
}
