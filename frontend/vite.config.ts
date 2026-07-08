import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/app/',
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // .tsx przed .ts — inaczej import „useReportRightPanel” trafia w nieistniejący .ts (404 w dev)
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.mts', '.json'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://app:80',
        changeOrigin: true,
      },
      '/_profiler': {
        target: 'http://app:80',
        changeOrigin: true,
      },
      '/_wdt': {
        target: 'http://app:80',
        changeOrigin: true,
      },
    },
  },
})
