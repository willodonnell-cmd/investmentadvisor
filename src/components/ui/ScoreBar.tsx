import React from 'react'

interface ScoreBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md'
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  value,
  max = 10,
  label,
  showValue = true,
  size = 'md',
}) => {
  const pct = Math.min((value / max) * 100, 100)

  const color =
    pct >= 70 ? '#4ade80' :
    pct >= 40 ? '#fb923c' :
    '#f87171'

  const height = size === 'sm' ? 'h-1' : 'h-1.5'

  return (
    <div className="flex flex-col gap-1">
      {(label || showValue) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-text-secondary">{label}</span>}
          {showValue && (
            <span className="text-xs font-medium text-text-primary tabular-nums">
              {value.toFixed(1)}
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${height} bg-[#2a2a2a] rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
