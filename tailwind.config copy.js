/** @type {import('tailwindcss').Config} */
// BEZIER · Design tokens v1.0 — mirrored from the official tokens.css
// Source of truth: bezier/project/tokens.css (Claude Design handoff)
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bz: {
          // Core palette (control room. cold. precise. swiss.)
          graphite:  '#050607',  // master bg, primary background
          deep:      '#11151C',  // panels, cards
          grid:      '#2A2F36',  // grid lines, dividers, hairlines
          system:    '#8A8F98',  // secondary text, metadata
          interface: '#C8CCD1',  // interface text, secondary on dark
          paper:     '#F4F4F1',  // primary on dark, control white
          'paper-2': '#ECECE7',  // secondary paper

          // Signal — sparingly
          cyan:      '#00D5FF',  // primary signal
          violet:    '#5361FF',  // secondary signal (optional)
        },
      },
      fontFamily: {
        display: ['Inter', 'Söhne', 'Suisse Intl', 'Neue Haas Grotesk', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'Söhne', 'Suisse Intl', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Brand type scale — px values
        'bz-meta':    ['11px', { lineHeight: '1.3',  letterSpacing: '0.22em', fontWeight: '500' }],
        'bz-label':   ['12px', { lineHeight: '1.3',  letterSpacing: '0.18em', fontWeight: '500' }],
        'bz-body':    ['14px', { lineHeight: '1.5',  fontWeight: '400' }],
        'bz-body-lg': ['16px', { lineHeight: '1.5',  fontWeight: '400' }],
        'bz-h6':      ['18px', { lineHeight: '1.4',  fontWeight: '500' }],
        'bz-h5':      ['22px', { lineHeight: '1.3',  fontWeight: '500' }],
        'bz-h4':      ['28px', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '500' }],
        'bz-h3':      ['40px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '500' }],
        'bz-h2':      ['56px', { lineHeight: '1.1',  letterSpacing: '-0.02em', fontWeight: '500' }],
        'bz-h1':      ['88px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '500' }],
        'bz-display': ['120px', { lineHeight: '1',   letterSpacing: '-0.03em', fontWeight: '500' }],
        'bz-mega':    ['180px', { lineHeight: '1',   letterSpacing: '-0.03em', fontWeight: '500' }],
      },
      letterSpacing: {
        'bz-display': '-0.03em',
        'bz-heading': '-0.02em',
        'bz-body':    '0',
        'bz-label':   '0.18em',
        'bz-meta':    '0.22em',
        'bz-coord':   '0.2em',
      },
      spacing: {
        // 4px base spacing scale
        'bz-1':  '4px',
        'bz-2':  '8px',
        'bz-3':  '12px',
        'bz-4':  '16px',
        'bz-5':  '20px',
        'bz-6':  '24px',
        'bz-8':  '32px',
        'bz-10': '40px',
        'bz-12': '48px',
        'bz-16': '64px',
        'bz-20': '80px',
        'bz-24': '96px',
        'bz-32': '128px',
      },
      borderRadius: {
        // Minimal radii — brand forbids rounded cards but small ui elements may use these
        'bz-1': '2px',
        'bz-2': '4px',
        'bz-3': '8px',
      },
      transitionDuration: {
        // Mechanical motion — 240–400ms standard
        '240': '240ms',
        '320': '320ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
};
