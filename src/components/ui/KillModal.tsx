import React, { useState } from 'react'
import type { Thesis, KillRecord, KillType, KillTriggerPathway } from '../../types'
import type { Signal, SignalComposite } from '../../types'
import { classifyKill, generateKillMemo, buildKillRecord } from '../../api/kill'

interface Props {
  thesis: Thesis
  signals: Signal[]
  composites: SignalComposite[]
  onKill: (record: KillRecord) => void
  onCancel: () => void
}

type Step = 'pathway' | 'classify' | 'challenge' | 'memo' | 'confirm'

const KILL_TYPE_LABELS: Record<KillType, string> = {
  1: 'Core Assumption Broken',
  2: 'Opportunity Closed',
  3: 'Better Expression Found',
  4: 'Superseded',
  5: 'Conviction Exhausted',
}

const KILL_TYPE_DESCRIPTIONS: Record<KillType, string> = {
  1: 'A foundational assumption has been definitively falsified.',
  2: 'The mispricing has been recognized or the catalyst has passed.',
  3: 'A superior vehicle for the same thesis now exists.',
  4: 'The macro or structural condition has fundamentally shifted.',
  5: 'Insufficient evidence accumulation within the time horizon.',
}

const PATHWAY_OPTS: { value: KillTriggerPathway; label: string; desc: string }[] = [
  { value: 'A', label: 'Scheduled reassessment', desc: 'Thesis reached a review checkpoint' },
  { value: 'B', label: 'Disconfirmer triggered', desc: 'A key disconfirmer event was observed' },
  { value: 'C', label: 'Signal collapse',        desc: 'Composite signal score turned severely negative' },
  { value: 'D', label: 'Forced by decay',        desc: 'Decay clock expired with insufficient conviction' },
]

