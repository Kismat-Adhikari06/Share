import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import * as api from './api.js'
import Library from './components/Library.jsx'
import OpenNotebook from './components/OpenNotebook.jsx'
import { IconBook } from './components/Icons.jsx'
import { matchesQuery, matchesShelf, SHELF_FILTERS, shelfCounts, sortNotes, titleFor } from './lib/notebooks.js'
import { useViewport } from './hooks/useViewport.js'

const APP_URL_KEY = 'shareideas:app-url'

// Read once per page load. The app records the exact URL it wrote when it opens a
// notebook, so refreshing that page lands on the library; a link someone shared
// (a different URL, or a link in a new tab) still opens its notebook.
const initialNoteId = new URLSearchParams(window.location.search).get('note')
const openedByApp = (() => {
  try {
    const owned = window.sessionStorage.getItem(APP_URL_KEY)
    if (!owned) return false
    window.sessionStorage.removeItem(APP_URL_KEY)
    return owned === window.location.href
  } catch {
    return false
  }
})()

function LoadingScreen() {
  return (
    <div className="center-state">
      <span className="state-icon" aria-hidden="true">
        <IconBook size={26} />
      </span>
      <p className="eyebrow">ShareIdeas</p>
      <h1>Opening the library…</h1>
      <span className="loading-bar" aria-hidden="true" />
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="center-state" role="alert">
      <span className="state-icon state-icon-error" aria-hidden="true">
        !
      </span>
      <p className="eyebrow">Connection</p>
      <h1>The library couldn’t be opened.</h1>
      <p className="muted">{message}</p>
      <button type="button" className="primary-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export default function App() {
  const [notes, setNotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [activeId, setActiveId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [openDraft, setOpenDraft] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(0)
  const [toast, setToast] = useState(null)
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem('shareideas:view') === 'list' ? 'list' : 'books'
    } catch {
      return 'books'
    }
  })
  const [shelf, setShelf] = useState(() => {
    try {
      const stored = window.localStorage.getItem('shareideas:shelf')
      return SHELF_FILTERS.some((entry) => entry.id === stored) ? stored : 'all'
    } catch {
      return 'all'
    }
  })

  const changeView = useCallback((next) => {
    setView(next)
    try {
      window.localStorage.setItem('shareideas:view', next)
    } catch {
      // preference just won't persist
    }
  }, [])

  const changeShelf = useCallback((next) => {
    setShelf(next)
    try {
      window.localStorage.setItem('shareideas:shelf', next)
    } catch {
      // preference just won't persist
    }
  }, [])

  const viewport = useViewport()
  const reduced = useReducedMotion()

  const pendingRef = useRef(new Map())
  const timersRef = useRef(new Map())
  const deepLinkRef = useRef(openedByApp ? null : initialNoteId)
  const toastTimer = useRef(0)

  const notify = useCallback((message) => {
    setToast({ id: Date.now(), message })
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2800)
  }, [])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const loadNotes = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.getNotes()
      setNotes(Array.isArray(data) ? data : [])
      setLoaded(true)
    } catch (error) {
      setLoadError(error?.message || 'Check the connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const persist = useCallback(
    async (id) => {
      const patch = pendingRef.current.get(id)
      if (!patch) return
      pendingRef.current.delete(id)

      try {
        const saved = await api.updateNote(id, patch)
        setNotes((prev) =>
          prev.map((note) => {
            if (note.id !== id) return note
            if (pendingRef.current.has(id)) return note
            return saved ? { ...note, ...saved } : note
          }),
        )
        setSavedAt(Date.now())
      } catch {
        pendingRef.current.set(id, { ...patch, ...(pendingRef.current.get(id) || {}) })
        notify('Could not save changes. They will retry with your next edit.')
      } finally {
        if (!pendingRef.current.size) setSaving(false)
      }
    },
    [notify],
  )

  const updateNote = useCallback(
    (id, patch) => {
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note)),
      )
      pendingRef.current.set(id, { ...(pendingRef.current.get(id) || {}), ...patch })
      setSaving(true)
      window.clearTimeout(timersRef.current.get(id))
      timersRef.current.set(
        id,
        window.setTimeout(() => {
          timersRef.current.delete(id)
          persist(id)
        }, 650),
      )
    },
    [persist],
  )

  const flushNote = useCallback(
    (id) => {
      window.clearTimeout(timersRef.current.get(id))
      timersRef.current.delete(id)
      persist(id)
    },
    [persist],
  )

  useEffect(() => {
    const onPageHide = () => {
      pendingRef.current.forEach((patch, id) => {
        fetch(`/api/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
          keepalive: true,
        }).catch(() => {})
      })
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [])

  const counts = useMemo(() => shelfCounts(notes), [notes])

  const visible = useMemo(
    () =>
      sortNotes(
        notes.filter((note) => matchesShelf(note, shelf) && matchesQuery(note, query)),
        sort,
      ),
    [notes, shelf, query, sort],
  )

  const activeNote = visible.find((note) => note.id === activeId) ?? null
  const openNote = notes.find((note) => note.id === openId) ?? null

  useEffect(() => {
    if (!loaded || !deepLinkRef.current) return
    const id = deepLinkRef.current
    deepLinkRef.current = null
    if (notes.some((note) => note.id === id)) {
      setActiveId(id)
      setOpenDraft(false)
      setOpenId(id)
    }
  }, [loaded, notes])

  useEffect(() => {
    if (!visible.length) {
      if (activeId !== null) setActiveId(null)
      return
    }
    if (!visible.some((note) => note.id === activeId)) setActiveId(visible[0].id)
  }, [visible, activeId])

  useEffect(() => {
    if (!loaded) return
    const url = new URL(window.location.href)
    if (openId) url.searchParams.set('note', openId)
    else url.searchParams.delete('note')
    window.history.replaceState({}, '', url)
    try {
      if (openId) window.sessionStorage.setItem(APP_URL_KEY, url.toString())
      else window.sessionStorage.removeItem(APP_URL_KEY)
    } catch {
      // preference just won't persist
    }
  }, [openId, loaded])

  useEffect(() => {
    document.title = openNote
      ? `${titleFor(openNote)} · ShareIdeas`
      : 'ShareIdeas · A quiet place for loud ideas'
  }, [openNote])

  useEffect(() => {
    if (!loaded) return undefined
    const interval = window.setInterval(async () => {
      try {
        const fresh = await api.getNotes()
        if (!Array.isArray(fresh)) return
        setNotes((prev) => {
          const map = new Map(fresh.map((note) => [note.id, note]))
          const merged = prev
            .filter((note) => map.has(note.id) || pendingRef.current.has(note.id))
            .map((note) => {
              if (pendingRef.current.has(note.id)) return note
              const incoming = map.get(note.id)
              if (!incoming || incoming.updatedAt <= (note.updatedAt ?? 0)) return note
              return incoming
            })
          fresh.forEach((note) => {
            if (!prev.some((local) => local.id === note.id) && !pendingRef.current.has(note.id)) {
              merged.push(note)
            }
          })
          return merged
        })
      } catch {
        // Stay with what we have while the connection is unsteady.
      }
    }, 5000)
    return () => window.clearInterval(interval)
  }, [loaded])

  const handleCreate = useCallback(
    async ({ title, cover, shelf: chosenShelf }) => {
      const note = await api.createNote({ title, cover, shelf: chosenShelf, content: '' })
      setNotes((prev) => [note, ...prev])
      setQuery('')
      setSort('recent')
      setActiveId(note.id)
      setOpenDraft(true)
      notify('Notebook created')
      window.setTimeout(() => setOpenId(note.id), 260)
      return note
    },
    [notify],
  )

  const handleOpen = useCallback((id) => {
    setActiveId(id)
    setOpenDraft(false)
    setOpenId(id)
  }, [])

  const handleClose = useCallback(() => {
    setOpenId(null)
    setOpenDraft(false)
    window.requestAnimationFrame(() => {
      const stage = document.querySelector('.carousel-stage')
      if (stage instanceof HTMLElement) stage.focus({ preventScroll: true })
    })
  }, [])

  const handleDelete = useCallback(
    async (id) => {
      setNotes((prev) => prev.filter((note) => note.id !== id))
      try {
        await api.deleteNote(id)
        notify('Notebook deleted')
      } catch {
        notify('The notebook could not be deleted.')
        loadNotes()
      }
    },
    [loadNotes, notify],
  )

  const bookW = Math.round(
    Math.max(190, Math.min(viewport.width * 0.26, 300, (viewport.height - 320) * 0.7)),
  )
  const bookH = Math.round(bookW * 1.42)

  return (
    <div className={`app ${openId ? 'is-reading' : ''}`.trim()}>
      <div className="app-bg" aria-hidden="true" />

      <div
        className="library-shell"
        inert={openId ? '' : undefined}
        aria-hidden={openId ? 'true' : undefined}
      >
        {loading ? (
          <LoadingScreen />
        ) : loadError ? (
          <ErrorScreen message={loadError} onRetry={loadNotes} />
        ) : (
          <Library
            notes={visible}
            totalCount={shelf === 'all' ? notes.length : counts[shelf] ?? 0}
            shelf={shelf}
            shelfCounts={counts}
            onShelfChange={changeShelf}
            activeId={activeId}
            activeNote={activeNote}
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            onSelect={setActiveId}
            onOpen={handleOpen}
            onCreate={handleCreate}
            bookW={bookW}
            bookH={bookH}
            reduced={Boolean(reduced)}
            disabled={Boolean(openId)}
            view={view}
            onViewChange={changeView}
          />
        )}
      </div>

      <AnimatePresence>
        {openNote && (
          <OpenNotebook
            key={openNote.id}
            note={openNote}
            initialMode={openDraft ? 'write' : 'read'}
            onChange={(patch) => updateNote(openNote.id, patch)}
            onFlush={() => flushNote(openNote.id)}
            onClose={handleClose}
            onClosed={handleClose}
            onDelete={handleDelete}
            saving={saving}
            savedAt={savedAt}
            notify={notify}
            reduced={Boolean(reduced)}
            viewport={viewport}
            view={view}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
