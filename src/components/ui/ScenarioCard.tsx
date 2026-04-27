import React, { useState } from 'react'
import { Scenario, ScenarioType } from '../../types'
import { MISPRICED_VARIABLE_LABELS } from '../../constants'

const TYPE_CONFIG: Record<ScenarioType, { label: string; color: string }> = {
  ThesisConfirmed: { label: 'Thesis Confirmed', color: 'text-success border-green-800 bg-green-950' },
  ContestedPath:   { label: 'Contested Path',   color: 'text-warning border-orange-800 bg-orange-950' },
  ThesisBroken:    { label: 'Thesis Broken',    color: 'text-danger  border-red-900   bg-red-950' },
}

interface Props {
  scenario: Scenario
  onProbabilityChange: (id: string, probability: number) => void
}

export const ScenarioCard: React.FC<Props> = ({ scenario, onProbabilityChange }) => {
  const [expanded, setExpanded] = useState(false)
  const [localProb, setLocalProb] = useState(Math.round(scenario.probability * 100))
  const config = TYPE_CONFIG[scenario.type]

  const isOverBase =
    scenario.type === 'ThesisConfirmed' &&
    scenario.baseRateAnchor !== undefined &&
    scenario.probability > scenario.baseRateAnchor + 0.20

  const handleProbBlur = () => {
    const clamped = Math.max(0, Math.min(100, localProb))
    setLocalProb(clamped)
    onProbabilityChange(scenario.id, clamped / 100)
  }

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden">

      {/* Header */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#1e1e1e] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs font-semibold text-text-primary flex-1 truncate">{scenario.name}</span>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[11px] text-text-muted">
            {scenario.returnRangeMin >= 0 ? '+' : ''}{scenario.returnRangeMin}% to {scenario.returnRangeMax >= 0 ? '+' : ''}{scenario.returnRangeMax}%
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              value={localProb}
              onChange={(e) => setLocalProb(parseInt(e.target.value) || 0)}
              onBlur={handleProbBlur}
              className="w-12 text-center bg-surface-2 border border-border rounded text-xs text-text-primary
                focus:outline-none focus:border-accent/40 py-0.5"
            />
            <span className="text-xs text-text-muted">%</span>
          </div>
        </div>
        <span className="text-text-muted text-xs flex-shrink-0">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Calibration warning */}
      {isOverBase && (
        <div className="mx-3 mb-2 px-3 py-2 bg-orange-950/50 border border-orange-800/40 rounded-lg">
          <p className="text-[10px] text-warning">
            ⚠ ThesisConfirmed probability exceeds base rate anchor by more than 20 points
            (base rate: {Math.round((scenario.baseRateAnchor ?? 0) * 100)}%)
          </p>
        </div>
      )}

      {/* Body */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">{scenario.coreNarrative}</p>

          {scenario.causalChain.length > 0 && (
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Causal Chain</p>
              <ol className="space-y-1.5">
                {scenario.causalChain.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-xs text-text-secondary">
                    <span className="text-text-muted flex-shrink-0 font-mono text-[10px] mt-0.5">{i + 1}.</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {scenario.confirmingEvidence.length > 0 && (
              <div>
                <p className="text-[10px] text-success uppercase tracking-wider mb-1.5">Confirming Evidence</p>
                <ul className="space-y-1.5">
                  {scenario.confirmingEvidence.map((e, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-text-secondary leading-relaxed">
                      <span className="text-success flex-shrink-0 mt-0.5">✓</span>{e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {scenario.disconfirmingEvidence.length > 0 && (
              <div>
                <p className="text-[10px] text-danger uppercase tracking-wider mb-1.5">Disconfirming Evidence</p>
                <ul className="space-y-1.5">
                  {scenario.disconfirmingEvidence.map((e, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-text-secondary leading-relaxed">
                      <span className="text-danger flex-shrink-0 mt-0.5">✗</span>{e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {(scenario.shiftTriggers.towardConfirmed || scenario.shiftTriggers.towardBroken) && (
            <div className="border-t border-border/60 pt-3 grid grid-cols-2 gap-3">
              {scenario.shiftTriggers.towardConfirmed && (
                <div>
                  <p className="text-[10px] text-text-muted mb-1">↑ Toward Confirmed</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">{scenario.shiftTriggers.towardConfirmed}</p>
                </div>
              )}
              {scenario.shiftTriggers.towardBroken && (
                <div>
                  <p className="text-[10px] text-text-muted mb-1">↓ Toward Broken</p>
                  <p className="text-[11px] text-text-secondary leading-relaxed">{scenario.shiftTriggers.towardBroken}</p>
                </div>
              )}
            </div>
          )}

          {scenario.keyAssumptions.length > 0 && (
            <div className="border-t border-border/60 pt-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Key Assumptions</p>
              <ul className="space-y-1">
                {scenario.keyAssumptions.map((a, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-text-secondary">
                    <span className="text-text-muted flex-shrink-0">·</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {scenario.primaryMispricedVariableFocus && (
            <div className="border-t border-border/60 pt-2 flex items-center gap-2">
              <span className="text-[10px] text-text-muted">Hinges on:</span>
              <span className="text-[10px] text-accent font-semibold">
                {MISPRICED_VARIABLE_LABELS[scenario.primaryMispricedVariableFocus] ?? scenario.primaryMispricedVariableFocus}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
