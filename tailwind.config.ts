import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FDF8F3',
        blush: '#F5E6E0',
        rose: '#E8C4C4',
        gold: '#C9A66B',
        'gold-light': '#E8D4B8',
        burgundy: '#8B3A3A',
        charcoal: '#2D2926',
        'warm-gray': '#6B6560',
        'soft-white': '#FFFCF9',
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'serif'],
        sans: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
