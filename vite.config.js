import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/studying-/' // <-- IMPORTANT for GitHub Pages (use your repo name)
})
