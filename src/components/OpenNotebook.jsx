import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { countEntries, entryDivider, parseBlocks, renderMarkdown } from '../lib/markdown.js'
import { measureBlocks, paginateBlocks } from '../lib/paginate.js'
import { coverFor, deriveTitle, shelfIdFor, SHELVES, timeAgo, titleFor, wordCount } from '../lib/notebooks.js'
import { uploadImage } from '../api.js'
import NotebookCover from './NotebookCover.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import FormatBar from './FormatBar.jsx'
import {
  IconArrowLeft,
  IconBold,
  IconCalendarPlus,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconCopy,
  IconDownload,
  IconEye,
  IconFileText,
  IconHeading,
  IconItalic,
  IconLink,
  IconList,
  IconMore,
  IconPen,
  IconQuote,
  IconTrash,
} from './Icons.jsx'

const EASE = [0.22, 0.61, 0.36, 1]
const FLIP_DURATION = 0.62

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'notebook'
  )
}

function PageFace({ page, side, number, empty = false, onStartWriting }) {
  return (
    <div className={`page page-${side}`}>
      {empty ? (
        <div className="page-empty">
          <p className="eyebrow">A blank page</p>
          <h2>Start with a thought.</h2>
          <p className="muted">
            A heading, a list, a single sentence. Markdown gives it shape without getting in the way.
          </p>
          <button type="button" className="primary-button" onClick={onStartWriting}>
            <IconPen size={16} />
            Start writing
          </button>
        </div>
      ) : (
        <div className="page-copy">
          {page
            ? page.map((block) => (
                <div
                  key={block.key}
                  className="md-block"
                  dangerouslySetInnerHTML={{ __html: block.html }}
                />
              ))
            : null}
        </div>
      )}
      {number ? <span className="page-number">{number}</span> : null}
    </div>
  )
}

