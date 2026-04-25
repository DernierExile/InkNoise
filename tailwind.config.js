/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // BEZIER brand system v1.0
        bz: {
          graphite: '#050607',  // master bg
          deep: '#11151C',      // panels / cards
          grid: '#242F36',      // hairlines / dividers
          system: '#8A8F98',    // metadata / labels
          interface: '#F4F4F1', // body text on dark
          paper: '#C8CCD1',     // primary text on dark
          cyan: '#00D5FF',      // signal — never decoration
          violet: '#5361FF',    // secondary signal — optional
        },
      },
      fontFamily: {
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      fontSize: {
        // Brand scale
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
        // Brand motion: 240–400ms standard
        '240': '240ms',
        '320': '320ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
};
