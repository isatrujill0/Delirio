import { useId, type ReactNode } from 'react';

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p className="field-error" id={msgId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={msgId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string; disabled?: boolean }) {
  return (
    <button className="toggle-row" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="toggle-text">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </span>
      <span className={`switch ${checked ? 'on' : ''}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
