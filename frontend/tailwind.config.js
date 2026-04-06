/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0B5ED7',
          600: '#0B5ED7',
          700: '#0A3D62',
        },
        accent: {
          500: '#1c7ed6',
          600: '#0A3D62',
        },
        government: {
          blue: '#0B5ED7',
          navy: '#0A3D62',
          success: '#28A745',
          danger: '#DC3545',
          warning: '#FFC107',
          surface: '#F5F7FA',
        },
      },
      boxShadow: {
        soft: '0 10px 35px -18px rgba(15, 23, 42, 0.45)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 320ms ease-out both',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
