import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite's config runs in Node, but this project has no @types/node dependency;
// declaring the one field used here keeps `npm run build` type-clean.
declare const process: { env: Record<string, string | undefined> }

// base './' keeps asset paths relative so the static build works on any host
// (Netlify, Vercel, GitHub Pages project sites, etc.)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Reachable from outside the container when running under Docker.
    host: true,
    port: 5173,
    // Bind mounts on Windows/macOS don't forward filesystem events, so the
    // watcher has to poll. Opt-in via env so native (non-Docker) `npm run dev`
    // keeps using the faster event-based watcher.
    watch:
      process.env.VITE_USE_POLLING === 'true'
        ? { usePolling: true, interval: 300 }
        : undefined,
  },
})
