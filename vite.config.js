import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  if (mode === 'production' && !env.VITE_API_URL) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      '⚠️ Warning: VITE_API_URL is not set in production build environment. ' +
      'Please configure VITE_API_URL in your Vercel Project Settings > Environment Variables once your backend is deployed.'
    )
  }

  return {
    plugins: [react()],
  }
})
