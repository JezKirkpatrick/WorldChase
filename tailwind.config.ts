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
        navy:      '#0a0e27',
        'navy-light': '#0f1535',
        'navy-mid':   '#141940',
        gold:      '#f5c518',
        'gold-dim':   '#c49a10',
        electric:  '#00d4ff',
        'electric-dim': '#0099bb',
        danger:    '#ff3d3d',
        success:   '#00ff88',
        warning:   '#ff9500',
      },
      fontFamily: {
        head: ['Rajdhani', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        body: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.6s cubic-bezier(0.4,0,0.6,1) infinite',
        'shake': 'shake 0.4s ease-in-out',
        'count-up': 'countUp 1s ease-out',
        'token-flash': 'tokenFlash 0.4s ease-out',
        'rank-improve': 'rankImprove 0.6s ease-out',
        'decrypt': 'decrypt 0.5s ease-out',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        tokenFlash: {
          '0%': { color: '#ff3d3d', transform: 'scale(1.2)' },
          '100%': { color: '#f5c518', transform: 'scale(1)' },
        },
        rankImprove: {
          '0%': { color: '#00ff88', transform: 'scale(1.3)' },
          '100%': { color: '#f5c518', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 0h1v40H0zM39 0h1v40h-1zM0 0v1h40V0zM0 39v1h40v-1z' fill='rgba(245,197,24,0.05)'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}

export default config
