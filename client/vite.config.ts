import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['monaco-editor/esm/vs/editor/editor.api'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})