import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const serverHost = `localhost:${process.env.PORT ?? 3001}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': `http://${serverHost}`,
      '/ws': { target: `ws://${serverHost}`, ws: true },
    },
  },
})
