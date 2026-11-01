import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function withSafeLinks(html) {
  return html.replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer" ')
}

function clean(html) {
  return DOMPurify.sanitize(withSafeLinks(html), {
    ADD_ATTR: ['target', 'rel'],
  })
}

const DIVIDER = /^(?:📅\s+(.+)|---\s+(.+?)\s+---)$/

export function entryDivider(date = new Date()) {
  const label = date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  return `📅 ${label}`
}

export function countEntries(content = '') {
  return 1 + content.split('\n').filter((line) => DIVIDER.test(line.trim())).length
}

function tokenHtml(token) {
  if (token.type === 'paragraph') {
    const match = DIVIDER.exec(token.text.trim())
    if (match) return `<div class="entry-divider"><span>${escapeHtml(match[1] || match[2])}</span></div>`
  }
  return marked.parser([token])
}

export function parseBlocks(content) {
  if (!content || !content.trim()) return []

  try {
    const tokens = marked.lexer(content)
    return tokens
      .map((token, index) => ({
        key: `block-${index}`,
        html: clean(tokenHtml(token)),
      }))
      .filter((block) => block.html.trim())
  } catch {
    return [{ key: 'block-raw', html: clean(`<p>${escapeHtml(content)}</p>`) }]
  }
}

export function renderMarkdown(content) {
  if (!content || !content.trim()) return ''
  try {
    const tokens = marked.lexer(content)
    return clean(tokens.map(tokenHtml).join(''))
  } catch {
    return clean(`<p>${escapeHtml(content)}</p>`)
  }
}
