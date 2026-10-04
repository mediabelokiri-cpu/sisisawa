/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#835227',
        'brand-accent': '#835227',
        'brand-secondary': '#8B9793',
        'brand-sage': '#8B9793',
        'brand-sand': '#CBC6B2',
        'brand-wood': '#835227',
        'brand-wood-dark': '#3E2410',
        'brand-wood-light': '#9C6332',
        'brand-bg': '#EFEFEF',
        'brand-canvas': '#EFEFEF',
        'brand-card': '#FFFFFF',
        'brand-dark': '#2B1E16',
      },
      borderRadius: {
        'pos': '14px',
        'pos-lg': '18px',
        'pos-sm': '10px',
        '2.5xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'subtle': '0 2px 10px -2px rgba(131, 82, 39, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.03)',
        'subtle-lg': '0 12px 30px -4px rgba(131, 82, 39, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.03)',
        'float': '0 20px 40px -10px rgba(131, 82, 39, 0.12), 0 8px 16px -4px rgba(0, 0, 0, 0.04)',
        'wood-glow': '0 8px 20px -3px rgba(131, 82, 39, 0.35)',
        'sage-glow': '0 8px 20px -3px rgba(139, 151, 147, 0.35)',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      }
    },
  },
  plugins: [],
}

