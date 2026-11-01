import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import NotebookCover from './NotebookCover.jsx'
import { COVERS, DEFAULT_SHELF, SHELVES } from '../lib/notebooks.js'
import { IconPlus } from './Icons.jsx'

export default function CreateNotebook({ open, onClose, onCreate, defaultShelf = DEFAULT_SHELF }) {
  const [title, setTitle] = useState('')
  const [coverIndex, setCoverIndex] = useState(0)
  const [shelf, setShelf] = useState(defaultShelf)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle('')
    setCoverIndex(0)
    setShelf(defaultShelf)
    setError('')
    setCreating(false)
  }, [open, defaultShelf])

  const submit = async () => {
    if (creating) return
    setCreating(true)
    setError('')
    try {
      await onCreate({
        title: title.trim() || 'Untitled notebook',
        cover: COVERS[coverIndex].id,
        shelf,
      })
      onClose()
    } catch (err) {
      setError(err?.message || 'The notebook could not be created.')
      setCreating(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-title" panelClassName="create-panel">
      <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
        <span aria-hidden="true">×</span>
      </button>

      <header className="create-head">
        <p className="eyebrow">New notebook</p>
        <h2 id="create-title">What are you thinking about?</h2>
        <p className="muted">Give it a name and a cover. You can change both later.</p>
      </header>

      <label className="field">
        <span>Title</span>
        <input
          data-autofocus
          value={title}
          onChange={(event) => setTitle(event.target.value.slice(0, 120))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              submit()
            }
          }}
          maxLength={120}
          placeholder="Untitled notebook"
          autoComplete="off"
        />
      </label>

      <fieldset className="cover-picker">
        <legend>Cover</legend>
        <div className="cover-options">
          {COVERS.map((cover, index) => (
            <button
              type="button"
              key={cover.id}
              className="cover-option"
              data-selected={index === coverIndex}
              aria-pressed={index === coverIndex}
              aria-label={`${cover.name} cover`}
              onClick={() => setCoverIndex(index)}
              style={{ '--swatch': cover.cover, '--swatch-spine': cover.spine, '--swatch-ink': cover.ink }}
            >
              <span className="swatch" aria-hidden="true">
                <span className="swatch-title" />
                <span className="swatch-rule" />
              </span>
              <span className="swatch-name">{cover.name}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="shelf-picker">
        <legend>Shelf</legend>
        <div className="shelf-options">
          {SHELVES.map((option) => (
            <button
              type="button"
              key={option.id}
              className="shelf-option"
              data-selected={shelf === option.id}
              aria-pressed={shelf === option.id}
              onClick={() => setShelf(option.id)}
            >
              {option.name}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="create-preview">
        <div className="create-preview-book" aria-hidden="true">
          <NotebookCover
            note={{
              id: 'preview',
              title: title.trim() || 'Untitled notebook',
              content: '',
              cover: COVERS[coverIndex].id,
            }}
          />
        </div>
        <div className="create-preview-copy">
          <p className="eyebrow">A fresh start</p>
          <p>Blank pages, ready when you are. Markdown gives your notes structure without getting in the way.</p>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="primary-button" onClick={submit} disabled={creating}>
          <IconPlus size={16} />
          {creating ? 'Creating…' : 'Create notebook'}
        </button>
      </div>
    </Modal>
  )
}
