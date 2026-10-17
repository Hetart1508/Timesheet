import { useState } from 'react';

export default function FormField({ label, error, hint, type = 'text', ...props }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const id = props.id || props.name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const isPassword = type === 'password';
  return <label className="field" htmlFor={id}><span>{label}</span><span className={isPassword ? 'password-input' : undefined}><input {...props} id={id} type={isPassword && passwordVisible ? 'text' : type} aria-invalid={Boolean(error)} aria-describedby={describedBy} />{isPassword ? <button type="button" className="password-toggle" aria-label={`${passwordVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>{passwordVisible ? 'Hide' : 'Show'}</button> : null}</span>{error ? <small className="field-error" id={`${id}-error`}>{error}</small> : hint ? <small id={`${id}-hint`}>{hint}</small> : null}</label>;
}