export default function OpenNotebook({
  note,
  initialMode = 'read',
  onChange,
  onFlush,
  onClose,
  onClosed,
  onDelete,
  saving,
  savedAt,
  notify,
  reduced,
  viewport,
  view = 'books',
}) {
  const diary = view === 'list'
  const [stage, setStage] = useState('opening')
  const [mode, setMode] = useState(initialMode)
  const [title, setTitle] = useState(() => titleFor(note))
  const [content, setContent] = useState(note.content ?? '')
  const [pages, setPages] = useState([[]])
  const [spread, setSpread] = useState(0)
  const [flip, setFlip] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [fontTick, setFontTick] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const titleTouched = useRef(Boolean((note.title ?? '').trim()))
  const localCopy = useRef({ content: note.content ?? '', title: titleFor(note) })
  const measureRef = useRef(null)
  const textareaRef = useRef(null)
  const readerRef = useRef(null)
  const diaryCopyRef = useRef(null)
  const bookRef = useRef(null)
  const imageRef = useRef(null)
  const pendingSelection = useRef(null)
  const pendingDelete = useRef(false)
  const closeTimer = useRef(0)
  const changeTimer = useRef(0)
  const pendingChange = useRef(null)

  const isMobile = viewport.width < 820
  const availableH = Math.max(360, viewport.height - 210)
  const horizontalBudget = isMobile ? viewport.width - 36 : (viewport.width - 150) / 2
  const pageW = Math.max(240, Math.floor(Math.min(availableH * 0.72, horizontalBudget, 600)))
  const pageH = Math.floor(pageW / 0.72)
  const padX = pageW < 340 ? 22 : pageW < 430 ? 30 : 42
  const padTop = pageW < 340 ? 30 : 38
  const padBottom = 30
  const textW = pageW - padX * 2
  const textH = pageH - padTop - padBottom - 22
  const pageFont = pageW < 340 ? 15 : pageW < 430 ? 16 : 17

  const bookWidth = isMobile ? pageW : pageW * 2
  const deferredContent = useDeferredValue(content)
  const blocks = useMemo(() => (mode === 'read' ? parseBlocks(content) : []), [mode, content])
  const previewHtml = useMemo(
    () => (mode === 'write' ? renderMarkdown(deferredContent) : ''),
    [mode, deferredContent],
  )
  const empty = content.trim().length === 0
  const words = wordCount(content)
  const palette = coverFor(note)

  const bookStyle = {
    width: bookWidth,
    height: pageH,
    '--page-w': `${pageW}px`,
    '--page-h': `${pageH}px`,
    '--pad-x': `${padX}px`,
    '--pad-top': `${padTop}px`,
    '--pad-bottom': `${padBottom}px`,
    '--page-font': `${pageFont}px`,
  }

  useEffect(() => {
    readerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (stage !== 'opening') return undefined
    const timer = window.setTimeout(() => setStage('open'), reduced || diary ? 220 : 1000)
    return () => window.clearTimeout(timer)
  }, [stage, reduced, diary])

  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) setFontTick((tick) => tick + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const emitChange = useCallback(
    (patch) => {
      pendingChange.current = { ...(pendingChange.current || {}), ...patch }
      window.clearTimeout(changeTimer.current)
      changeTimer.current = window.setTimeout(() => {
        const next = pendingChange.current
        pendingChange.current = null
        if (next) onChange(next)
      }, 260)
    },
    [onChange],
  )

  const flushChanges = useCallback(() => {
    window.clearTimeout(changeTimer.current)
    const next = pendingChange.current
    pendingChange.current = null
    if (next) onChange(next)
  }, [onChange])

  useEffect(
    () => () => {
      window.clearTimeout(changeTimer.current)
      window.clearTimeout(closeTimer.current)
    },
    [],
  )

  useLayoutEffect(() => {
    if (mode !== 'read') return
    const el = measureRef.current
    if (!el) return

    const metrics = measureBlocks(el)
    const next = paginateBlocks(blocks, metrics, textH)
    setPages(next)

    const max = Math.max(0, (isMobile ? next.length : Math.ceil(next.length / 2)) - 1)
    setSpread((current) => Math.min(current, max))
  }, [mode, blocks, textW, textH, isMobile, fontTick])

  useEffect(() => {
    if ((mode === 'write' || mode === 'text') && stage === 'open') {
      const timer = window.setTimeout(() => textareaRef.current?.focus(), 80)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [mode, stage])

  const autoDated = useRef(false)
  useEffect(() => {
    if (mode !== 'write' || stage !== 'open' || autoDated.current) return
    autoDated.current = true
    if (!content.trim()) return
    const last = note.updatedAt || note.createdAt
    if (!last || new Date(last).toDateString() === new Date().toDateString()) return
    const stamp = entryDivider()
    if (content.trimEnd().endsWith(stamp)) return
    const next = `${content.replace(/\s+$/, '')}\n\n${stamp}\n\n`
    pendingSelection.current = [next.length, next.length]
    handleContent(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stage])

  useLayoutEffect(() => {
    if (!pendingSelection.current) return
    const [start, end] = pendingSelection.current
    pendingSelection.current = null
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(start, end)
  }, [content])

  const handleContent = useCallback(
    (next) => {
      setContent(next)
      localCopy.current.content = next
      const patch = { content: next }
      if (!titleTouched.current) {
        const derived = deriveTitle(next)
        setTitle(derived)
        patch.title = derived
      }
      emitChange(patch)
    },
    [emitChange],
  )

  const handleTitle = (value) => {
    const next = value.slice(0, 120)
    titleTouched.current = true
    localCopy.current.title = next
    setTitle(next)
    emitChange({ title: next })
  }

  const handleTitleBlur = () => {
    const next = title.trim() || deriveTitle(content)
    if (next !== title) setTitle(next)
    if (titleTouched.current) emitChange({ title: next })
  }

  // Pick up edits made elsewhere (another device or tab) while the notebook is
  // open and being read. Anything typed here stays the source of truth.
  useEffect(() => {
    if (mode !== 'read' || stage === 'closing' || pendingChange.current) return

    const incoming = note.content ?? ''
    if (incoming !== localCopy.current.content) {
      localCopy.current.content = incoming
      setContent(incoming)
    }

    if (!titleTouched.current) {
      const incomingTitle = titleFor(note)
      if (incomingTitle !== localCopy.current.title) {
        localCopy.current.title = incomingTitle
        setTitle(incomingTitle)
      }
    }
  }, [note.content, note.title, mode, stage])

  const applyInline = (before, after, placeholder) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = content.slice(start, end) || placeholder
    const next = content.slice(0, start) + before + selected + after + content.slice(end)
    pendingSelection.current = [start + before.length, start + before.length + selected.length]
    handleContent(next)
  }

  const insertBlock = (text, selectAfter = false) => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionEnd
    const before = content.slice(0, pos)
    const after = content.slice(pos).replace(/^\n+/, '')
    const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
    const head = `${before}${lead}${text}\n\n`
    pendingSelection.current = selectAfter ? [before.length + lead.length, head.length - 2] : [head.length, head.length]
    handleContent(head + after)
  }

  const insertDate = () => insertBlock(entryDivider())

  const addImages = async (files) => {
    const images = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'))
    if (!images.length || !textareaRef.current) return

    for (const file of images) {
      try {
        notify?.('Uploading image…')
        const url = await uploadImage(file)
        if (!url) continue
        const alt = file.name.replace(/\.[^.]+$/, '').replace(/[[\]]/g, '').slice(0, 60) || 'image'
        insertBlock(`![${alt}](${url})`)
        notify?.('Image added')
      } catch (error) {
        notify?.(error?.message || 'The image could not be added.')
      }
    }
  }

  const imageHandlers = {
    onPaste: (event) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (!files.length) return
      event.preventDefault()
      addImages(files)
    },
    onDragOver: (event) => {
      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return
      event.preventDefault()
    },
    onDrop: (event) => {
      const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (!files.length) return
      event.preventDefault()
      addImages(files)
    },
  }

  const applyStyle = (key) => {
    const el = textareaRef.current
    if (!el) return
    if (key === 'rule') {
      insertBlock('---')
      return
    }
    if (key === 'code') {
      const picked = content.slice(el.selectionStart, el.selectionEnd)
      insertBlock('```\n' + (picked || 'code') + '\n```')
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    const lineEndIndex = content.indexOf('\n', end)
    const lineEnd = lineEndIndex === -1 ? content.length : lineEndIndex
    const lines = content.slice(lineStart, lineEnd).split('\n')
    const strip = (line) => line.replace(/^(#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/, '')
    const prefixFor = (i) =>
      ({ title: '# ', heading: '## ', sub: '### ', bullet: '- ', number: `${i + 1}. `, quote: '> ', text: '' })[key] ?? ''
    const already = key !== 'text' && lines.every((line, i) => line.startsWith(prefixFor(i)))
    const nextBlock = lines.map((line, i) => (already ? strip(line) : prefixFor(i) + strip(line))).join('\n')
    pendingSelection.current = [lineStart + nextBlock.length, lineStart + nextBlock.length]
    handleContent(content.slice(0, lineStart) + nextBlock + content.slice(lineEnd))
  }

  const requestClose = useCallback(() => {
    if (stage === 'closing') return
    flushChanges()
    setConfirmOpen(false)
    setStage('closing')
    closeTimer.current = window.setTimeout(
      () => {
        if (pendingDelete.current) onDelete(note.id)
        onClosed()
      },
      reduced || diary ? 300 : isMobile ? 780 : 1100,
    )
  }, [stage, flushChanges, reduced, diary, isMobile, onDelete, onClosed, note.id])

  const turn = useCallback(
    (direction) => {
      if (diary || stage !== 'open' || mode !== 'read' || flip) return
      const max = Math.max(0, (isMobile ? pages.length : Math.ceil(pages.length / 2)) - 1)
      const next = spread + direction
      if (next < 0 || next > max) return
      if (reduced) {
        setSpread(next)
        return
      }
      setFlip({ dir: direction })
    },
    [diary, stage, mode, flip, isMobile, pages.length, spread, reduced],
  )

  const commitFlip = useCallback(() => {
    setSpread((current) => current + (flip?.dir ?? 0))
    setFlip(null)
  }, [flip])

  const diaryHtml = useMemo(
    () => (diary && mode === 'read' ? renderMarkdown(content) : ''),
    [diary, mode, content],
  )
  const created = new Date(note.createdAt || Date.now())
  const diaryDate = `${created.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })} at ${created.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  const entries = countEntries(content)

  const continueEntry = () => {
    setMenuOpen(false)
    const stamp = entryDivider()
    const trimmed = content.replace(/\s+$/, '')
    let next = content
    if (trimmed && !trimmed.endsWith(stamp)) next = `${trimmed}\n\n${stamp}\n\n`
    else if (trimmed) next = `${trimmed}\n\n`
    if (next !== content) {
      pendingSelection.current = [next.length, next.length]
      handleContent(next)
    } else {
      pendingSelection.current = [content.length, content.length]
    }
    setMode('write')
  }

  const startWriting = () => {
    setMode('write')
  }

  const exportNote = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${slugify(title)}.md`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify?.('Markdown exported')
  }

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(content)
      notify?.('Notebook copied')
    } catch {
      const area = document.createElement('textarea')
      area.value = content
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      notify?.(ok ? 'Notebook copied' : 'Could not copy')
    }
  }

  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('note', note.id)
    try {
      await navigator.clipboard.writeText(url.toString())
      notify?.('Link copied')
    } catch {
      window.prompt('Copy this link', url.toString())
    }
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (confirmOpen) return
        if (menuOpen) {
          event.preventDefault()
          setMenuOpen(false)
          return
        }
        const tag = event.target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
          event.target.blur()
          return
        }
        if (stage === 'open') {
          event.preventDefault()
          if (mode !== 'read') setMode('read')
          else requestClose()
        }
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        const tag = event.target?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return
        if (stage !== 'open' || confirmOpen) return

        if (mode !== 'read') {
          const editor = textareaRef.current
          if (!editor) return
          event.preventDefault()
          editor.focus()
          editor.setSelectionRange(0, editor.value.length)
          return
        }

        if (flip) return
        const host = diary ? diaryCopyRef.current : bookRef.current
        const nodes = diary
          ? host
            ? [host]
            : []
          : Array.from(host?.querySelectorAll('.page .page-copy') ?? [])
        if (!nodes.length) return

        event.preventDefault()
        const range = document.createRange()
        range.selectNodeContents(nodes[0])
        nodes.slice(1).forEach((node) => range.setEnd(node, node.childNodes.length))
        const selection = window.getSelection()
        if (!selection) return
        selection.removeAllRanges()
        selection.addRange(range)
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        flushChanges()
        onFlush?.()
        notify?.('Saved')
        return
      }

      if (mode !== 'read' || stage !== 'open' || flip) return
      const tag = event.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return

      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault()
        turn(1)
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault()
        turn(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmOpen, menuOpen, stage, mode, flip, diary, requestClose, turn, onFlush, notify])

  const totalPages = Math.max(1, pages.length)
  const maxSpread = Math.max(0, (isMobile ? pages.length : Math.ceil(pages.length / 2)) - 1)
  const shownStart = isMobile ? Math.min(spread, totalPages - 1) + 1 : spread * 2 + 1
  const shownEnd = isMobile ? shownStart : Math.min(spread * 2 + 2, totalPages)
  const canPrev = spread > 0
  const canNext = spread < maxSpread

  const pageAt = (index) => (index >= 0 && index < pages.length ? pages[index] : null)
  const pageNumber = (index) => (index >= 0 && index < pages.length ? index + 1 : null)

  const leftIndex = spread * 2
  const rightIndex = leftIndex + 1

  let staticLeftIndex = leftIndex
  let staticRightIndex = rightIndex
  let leafFrontIndex = null
  let leafBackIndex = null

  if (flip) {
    if (flip.dir > 0) {
      staticRightIndex = rightIndex + 2
      leafFrontIndex = rightIndex
      leafBackIndex = rightIndex + 1
    } else {
      staticLeftIndex = leftIndex - 2
      leafFrontIndex = leftIndex
      leafBackIndex = leftIndex - 1
    }
  }

  const mobileLeafIndex = flip ? spread : null
  const mobileStaticIndex = flip ? spread + flip.dir : null

  return (
    <motion.div
      ref={readerRef}
      className="reader"
      data-stage={stage}
      data-mode={mode}
      role="dialog"
      aria-modal="true"
      aria-label={`Notebook: ${title}`}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="reader-glow" aria-hidden="true" />

      <input
        ref={imageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        hidden
        onChange={(event) => {
          addImages(event.target.files)
          event.target.value = ''
        }}
      />

      <header className="reader-toolbar">
        <div className="toolbar-left">
          <button
            type="button"
            className="icon-button back-button"
            onClick={requestClose}
            aria-label="Back to library"
          >
            <IconArrowLeft size={19} />
          </button>

          <div className="title-wrap">
            <input
              className="reader-title"
              value={title}
              onChange={(event) => handleTitle(event.target.value)}
              onBlur={handleTitleBlur}
              maxLength={120}
              aria-label="Notebook title"
              spellCheck={false}
              autoComplete="off"
            />
            <span className="reader-sub">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} · edited{' '}
              {timeAgo(note.updatedAt || note.createdAt)}
            </span>
          </div>
        </div>

        <div className="toolbar-right">
          <span
            className={`save-state ${saving ? 'is-saving' : ''}`}
            aria-live="polite"
            title={savedAt ? `Saved ${timeAgo(savedAt)}` : 'All changes saved'}
          >
            {saving ? <span className="save-dot" aria-hidden="true" /> : <IconCheck size={14} />}
            <span className="save-label">{saving ? 'Saving…' : 'Saved'}</span>
          </span>

          <label className="shelf-select">
            <span className="shelf-select-label">Shelf</span>
            <select
              value={shelfIdFor(note)}
              onChange={(event) => onChange({ shelf: event.target.value })}
              aria-label="Notebook shelf"
            >
              {SHELVES.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mode-toggle" role="tablist" aria-label="Notebook mode">
            <button
              type="button"
              role="tab"
              className="mode-option"
              aria-selected={mode === 'read'}
              onClick={() => setMode('read')}
            >
              {mode === 'read' && (
                <motion.span
                  layoutId={reduced ? undefined : 'mode-pill'}
                  className="mode-pill"
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                />
              )}
              <IconEye size={15} />
              <span>Read</span>
            </button>
            <button
              type="button"
              role="tab"
              className="mode-option"
              aria-selected={mode === 'write'}
              onClick={() => setMode('write')}
            >
              {mode === 'write' && (
                <motion.span
                  layoutId={reduced ? undefined : 'mode-pill'}
                  className="mode-pill"
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                />
              )}
              <IconPen size={15} />
              <span>Write</span>
            </button>
          </div>

          <div className="toolbar-actions">
            {!diary && (
              <button
                type="button"
                className="icon-button"
                onClick={continueEntry}
                aria-label="Add a new dated entry"
                title="Add a new dated entry"
              >
                <IconCalendarPlus size={18} />
              </button>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={copyAll}
              aria-label="Copy entire notebook"
              title="Copy entire notebook"
            >
              <IconCopy size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={exportNote}
              aria-label="Export as Markdown"
              title="Export as Markdown"
            >
              <IconDownload size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={copyLink}
              aria-label="Copy link to notebook"
              title="Copy link"
            >
              <IconLink size={18} />
            </button>
            <button
              type="button"
              className={`icon-button danger ${diary ? 'only-wide' : ''}`.trim()}
              onClick={() => setConfirmOpen(true)}
              aria-label="Delete notebook"
              title="Delete notebook"
            >
              <IconTrash size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="reader-main">
        {diary ? (
          <motion.div
            className="diary"
            initial={{ opacity: 0, y: reduced ? 0 : 22 }}
            animate={
              stage === 'closing'
                ? { opacity: 0, y: reduced ? 0 : 14, transition: { duration: 0.24 } }
                : { opacity: 1, y: 0, transition: { duration: reduced ? 0.15 : 0.45, ease: EASE } }
            }
          >
            <article className="diary-sheet" data-mode={mode}>
              <header className="diary-head">
                <p className="eyebrow">{diaryDate}</p>
                <h1 className="diary-title">{title || 'Untitled notebook'}</h1>
                <div className="note-row-tags">
                  <span className="note-tag">
                    {words} {words === 1 ? 'word' : 'words'}
                  </span>
                  <span className="note-tag note-tag-soft">
                    edited {timeAgo(note.updatedAt || note.createdAt)}
                  </span>
                </div>
              </header>

              <div className="diary-body">
                {mode === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    className="editor-textarea diary-textarea"
                    value={content}
                    {...imageHandlers}
                    onChange={(event) => handleContent(event.target.value)}
                    onKeyDown={(event) => {
                      if (!(event.metaKey || event.ctrlKey)) return
                      const key = event.key.toLowerCase()
                      if (key === 'b') {
                        event.preventDefault()
                        applyInline('**', '**', 'bold text')
                      } else if (key === 'i') {
                        event.preventDefault()
                        applyInline('*', '*', 'italic text')
                      }
                    }}
                    placeholder="Dear diary…"
                    aria-label="Entry content, Markdown"
                    spellCheck="true"
                  />
                ) : empty ? (
                  <div className="diary-empty">
                    <p className="preview-empty">Nothing written yet.</p>
                    <button type="button" className="primary-button" onClick={startWriting}>
                      <IconPen size={16} />
                      Start writing
                    </button>
                  </div>
                ) : (
                  <div
                    ref={diaryCopyRef}
                    className="page-copy diary-copy"
                    dangerouslySetInnerHTML={{ __html: diaryHtml }}
                  />
                )}
              </div>

              {mode === 'read' && (
                <footer className="diary-foot">
                  <span className="diary-meta">
                    {entries} {entries === 1 ? 'entry' : 'entries'} · {words} {words === 1 ? 'word' : 'words'}
                  </span>
                  <button
                    type="button"
                    className="diary-more"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label="More actions"
                  >
                    <IconMore size={18} />
                  </button>
                </footer>
              )}

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <motion.button
                      type="button"
                      className="diary-scrim"
                      aria-label="Close menu"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setMenuOpen(false)}
                    />
                    <motion.div
                      className="diary-menu"
                      role="menu"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.22, ease: EASE }}
                    >
                      <p className="diary-menu-title">Choose what happens next.</p>
                      <button type="button" role="menuitem" className="diary-menu-item is-primary" onClick={continueEntry}>
                        <IconCalendarPlus size={17} />
                        Continue with a new entry
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="diary-menu-item"
                        onClick={() => {
                          setMenuOpen(false)
                          copyAll()
                        }}
                      >
                        <IconCopy size={17} />
                        Copy everything
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="diary-menu-item"
                        onClick={() => {
                          setMenuOpen(false)
                          exportNote()
                        }}
                      >
                        <IconDownload size={17} />
                        Export as Markdown
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="diary-menu-item is-danger"
                        onClick={() => {
                          setMenuOpen(false)
                          setConfirmOpen(true)
                        }}
                      >
                        <IconTrash size={17} />
                        Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {mode === 'write' && (
                <FormatBar
                  onInline={applyInline}
                  onStyle={applyStyle}
                  onDate={insertDate}
                  onImage={() => imageRef.current?.click()}
                />
              )}
            </article>
          </motion.div>
        ) : (
        <div className="book-column">
          <div
            className={`book-stage ${isMobile ? 'is-single' : ''}`.trim()}
            style={{ width: bookWidth, height: pageH }}
          >
            <motion.div
              ref={bookRef}
              className="book"
              style={bookStyle}
              initial={
                reduced ? { opacity: 0 } : { x: isMobile ? 0 : -pageW / 2, scale: 0.9, opacity: 0 }
              }
              animate={
                stage === 'closing'
                  ? {
                      x: isMobile ? 0 : -pageW / 2,
                      scale: 0.9,
                      opacity: 0,
                      transition: reduced
                        ? { duration: 0.26 }
                        : { delay: isMobile ? 0.16 : 0.4, duration: 0.42, ease: 'easeIn' },
                    }
                  : {
                      x: 0,
                      scale: 1,
                      opacity: 1,
                      transition: reduced ? { duration: 0.2 } : { duration: 0.9, ease: EASE },
                    }
              }
            >
              <motion.div
                className={`spread ${isMobile ? 'is-single' : ''}`.trim()}
                initial={{ opacity: reduced ? 1 : 0 }}
                animate={{ opacity: stage === 'closing' ? 0 : 1 }}
                transition={{
                  delay: stage === 'opening' && !reduced ? 0.22 : 0,
                  duration: reduced ? 0.2 : 0.5,
                }}
              >
                {mode === 'write' ? (
                  <>
                    <div className="page page-left page-editor">
                      <div className="page-label">
                        <span>Editing</span>
                        <span>{wordCount(content)} words</span>
                      </div>
                      <textarea
                        ref={textareaRef}
                        className="editor-textarea"
                        value={content}
                        {...imageHandlers}
                        onChange={(event) => handleContent(event.target.value)}
                        onKeyDown={(event) => {
                          if (!(event.metaKey || event.ctrlKey)) return
                          const key = event.key.toLowerCase()
                          if (key === 'b') {
                            event.preventDefault()
                            applyInline('**', '**', 'bold text')
                          } else if (key === 'i') {
                            event.preventDefault()
                            applyInline('*', '*', 'italic text')
                          }
                        }}
                        placeholder="Start writing…"
                        aria-label="Notebook content, Markdown"
                        spellCheck="true"
                      />
                      <FormatBar
                        onInline={applyInline}
                        onStyle={applyStyle}
                        onDate={insertDate}
                        onImage={() => imageRef.current?.click()}
                      />
                    </div>

                    {!isMobile && (
                      <div className="page page-right page-preview">
                        <div className="page-label">
                          <span>Preview</span>
                          <span>{empty ? 'Blank' : 'Live'}</span>
                        </div>
                        <div className="preview-scroll">
                          {empty ? (
                            <p className="preview-empty">Your writing will appear here.</p>
                          ) : (
                            <div
                              className="page-copy markdown-preview"
                              dangerouslySetInnerHTML={{ __html: previewHtml }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {!isMobile && (
                      <PageFace
                        page={pageAt(staticLeftIndex)}
                        side="left"
                        number={pageNumber(staticLeftIndex)}
                        empty={!flip && empty}
                        onStartWriting={startWriting}
                      />
                    )}

                    {isMobile ? (
                      <PageFace
                        page={pageAt(flip ? mobileStaticIndex : spread)}
                        side="right"
                        number={pageNumber(flip ? mobileStaticIndex : spread)}
                        empty={!flip && empty}
                        onStartWriting={startWriting}
                      />
                    ) : (
                      <PageFace
                        page={pageAt(staticRightIndex)}
                        side="right"
                        number={pageNumber(staticRightIndex)}
                      />
                    )}

                    {!isMobile && <span className="gutter" aria-hidden="true" />}
                  </>
                )}
              </motion.div>

              {stage !== 'open' && !reduced && (
                <motion.div
                  className="opening-cover"
                  style={{ width: pageW, height: pageH }}
                  initial={{ rotateY: stage === 'opening' ? 0 : -180, opacity: 1 }}
                  animate={
                    stage === 'opening'
                      ? { rotateY: -180, opacity: 0 }
                      : { rotateY: 0, opacity: 1 }
                  }
                  transition={
                    stage === 'opening'
                      ? {
                          rotateY: { duration: 0.9, ease: EASE, delay: 0.08 },
                          opacity: { delay: 0.92, duration: 0.16 },
                        }
                      : {
                          rotateY: { duration: 0.68, ease: EASE },
                          opacity: { duration: 0.1 },
                        }
                  }
                >
                  <div className="cover-face-front">
                    <NotebookCover note={note} className="cover-flat" />
                  </div>
                  <div className="cover-face-back">
                    <div
                      className="inside-cover"
                      style={{ '--inside': palette.board, '--inside-ink': palette.ink }}
                    >
                      <span className="inside-mark">ShareIdeas</span>
                      <span className="inside-rule" aria-hidden="true" />
                      <p>Notes in progress.</p>
                      <span className="inside-pocket" aria-hidden="true" />
                    </div>
                  </div>
                </motion.div>
              )}

              {flip && mode === 'read' && stage === 'open' && !reduced && !isMobile && (
                <motion.div
                  className={`leaf leaf-${flip.dir > 0 ? 'next' : 'prev'}`}
                  initial={{ rotateY: 0 }}
                  animate={{ rotateY: flip.dir > 0 ? -180 : 180 }}
                  transition={{ duration: FLIP_DURATION, ease: [0.3, 0.12, 0.18, 1] }}
                  onAnimationComplete={commitFlip}
                >
                  <div className="leaf-face leaf-front">
                    <PageFace
                      page={pageAt(leafFrontIndex)}
                      side={flip.dir > 0 ? 'right' : 'left'}
                      number={pageNumber(leafFrontIndex)}
                    />
                  </div>
                  <div className="leaf-face leaf-back">
                    <PageFace
                      page={pageAt(leafBackIndex)}
                      side={flip.dir > 0 ? 'left' : 'right'}
                      number={pageNumber(leafBackIndex)}
                    />
                  </div>
                </motion.div>
              )}

              {flip && mode === 'read' && stage === 'open' && !reduced && isMobile && (
                <motion.div
                  className={`mobile-leaf mobile-leaf-${flip.dir > 0 ? 'next' : 'prev'}`}
                  initial={{ rotateY: 0, opacity: 1 }}
                  animate={{ rotateY: flip.dir > 0 ? -78 : 78, opacity: 0.12 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  onAnimationComplete={commitFlip}
                >
                  <PageFace page={pageAt(mobileLeafIndex)} side="right" number={pageNumber(mobileLeafIndex)} />
                </motion.div>
              )}
            </motion.div>

            {mode === 'read' && stage === 'open' && (
              <>
                <button
                  type="button"
                  className="turn-button turn-prev"
                  onClick={() => turn(-1)}
                  disabled={!canPrev || Boolean(flip)}
                  aria-label="Previous page"
                >
                  <IconChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="turn-button turn-next"
                  onClick={() => turn(1)}
                  disabled={!canNext || Boolean(flip)}
                  aria-label="Next page"
                >
                  <IconChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          <div className="book-status" aria-live="polite">
            {mode === 'write' ? (
              <span>
                Editing · {wordCount(content)} {wordCount(content) === 1 ? 'word' : 'words'}
              </span>
            ) : (
              <span>
                {shownEnd > shownStart ? `Pages ${shownStart}–${shownEnd}` : `Page ${shownStart}`} of{' '}
                {totalPages}
              </span>
            )}
            {!isMobile && <span className="book-hint">Use ← → to turn pages</span>}
          </div>
        </div>
        )}
      </main>

      <div className="measure-layer" aria-hidden="true">
        <div
          className="page-copy measure-copy"
          ref={measureRef}
          style={{ width: textW, fontSize: pageFont }}
        >
          {blocks.map((block) => (
            <div
              key={block.key}
              className="md-block"
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {confirmOpen && (
          <ConfirmDialog
            open={confirmOpen}
            title={title}
            description="This removes the notebook and every page in it. It can’t be undone."
            confirmLabel="Delete notebook"
            onConfirm={() => {
              pendingDelete.current = true
              setConfirmOpen(false)
              requestClose()
            }}
            onCancel={() => setConfirmOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
