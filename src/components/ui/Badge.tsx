import React from 'react'
import { LifecycleStage, VerdictType } from '../../types'

// Warm, print-quality stage styles
const STAGE_STYLES: Record<LifecycleStage, { bg: string; color: string; border: string }> = {
  Developing:   { bg: '#EDE6F4', color: '#582880', border: '#C4A8DC' },
  Actionable:   { bg: '#F5EBD8', color: '#7A4A10', border: '#C8A06A' },
  Live:         { bg: '#EBF4EE', color: '#2E6E4A', border: '#A8CCBA' },
  Killed:       { bg: '#fde8e4', color: '#9b2c1a', border: '#e8a89a' },
  PlayedOut:    { bg: '#EEE9E2', color: '#A8A098', border: '#C8C0B4' },
  Broken:       { bg: '#F4E8E8', color: '#A83030', border: '#D4A0A0' },
  Archived:     { bg: '#EEE9E2', color: '#A8A098', border: '#C8C0B4' },
}

const VERDICT_STYLES: Record<VerdictType, { bg: string; color: string; border: string }> = {
  Endorse:   { bg: '#EBF4EE', color: '#2E6E4A', border: '#A8CCBA' },
  Challenge: { bg: '#F5EBD8', color: '#7A4A10', border: '#C8A06A' },
  Reject:    { bg: '#F4E8E8', color: '#A83030', border: '#D4A0A0' },
  Reframe:   { bg: '#EDE6F4', color: '#582880', border: '#C4A8DC' },
}

interface LifecycleBadgeProps {
  stage: LifecycleStage
  size?: 'sm' | 'md'
}

export const LifecycleBadge: React.FC<LifecycleBadgeProps> = ({ stage, size = 'md' }) => {
  const s = STAGE_STYLES[stage]
  const px = size === 'sm' ? '6px' : '8px'
  const py = size === 'sm' ? '1px' : '2px'
  const fontSize = size === 'sm' ? 9 : 9.5

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: `${py} ${px}`,
      borderRadius: 4,
      fontSize,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {stage}
    </span>
  )
}

interface VerdictBadgeProps {
  verdict: VerdictType
  size?: 'sm' | 'md'
}

export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ verdict, size = 'md' }) => {
  const s = VERDICT_STYLES[verdict]
  const px = size === 'sm' ? '6px' : '8px'
  const py = size === 'sm' ? '1px' : '2px'
  const fontSize = size === 'sm' ? 9 : 9.5

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: `${py} ${px}`,
      borderRadius: 4,
      fontSize,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
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
  const styles = {
    default: { bg: '#EEE9E2', color: '#56504A', border: '#D8D0C4' },
    accent:  { bg: 'rgba(154,122,80,0.10)', color: '#7A5A38', border: 'rgba(154,122,80,0.25)' },
    muted:   { bg: '#F0EAE0', color: '#A8A098', border: '#D8D0C4' },
  }[variant]

  const px = size === 'sm' ? '6px' : '8px'
  const py = size === 'sm' ? '1px' : '2px'
  const fontSize = size === 'sm' ? 9 : 9.5

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: `${py} ${px}`,
      borderRadius: 4,
      fontSize,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: styles.bg,
      color: styles.color,
      border: `1px solid ${styles.border}`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
