import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'

// The legal pages live in public/ as plain HTML. Static hosts resolve
// /privacy/ to privacy/index.html on their own, but the dev and preview
// servers would otherwise hand those URLs to the SPA fallback, so rewrite
// them to the real files.
const staticPageRewrite = (): Plugin => {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    const url = req.url?.split('?')[0]
    if (url === '/privacy' || url === '/privacy/') req.url = '/privacy/index.html'
    if (url === '/terms' || url === '/terms/') req.url = '/terms/index.html'
    next()
  }
  return {
    name: 'static-page-rewrite',
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}

// GitHub Pages has no SPA rewrite rule, so deep links like /docs/get-started
// 404 on the server. Serving a copy of index.html as 404.html lets the
// client-side router take over on those URLs.
const spaFallback404 = (): Plugin => ({
  name: 'spa-fallback-404',
  apply: 'build',
  closeBundle() {
    const dist = path.resolve(import.meta.dirname, 'dist')
    const index = path.join(dist, 'index.html')
    if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'))
  },
})

// base is "/burla/" for GitHub project Pages, "/" for local dev.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), staticPageRewrite(), spaFallback404()],
})
