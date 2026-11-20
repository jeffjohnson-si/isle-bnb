/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07262a',
        deep: '#0b3f42',
        palm: '#0f5c52',
        lagoon: '#0e8a8a',
        aqua: '#35c6bd',
        mist: '#e8f4f2',
        sand: '#faf6ef',
        shell: '#f3e9db',
        coral: '#ff6a4d',
        sun: '#ffc46b',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(7, 38, 42, 0.04), 0 12px 32px -12px rgba(7, 38, 42, 0.18)',
        lift: '0 2px 6px rgba(7, 38, 42, 0.06), 0 26px 50px -18px rgba(7, 38, 42, 0.28)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}
