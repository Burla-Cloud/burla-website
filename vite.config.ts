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

// Emits a real HTML file per route (own title, description, canonical), plus
// robots.txt, sitemap.xml, and a noindex 404.html. Without it every URL serves
// the same shell and Google treats the whole site as duplicates of "/".
const prerenderRoutes = (): Plugin => ({
  name: 'prerender-routes',
  apply: 'build',
  async closeBundle() {
    const dist = path.resolve(import.meta.dirname, 'dist')
    if (!fs.existsSync(path.join(dist, 'index.html'))) return
    const { prerender } = await import('./scripts/prerender.mjs')
    await prerender()
  },
})

// base is "/burla/" for GitHub project Pages, "/" for local dev.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), staticPageRewrite(), prerenderRoutes()],
})
