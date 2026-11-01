import { coverFor, estimatePages, titleFor } from '../lib/notebooks.js'

export default function NotebookCover({ note, className = '' }) {
  const palette = coverFor(note)
  const title = titleFor(note)
  const pages = estimatePages(note.content)

  return (
    <div
      className={`notebook-cover ${className}`.trim()}
      style={{
        '--cover': palette.cover,
        '--spine': palette.spine,
        '--board': palette.board,
        '--ink': palette.ink,
      }}
    >
      <div className="cover-block" aria-hidden="true" />
      <div className="cover-face">
        <div className="cover-spine" aria-hidden="true">
          <span className="cover-hinge" />
        </div>
        <div className="cover-inner">
          <span className="cover-rule" aria-hidden="true" />
          <h3 className="cover-title">{title}</h3>
          <span className="cover-pages">
            {pages ? `${pages} ${pages === 1 ? 'page' : 'pages'}` : 'New notebook'}
          </span>
        </div>
        <span className="cover-brand" aria-hidden="true">
          ShareIdeas
        </span>
      </div>
    </div>
  )
}
