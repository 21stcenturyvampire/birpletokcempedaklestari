export default function Modal({ title, onClose, children, lebar = 480 }) {
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: lebar }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
