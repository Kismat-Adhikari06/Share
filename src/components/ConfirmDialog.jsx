import Modal from './Modal.jsx'

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title" panelClassName="confirm-panel">
      <p className="eyebrow">Delete notebook</p>
      <h2 id="confirm-title">Delete “{title}”?</h2>
      <p className="muted">{description}</p>
      <div className="modal-actions">
        <button type="button" className="text-button" onClick={onCancel} data-autofocus>
          Keep it
        </button>
        <button type="button" className="danger-button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
