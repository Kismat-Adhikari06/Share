import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react'
import NotebookCover from './NotebookCover.jsx'
import { titleFor } from '../lib/notebooks.js'

const SPACING_RATIO = 0.66
const SPRING = { type: 'spring', stiffness: 150, damping: 24, mass: 0.9 }

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function rubberband(value, min, max) {
  if (value < min) return min + (value - min) * 0.32
  if (value > max) return max + (value - max) * 0.32
  return value
}

function CarouselItem({
  note,
  index,
  progress,
  bookW,
  bookH,
  reduced,
  active,
  onFocus,
  onOpen,
  suppressClick,
}) {
  const distance = useTransform(progress, (value) => index - value)
  const x = useTransform(distance, (d) => d * bookW * SPACING_RATIO)
  const scale = useTransform(distance, (d) => (reduced ? 1 : 1 - Math.min(Math.abs(d), 3) * 0.1))
  const rotateY = useTransform(distance, (d) => (reduced ? 0 : clamp(d * -13, -22, 22)))
  const z = useTransform(distance, (d) => (reduced ? 0 : -Math.abs(d) * 120))
  const depthOpacity = useTransform(distance, (d) => Math.max(0, 1 - Math.max(0, Math.abs(d) - 2.2) * 0.6))
  const zIndex = useTransform(distance, (d) => Math.round(40 - Math.abs(d) * 10))

  const [hovered, setHovered] = useState(false)
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)

  const handlePointerMove = (event) => {
    if (reduced || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    tiltY.set(px * 7)
    tiltX.set(-py * 5)
  }

  const resetHover = () => {
    setHovered(false)
    animate(tiltX, 0, SPRING)
    animate(tiltY, 0, SPRING)
  }

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    const current = progress.get()
    if (Math.abs(index - current) < 0.45) onOpen(note.id)
    else onFocus(note.id)
  }

  return (
    <motion.div
      className="carousel-item"
      style={{
        x,
        z,
        rotateY,
        zIndex,
        width: bookW,
        height: bookH,
        marginLeft: -bookW / 2,
        marginTop: -bookH / 2,
      }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.86, y: 70, transition: { duration: 0.35, ease: 'easeIn' } }}
      transition={{ duration: 0.45, ease: [0.22, 0.8, 0.3, 1] }}
    >
      <motion.div className="carousel-depth" style={{ opacity: depthOpacity, scale }}>
        <motion.button
          type="button"
          className="notebook-button"
          data-active={active ? 'true' : 'false'}
          style={{ rotateX: tiltX, rotateY: tiltY }}
          animate={{ y: hovered && !reduced ? -12 : 0 }}
          transition={SPRING}
          onPointerEnter={() => setHovered(true)}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetHover}
          onBlur={resetHover}
          onClick={handleClick}
          aria-label={`${active ? 'Open' : 'Bring to the front'}: ${titleFor(note)}`}
        >
          <motion.div
            className="notebook-shadow"
            aria-hidden="true"
            animate={{ opacity: hovered ? 0.95 : 0.6, scale: hovered ? 1.04 : 1 }}
            transition={SPRING}
          />
          <NotebookCover note={note} />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

export default function Carousel({
  notes,
  activeId,
  onSelect,
  onOpen,
  bookW,
  bookH,
  reduced,
  disabled = false,
}) {
  const count = notes.length
  const initialIndex = Math.max(0, notes.findIndex((note) => note.id === activeId))
  const progress = useMotionValue(initialIndex)
  const targetRef = useRef(initialIndex)
  const stageRef = useRef(null)
  const suppressClick = useRef(false)
  const wheelLock = useRef(0)

  const goTo = useCallback(
    (target, { select = true } = {}) => {
      if (!count) return
      const next = clamp(Math.round(target), 0, count - 1)
      targetRef.current = next
      animate(progress, next, reduced ? { duration: 0.2, ease: 'easeOut' } : SPRING)
      if (select && notes[next]) onSelect(notes[next].id)
    },
    [count, notes, onSelect, progress, reduced],
  )

  useEffect(() => {
    const index = notes.findIndex((note) => note.id === activeId)
    if (index === -1) return
    if (index !== targetRef.current) {
      targetRef.current = index
      animate(progress, index, reduced ? { duration: 0.2, ease: 'easeOut' } : SPRING)
    }
  }, [activeId, notes, progress, reduced])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const onWheel = (event) => {
      if (disabled || count < 2) return
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!delta) return
      event.preventDefault()
      const now = performance.now()
      if (now - wheelLock.current < 240) return
      wheelLock.current = now
      goTo(Math.round(progress.get()) + (delta > 0 ? 1 : -1))
    }

    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [count, disabled, goTo, progress])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (disabled) return
      const tag = event.target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(Math.round(progress.get()) + 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(Math.round(progress.get()) - 1)
      } else if (event.key === 'Enter' && activeId) {
        event.preventDefault()
        onOpen(activeId)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeId, disabled, goTo, onOpen, progress])

  const onPointerDown = (event) => {
    if (disabled || count < 2) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const gesture = {
      startX: event.clientX,
      startY: event.clientY,
      startProgress: progress.get(),
      lastX: event.clientX,
      lastTime: performance.now(),
      active: false,
      id: event.pointerId,
    }

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== gesture.id) return
      const dx = moveEvent.clientX - gesture.startX
      const dy = moveEvent.clientY - gesture.startY

      if (!gesture.active) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          cleanup()
          return
        }
        gesture.active = true
        suppressClick.current = true
        document.body.classList.add('is-dragging')
      }

      if (moveEvent.cancelable) moveEvent.preventDefault()

      const spacing = bookW * SPACING_RATIO
      const raw = gesture.startProgress - dx / spacing
      progress.set(rubberband(raw, 0, count - 1))

      const now = performance.now()
      if (now > gesture.lastTime) {
        gesture.velocity = (moveEvent.clientX - gesture.lastX) / (now - gesture.lastTime)
      }
      gesture.lastX = moveEvent.clientX
      gesture.lastTime = now
    }

    const up = (upEvent) => {
      if (upEvent.pointerId !== gesture.id) return
      cleanup()
      if (!gesture.active) return
      const spacing = bookW * SPACING_RATIO
      const velocity = gesture.velocity || 0
      const projected = progress.get() - (velocity * 0.16) / spacing
      goTo(projected)
      window.setTimeout(() => {
        suppressClick.current = false
      }, 120)
    }

    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      document.body.classList.remove('is-dragging')
    }

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return (
    <div
      className="carousel-stage"
      ref={stageRef}
      onPointerDown={onPointerDown}
      tabIndex={-1}
      role="group"
      aria-label="Notebook carousel"
    >
      <div className="carousel-floor" aria-hidden="true" />
      <AnimatePresence initial={false}>
        {notes.map((note, index) => (
          <CarouselItem
            key={note.id}
            note={note}
            index={index}
            progress={progress}
            bookW={bookW}
            bookH={bookH}
            reduced={reduced}
            active={note.id === activeId}
            onFocus={onSelect}
            onOpen={onOpen}
            suppressClick={suppressClick}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
