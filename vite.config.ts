import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages はリポジトリ名のサブパスで配信される
  base: command === 'build' ? '/ai-sdlc-101/' : '/',
  plugins: [react(), tailwindcss()],
}))
