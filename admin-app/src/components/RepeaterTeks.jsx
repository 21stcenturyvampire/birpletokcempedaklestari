// Repeater sederhana untuk array of string, mis. ["Jahe", "Serai", ...]
export default function RepeaterTeks({ value = [], onChange, placeholder }) {
  const list = value || []

  const ubahBaris = (idx, teks) => {
    const baru = [...list]
    baru[idx] = teks
    onChange(baru)
  }

  const hapusBaris = (idx) => {
    onChange(list.filter((_, i) => i !== idx))
  }

  const tambahBaris = () => {
    onChange([...list, ''])
  }

  return (
    <div className="repeater">
      {list.map((teks, idx) => (
        <div className="repeater-baris" key={idx}>
          <input
            className="input"
            value={teks}
            placeholder={placeholder}
            onChange={(e) => ubahBaris(idx, e.target.value)}
          />
          <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => hapusBaris(idx)}>
            Hapus
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-garis" onClick={tambahBaris} style={{ marginTop: 8 }}>
        + Tambah
      </button>
    </div>
  )
}
