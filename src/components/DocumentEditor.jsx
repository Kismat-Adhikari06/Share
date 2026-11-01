import { useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { splitImageSegments } from '../lib/segments.js'

function TextSegment({ segment, onChange, placeholder, label, imageHandlers, onShortcut, onActivate }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  })

  return (
    <textarea
      ref={ref}
      onFocus={onActivate}
      className="editor-textarea editor-segment"
      data-seg-start={segment.start}
      value={segment.text}
      rows={1}
      {...imageHandlers}
      onChange={(event) => onChange(segment, event.target.value)}
      onKeyDown={(event) => {
        if (!(event.metaKey || event.ctrlKey)) return
        const key = event.key.toLowerCase()
        if (key === 'b' || key === 'i') {
          event.preventDefault()
          onShortcut?.(key === 'b' ? 'bold' : 'italic')
        }
      }}
      placeholder={segment.start === 0 ? placeholder : undefined}
      aria-label={label}
      spellCheck="true"
    />
  )
}

// A writing surface that draws images in place, so the note looks like the page it
// will become while the text around them stays plain Markdown.
export default function DocumentEditor({ value, onChange, placeholder, label, imageHandlers, onShortcut, apiRef }) {
  const segments = splitImageSegments(value)
  const containerRef = useRef(null)
  const lastArea = useRef(null)

  const areas = () => [...(containerRef.current?.querySelectorAll('textarea.editor-segment') ?? [])]
  const startOf = (el) => Number(el.dataset.segStart || 0)

  useImperativeHandle(
    apiRef,
    () => ({
      getSelection: () => {
        const all = areas()
        if (!all.length) return null
        const active = document.activeElement
        const el = all.includes(active) ? active : all.includes(lastArea.current) ? lastArea.current : all[0]
        const base = startOf(el)
        return { start: base + el.selectionStart, end: base + el.selectionEnd }
      },
      setSelection: (start, end = start) => {
        const all = areas()
        if (!all.length) return
        const el =
          all.find((area) => {
            const base = startOf(area)
            return start >= base && start <= base + area.value.length
          }) ?? all[all.length - 1]
        const base = startOf(el)
        const localStart = Math.max(0, Math.min(el.value.length, start - base))
        const localEnd = Math.max(localStart, Math.min(el.value.length, end - base))
        el.focus()
        el.setSelectionRange(localStart, localEnd)
      },
      focusFirst: () => areas()[0]?.focus(),
    }),
    [],
  )

  return (
    <div className="editor-doc" ref={containerRef}>
      {segments.map((segment) =>
        segment.type === 'image' ? (
          <figure key={segment.key} className="editor-figure">
            <img src={segment.url} alt={segment.alt} loading="lazy" />
          </figure>
        ) : (
          <TextSegment
            key={segment.key}
            segment={segment}
            placeholder={placeholder}
            label={label}
            imageHandlers={imageHandlers}
            onShortcut={onShortcut}
            onActivate={(event) => {
              lastArea.current = event.target
            }}
            onChange={(seg, next) => onChange(value.slice(0, seg.start) + next + value.slice(seg.end))}
          />
        ),
      )}
    </div>
  )
}
