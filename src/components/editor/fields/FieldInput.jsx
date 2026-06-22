export function FieldInput({ label, value, onChange, placeholder, type = "text", disabled = false }) {
  return (
    <div className="field">
      <label className="field__label">{label}</label>
      <input
        type={type}
        className="input"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
