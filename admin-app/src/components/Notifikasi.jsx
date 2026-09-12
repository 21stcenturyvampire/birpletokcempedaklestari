export default function Notifikasi({ tipe = 'info', pesan, onClose }) {
  if (!pesan) return null
  return (
    <div className={`notif notif-${tipe}`}>
      <span>{pesan}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Tutup notifikasi">
          ×
        </button>
      )}
    </div>
  )
}
