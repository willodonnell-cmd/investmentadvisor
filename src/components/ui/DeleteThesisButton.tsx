import React from 'react'

interface DeleteThesisButtonProps {
  onDelete: (e: React.MouseEvent) => void
  size?: 'sm' | 'md'
  title?: string
}

export const DeleteThesisButton: React.FC<DeleteThesisButtonProps> = ({
  onDelete,
  size = 'sm',
  title = 'Delete thesis',
}) => {
  const dim = size === 'sm' ? 22 : 26
  const fontSize = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onDelete}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: dim,
        height: dim,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: '1px solid rgba(168,48,48,0.25)',
        background: 'rgba(168,48,48,0.06)',
        color: '#A83030',
        fontSize,
        lineHeight: 1,
        cursor: 'pointer',
        transition: 'background 0.12s ease, border-color 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(168,48,48,0.14)'
        e.currentTarget.style.borderColor = 'rgba(168,48,48,0.45)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(168,48,48,0.06)'
        e.currentTarget.style.borderColor = 'rgba(168,48,48,0.25)'
      }}
    >
      ×
    </button>
  )
}
