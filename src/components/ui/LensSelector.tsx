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
    <div className="tab-group">
      {LENS_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => setLens(option.value)}
          className={`tab${lens === option.value ? ' active' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
