import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface FieldShellProps {
  label: ReactNode
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
}

function ids(base: string, error?: string, hint?: ReactNode) {
  return {
    describedBy: [hint ? `${base}-hint` : null, error ? `${base}-error` : null].filter(Boolean).join(' ') || undefined,
  }
}

/** Campo de texto con etiqueta, ayuda y error accesibles. */
export function TextField({
  label,
  error,
  hint,
  className,
  required,
  id,
  ...input
}: FieldShellProps & Omit<ComponentProps<'input'>, 'className'>) {
  const auto = useId()
  const base = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={base} className="label">
        {label}
        {required && <span aria-hidden="true" className="text-pink-deep"> *</span>}
      </label>
      <input
        id={base}
        className="input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids(base, error, hint).describedBy}
        {...input}
      />
      {hint && !error && <p id={`${base}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${base}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  )
}

export function TextAreaField({
  label,
  error,
  hint,
  className,
  required,
  id,
  ...input
}: FieldShellProps & Omit<ComponentProps<'textarea'>, 'className'>) {
  const auto = useId()
  const base = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={base} className="label">
        {label}
        {required && <span aria-hidden="true" className="text-pink-deep"> *</span>}
      </label>
      <textarea
        id={base}
        className="textarea"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids(base, error, hint).describedBy}
        {...input}
      />
      {hint && !error && <p id={`${base}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${base}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  )
}

export function SelectField({
  label,
  error,
  hint,
  className,
  required,
  id,
  children,
  ...input
}: FieldShellProps & Omit<ComponentProps<'select'>, 'className'>) {
  const auto = useId()
  const base = id ?? auto
  return (
    <div className={className}>
      <label htmlFor={base} className="label">
        {label}
        {required && <span aria-hidden="true" className="text-pink-deep"> *</span>}
      </label>
      <select
        id={base}
        className={cn('select')}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids(base, error, hint).describedBy}
        {...input}
      >
        {children}
      </select>
      {hint && !error && <p id={`${base}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${base}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  )
}
