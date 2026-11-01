const IMAGE_LINE = /^[ \t]*!\[([^\]]*)\]\(([^)\s]+)\)[ \t]*$/gm

// Split note content into runs of text and standalone image lines, so the editor
// can draw the picture in place instead of showing its Markdown.
export function splitImageSegments(content = '') {
  const segments = []
  const lastIndex = IMAGE_LINE.lastIndex
  IMAGE_LINE.lastIndex = 0
  let cursor = 0
  let match

  while ((match = IMAGE_LINE.exec(content))) {
    if (match.index > cursor) {
      segments.push({ type: 'text', start: cursor, end: match.index, text: content.slice(cursor, match.index) })
    }
    segments.push({
      type: 'image',
      start: match.index,
      end: match.index + match[0].length,
      alt: match[1],
      url: match[2],
    })
    cursor = match.index + match[0].length
  }

  IMAGE_LINE.lastIndex = lastIndex

  if (cursor < content.length) {
    segments.push({ type: 'text', start: cursor, end: content.length, text: content.slice(cursor) })
  } else if (segments[segments.length - 1]?.type !== 'text') {
    // Always leave a place to type after a trailing image.
    segments.push({ type: 'text', start: cursor, end: cursor, text: '' })
  }

  return segments.map((segment) => ({ ...segment, key: `${segment.type}-${segment.start}` }))
}
