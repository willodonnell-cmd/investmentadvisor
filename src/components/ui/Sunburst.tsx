import React from 'react'

interface SunburstProps {
  size?: number
  className?: string
}

export const Sunburst: React.FC<SunburstProps> = ({ size = 22, className }) => (
  <div
    className={className}
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: [
        'radial-gradient(circle at 50% 32%, rgba(255,250,235,.7) 0%, rgba(255,250,235,0) 38%)',
        'repeating-conic-gradient(from 0deg, rgba(255,255,255,.12) 0 1.2deg, rgba(0,0,0,.10) 1.2deg 2.4deg)',
        'radial-gradient(circle at 50% 50%, #ffd87a 0%, #f4922c 30%, #e0511a 70%, #a01a0c 100%)',
      ].join(', '),
      boxShadow: [
        'inset 0 0 0 1px rgba(0,0,0,.25)',
        'inset 0 -2px 4px rgba(0,0,0,.18)',
        '0 0 0 2px rgba(0,0,0,.4)',
        '0 1px 2px rgba(0,0,0,.4)',
      ].join(', '),
    }}
  />
)
