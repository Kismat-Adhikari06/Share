import { useEffect, useRef, useState } from 'react'
import Carousel from './Carousel.jsx'
import CreateNotebook from './CreateNotebook.jsx'
import NoteList from './NoteList.jsx'
import { estimatePages, SHELF_FILTERS, shelfFor, timeAgo, titleFor, wordCount } from '../lib/notebooks.js'
import {
  IconBook,
  IconClose,
  IconList,
  IconPlus,
  IconSearch,
  IconSort,
} from './Icons.jsx'

function EmptyShelf({ hasQuery, query, shelfName, onClear, onCreate }) {
  return (
    <div className="empty-shelf">
      <span className="empty-icon" aria-hidden="true">
        <IconBook size={30} />
      </span>
      <p className="eyebrow">{hasQuery ? 'No matches' : 'An empty shelf'}</p>
      <h2>
        {hasQuery
          ? `Nothing matches “${query.trim()}”`
          : shelfName
            ? `Nothing filed under ${shelfName} yet.`
            : 'Your first notebook is waiting.'}
      </h2>
      <p className="muted">
        {hasQuery
          ? 'Try a different word, or clear the search to see every notebook.'
          : shelfName
            ? 'Move a notebook onto this shelf, or start a new one here.'
            : 'A place for half-formed thoughts, careful plans, and everything between.'}
      </p>
      {hasQuery ? (
        <button type="button" className="text-button" onClick={onClear}>
          Clear search
        </button>
      ) : (
        <button type="button" className="primary-button" onClick={onCreate}>
          <IconPlus size={16} />
          Create a notebook
        </button>
      )}
    </div>
  )
}

export default function Library({
  notes,
  totalCount,
  activeId,
  activeNote,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onSelect,
  onOpen,
  onCreate,
  bookW,
  bookH,
  reduced,
  disabled,
  view,
  onViewChange,
  shelf,
  shelfCounts,
  onShelfChange,
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const isList = view === 'list'
  const searchRef = useRef(null)
  const shelfOptions = SHELF_FILTERS
  const shelfName = shelf && shelf !== 'all' ? SHELF_FILTERS.find((e) => e.id === shelf)?.name : ''

  useEffect(() => {
    const onKeyDown = (event) => {
      if (disabled) return
      const tag = event.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return
      if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disabled])

  const activeIndex = Math.max(0, notes.findIndex((note) => note.id === activeId))
  const hasQuery = Boolean(query.trim())
  const pages = activeNote ? estimatePages(activeNote.content) : 0
  const words = activeNote ? wordCount(activeNote.content) : 0
  const edited = activeNote ? activeNote.updatedAt || activeNote.createdAt : 0

  return (
    <section className="library" aria-label="Notebook library">
      <header className="library-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <IconBook size={20} />
          </span>
          <div className="brand-copy">
            <h1>ShareIdeas</h1>
            <p>A quiet place for loud ideas.</p>
          </div>
        </div>

        <div className="library-tools">
          <div className="search-field">
            <IconSearch size={17} />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search notebooks"
              aria-label="Search notebooks"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                className="search-clear"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
              >
                <IconClose size={14} />
              </button>
            )}
          </div>

          <div className="view-toggle" role="group" aria-label="Library view">
            <button
              type="button"
              className="view-option"
              aria-pressed={!isList}
              onClick={() => onViewChange('books')}
              title="Book view"
            >
              <IconBook size={16} />
              <span>Books</span>
            </button>
            <button
              type="button"
              className="view-option"
              aria-pressed={isList}
              onClick={() => onViewChange('list')}
              title="List view"
            >
              <IconList size={16} />
              <span>List</span>
            </button>
          </div>

          <button
            type="button"
            className="sort-button"
            onClick={() => onSortChange(sort === 'recent' ? 'title' : 'recent')}
            aria-label={`Sort: ${sort === 'recent' ? 'recent first' : 'title A to Z'}. Change sorting.`}
          >
            <IconSort size={16} />
            <span>{sort === 'recent' ? 'Recent first' : 'Title A–Z'}</span>
          </button>

          <button type="button" className="primary-button new-button" onClick={() => setCreateOpen(true)}>
            <IconPlus size={16} />
            <span>New notebook</span>
          </button>
        </div>
      </header>

      <div className={`library-meta ${isList ? 'is-list' : ''}`.trim()}>
        <div className="active-summary" aria-live="polite" hidden={isList}>
          <span className="eyebrow">On the desk</span>
          <h2>{activeNote ? titleFor(activeNote) : hasQuery ? 'No notebook found' : 'Your shelf is empty'}</h2>
          <p>
            {activeNote
              ? `${pages || 1} ${pages === 1 ? 'page' : 'pages'} · ${words} ${words === 1 ? 'word' : 'words'} · edited ${timeAgo(edited)}`
              : hasQuery
                ? 'Try another search, or clear it to browse the whole shelf.'
                : 'Create a notebook to put something down.'}
          </p>
        </div>

        <div className="library-tally">
          <span className="tally-number">{String(totalCount).padStart(2, '0')}</span>
          <span className="tally-label">{totalCount === 1 ? 'notebook' : 'notebooks'}</span>
          {hasQuery && (
            <span className="tally-filter">
              {notes.length} {notes.length === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>
      </div>

      <div className="shelf-bar" role="group" aria-label="Notebook shelves">
        {shelfOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className="shelf-chip"
            aria-pressed={shelf === option.id}
            onClick={() => onShelfChange(option.id)}
          >
            <span>{option.name}</span>
            <span className="shelf-count">{shelfCounts?.[option.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className={`carousel-region ${isList ? 'is-list' : ''}`.trim()}>
        {notes.length && isList ? (
          <NoteList notes={notes} activeId={activeId} onSelect={onSelect} onOpen={onOpen} />
        ) : notes.length ? (
          <Carousel
            notes={notes}
            activeId={activeId}
            onSelect={onSelect}
            onOpen={onOpen}
            bookW={bookW}
            bookH={bookH}
            reduced={reduced}
            disabled={disabled}
          />
        ) : (
          <EmptyShelf
            hasQuery={hasQuery}
            query={query}
            shelfName={shelfName}
            onClear={() => onQueryChange('')}
            onCreate={() => setCreateOpen(true)}
          />
        )}
      </div>

      <footer className="library-footer" hidden={isList}>
        <div className="library-hint">
          <span className="hint-key" aria-hidden="true">←</span>
          <span className="hint-key" aria-hidden="true">→</span>
          <span>drag, scroll, or use arrow keys to browse</span>
        </div>

        <div className="library-dots" role="tablist" aria-label="Notebooks">
          {notes.length <= 12 ? (
            notes.map((note, index) => (
              <button
                key={note.id}
                type="button"
                role="tab"
                className="dot"
                data-active={note.id === activeId}
                aria-selected={note.id === activeId}
                aria-label={`Show ${titleFor(note)}`}
                onClick={() => onSelect(note.id)}
              />
            ))
          ) : (
            <span className="dot-count">
              {activeIndex + 1} / {notes.length}
            </span>
          )}
        </div>

        <span className="library-tagline">ShareIdeas · a quiet place for loud ideas</span>
      </footer>

      <CreateNotebook
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={onCreate}
        defaultShelf={shelfFor({ shelf }).id}
      />
    </section>
  )
}
