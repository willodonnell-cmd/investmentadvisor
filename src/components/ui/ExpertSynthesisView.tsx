import React, { useState } from 'react'
import {
  ExpertSynthesisResult, VoiceContribution, VerdictType, PanelPosture,
} from '../../types'
import { MISPRICED_VARIABLE_LABELS, EXPERT_BENCH } from '../../constants'

const VERDICT_CONFIG: Record<VerdictType, { color: string }> = {
  Endorse:   { color: 'text-success  border-green-800  bg-green-950' },
  Challenge: { color: 'text-warning  border-orange-800 bg-orange-950' },
  Reject:    { color: 'text-danger   border-red-900    bg-red-950' },
  Reframe:   { color: 'text-blue-400 border-blue-900   bg-blue-950' },
}

const POSTURE_CONFIG: Record<PanelPosture, { color: string }> = {
  Constructive: { color: 'text-success    border-green-800  bg-green-950/50' },
  Mixed:        { color: 'text-warning    border-orange-800 bg-orange-950/50' },
  Skeptical:    { color: 'text-orange-400 border-orange-700 bg-orange-950/50' },
  Hostile:      { color: 'text-danger     border-red-900    bg-red-950/50' },
}

const CONFIDENCE_COLORS: Record<string, string> = {
  High: 'text-success', Medium: 'text-warning', Low: 'text-text-muted',
}

