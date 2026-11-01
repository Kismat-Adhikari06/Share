import { coverFor, estimatePages, excerptFor, shelfFor, timeAgo, titleFor, wordCount } from '../lib/notebooks.js'
import { IconBook, IconChevronRight } from './Icons.jsx'

function stamp(note) {
  const value = note.updatedAt || note.createdAt
  if (!value) return { date: '', time: '' }
  const d = new Date(value)
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function NoteList({ notes, activeId, onSelect, onOpen }) {
  return (
    <ul className="note-list" aria-label="Notebooks">
      {notes.map((note) => {
        const palette = coverFor(note)
        const pages = estimatePages(note.content)
        const words = wordCount(note.content)
        const shelf = shelfFor(note)
        const { date, time } = stamp(note)
        return (
          <li key={note.id}>
            <button
              type="button"
              className="note-row"
              data-active={note.id === activeId}
              onClick={() => onOpen(note.id)}
              onFocus={() => onSelect(note.id)}
              style={{ '--row-cover': palette.cover, '--row-spine': palette.spine, '--row-ink': palette.ink }}
            >
              <span className="note-row-cover" aria-hidden="true">
                <IconBook size={22} />
                <span className="note-row-dot" />
              </span>
              <span className="note-row-body">
                <span className="note-row-top">
                  <span className="note-row-title">{titleFor(note)}</span>
                  <span className="note-row-date">
                    {date}
                    <br />
                    {time}
                  </span>
                </span>
                <span className="note-row-tags">
                  {shelf ? <span className="note-tag note-tag-shelf">{shelf.name}</span> : null}
                  <span className="note-tag">
                    {pages || 1} {pages === 1 || !pages ? 'page' : 'pages'}
                  </span>
                  <span className="note-tag">
                    {words} {words === 1 ? 'word' : 'words'}
                  </span>
                  <span className="note-tag note-tag-soft">edited {timeAgo(note.updatedAt || note.createdAt)}</span>
                </span>
                <span className="note-row-excerpt">{excerptFor(note)}</span>
              </span>
              <span className="note-row-chevron" aria-hidden="true">
                <IconChevronRight size={18} />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
