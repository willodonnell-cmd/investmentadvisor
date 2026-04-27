import React from 'react'
import { ThesisLens } from '../../types'
import { usePortfolioStore } from '../../store'

const LENS_OPTIONS: { value: ThesisLens; label: string }[] = [
  { value: 'Standalone',        label: 'Standalone' },
  { value: 'PrologisAware',     label: 'Prologis-Aware' },
  { value: 'CompareVsPrologis', label: 'vs Prologis' },
]

export const LensSelector: React.FC = () => {
  const { lens, setLens } = usePortfolioStore()

  return (
    <div className="flex items-center gap-0.5 bg-surface rounded-md p-0.5 border border-border">
      {LENS_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => setLens(option.value)}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${
            lens === option.value
              ? 'bg-surface-2 text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
