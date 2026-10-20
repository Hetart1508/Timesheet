import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FormField({ label, error, hint, type = 'text', ...props }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const id = props.id || props.name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const isPassword = type === 'password';
  const visibilityLabel = `${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`;
  return <label className="field" htmlFor={id}><span>{label}</span><span className={isPassword ? 'password-input' : undefined}><input {...props} id={id} type={isPassword && passwordVisible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={describedBy} />{isPassword ? <button type="button" className="password-toggle" aria-label={visibilityLabel} title={visibilityLabel} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}</button> : null}</span>{error ? <small className="field-error" id={`${id}-error`}>{error}</small> : hint ? <small id={`${id}-hint`}>{hint}</small> : null}</label>;
}
