'use client'
import Link from 'next/link'
import { useEffect, useRef, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { site } from '@/config/site'

/** Campo trampa anti-bots: invisible y fuera del orden de tabulación; si llega relleno, la API descarta el envío. */
export function Honeypot({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label>
        No rellenes este campo
        <input
          type="text"
          name="website"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
    </div>
  )
}

/** Casilla de consentimiento con enlace a la política de privacidad. */
export function ConsentField({
  id,
  checked,
  error,
  onChange,
  purpose,
}: {
  id: string
  checked: boolean
  error?: string
  onChange: (checked: boolean) => void
  purpose: string
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-1 size-5 shrink-0 cursor-pointer accent-pink aria-[invalid=true]:outline aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-danger"
        />
        <span className="text-[0.95rem]">
          He leído la{' '}
          <Link href="/legal/privacidad" target="_blank" rel="noopener" className="font-bold text-violet-deep underline">
            política de privacidad
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </Link>{' '}
          y acepto que {site.name} trate mis datos para {purpose}.<span aria-hidden="true" className="text-pink-deep"> *</span>
        </span>
      </label>
      {error && (
        <p id={`${id}-error`} className="field-error ml-8" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Mensaje de error general del formulario (fallo de red, límite de envíos, error del servidor). */
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border-2 border-ink bg-danger-soft p-4 font-bold">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

/** Botón de envío con estado de carga. */
export function SubmitButton({ submitting, children }: { submitting: boolean; children: ReactNode }) {
  return (
    <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
      {submitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Send aria-hidden="true" className="size-5" />}
      {submitting ? 'Enviando…' : children}
    </Button>
  )
}

/** Pantalla de éxito: recibe el foco al aparecer para que lectores de pantalla y teclado la encuentren. */
export function FormSuccess({
  title,
  number,
  resetLabel,
  onReset,
  children,
}: {
  title: string
  number: string
  resetLabel: string
  onReset: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <div ref={ref} tabIndex={-1} role="status" className="card bg-teal-soft p-6 text-center outline-none sm:p-10">
      <span aria-hidden="true" className="mx-auto flex size-16 items-center justify-center rounded-full border-2 border-ink bg-yellow shadow-pop">
        <CircleCheck className="size-8" strokeWidth={2.4} />
      </span>
      <h2 className="mt-5 text-3xl sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-lg">{children}</p>
      <p className="mt-5">
        <span className="sr-only">Tu número de referencia es </span>
        <span aria-hidden="true" className="text-sm font-bold text-ink-soft">Referencia </span>
        <span className="sticker ml-1 bg-paper text-xl">{number}</span>
      </p>
      <div className="mt-7">
        <Button variant="secondary" onClick={onReset}>
          {resetLabel}
        </Button>
      </div>
    </div>
  )
}
