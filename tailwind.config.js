/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // ── Canvas ─────────────────────────────────────
        accent:       '#9A7A50',   // warm bronze — active states, brand
        background:   '#EDE8DE',   // page canvas warm linen
        surface:      '#FDFCF9',   // card surface — near white for contrast
        'surface-2':  '#F8F4EF',   // secondary elevated panel
        'surface-3':  '#F3EFE8',   // third tier
        border:       '#D8D0C4',   // separator

        // ── Text — strong contrast on light surfaces ───
        'text-primary':   '#18140E', // near black, warm
        'text-secondary': '#3C3428', // clear dark brown
        'text-muted':     '#706050', // readable mid-brown
        'text-ghost':     '#A89878', // light labels only

        // ── Stage colors ────────────────────────────────
        'stage-live':   '#1E7042',
        'stage-act':    '#8A4A08',
        'stage-press':  '#2A4A90',
        'stage-hyp':    '#5A2890',
        'stage-watch':  '#1A6868',
        'stage-sig':    '#504840',

        // Stage badge backgrounds
        'live-bg':    '#E8F4EC',
        'act-bg':     '#F5EBD8',
        'press-bg':   '#E6EDF8',
        'hyp-bg':     '#EDE6F6',
        'watch-bg':   '#E4F0F0',
        'sig-bg':     '#EEEAE4',

        // ── Semantic ────────────────────────────────────
        success: '#1E7042',
        warning: '#8A4A08',
        danger:  '#A02828',

        // ── Macro regime ────────────────────────────────
        'macro-green':  '#1E7042',
        'macro-amber':  '#8A4A08',
        'macro-red':    '#A02828',
        'macro-neutral':'#A89878',
      },
      borderColor: {
        DEFAULT: '#D8D0C4',
      },
      backgroundColor: {
        DEFAULT: '#EDE8DE',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(20,12,4,0.06), 0 4px 12px rgba(20,12,4,0.08), 0 0 0 1px rgba(20,12,4,0.05)',
        'card-hover': '0 4px 16px rgba(20,12,4,0.12), 0 12px 32px rgba(20,12,4,0.10), 0 0 0 1px rgba(20,12,4,0.07)',
        'shell':      '0 8px 40px rgba(20,12,4,0.18)',
        'sidebar':    '4px 0 32px rgba(0,0,0,0.30)',
        'modal':      '0 0 0 1px rgba(20,12,4,0.12), 0 8px 40px rgba(20,12,4,0.24)',
        'nav-hover':  '0 2px 8px rgba(20,12,4,0.12)',
      },
    },
  },
  plugins: [],
}
