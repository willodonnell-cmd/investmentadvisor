import React, { useState } from 'react'
import { CanvasSection } from '../../api/brainstorming'

const HIGHLIGHTED_SECTIONS = new Set([
  'coreStatement', 'transmissionPath', 'variantView', 'mispricedVariable',
])

const SECTION_NUMBERS: Record<string, number> = {
  rawSignal: 1, thesisType: 2, coreStatement: 3, whyNow: 4,
  transmissionPath: 5, valueCaptureMethod: 6, consensusView: 7,
  variantView: 8, mispricedVariable: 9, keyAssumptions: 10,
  disconfirmers: 11, beneficiariesLosers: 12, triggersAssessment: 13,
}

interface CanvasSectionCardProps {
  section: CanvasSection
  defaultOpen?: boolean
}

export const CanvasSectionCard: React.FC<CanvasSectionCardProps> = ({
  section,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen)
  const isHighlighted = HIGHLIGHTED_SECTIONS.has(section.id)
  const num = SECTION_NUMBERS[section.id] ?? '·'

  return (
    <div
      className={`border rounded-xl transition-all duration-150 overflow-hidden
        ${isHighlighted
          ? 'border-accent/20 bg-[rgba(255,107,107,0.04)]'
          : 'border-border bg-surface'
        }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold tabular-nums w-5 text-center
            ${isHighlighted ? 'text-accent' : 'text-text-muted'}`}>
            {num}
          </span>
          <span className={`text-xs font-semibold tracking-wide
            ${isHighlighted ? 'text-accent' : 'text-text-secondary'}`}>
            {section.title.toUpperCase()}
          </span>
        </div>
        <span className={`text-text-muted text-xs transition-transform duration-150
          ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-border/50">
          {section.content && (
            <p className="text-sm text-text-primary leading-relaxed pt-3">
              {section.content}
            </p>
          )}
          {section.bullets && section.bullets.length > 0 && (
            <ul className="space-y-1.5 mt-2">
              {section.bullets.map((bullet, i) => (
                <li key={i} className="flex gap-2 text-xs text-text-secondary leading-relaxed">
                  <span className={`mt-1 flex-shrink-0 ${isHighlighted ? 'text-accent' : 'text-text-muted'}`}>
                    ·
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
