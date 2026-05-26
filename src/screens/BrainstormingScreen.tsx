import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useThesisStore } from '../store/thesisStore'
import { useBrainstormStore } from '../store/brainstormStore'
import { useScenarioStore } from '../store/scenarioStore'
import { useSynthesisStore } from '../store/synthesisStore'
import { useTopBar } from '../store/topbarStore'
import { Sunburst } from '../components/ui/Sunburst'
import { LoadingSpinner } from '../components/shared/LoadingSpinner'

// ── Suggested prompts ────────────────────────────────────────────────────────
const PROMPT_POOL = [
  { tag: 'RATES VOL',      text: 'MOVE › VIX dislocation — what does a rates-vol-led tape favor?' },
  { tag: 'CAPEX PEAK',     text: 'Hyperscaler capex peak — beneficiaries past the chip layer.' },
  { tag: 'CYCLE',          text: 'US commercial real estate refinancing wall creates distressed opportunity.' },
  { tag: 'REFLEXIVITY',    text: 'GLP-1 drugs are structurally impacting food, retail, and healthcare.' },
  { tag: 'ENERGY',         text: 'Nuclear energy renaissance driven by AI data center power demand.' },
  { tag: 'MACRO',          text: 'European defense spending ramp is a decade-long capital cycle.' },
  { tag: 'REAL ASSETS',    text: 'Nearshoring to Mexico benefits industrial REITs and logistics.' },
  { tag: 'COMMODITIES',    text: 'Copper scarcity thesis as electrification accelerates.' },
  { tag: 'POLICY',         text: 'LNG export capacity creates a new US energy export regime.' },
  { tag: 'FX',             text: 'Dollar weakening cycle benefits emerging market debt.' },
]

function pickSix(pool: typeof PROMPT_POOL, exclude: string[]): typeof PROMPT_POOL {
  const avail = pool.filter(p => !exclude.includes(p.text))
  return [...(avail.length >= 6 ? avail : pool)].sort(() => Math.random() - 0.5).slice(0, 6)
}

// ── Phase stepper ────────────────────────────────────────────────────────────
const PHASES = ['Brainstorm', 'Canvas', 'Scenarios', 'Experts', 'Promote'] as const
type WizardPhase = typeof PHASES[number]

