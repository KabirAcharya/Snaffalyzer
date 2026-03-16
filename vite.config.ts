import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), viteSingleFile(), cloudflare()],
  build: {
    outDir: 'dist',
    target: 'esnext',
  },
})