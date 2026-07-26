import type { Plugin } from 'vite'

/**
 * Serves /live-update-version.json so clients can detect when a new build (or
 * local file change) is available while Admin Mode "Live updates" is on.
 */
export function liveUpdateVersionPlugin(): Plugin {
  let version = createVersion()
  let bumpTimer: ReturnType<typeof setTimeout> | null = null

  const bump = () => {
    if (bumpTimer) clearTimeout(bumpTimer)
    // Debounce so rapid saves become one "push" signal.
    bumpTimer = setTimeout(() => {
      version = createVersion()
    }, 1500)
  }

  const onWatchEvent = (file: string) => {
    if (shouldIgnoreWatchPath(file)) return
    bump()
  }

  return {
    name: 'live-update-version',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/live-update-version.json') {
          next()
          return
        }
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ version }))
      })

      server.watcher.on('change', onWatchEvent)
      server.watcher.on('add', onWatchEvent)
      server.watcher.on('unlink', onWatchEvent)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'live-update-version.json',
        source: JSON.stringify({ version: createVersion() }),
      })
    },
  }
}

function createVersion(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function shouldIgnoreWatchPath(file: string): boolean {
  const normalized = file.replace(/\\/g, '/')
  if (normalized.includes('/node_modules/')) return true
  if (normalized.includes('/.git/')) return true
  if (normalized.includes('/server/data/')) return true
  if (normalized.endsWith('live-update-version.json')) return true
  if (normalized.endsWith('.tmp')) return true
  return !(
    normalized.includes('/src/') ||
    normalized.includes('/public/') ||
    normalized.includes('/server/') ||
    normalized.endsWith('/index.html') ||
    normalized.endsWith('/vite.config.ts') ||
    normalized.endsWith('/package.json')
  )
}
