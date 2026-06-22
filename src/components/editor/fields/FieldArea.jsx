export function FieldArea({ label, value, onChange, placeholder, rows = 4, help, disabled = false }) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      {help && <p className="field__help">{help}</p>}
      <textarea
        className="textarea"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
    </div>
  );
}
