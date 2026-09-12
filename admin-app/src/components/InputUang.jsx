import { formatInputAngka, parseAngka } from '../utils/format'

// Input angka dengan pemisah ribuan otomatis saat mengetik.
// Nilai yang dikirim ke onChange selalu angka murni (number).
export default function InputUang({ value, onChange, placeholder, id, error }) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className={error ? 'input input-error' : 'input'}
      placeholder={placeholder}
      value={value === '' || value === undefined || value === null ? '' : formatInputAngka(value)}
      onChange={(e) => onChange(parseAngka(e.target.value))}
    />
  )
}
