import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => (
  <div
    className={`${SIZE_MAP[size]} rounded-full border-border border-t-accent animate-spin`}
  />
)
