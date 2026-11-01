import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.ts'],
    coverage: { include: ['src/lib/**'] },
  },
})
