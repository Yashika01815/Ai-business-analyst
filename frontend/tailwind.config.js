/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Lexend"', '"Inter"', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0a0b14',
          900: '#0f1120',
          800: '#161829',
          700: '#1e2138',
        },
        accent: {
          400: '#8b93ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        mint: {
          400: '#4ade80',
          500: '#22c55e',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        coral: {
          400: '#fb7185',
          500: '#f43f5e',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.15), 0 8px 30px rgba(99,102,241,0.15)',
        card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(15,17,32,0.06)',
      },
      backgroundImage: {
        'grid-fade': 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08), transparent 60%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out both',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