function PhaseStep({ index, label, status }: { index: number; label: string; status: 'active' | 'done' | 'future' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {index > 0 && (
        <div style={{
          width: 32, height: 1,
          background: status === 'future' ? 'rgba(0,0,0,0.12)' : '#f4922c',
          flexShrink: 0,
        }} />
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 12px', borderRadius: 99,
        background: status === 'active'
          ? 'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)'
          : status === 'done' ? '#e8f5ef' : 'transparent',
        border: status === 'future' ? '1px solid rgba(0,0,0,0.10)' : 'none',
      }}>
        {status === 'done' ? (
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#2d6a4f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>
          </span>
        ) : (
          <span style={{
            width: 16, height: 16, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: status === 'active' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.08)',
            fontSize: 9, fontWeight: 700,
            color: status === 'active' ? '#fff' : '#8b8980',
          }}>
            {index + 1}
          </span>
        )}
        <span style={{
          fontSize: 12, fontWeight: status === 'active' ? 600 : 400,
          color: status === 'active' ? '#fff' : status === 'done' ? '#2d6a4f' : '#8b8980',
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}

// ── Canvas cell ──────────────────────────────────────────────────────────────
function CanvasCell({ index, title, content }: { index: number; title: string; content: string }) {
  const isHypothesis = index === 0
  return (
    <div style={{
      gridColumn: isHypothesis ? 'span 2' : undefined,
      background: '#fbf8f1',
      border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 10, padding: '12px 14px',
      boxShadow: '0 1px 0 rgba(255,255,255,.5) inset',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{
          fontFamily: 'GeistMono, monospace', fontSize: 9, fontWeight: 500,
          color: '#8b8980', letterSpacing: '0.02em',
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#3a3a42' }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: 12, color: '#3a3a42', lineHeight: 1.55 }}>{content}</p>
    </div>
  )
}

// ── Scenario card ────────────────────────────────────────────────────────────
function ScenarioCard({ name, prob, ret, narrative, color }: { name: string; prob: number; ret: string; narrative: string; color: string }) {
  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden',
      border: '1px solid rgba(0,0,0,0.08)',
      background: '#fbf8f1',
    }}>
      <div style={{ height: 3, background: color }} />
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1f' }}>{name}</span>
          <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 12, color: '#8b8980' }}>{prob}%</span>
        </div>
        <p style={{ fontFamily: 'GeistMono, monospace', fontSize: 20, fontWeight: 600, color, marginBottom: 8, lineHeight: 1 }}>
          {ret}
        </p>
        <p style={{ fontSize: 12, color: '#6b6960', lineHeight: 1.55 }}>{narrative}</p>
      </div>
    </div>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────
export const BrainstormingScreen: React.FC = () => {
  const navigate = useNavigate()
  const { theses } = useThesisStore()
  const addThesis = useThesisStore((s) => s.addThesis)
  const promoteToDeveloping = useThesisStore((s) => s.promoteToDeveloping)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const spark       = useBrainstormStore((s) => s.spark)
  const setSpark    = useBrainstormStore((s) => s.setSpark)
  const phase       = useBrainstormStore((s) => s.phase)
  const canvas      = useBrainstormStore((s) => s.canvas)
  const canvasError = useBrainstormStore((s) => s.canvasError)
  const generateCanvas   = useBrainstormStore((s) => s.generateCanvas)
  const advanceToThesis  = useBrainstormStore((s) => s.advanceToThesis)
  const resetCanvas      = useBrainstormStore((s) => s.resetCanvas)
  const lastCreatedThesisId = useBrainstormStore((s) => s.lastCreatedThesisId)

  const allScenarios = useScenarioStore((s) => s.scenarios)
  const scenariosForThesis = lastCreatedThesisId
    ? Object.values(allScenarios).filter(sc => sc.linkedThesisId === lastCreatedThesisId)
    : []
  const synthesis = useSynthesisStore((s) =>
    lastCreatedThesisId ? s.expertSyntheses[lastCreatedThesisId] : undefined
  )

  const [wizardStep, setWizardStep] = useState<number>(0) // 0-4
  const [visiblePrompts, setVisiblePrompts] = useState(() => pickSix(PROMPT_POOL, []))

  useTopBar({ title: 'Build Thesis', crumb: 'Spark an idea and build a canvas' })

  // Auto-advance wizard step when store phase changes
  useEffect(() => {
    if (phase === 'canvas' && wizardStep < 1) setWizardStep(1)
  }, [phase, wizardStep])

  const canAdvanceFrom1 = phase === 'canvas' || phase === 'normalizing'
  const canAdvanceFrom2 = !!lastCreatedThesisId

  const handleGenerate = () => {
    if (!spark.trim()) return
    void generateCanvas()
  }

  const handleRunScenarios = async () => {
    const id = await advanceToThesis()
    if (id) setWizardStep(2)
  }

  const handlePromote = () => {
    if (!lastCreatedThesisId) return
    const thesis = useThesisStore.getState().theses[lastCreatedThesisId]
    if (!thesis) return
    promoteToDeveloping(thesis)
    navigate('/')
  }

  const handleReset = () => { resetCanvas(); setWizardStep(0) }

  const refreshPrompts = useCallback(() => {
    setVisiblePrompts(prev => pickSix(PROMPT_POOL, prev.map(p => p.text)))
  }, [])

  const stepStatus = (i: number): 'active' | 'done' | 'future' =>
    i < wizardStep ? 'done' : i === wizardStep ? 'active' : 'future'

  return (
    <div style={{ padding: '22px 24px', maxWidth: 900 }}>
      {/* Phase stepper */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#f5f2eb', border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 99, padding: '6px 16px',
        marginBottom: 28, alignSelf: 'flex-start', width: 'fit-content',
      }}>
        {PHASES.map((label, i) => (
          <PhaseStep key={label} index={i} label={label} status={stepStatus(i)} />
        ))}
      </div>

      {/* ── Phase 0: Brainstorm ── */}
      {wizardStep === 0 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
            What thesis are you exploring?
          </h2>
          <p style={{ fontSize: 13, color: '#6b6960', marginBottom: 22 }}>
            Brainstorm with AI to sharpen the idea, then generate a canvas across 13 categories.
          </p>

          {/* Composer */}
          <div style={{ background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            <textarea
              ref={textareaRef}
              value={spark}
              onChange={(e) => setSpark(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
              disabled={phase === 'generating'}
              placeholder="Drop a rough idea — e.g. 'AI power buildout repricing transmission opens up opportunities in…'"
              rows={4}
              style={{
                width: '100%', background: 'transparent',
                border: 'none', outline: 'none', resize: 'none',
                padding: '16px 18px', fontSize: 13.5, color: '#1a1a1f',
                lineHeight: 1.55, fontFamily: 'inherit',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,0.06)',
              background: '#f5f2eb',
            }}>
              <span style={{ fontSize: 10.5, color: '#8b8980' }}>↵ to send · ⌘↵ for new line</span>
              <button
                onClick={handleGenerate}
                disabled={!spark.trim() || phase === 'generating'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  fontSize: 12.5, fontWeight: 600, cursor: spark.trim() && phase !== 'generating' ? 'pointer' : 'default',
                  color: '#fbf8f1', opacity: spark.trim() && phase !== 'generating' ? 1 : 0.4,
                  background: 'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)',
                }}
              >
                {phase === 'generating' && <LoadingSpinner size="sm" />}
                {phase === 'generating' ? 'Generating…' : 'Generate canvas →'}
              </button>
            </div>
          </div>

          {canvasError && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(155,44,26,0.08)', border: '1px solid rgba(155,44,26,0.20)', marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#9b2c1a' }}>{canvasError}</p>
            </div>
          )}

          {/* Suggested prompts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8b8980' }}>Suggested prompts</span>
              <span style={{ fontSize: 10.5, color: '#c4892a' }}>tuned to today's regime · late-cycle · tight liquidity</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {visiblePrompts.map((p) => (
                <button
                  key={p.text}
                  onClick={() => { setSpark(p.text); textareaRef.current?.focus() }}
                  style={{
                    textAlign: 'left', padding: '10px 14px',
                    background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 9, cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#c4892a', display: 'block', marginBottom: 3 }}>
                    {p.tag}
                  </span>
                  <span style={{ fontSize: 12, color: '#3a3a42', lineHeight: 1.4 }}>{p.text}</span>
                </button>
              ))}
            </div>
            <button
              onClick={refreshPrompts}
              style={{ marginTop: 10, fontSize: 11, color: '#8b8980', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ↻ New ideas
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 1: Canvas ── */}
      {wizardStep === 1 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Thesis Canvas
          </h2>
          <p style={{ fontSize: 13, color: '#6b6960', marginBottom: 22 }}>
            AI-generated read across 13 categories. Refine with the chat above, then submit to scenarios.
          </p>

          {canvas && (
            <>
              <div style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1f', marginBottom: 4 }}>
                  {canvas.bestThesisName}
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
                {canvas.sections.map((s, i) => (
                  <CanvasCell key={s.id} index={i} title={s.title} content={s.content} />
                ))}
              </div>
            </>
          )}

          {phase === 'generating' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
              {Array.from({ length: 13 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 100, borderRadius: 10, gridColumn: i === 0 ? 'span 2' : undefined }} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setWizardStep(0)}
              style={{ fontSize: 12, color: '#8b8980', background: 'none', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 7, padding: '7px 14px', cursor: 'pointer' }}
            >
              ← Refine in chat
            </button>
            <button
              onClick={handleRunScenarios}
              disabled={phase === 'normalizing' || !canvas}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: canvas && phase !== 'normalizing' ? 'pointer' : 'default',
                color: '#fbf8f1', opacity: canvas && phase !== 'normalizing' ? 1 : 0.4,
                background: 'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)',
              }}
            >
              {phase === 'normalizing' && <LoadingSpinner size="sm" />}
              {phase === 'normalizing' ? 'Building thesis…' : 'Run scenarios →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 2: Scenarios ── */}
      {wizardStep === 2 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Scenarios
          </h2>
          <p style={{ fontSize: 13, color: '#6b6960', marginBottom: 22 }}>
            Bull / Base / Bear paths with probability and expected return. Re-weight if you disagree.
          </p>

          {scenariosForThesis.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
                {scenariosForThesis.map((sc) => {
                  const color = sc.type === 'ThesisConfirmed' ? '#2d6a4f' : sc.type === 'ContestedPath' ? '#c4892a' : '#9b2c1a'
                  const label = sc.type === 'ThesisConfirmed' ? 'Bull' : sc.type === 'ContestedPath' ? 'Base' : 'Bear'
                  const retStr = sc.returnRange ? `+${sc.returnRange[1]}%` : '—'
                  return <ScenarioCard key={sc.type} name={label} prob={Math.round(sc.probability * 100)} ret={retStr} narrative={sc.coreNarrative} color={color} />
                })}
              </div>
              <div style={{ padding: '10px 14px', background: '#f5f2eb', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'GeistMono, monospace', fontSize: 12, color: '#6b6960' }}>
                  Scenarios generated · re-weight on Thesis Detail
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {['Bull', 'Base', 'Bear'].map((label, i) => {
                const colors = ['#2d6a4f', '#c4892a', '#9b2c1a']
                return (
                  <div key={label} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', background: '#fbf8f1' }}>
                    <div style={{ height: 3, background: colors[i] }} />
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1f' }}>{label}</span>
                        <div className="skeleton" style={{ width: 32, height: 16, borderRadius: 4 }} />
                      </div>
                      <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 6, marginBottom: 10 }} />
                      <div className="skeleton" style={{ height: 56, borderRadius: 6 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setWizardStep(3)}
              style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: '#fbf8f1',
                background: 'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)',
              }}
            >
              Submit to expert panel →
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 3: Experts ── */}
      {wizardStep === 3 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Expert Panel
          </h2>
          <p style={{ fontSize: 13, color: '#6b6960', marginBottom: 22 }}>
            Engine selected voices from the 18-member bench. Synthesis first, then each voice's perspective.
          </p>

          {synthesis ? (
            <div style={{ background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '18px 22px', marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Panel Synthesis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {synthesis.panelSummary && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#8b8980' }}>Summary</span>
                    <p style={{ fontSize: 12.5, color: '#3a3a42', marginTop: 4, lineHeight: 1.55 }}>{synthesis.panelSummary}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: '18px 22px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <LoadingSpinner size="sm" />
                <span style={{ fontSize: 13, color: '#8b8980' }}>Expert panel generating in background…</span>
              </div>
              <p style={{ fontSize: 12, color: '#8b8980', marginTop: 8 }}>
                You can continue to Promote and view the full expert panel on Thesis Detail once ready.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setWizardStep(4)}
              style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                color: '#fbf8f1',
                background: 'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)',
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Phase 4: Promote ── */}
      {wizardStep === 4 && (
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6 }}>
            Ready to promote
          </h2>
          <p style={{ fontSize: 13, color: '#6b6960', marginBottom: 22 }}>
            Move this thesis from Build Thesis into the Developing column of your pipeline.
          </p>

          {lastCreatedThesisId && (() => {
            const t = useThesisStore.getState().theses[lastCreatedThesisId]
            if (!t) return null
            const score = t.thesisQualityScore ? Math.round(t.thesisQualityScore * 10) : 62
            return (
              <div style={{ background: '#fbf8f1', border: '1px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '20px 24px', marginBottom: 24 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.005em', marginBottom: 4 }}>{t.name}</h3>
                {t.ticker && (
                  <p style={{ fontSize: 12, color: '#8b8980', marginBottom: 14 }}>
                    {t.ticker} · {t.type.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'TYPE', value: 'Thesis' },
                    { label: 'STAGE ON SAVE', value: 'Developing' },
                    { label: 'CONVICTION', value: `${score} / 100` },
                    { label: 'HORIZON', value: `${t.timeHorizon}–${t.timeHorizon + 6} months` },
                    { label: 'SIZING TARGET', value: '4.5% gross' },
                    { label: 'EXPECTED RETURN', value: '+18.4%' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#f5f2eb', borderRadius: 8, padding: '10px 12px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#8b8980', display: 'block', marginBottom: 4 }}>{label}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1f' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handleReset}
              style={{ fontSize: 12, color: '#8b8980', background: 'none', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 7, padding: '8px 16px', cursor: 'pointer' }}
            >
              Save as draft
            </button>
            <button
              onClick={handlePromote}
              disabled={!lastCreatedThesisId}
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none',
                fontSize: 13.5, fontWeight: 600, cursor: lastCreatedThesisId ? 'pointer' : 'default',
                color: '#fbf8f1',
                background: 'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)',
                opacity: lastCreatedThesisId ? 1 : 0.4,
              }}
            >
              Promote to Developing →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
