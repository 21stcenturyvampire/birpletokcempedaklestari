import Modal from './Modal'

export default function ConfirmDialog({ judul = 'Konfirmasi', pesan, onBatal, onKonfirmasi, sedangProses }) {
  return (
    <Modal title={judul} onClose={onBatal} lebar={400}>
      <p style={{ marginTop: 0 }}>{pesan}</p>
      <div className="form-aksi">
        <button type="button" className="btn btn-garis" onClick={onBatal} disabled={sedangProses}>
          Batal
        </button>
        <button type="button" className="btn btn-bahaya" onClick={onKonfirmasi} disabled={sedangProses}>
          {sedangProses ? 'Memproses...' : 'Ya, lanjutkan'}
        </button>
      </div>
    </Modal>
  )
}
