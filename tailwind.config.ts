import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        grizzly: {
          navy: '#111111',
          red: '#752936',
          gold: '#87703e',
          light: '#f5efe8',
        },
      },
    },
  },
  plugins: [],
}

export default config
