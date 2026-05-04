import React from 'react'

interface ProgressRingProps {
  pct: number
  zone: 'Green' | 'Yellow' | 'Orange' | 'Red' | 'Overdue'
  size?: number
  strokeWidth?: number
  label?: string
}

const ZONE_COLORS: Record<string, string> = {
  Green:   '#2E6E4A',
  Yellow:  '#9A7A50',
  Orange:  '#7A4A10',
  Red:     '#A83030',
  Overdue: '#8C2828',
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  pct,
  zone,
  size = 40,
  strokeWidth = 3,
  label,
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference
  const color = ZONE_COLORS[zone]

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(216,208,196,0.8)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      {label && <span className="text-[10px] text-text-muted">{label}</span>}
    </div>
  )
}
