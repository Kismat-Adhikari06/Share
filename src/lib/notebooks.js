export const COVERS = [
  { id: 'terracotta', name: 'Terracotta', cover: '#b05f43', spine: '#88452f', board: '#6f3a28', ink: '#fbeee4' },
  { id: 'beige', name: 'Warm beige', cover: '#c3a87f', spine: '#9d855f', board: '#7d6849', ink: '#33291c' },
  { id: 'sage', name: 'Sage', cover: '#7e9072', spine: '#5d6f55', board: '#495843', ink: '#f5f7ee' },
  { id: 'rose', name: 'Dusty rose', cover: '#b4868b', spine: '#8e6368', board: '#6f4d51', ink: '#fdf2f2' },
  { id: 'burgundy', name: 'Burgundy', cover: '#6f3a45', spine: '#512831', board: '#3f1f27', ink: '#f7e4e7' },
  { id: 'navy', name: 'Deep navy', cover: '#33465e', spine: '#233344', board: '#1b2836', ink: '#ecf1f8' },
  { id: 'brown', name: 'Soft brown', cover: '#6a4e3d', spine: '#4f392b', board: '#3e2d22', ink: '#f8ede3' },
  { id: 'slate', name: 'Slate blue', cover: '#5c7084', spine: '#445667', board: '#364553', ink: '#f0f4f8' },
]

export const SHELVES = [
  { id: 'diary', name: 'Personal diary' },
  { id: 'junk', name: 'Junk' },
]

export const DEFAULT_SHELF = 'junk'

export const SHELF_FILTERS = [{ id: 'all', name: 'All' }, ...SHELVES]

// Every notebook belongs to a shelf. Anything not filed as a diary is junk.
export function shelfFor(note) {
  return SHELVES.find((shelf) => shelf.id === note?.shelf) ?? SHELVES.find((shelf) => shelf.id === DEFAULT_SHELF)
}

export function shelfIdFor(note) {
  return shelfFor(note).id
}

export function matchesShelf(note, filter) {
  if (!filter || filter === 'all') return true
  return shelfIdFor(note) === filter
}

export function coverFor(note) {
  const chosen = COVERS.find((c) => c.id === note?.cover)
  if (chosen) return chosen

  let hash = 0
  const id = note?.id ?? 'shareideas'
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return COVERS[hash % COVERS.length]
}

export function deriveTitle(content = '') {
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^[=\-_*~`#\s]+$/.test(l))

  if (!line) return 'Untitled notebook'
  const title = line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[=\-_*~`]+\s*/, '')
    .replace(/\s*[=\-_*~`]+$/, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
  return title || 'Untitled notebook'
}

export function titleFor(note) {
  const explicit = (note?.title ?? '').trim()
  return explicit || deriveTitle(note?.content ?? '')
}

export function wordCount(content = '') {
  const trimmed = content.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

export function estimatePages(content = '') {
  const text = content.trim()
  if (!text) return 0
  const visible = text.replace(/[#*_`>~[\]()]/g, '').length
  return Math.max(1, Math.ceil(visible / 1400))
}

export function timeAgo(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(timestamp).toLocaleDateString()
}

export function shelfCounts(notes) {
  const counts = { all: notes.length, diary: 0, junk: 0 }
  notes.forEach((note) => {
    counts[shelfIdFor(note)] += 1
  })
  return counts
}

export function sortNotes(notes, sort) {
  const copy = [...notes]
  if (sort === 'title') {
    return copy.sort((a, b) => titleFor(a).localeCompare(titleFor(b)))
  }
  const stamp = (note) => note.updatedAt || note.createdAt || 0
  return copy.sort((a, b) => stamp(b) - stamp(a))
}

export function matchesQuery(note, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return titleFor(note).toLowerCase().includes(q) || (note.content ?? '').toLowerCase().includes(q)
}

export function excerptFor(note, max = 150) {
  const lines = (note?.content ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[=\-_*~`#\s]+$/.test(l))
  const title = deriveTitle(note?.content ?? '')
  const startsWithTitle = lines.length && deriveTitle(lines[0]) === title && !(note?.title ?? '').trim()
  const body = (startsWithTitle ? lines.slice(1) : lines)
    .join(' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[#>\-*+\d.\s]+/g, '')
    .replace(/[#>*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!body) return 'No writing yet.'
  return body.length > max ? `${body.slice(0, max).trimEnd()}…` : body
}
