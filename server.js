import express from 'express'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DATA_FILE = join(DATA_DIR, 'notes.json')
const PORT = Number(process.env.PORT) || 3000

function load() {
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
    return { notes: Array.isArray(parsed.notes) ? parsed.notes : [] }
  } catch {
    return { notes: [] }
  }
}

const UPLOAD_DIR = join(DATA_DIR, 'uploads')
const IMAGE_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const SHELF_IDS = new Set(['diary', 'junk'])
const shelfFrom = (value) => (SHELF_IDS.has(value) ? value : '')

const store = load()

function persist() {
  mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DATA_FILE}.tmp`
  writeFileSync(tmp, JSON.stringify(store, null, 2))
  renameSync(tmp, DATA_FILE)
}

const app = express()
app.use(express.json({ limit: '4mb' }))

app.post('/api/uploads', express.raw({ type: Object.keys(IMAGE_TYPES), limit: '12mb' }), (req, res) => {
  const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
  const ext = IMAGE_TYPES[type]
  if (!ext) return res.status(415).json({ error: 'Only PNG, JPG, WebP or GIF images can be added.' })

  const body = req.body
  if (!Buffer.isBuffer(body) || body.length === 0) {
    return res.status(400).json({ error: 'The image was empty.' })
  }

  mkdirSync(UPLOAD_DIR, { recursive: true })
  const name = `${randomUUID()}.${ext}`
  writeFileSync(join(UPLOAD_DIR, name), body)
  res.status(201).json({ url: `/uploads/${name}`, bytes: body.length })
})

app.use(
  '/uploads',
  express.static(UPLOAD_DIR, { index: false, dotfiles: 'ignore', maxAge: '7d', immutable: true }),
)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, notes: store.notes.length })
})

app.get('/api/notes', (_req, res) => {
  res.json({ notes: store.notes })
})

app.post('/api/notes', (req, res) => {
  const now = Date.now()
  const note = {
    id: randomUUID(),
    title: typeof req.body?.title === 'string' ? req.body.title.slice(0, 120) : '',
    cover: typeof req.body?.cover === 'string' ? req.body.cover.slice(0, 24) : '',
    shelf: shelfFrom(req.body?.shelf),
    content: typeof req.body?.content === 'string' ? req.body.content : '',
    createdAt: now,
    updatedAt: now,
  }
  store.notes.push(note)
  persist()
  res.status(201).json({ note })
})

app.put('/api/notes/:id', (req, res) => {
  const note = store.notes.find((n) => n.id === req.params.id)
  if (!note) return res.status(404).json({ error: 'Note not found' })

  if (typeof req.body?.content === 'string') note.content = req.body.content
  if (typeof req.body?.title === 'string') note.title = req.body.title.slice(0, 120)
  if (typeof req.body?.cover === 'string') note.cover = req.body.cover.slice(0, 24)
  if ('shelf' in (req.body ?? {})) note.shelf = shelfFrom(req.body.shelf)
  note.updatedAt = Date.now()
  persist()
  res.json({ note })
})

app.delete('/api/notes/:id', (req, res) => {
  const index = store.notes.findIndex((n) => n.id === req.params.id)
  if (index === -1) return res.status(404).json({ error: 'Note not found' })

  store.notes.splice(index, 1)
  persist()
  res.status(204).end()
})

const dist = join(__dirname, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    if (req.path.startsWith('/uploads')) return res.status(404).end()
    res.sendFile(join(dist, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ShareIdeas running at http://localhost:${PORT}`)
})
