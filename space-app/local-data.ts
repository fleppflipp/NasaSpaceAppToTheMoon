import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const prefix = '/local-fire-data/'
const filename = /^fires_\d{4}(?:_\d{2}\.pmtiles|\.json)$/

async function serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end()
    return
  }
  const name = (req.url ?? '').split('?')[0]?.slice(prefix.length) ?? ''
  if (name === '') {
    try {
      const files = await readdir(dataDir, { withFileTypes: true })
      const listing = files
        .filter((file) => file.isFile() && filename.test(file.name))
        .map((file) => ({ name: file.name }))
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(listing))
    } catch {
      res.writeHead(503).end()
    }
    return
  }
  if (!filename.test(name)) {
    res.writeHead(404).end()
    return
  }
  const path = join(dataDir, name)
  try {
    const info = await stat(path)
    if (!info.isFile()) {
      res.writeHead(404).end()
      return
    }
    let start = 0
    let end = info.size - 1
    const range = req.headers.range
    if (range !== undefined) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(range)
      if (
        match === null ||
        Number(match[1]) >= info.size ||
        (match[2] !== '' && Number(match[2]) < Number(match[1]))
      ) {
        res
          .writeHead(416, { 'Content-Range': `bytes */${String(info.size)}` })
          .end()
        return
      }
      start = Number(match[1])
      end = match[2] === '' ? end : Math.min(Number(match[2]), end)
    }
    res.writeHead(range === undefined ? 200 : 206, {
      'Content-Type': name.endsWith('.json')
        ? 'application/json'
        : 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Length': String(end - start + 1),
      ...(range === undefined
        ? {}
        : {
            'Content-Range': `bytes ${String(start)}-${String(end)}/${String(info.size)}`,
          }),
    })
    if (req.method === 'HEAD' || info.size === 0) res.end()
    else
      createReadStream(path, { start, end })
        .on('error', () => res.destroy())
        .pipe(res)
  } catch {
    res.writeHead(404).end()
  }
}

/** Expose only fire data, with byte ranges for PMTiles, in dev and preview. */
export function localFireData(): Plugin {
  const install = (server: {
    middlewares: {
      use: (
        handler: (
          req: IncomingMessage,
          res: ServerResponse,
          next: () => void,
        ) => void,
      ) => void
    }
  }) => {
    server.middlewares.use((req, res, next) => {
      if (!(req.url ?? '').startsWith(prefix)) {
        next()
        return
      }
      void serve(req, res)
    })
  }
  return {
    name: 'local-fire-data',
    configureServer: install,
    configurePreviewServer: install,
  }
}