const VoiceCard: React.FC<{ contribution: VoiceContribution }> = ({ contribution: c }) => {
  const [open, setOpen] = useState(false)
  const verdict = VERDICT_CONFIG[c.verdict]
  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#1e1e1e] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${verdict.color}`}>
          {c.verdict}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-text-primary">
            {EXPERT_BENCH[c.voiceId]?.name ?? c.voiceId}
          </span>
          <span className="text-[10px] text-text-muted ml-1.5">{c.voiceId}</span>
        </div>
        <span className="text-[10px] text-text-muted truncate max-w-[200px] hidden sm:block">{c.lensApplied}</span>
        <span className={`text-[10px] font-medium flex-shrink-0 ${CONFIDENCE_COLORS[c.confidence] ?? 'text-text-muted'}`}>
          {c.confidence}
        </span>
        <span className="text-text-muted text-xs flex-shrink-0">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">{c.coreArgument}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Focuses on</p>
              <p className="text-[11px] text-accent">
                {MISPRICED_VARIABLE_LABELS[c.primaryMispricedVariableFocus] ?? c.primaryMispricedVariableFocus}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">What would change verdict</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">{c.whatWouldChangeVerdict}</p>
            </div>
          </div>
          {c.scenarioProbabilities && (
            <div className="border-t border-border/60 pt-2 flex gap-4">
              <span className="text-[11px]">
                <span className="text-success">Confirmed</span>{' '}
                {Math.round(c.scenarioProbabilities.thesisConfirmed * 100)}%
              </span>
              <span className="text-[11px]">
                <span className="text-warning">Contested</span>{' '}
                {Math.round(c.scenarioProbabilities.contestedPath * 100)}%
              </span>
              <span className="text-[11px]">
                <span className="text-danger">Broken</span>{' '}
                {Math.round(c.scenarioProbabilities.thesisBroken * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  synthesis: ExpertSynthesisResult
}

export const ExpertSynthesisView: React.FC<Props> = ({ synthesis }) => {
  const [showRules, setShowRules] = useState(false)
  const ps = synthesis.panelSynthesis
  const posture = POSTURE_CONFIG[ps.panelPosture]

  return (
    <div className="space-y-3">

      {/* Coverage disclosure */}
      {synthesis.coverageDisclosure && (
        <div className="px-3 py-2.5 bg-orange-950/40 border border-orange-800/50 rounded-xl">
          <p className="text-[11px] text-warning leading-relaxed">⚠ {synthesis.coverageDisclosure}</p>
        </div>
      )}

      {/* Panel composition */}
      <div className="border border-border rounded-xl bg-surface p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-text-muted uppercase tracking-wider mr-1">Panel</span>
            {synthesis.selectedVoices.map((v) => (
              <span key={v} className="text-[11px] text-text-secondary border border-border px-2 py-0.5 rounded">
                {v}
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowRules((v) => !v)}
            className="text-[10px] text-text-muted hover:text-text-secondary transition-colors flex-shrink-0"
          >
            Selection rules {showRules ? '▲' : '▼'}
          </button>
        </div>
        {showRules && (
          <ul className="space-y-0.5 border-t border-border/60 pt-2">
            {synthesis.selectionRules.map((r, i) => (
              <li key={i} className="text-[10px] text-text-muted">{r}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Posture · Contested variable · Verdict distribution */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-xl bg-surface p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Panel Posture</p>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${posture.color}`}>
            {ps.panelPosture}
          </span>
        </div>
        <div className="border border-border rounded-xl bg-surface p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Most Contested</p>
          <p className="text-xs text-accent font-semibold leading-tight">
            {MISPRICED_VARIABLE_LABELS[ps.mostContestedVariable] ?? ps.mostContestedVariable}
          </p>
        </div>
        <div className="border border-border rounded-xl bg-surface p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Verdicts</p>
          <div className="flex gap-2 flex-wrap">
            {ps.verdictDistribution.endorse > 0 && (
              <span className="text-[10px] text-success">{ps.verdictDistribution.endorse}E</span>
            )}
            {ps.verdictDistribution.challenge > 0 && (
              <span className="text-[10px] text-warning">{ps.verdictDistribution.challenge}C</span>
            )}
            {ps.verdictDistribution.reject > 0 && (
              <span className="text-[10px] text-danger">{ps.verdictDistribution.reject}R</span>
            )}
            {ps.verdictDistribution.reframe > 0 && (
              <span className="text-[10px] text-blue-400">{ps.verdictDistribution.reframe}RF</span>
            )}
          </div>
        </div>
      </div>

      {/* Strongest for / against */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-green-900/50 rounded-xl bg-green-950/20 p-3">
          <p className="text-[10px] text-success uppercase tracking-wider mb-1.5">Strongest Argument For</p>
          <p className="text-xs text-text-secondary leading-relaxed">{ps.strongestArgumentFor}</p>
        </div>
        <div className="border border-red-900/50 rounded-xl bg-red-950/20 p-3">
          <p className="text-[10px] text-danger uppercase tracking-wider mb-1.5">Strongest Argument Against</p>
          <p className="text-xs text-text-secondary leading-relaxed">{ps.strongestArgumentAgainst}</p>
        </div>
      </div>

      {/* Panel probability matrix */}
      {ps.panelProbabilityMatrix && (
        <div className="border border-border rounded-xl bg-surface p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Panel Probability Matrix</p>
          <div className="flex gap-6">
            <span className="text-xs">
              <span className="text-success font-semibold">Confirmed</span>{' '}
              {Math.round(ps.panelProbabilityMatrix.thesisConfirmed * 100)}%
            </span>
            <span className="text-xs">
              <span className="text-warning font-semibold">Contested</span>{' '}
              {Math.round(ps.panelProbabilityMatrix.contestedPath * 100)}%
            </span>
            <span className="text-xs">
              <span className="text-danger font-semibold">Broken</span>{' '}
              {Math.round(ps.panelProbabilityMatrix.thesisBroken * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Convergence / Divergence */}
      {(ps.convergencePoints.length > 0 || ps.divergencePoints.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {ps.convergencePoints.length > 0 && (
            <div className="border border-border rounded-xl bg-surface p-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Convergence</p>
              <ul className="space-y-1">
                {ps.convergencePoints.map((pt, i) => (
                  <li key={i} className="text-[11px] text-text-secondary flex gap-1.5">
                    <span className="text-text-muted flex-shrink-0">·</span>{pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ps.divergencePoints.length > 0 && (
            <div className="border border-border rounded-xl bg-surface p-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Divergence</p>
              <ul className="space-y-1">
                {ps.divergencePoints.map((pt, i) => (
                  <li key={i} className="text-[11px] text-text-secondary flex gap-1.5">
                    <span className="text-text-muted flex-shrink-0">·</span>{pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* What would resolve */}
      {ps.whatWouldResolveDisagreement && (
        <div className="border border-border/60 rounded-xl bg-surface p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">What Would Resolve Disagreement</p>
          <p className="text-xs text-text-secondary leading-relaxed">{ps.whatWouldResolveDisagreement}</p>
        </div>
      )}

      {/* Reconciliation */}
      {synthesis.reconciliation && (
        <div className="border border-border rounded-xl bg-surface p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Research vs Panel Reconciliation</p>
            <div className="flex gap-2">
              <span className="text-[10px] border border-border px-2 py-0.5 rounded text-text-secondary">
                Stronger: <span className="text-accent font-semibold">{synthesis.reconciliation.strongerEvidenceBase}</span>
              </span>
              <span className="text-[10px] border border-border px-2 py-0.5 rounded text-text-secondary">
                Contested:{' '}
                <span className="text-accent">
                  {MISPRICED_VARIABLE_LABELS[synthesis.reconciliation.contestedVariable] ?? synthesis.reconciliation.contestedVariable}
                </span>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {synthesis.reconciliation.agreements.length > 0 && (
              <div>
                <p className="text-[10px] text-success mb-1">Agreements</p>
                <ul className="space-y-0.5">
                  {synthesis.reconciliation.agreements.map((a, i) => (
                    <li key={i} className="text-[11px] text-text-secondary flex gap-1.5">
                      <span className="text-success flex-shrink-0">✓</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {synthesis.reconciliation.disagreements.length > 0 && (
              <div>
                <p className="text-[10px] text-warning mb-1">Disagreements</p>
                <ul className="space-y-0.5">
                  {synthesis.reconciliation.disagreements.map((d, i) => (
                    <li key={i} className="text-[11px] text-text-secondary flex gap-1.5">
                      <span className="text-warning flex-shrink-0">⚠</span>{d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="border-t border-border/60 pt-2 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-text-muted mb-0.5">Lifecycle Implication</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">{synthesis.reconciliation.lifecycleImplication}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted mb-0.5">Trigger Readiness</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">{synthesis.reconciliation.triggerReadinessImplication}</p>
            </div>
          </div>
        </div>
      )}

      {/* Structural facts */}
      {synthesis.structuralFactsLayer && (
        <div className="border border-border rounded-xl bg-surface p-3">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Structural Facts</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Liquidity', synthesis.structuralFactsLayer.liquidity],
              ['Position Feasibility', synthesis.structuralFactsLayer.positionSizeFeasibility],
              ['Execution Risk', synthesis.structuralFactsLayer.executionRisk],
              ['Time to Close', synthesis.structuralFactsLayer.timeToClose],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] text-text-muted mb-0.5">{k}</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice contributions */}
      <div className="space-y-2">
        <p className="text-[10px] text-text-muted uppercase tracking-wider">Voice Contributions</p>
        {synthesis.contributions.map((c) => (
          <VoiceCard key={c.voiceId} contribution={c} />
        ))}
      </div>

    </div>
  )
}
