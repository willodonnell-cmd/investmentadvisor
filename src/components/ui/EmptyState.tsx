import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    {icon && <div className="text-text-muted mb-4 text-3xl">{icon}</div>}
    <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
    {description && (
      <p className="text-xs text-text-secondary max-w-xs leading-relaxed">{description}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 px-4 py-2 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-medium rounded-md border border-accent/20 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
)
