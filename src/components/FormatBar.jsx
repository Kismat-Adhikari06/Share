import { useEffect, useRef, useState } from 'react'
import {
  IconBold,
  IconCalendarPlus,
  IconImage,
  IconItalic,
  IconLink,
  IconList,
  IconType,
} from './Icons.jsx'

const STYLES = [
  { key: 'title', label: 'Title', cls: 'st-title' },
  { key: 'heading', label: 'Heading', cls: 'st-heading' },
  { key: 'sub', label: 'Subheading', cls: 'st-sub' },
  { key: 'text', label: 'Normal text', cls: '' },
  { key: 'bullet', label: 'Bullet list', cls: '' },
  { key: 'number', label: 'Numbered list', cls: '' },
  { key: 'quote', label: 'Quote', cls: 'st-quote' },
  { key: 'code', label: 'Code block', cls: 'st-code' },
  { key: 'rule', label: 'Divider line', cls: '' },
]

export default function FormatBar({ onInline, onStyle, onDate, onImage }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const keep = (event) => event.preventDefault()

  return (
    <div className="format-wrap" ref={wrapRef}>
      {open && (
        <div className="style-menu" role="menu" aria-label="Text style">
          {STYLES.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`style-item ${item.cls}`.trim()}
              onPointerDown={keep}
              onClick={() => {
                setOpen(false)
                onStyle(item.key)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="format-bar" role="toolbar" aria-label="Formatting">
        <button
          type="button"
          className="format-labeled"
          onPointerDown={keep}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Text style"
        >
          <IconType size={15} />
          <span>Style</span>
        </button>
        <span className="format-sep" aria-hidden="true" />
        <button type="button" onPointerDown={keep} onClick={() => onInline('**', '**', 'bold text')} aria-label="Bold" title="Bold">
          <IconBold size={15} />
        </button>
        <button type="button" onPointerDown={keep} onClick={() => onInline('*', '*', 'italic text')} aria-label="Italic" title="Italic">
          <IconItalic size={15} />
        </button>
        <button type="button" onPointerDown={keep} onClick={() => onStyle('bullet')} aria-label="Bullet list" title="Bullet list">
          <IconList size={15} />
        </button>
        <button type="button" onPointerDown={keep} onClick={() => onInline('[', '](https://)', 'link text')} aria-label="Link" title="Link">
          <IconLink size={15} />
        </button>
        <button
          type="button"
          onPointerDown={keep}
          onClick={onImage}
          aria-label="Add an image"
          title="Add an image (or paste / drop one into the editor)"
        >
          <IconImage size={15} />
        </button>
        <span className="format-sep" aria-hidden="true" />
        <button
          type="button"
          className="format-labeled is-accent"
          onPointerDown={keep}
          onClick={onDate}
          title="Start a new dated entry here"
        >
          <IconCalendarPlus size={15} />
          <span>Date</span>
        </button>
      </div>
    </div>
  )
}
