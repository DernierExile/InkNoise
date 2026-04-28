/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // BEZIER brand system v1.0 — Sprint 1.5 corrections
        bz: {
          graphite: '#050607',     // master bg
          deep: '#11151C',         // panels / cards
          grid: '#2A2F36',         // hairlines / dividers
          system: '#8A8F98',       // metadata / labels
          interface: '#C8CCD1',    // secondary text
          paper: '#F4F4F1',        // primary text on dark
          'paper-2': '#ECECE7',    // softer surface paper
          cyan: '#00D5FF',         // signal — never decoration
          violet: '#5361FF',       // secondary signal — optional
        },
      },
      fontFamily: {
        // Type stack: Söhne, Suisse Intl, Inter — fallback chain
        display: ['"Söhne"', '"Suisse Intl"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['"Söhne"', '"Suisse Intl"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      spacing: {
        // 4px base scale — bz-1 to bz-32
        'bz-1': '4px',
        'bz-2': '8px',
        'bz-3': '12px',
        'bz-4': '16px',
        'bz-5': '20px',
        'bz-6': '24px',
        'bz-8': '32px',
        'bz-10': '40px',
        'bz-12': '48px',
        'bz-16': '64px',
        'bz-20': '80px',
        'bz-24': '96px',
        'bz-32': '128px',
      },
      borderRadius: {
        // Square-first system — only minimal radii allowed
        'bz-1': '1px',
        'bz-2': '2px',
        'bz-3': '3px',
      },
      letterSpacing: {
        'bz-display': '-0.02em',
        'bz-heading': '-0.01em',
        'bz-label': '0.04em',
        'bz-meta': '0.18em',
        'bz-coord': '0.3em',
      },
      fontSize: {
        'bz-mega': ['180px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'bz-display': ['128px', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '500' }],
        'bz-h1': ['88px', { lineHeight: '1.05', letterSpacing: '-0.015em', fontWeight: '500' }],
        'bz-h2': ['56px', { lineHeight: '1.1', letterSpacing: '-0.01em', fontWeight: '500' }],
        'bz-h3': ['40px', { lineHeight: '1.15', fontWeight: '500' }],
        'bz-h4': ['28px', { lineHeight: '1.25', fontWeight: '500' }],
        'bz-h5': ['22px', { lineHeight: '1.3', fontWeight: '500' }],
        'bz-h6': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        'bz-body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'bz-body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'bz-label': ['12px', { lineHeight: '1.3', fontWeight: '500' }],
        'bz-meta': ['11px', { lineHeight: '1.3', fontWeight: '500' }],
      },
      transitionDuration: {
        '240': '240ms',
        '320': '320ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
};
