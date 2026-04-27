import React from 'react'
import { LifecycleStage, VerdictType } from '../../types'

const STAGE_STYLES: Record<LifecycleStage, string> = {
  Signal: 'bg-[#2a2a2a] text-text-secondary border border-border',
  Hypothesis: 'bg-blue-950 text-blue-300 border border-blue-800',
  PressureTest: 'bg-yellow-950 text-yellow-300 border border-yellow-800',
  Actionable: 'bg-orange-950 text-warning border border-orange-800',
  Watch: 'bg-teal-950 text-teal-300 border border-teal-800',
  Live: 'bg-green-950 text-success border border-green-800',
  PlayedOut: 'bg-[#1a1a1a] text-text-muted border border-border',
  Broken: 'bg-red-950 text-danger border border-red-900',
  Archived: 'bg-[#1a1a1a] text-text-muted border border-border',
}

const VERDICT_STYLES: Record<VerdictType, string> = {
  Endorse: 'bg-green-950 text-success border border-green-800',
  Challenge: 'bg-yellow-950 text-yellow-300 border border-yellow-800',
  Reject: 'bg-red-950 text-danger border border-red-900',
  Reframe: 'bg-purple-950 text-purple-300 border border-purple-800',
}

interface LifecycleBadgeProps {
  stage: LifecycleStage
  size?: 'sm' | 'md'
}

export const LifecycleBadge: React.FC<LifecycleBadgeProps> = ({ stage, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`inline-flex items-center rounded font-medium ${sizeClass} ${STAGE_STYLES[stage]}`}>
      {stage}
    </span>
  )
}

interface VerdictBadgeProps {
  verdict: VerdictType
  size?: 'sm' | 'md'
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`inline-flex items-center rounded font-medium ${sizeClass} ${VERDICT_STYLES[verdict]}`}>
      {verdict}
    </span>
  )
}

interface GenericBadgeProps {
  label: string
  variant?: 'default' | 'accent' | 'muted'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<GenericBadgeProps> = ({ label, variant = 'default', size = 'md' }) => {
  const variantClass = {
    default: 'bg-[#2a2a2a] text-text-secondary border border-border',
    accent: 'bg-accent/10 text-accent border border-accent/30',
    muted: 'bg-[#1a1a1a] text-text-muted border border-border',
  }[variant]
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <span className={`inline-flex items-center rounded font-medium ${sizeClass} ${variantClass}`}>
      {label}
    </span>
  )
}
