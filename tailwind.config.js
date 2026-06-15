/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-sans)',
      },
      letterSpacing: {
        caps: 'var(--tracking-caps)',
      },
      colors: {
        ink: {
          DEFAULT: 'var(--ink)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          paper: 'var(--surface-paper)',
        },
        brand: {
          DEFAULT: 'var(--brand)',
          light: 'var(--brand-light)',
          muted: 'var(--brand-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          light: 'var(--accent-light)',
        },
        deposit: {
          DEFAULT: 'var(--deposit)',
          fg: 'var(--deposit-fg)',
          muted: 'var(--deposit-muted)',
          bg: 'var(--deposit-bg)',
          border: 'var(--deposit-border)',
        },
        line: 'var(--line)',
        nav: {
          DEFAULT: 'var(--nav-bg)',
          fg: 'var(--nav-fg)',
          'fg-muted': 'var(--nav-fg-muted)',
          border: 'var(--nav-border)',
          active: 'var(--nav-active)',
        },
      },
      boxShadow: {
        card: 'none',
        'card-hover': 'none',
        lift: 'var(--shadow-lift)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-lg)',
      },
      borderWidth: {
        theme: 'var(--border-width)',
      },
    },
  },
  plugins: [],
}
