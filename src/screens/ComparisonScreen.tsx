import React from 'react'
import { EmptyState } from '../components/ui/EmptyState'

export const ComparisonScreen: React.FC = () => (
  <div className="p-5">
    <div className="mb-6">
      <h1 className="text-xl font-bold text-text-primary">Company Comparison</h1>
      <p className="text-xs text-text-muted mt-1">Business quality vs. stock attractiveness across thesis expressions</p>
    </div>
    <div className="h-64 border border-dashed border-border rounded-xl">
      <EmptyState
        title="Comparison View — Phase 3"
        description="Compare companies within and across theses on business quality and stock attractiveness dimensions."
      />
    </div>
  </div>
)
