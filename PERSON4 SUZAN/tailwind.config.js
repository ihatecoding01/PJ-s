/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#F8F8F0',
        sage: '#E7EFE3',
        'sage-light': '#D2E2CD',
        forest: '#263F32',
        coral: '#F28F7B',
        ink: '#111713',
        white: '#FFFFFF',
        gray: '#E6E8E2',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'brutal': '4px 4px 0 #111713',
        'brutal-sm': '2px 2px 0 #111713',
        'brutal-lg': '6px 6px 0 #111713',
        'card': '0 2px 8px rgba(17, 23, 19, 0.04)',
      },
      borderRadius: {
        'card': '12px',
        'card-lg': '16px',
      }
    },
  },
  plugins: [],
}
