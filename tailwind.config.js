/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'DM Sans', 'Helvetica Neue', 'sans-serif'],
        mono: ['GeistMono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs':   ['11px', { letterSpacing: '0.06em' }],
        'sm':   ['13px', { lineHeight: '1.55' }],
        'base': ['15px', { lineHeight: '1.55' }],
        'lg':   ['18px', { lineHeight: '1.35' }],
        'xl':   ['24px', { lineHeight: '1.15' }],
        '2xl':  ['32px', { lineHeight: '1.15' }],
        '3xl':  ['42px', { lineHeight: '1.15' }],
      },
      colors: {
        // ── Page & surface ───────────────────────────────────
        bg:              '#ede9e0',
        surface:         '#f5f2eb',
        'surface-2':     '#e8e4d8',

        // ── Text ─────────────────────────────────────────────
        'text-primary':   '#1a1a1f',
        'text-secondary': '#6b6860',
        'text-muted':     '#a8a5a0',

        // ── Borders ──────────────────────────────────────────
        border:          'rgba(0,0,0,0.08)',
        'border-strong': 'rgba(0,0,0,0.15)',

        // ── Sidebar ──────────────────────────────────────────
        sidebar:         '#1a1a1f',

        // ── Functional / stage ───────────────────────────────
        live:            '#2d6a4f',
        'live-bg':       '#e8f5ef',
        actionable:      '#92400e',
        'actionable-bg': '#fef3c7',
        watch:           '#1e4d6b',
        'watch-bg':      '#e0f0f8',
        hypothesis:      '#4a1d6b',
        'hypothesis-bg': '#f3e8ff',
        pressure:        '#1e3a5f',
        'pressure-bg':   '#e0eaf8',
        signal:          '#4b5563',
        'signal-bg':     '#f3f4f6',
        danger:          '#b91c1c',
        'danger-bg':     '#fef2f2',

        // ── Accent (identity mark only) ───────────────────────
        accent: '#c4892a',
      },
      borderRadius: {
        card:   '12px',
        btn:    '8px',
        pill:   '4px',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
      },
    },
  },
  plugins: [],
}
