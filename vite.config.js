import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { prepareNearbyData } from './scripts/prepare-nearby-data.mjs'

await prepareNearbyData()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'data',
})