export const KillModal: React.FC<Props> = ({
  thesis,
  signals,
  composites,
  onKill,
  onCancel,
}) => {
  const [step, setStep] = useState<Step>('pathway')
  const [pathway, setPathway] = useState<KillTriggerPathway>('A')
  const [killType, setKillType] = useState<KillType>(5)
  const [confidence, setConfidence] = useState<'High' | 'Medium' | 'Low'>('Medium')
  const [challengeAnswers, setChallengeAnswers] = useState<string[]>([])
  const [challengeQuestions, setChallengeQuestions] = useState<string[]>([])
  const [killReason, setKillReason] = useState('')
  const [brokenAssumption, setBrokenAssumption] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [generatingMemo, setGeneratingMemo] = useState(false)
  const [pendingRecord, setPendingRecord] = useState<Omit<KillRecord, 'id' | 'killedAt'> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleClassify = async () => {
    setClassifying(true)
    setError(null)
    try {
      const result = await classifyKill(thesis, signals, composites, pathway)
      setKillType(result.recommendedType)
      setConfidence(result.confidence)
      setChallengeQuestions(result.challengeQuestions)
      setChallengeAnswers(result.challengeQuestions.map(() => ''))
      setStep('challenge')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setClassifying(false)
    }
  }

  const handleGenerateMemo = async () => {
    setGeneratingMemo(true)
    setError(null)
    try {
      const partial = await generateKillMemo(
        thesis,
        killType,
        pathway,
        killReason || `Kill type ${killType}: ${KILL_TYPE_LABELS[killType]}`,
        killType === 1 && brokenAssumption ? brokenAssumption : undefined,
        signals,
        composites,
      )
      setPendingRecord(partial)
      setStep('confirm')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGeneratingMemo(false)
    }
  }

  const handleConfirm = () => {
    if (!pendingRecord) return
    const record = buildKillRecord(pendingRecord)
    onKill(record)
  }

  const CONFIDENCE_STYLES = {
    High:   'text-success border-green-800 bg-green-950/40',
    Medium: 'text-warning border-orange-800 bg-orange-950/40',
    Low:    'text-danger border-red-800 bg-red-950/40',
  }

  const STEPS: Step[] = ['pathway', 'classify', 'challenge', 'memo', 'confirm']
  const stepNum = STEPS.indexOf(step) + 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#0f0f0f] border border-red-900/50 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between">
          <div>
            <p className="text-[10px] text-danger uppercase tracking-widest font-semibold mb-1">
              Kill Protocol — Step {stepNum} of {STEPS.length}
            </p>
            <h2 className="text-sm font-bold text-text-primary">{thesis.name}</h2>
          </div>
          <button onClick={onCancel} className="text-text-muted hover:text-text-secondary text-lg mt-0.5">×</button>
        </div>

        {/* Step progress */}
        <div className="flex border-b border-border">
          {(['pathway', 'classify', 'challenge', 'memo', 'confirm'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-0.5 ${i < stepNum ? 'bg-danger' : 'bg-border'}`}
            />
          ))}
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[520px] overflow-y-auto">

          {/* ── Step 1: Pathway ── */}
          {step === 'pathway' && (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">What triggered this kill?</p>
              {PATHWAY_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPathway(opt.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors
                    ${pathway === opt.value
                      ? 'border-danger/50 bg-red-950/30 text-text-primary'
                      : 'border-border hover:border-[#3a3a3a] text-text-secondary'}`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <p className="text-[11px] text-text-muted mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 2: Classify ── */}
          {step === 'classify' && (
            <div className="space-y-4">
              <p className="text-xs text-text-secondary">Pathway: <span className="text-text-primary">{PATHWAY_OPTS.find(p => p.value === pathway)?.label}</span></p>
              <p className="text-xs text-text-muted">
                The system will analyze the thesis state and recommend a kill type.
                You can override after classification.
              </p>
              {error && <p className="text-xs text-danger">{error}</p>}
              {classifying && <p className="text-xs text-text-muted animate-pulse">Classifying…</p>}
            </div>
          )}

          {/* ── Step 3: Challenge questions ── */}
          {step === 'challenge' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] border px-2 py-0.5 rounded ${CONFIDENCE_STYLES[confidence]}`}>
                  {confidence} confidence
                </span>
                <span className="text-xs text-text-secondary">— Recommended: {KILL_TYPE_LABELS[killType]}</span>
              </div>
              <p className="text-[11px] text-text-muted">{KILL_TYPE_DESCRIPTIONS[killType]}</p>

              {/* Override kill type */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-text-muted">Override Kill Type</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {([1, 2, 3, 4, 5] as KillType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setKillType(t)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors
                        ${killType === t
                          ? 'border-danger/50 bg-red-950/20 text-text-primary'
                          : 'border-border hover:border-[#3a3a3a] text-text-secondary'}`}
                    >
                      <span className="text-text-muted font-mono mr-2">{t}.</span>
                      {KILL_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {killType === 1 && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-text-muted">Broken Assumption</label>
                  <input
                    value={brokenAssumption}
                    onChange={(e) => setBrokenAssumption(e.target.value)}
                    placeholder="Which core assumption was broken?"
                    className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-xs
                      text-text-primary placeholder-text-muted focus:outline-none focus:border-danger/40"
                  />
                </div>
              )}

              {/* Challenge questions */}
              {challengeQuestions.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">Challenge Questions</p>
                  {challengeQuestions.map((q, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-xs text-text-secondary">{q}</p>
                      <textarea
                        value={challengeAnswers[i] ?? ''}
                        onChange={(e) => {
                          const arr = [...challengeAnswers]
                          arr[i] = e.target.value
                          setChallengeAnswers(arr)
                        }}
                        rows={2}
                        placeholder="Your answer…"
                        className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-xs
                          text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent/40 resize-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-text-muted">Kill Reason (one sentence)</label>
                <input
                  value={killReason}
                  onChange={(e) => setKillReason(e.target.value)}
                  placeholder="Why is this thesis being killed?"
                  className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-xs
                    text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/40"
                />
              </div>
            </div>
          )}

          {/* ── Step 4: Memo generation ── */}
          {step === 'memo' && (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">
                Generating kill memo with lesson extraction and learning routes…
              </p>
              {error && <p className="text-xs text-danger">{error}</p>}
              {generatingMemo && <p className="text-xs text-text-muted animate-pulse">Extracting lessons…</p>}
            </div>
          )}

          {/* ── Step 5: Confirm ── */}
          {step === 'confirm' && pendingRecord && (
            <div className="space-y-4">
              <div className="bg-red-950/20 border border-red-800/30 rounded-xl px-4 py-3 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-danger">Kill Summary</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-text-muted">Type</p>
                    <p className="text-text-primary font-medium">{KILL_TYPE_LABELS[pendingRecord.killType]}</p>
                  </div>
                  <div>
                    <p className="text-text-muted">Pathway</p>
                    <p className="text-text-primary font-medium">{PATHWAY_OPTS.find(p => p.value === pendingRecord.triggerPathway)?.label}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted mb-0.5">Reason</p>
                  <p className="text-xs text-text-secondary">{pendingRecord.killReason}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted mb-0.5">Lesson Learned</p>
                  <p className="text-xs text-text-secondary leading-relaxed">{pendingRecord.lessonLearned}</p>
                </div>
                {pendingRecord.learningRoutes.length > 0 && (
                  <div>
                    <p className="text-[10px] text-text-muted mb-1">Learning Routes</p>
                    {pendingRecord.learningRoutes.map((lr, i) => (
                      <div key={i} className="flex gap-2 mb-1">
                        <span className="text-[10px] border border-border rounded px-1.5 text-text-muted flex-shrink-0">
                          {lr.type}
                        </span>
                        <span className="text-[11px] text-text-secondary">{lr.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-text-muted text-center">
                This will archive the thesis and record the kill event. This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-between gap-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-text-muted border border-border
              hover:border-[#3a3a3a] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {step === 'pathway' && (
              <button
                onClick={() => setStep('classify')}
                className="px-4 py-1.5 text-xs font-medium text-text-primary bg-danger/80 hover:bg-danger
                  rounded-lg transition-colors"
              >
                Continue →
              </button>
            )}
            {step === 'classify' && (
              <button
                onClick={handleClassify}
                disabled={classifying}
                className="px-4 py-1.5 text-xs font-medium text-text-primary bg-danger/80 hover:bg-danger
                  disabled:opacity-50 rounded-lg transition-colors"
              >
                {classifying ? 'Classifying…' : 'Classify Kill →'}
              </button>
            )}
            {step === 'challenge' && (
              <button
                onClick={() => setStep('memo')}
                className="px-4 py-1.5 text-xs font-medium text-text-primary bg-danger/80 hover:bg-danger
                  rounded-lg transition-colors"
              >
                Generate Memo →
              </button>
            )}
            {step === 'memo' && (
              <button
                onClick={handleGenerateMemo}
                disabled={generatingMemo}
                className="px-4 py-1.5 text-xs font-medium text-text-primary bg-danger/80 hover:bg-danger
                  disabled:opacity-50 rounded-lg transition-colors"
              >
                {generatingMemo ? 'Generating…' : 'Generate Kill Memo →'}
              </button>
            )}
            {step === 'confirm' && (
              <button
                onClick={handleConfirm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-danger hover:bg-red-600
                  rounded-lg transition-colors"
              >
                Confirm Kill
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
