const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const directory = path.resolve(__dirname, '..', 'harmonized')
const tileDirectory = path.resolve(__dirname, '..', 'data')
const port = Number(process.env.CSV_PORT || 8081)
const filename = /^[a-zA-Z0-9_-]+\.csv$/
const tileFilename = /^fires_\d{4}(?:_\d{2}\.pmtiles|\.json)$/

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end()
    return
  }
  const pathname = new URL(req.url, 'http://localhost').pathname
  if (pathname === '/' || pathname === '/tiles' || pathname === '/tiles/') {
    Promise.all([fs.promises.readdir(directory, { withFileTypes: true }), fs.promises.readdir(tileDirectory, { withFileTypes: true })]).then(([csvs, tiles]) => {
      const body = JSON.stringify([...csvs.filter((f) => f.isFile() && filename.test(f.name)), ...tiles.filter((f) => f.isFile() && tileFilename.test(f.name))].map((f) => ({ name: f.name })))
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Access-Control-Allow-Origin': '*' })
      res.end(req.method === 'HEAD' ? undefined : body)
    }).catch(() => res.writeHead(503).end())
    return
  }
  const name = pathname.startsWith('/tiles/')
    ? pathname.slice('/tiles/'.length)
    : pathname.slice(1)
  if (!filename.test(name) && !tileFilename.test(name)) return res.writeHead(404).end()
  const file = path.join(filename.test(name) ? directory : tileDirectory, name)
  fs.stat(file, (error, info) => {
    if (error || !info.isFile()) return res.writeHead(404).end()
    let start = 0
    let end = info.size - 1
    const range = req.method === 'GET' ? req.headers.range : undefined
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match || (!match[1] && !match[2]) || !info.size) return res.writeHead(416, { 'Content-Range': `bytes */${info.size}`, 'Access-Control-Allow-Origin': '*' }).end()
      if (!match[1]) {
        const suffix = Number(match[2])
        if (!Number.isSafeInteger(suffix) || suffix <= 0) return res.writeHead(416, { 'Content-Range': `bytes */${info.size}`, 'Access-Control-Allow-Origin': '*' }).end()
        start = Math.max(info.size - suffix, 0)
      } else {
        start = Number(match[1])
        if (match[2]) end = Math.min(Number(match[2]), end)
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= info.size || end < start) return res.writeHead(416, { 'Content-Range': `bytes */${info.size}`, 'Access-Control-Allow-Origin': '*' }).end()
    }
    const type = name.endsWith('.csv') ? 'text/csv; charset=utf-8' : name.endsWith('.json') ? 'application/json' : 'application/octet-stream'
    res.writeHead(range ? 206 : 200, { 'Content-Type': type, 'Content-Length': info.size ? end - start + 1 : 0, 'Last-Modified': info.mtime.toUTCString(), 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Last-Modified', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}) })
    if (req.method === 'HEAD' || !info.size) return res.end()
    fs.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res)
  })
}).listen(port, '127.0.0.1', () => console.log(`Fire CSV server: http://127.0.0.1:${port}/`))
