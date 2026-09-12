import InputUang from './InputUang'

// Repeater generik untuk array of object, field-nya ditentukan lewat
// prop `fields`: [{ key, label, type: 'text'|'textarea'|'uang'|'select', placeholder, options }]
export default function RepeaterObjek({ value = [], onChange, fields, objekKosong, tambahLabel = '+ Tambah' }) {
  const list = value || []

  const ubahField = (idx, key, isi) => {
    const baru = list.map((item, i) => (i === idx ? { ...item, [key]: isi } : item))
    onChange(baru)
  }

  const hapusBaris = (idx) => {
    onChange(list.filter((_, i) => i !== idx))
  }

  const tambahBaris = () => {
    onChange([...list, { ...objekKosong }])
  }

  return (
    <div className="repeater">
      {list.map((item, idx) => (
        <div className="repeater-kartu" key={idx}>
          {fields.map((f) => (
            <div key={f.key} className="repeater-field">
              <label>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  className="input"
                  rows={2}
                  value={item[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => ubahField(idx, f.key, e.target.value)}
                />
              ) : f.type === 'uang' ? (
                <InputUang value={item[f.key] ?? ''} onChange={(v) => ubahField(idx, f.key, v)} placeholder={f.placeholder} />
              ) : f.type === 'select' ? (
                <select className="input" value={item[f.key] ?? ''} onChange={(e) => ubahField(idx, f.key, e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={item[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => ubahField(idx, f.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <button type="button" className="btn-tautan btn-tautan-bahaya" onClick={() => hapusBaris(idx)}>
            Hapus baris ini
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-garis" onClick={tambahBaris} style={{ marginTop: 4 }}>
        {tambahLabel}
      </button>
    </div>
  )
}
