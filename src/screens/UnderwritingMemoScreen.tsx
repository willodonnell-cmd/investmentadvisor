import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useThesisStore, useMacroStore, useScenarioStore, useSynthesisStore } from '../store'
import { EmptyState } from '../components/ui/EmptyState'
import { Badge } from '../components/ui/Badge'
import { THESIS_TYPE_LABELS } from '../constants'
import { generateUnderwritingMemo, MemoProgress } from '../api/underwriting'
import { MemoSection } from '../types'

// ─── Section card ──────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  thesis:         'Thesis',
  macroRegime:    'Macro',
  scenarios:      'Scenarios',
  expertSynthesis:'Expert Synthesis',
  researchView:   'Research View',
  api:            'AI Generated',
}

const MemoSectionCard: React.FC<{ section: MemoSection; defaultOpen?: boolean }> = ({
  section,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#1e1e1e] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-[10px] text-text-muted border border-border px-2 py-0.5 rounded flex-shrink-0">
          {SOURCE_LABELS[section.source] ?? section.source}
        </span>
        <span className="text-xs font-semibold text-text-primary flex-1">{section.title}</span>
        <span className="text-text-muted text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">{section.content}</p>
          {section.bullets && section.bullets.length > 0 && (
            <ul className="space-y-1.5">
              {section.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
                  <span className="text-text-muted mt-0.5 flex-shrink-0">·</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Progress bar ──────────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ progress: MemoProgress }> = ({ progress }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <p className="text-xs text-text-secondary">{progress.step}</p>
      <p className="text-xs text-text-muted">{progress.done}/{progress.total}</p>
    </div>
    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
      <div
        className="h-full bg-accent/70 rounded-full transition-all duration-300"
        style={{ width: `${(progress.done / progress.total) * 100}%` }}
      />
    </div>
  </div>
)

// ─── Main screen ───────────────────────────────────────────────────────────────

export const UnderwritingMemoScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const thesis = useThesisStore((s) => (id ? s.theses[id] : undefined))
  const regime = useMacroStore((s) => s.regime)

  const scenariosRecord = useScenarioStore((s) => s.scenarios)
  const scenarios = useMemo(
    () => Object.values(scenariosRecord).filter((sc) => sc.linkedThesisId === id),
    [scenariosRecord, id]
  )

  const setMemo = useSynthesisStore((s) => s.setMemo)
  const setResearchView = useSynthesisStore((s) => s.setResearchView)
  const setSynthesis = useSynthesisStore((s) => s.setSynthesis)
  const memo = useSynthesisStore((s) => (id ? s.underwritingMemos[id] : undefined))
  const existingSynthesis = useSynthesisStore((s) => (id ? s.expertSyntheses[id] : undefined))
  const existingResearchView = useSynthesisStore((s) => (id ? s.researchViews[id] : undefined))

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<MemoProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!thesis) {
    return (
      <div className="p-5">
        <EmptyState
          title="Thesis not found"
          description="This thesis may have been deleted."
          action={{ label: '← Back to Desk', onClick: () => navigate('/') }}
        />
      </div>
    )
  }

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setError(null)
    setProgress({ step: 'Starting…', done: 0, total: 6 })

    try {
      const result = await generateUnderwritingMemo(thesis, regime, thesis.lens, {
        existingResearchView,
        existingSynthesis,
        existingScenarios: scenarios.length > 0 ? scenarios : undefined,
        onProgress: (p) => setProgress(p),
      })
      setMemo(thesis.id, result)
      // Persist any generated research view or synthesis from the memo run
    } catch (e: any) {
      setError(e.message ?? 'Generation failed')
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  const FIRST_SECTIONS = 3

  return (
    <div className="p-5 max-w-[900px] space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate(`/thesis/${thesis.id}`)}
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors mb-2 block"
          >
            ← {thesis.name}
          </button>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge label={THESIS_TYPE_LABELS[thesis.type] ?? thesis.type} variant="muted" />
            <Badge label={thesis.stage} variant="muted" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Underwriting Memo</h1>
          {memo && (
            <p className="text-[10px] text-text-muted mt-1">
              Generated {new Date(memo.generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-xs font-semibold text-text-primary bg-accent/90 hover:bg-accent
              disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {generating ? 'Generating…' : memo ? 'Regenerate' : 'Generate Memo'}
          </button>
        </div>
      </div>

      {/* ── Progress ── */}
      {generating && progress && (
        <div className="border border-border rounded-xl bg-surface p-4">
          <ProgressBar progress={progress} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="border border-red-900/50 rounded-xl bg-red-950/20 px-4 py-3">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {/* ── Memo sections ── */}
      {memo && !generating && (
        <div className="space-y-2">
          {memo.sections.map((section, i) => (
            <MemoSectionCard
              key={section.id}
              section={section}
              defaultOpen={i < FIRST_SECTIONS}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!memo && !generating && !error && (
        <div className="border border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-3">
          <p className="text-sm font-medium text-text-muted">No memo generated yet</p>
          <p className="text-xs text-text-muted max-w-md text-center">
            Generates a Research View, Scenarios, Expert Synthesis, and three AI-written sections —
            Valuation Framework, Capital Allocation Context, and Action Recommendation.
          </p>
          <button
            onClick={handleGenerate}
            className="mt-2 px-5 py-2 text-xs font-semibold text-text-primary bg-accent/90 hover:bg-accent
              rounded-xl transition-colors"
          >
            Generate Underwriting Memo
          </button>
        </div>
      )}

    </div>
  )
}
