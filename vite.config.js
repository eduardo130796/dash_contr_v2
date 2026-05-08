import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "https://solid-space-funicular-qx5xr6qvw56h4476-8000.app.github.dev",
        changeOrigin: true,
        secure: true,
      },
    },
  },
})