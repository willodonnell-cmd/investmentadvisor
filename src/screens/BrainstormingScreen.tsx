import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateCanvas, normalizeCanvasToThesis, ThesisCanvas } from '../api/brainstorming'
import { useThesisStore } from '../store'
import { CanvasSectionCard } from '../components/ui/CanvasSectionCard'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'
import { Badge } from '../components/ui/Badge'
import { THESIS_TYPE_LABELS } from '../constants'

type Phase = 'idle' | 'generating' | 'canvas' | 'normalizing' | 'done' | 'error'

const QUALITY_STYLES = {
  Strong:   'text-success bg-green-950 border-green-800',
  Moderate: 'text-warning bg-orange-950 border-orange-800',
  Weak:     'text-danger bg-red-950 border-red-900',
}

const SPARK_EXAMPLES = [
  'Reshoring of semiconductor manufacturing to the US',
  'AI energy demand creating a power infrastructure supercycle',
  'The Japanese yield curve control regime is breaking down',
  'Consumer private label acceleration is permanently re-rating branded CPG',
]

export const BrainstormingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { addThesis } = useThesisStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [spark, setSpark] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [canvas, setCanvas] = useState<ThesisCanvas | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandAll, setExpandAll] = useState(false)

  const handleGenerate = async () => {
    if (!spark.trim()) return
    setPhase('generating')
    setCanvas(null)
    setError(null)
    setExpandAll(false)

    try {
      const result = await generateCanvas(spark.trim())
      setCanvas(result)
      setPhase('canvas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('error')
    }
  }

  const handleAdvanceToThesis = async () => {
    if (!canvas) return
    setPhase('normalizing')
    setError(null)

    try {
      const thesis = await normalizeCanvasToThesis(canvas, spark.trim())
      addThesis(thesis)
      navigate(`/thesis/${thesis.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('canvas')
    }
  }

  const handleReset = () => {
    setPhase('idle')
    setCanvas(null)
    setError(null)
    setSpark('')
    setTimeout(() => textareaRef.current?.focus(), 50)
  }

  return (
    <div className="min-h-full p-5 max-w-[800px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Brainstorming</h1>
        <p className="text-xs text-text-muted mt-1">Spark → Canvas → Thesis</p>
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
          className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary
            placeholder:text-text-muted focus:outline-none focus:border-accent/40 resize-none
            transition-colors disabled:opacity-50 leading-relaxed"
        />

        {phase === 'idle' && !spark && (
          <div className="mt-2 flex flex-wrap gap-2">
            {SPARK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setSpark(ex); textareaRef.current?.focus() }}
                className="text-[11px] text-text-muted hover:text-text-secondary border border-border
                  hover:border-[#3a3a3a] rounded-lg px-2.5 py-1 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-text-muted">⌘↵ to generate</span>
          <div className="flex gap-2">
            {(phase === 'canvas' || phase === 'error') && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary
                  border border-border hover:border-[#3a3a3a] rounded-lg transition-colors"
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
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-950 border border-red-800 rounded-xl">
          <p className="text-xs font-semibold text-danger mb-1">Error</p>
          <p className="text-xs text-red-300 font-mono break-all">{error}</p>
        </div>
      )}

      {/* Generating skeleton */}
      {phase === 'generating' && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-surface border border-border rounded-xl animate-pulse"
              style={{ opacity: 1 - i * 0.12 }}
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
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
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
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border
                    ${QUALITY_STYLES[canvas.qualityAssessment]}`}
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
                border border-border hover:border-[#3a3a3a] rounded-lg px-2.5 py-1.5 transition-colors"
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
          <div className="pt-4 border-t border-border">
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
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90
                  text-white text-sm font-semibold rounded-xl transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
              >
                {phase === 'normalizing' && <LoadingSpinner size="sm" />}
                {phase === 'normalizing' ? 'Building thesis…' : 'Advance to Thesis →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
