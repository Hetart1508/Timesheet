export default function FormField({ label, error, hint, ...props }) {
  const id = props.id || props.name;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return <label className="field" htmlFor={id}><span>{label}</span><input {...props} id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} />{error ? <small className="field-error" id={`${id}-error`}>{error}</small> : hint ? <small id={`${id}-hint`}>{hint}</small> : null}</label>;
}
