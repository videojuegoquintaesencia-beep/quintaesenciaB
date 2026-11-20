'use client'
import { useCallback, useState, type FormEvent } from 'react'
import type { ZodType } from 'zod'
import { writeToUs } from '@/lib/contact-text'
import { fieldErrors } from '@/lib/validators'

export type FieldErrors = Record<string, string>
export type IntakeStatus = 'idle' | 'submitting' | 'success'

interface ApiResult {
  ok?: boolean
  number?: string
  error?: string
  errors?: FieldErrors
}

/**
 * Estado y envío de un formulario que valida con zod en el navegador y publica JSON en una ruta de API.
 * Los campos con error se enlazan por id: `${idPrefix}-${campo}` (el primero recibe el foco).
 */
export function useIntakeForm<V extends object>({
  endpoint,
  idPrefix,
  initial,
  schema,
  toInput,
  preflight,
  contactEmail,
}: {
  endpoint: string
  idPrefix: string
  initial: V
  schema: ZodType
  /** Convierte los valores del formulario en el cuerpo que valida el esquema y recibe la API. */
  toInput: (values: V) => unknown
  /** Comprobación previa al envío (p. ej. subidas en curso): devuelve un mensaje para impedirlo. */
  preflight?: () => string | null
  /** Email de contacto efectivo (ajustes del panel), para el mensaje de fallo de conexión. */
  contactEmail: string
}) {
  const [values, setValues] = useState<V>(initial)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [status, setStatus] = useState<IntakeStatus>('idle')
  const [number, setNumber] = useState<string | null>(null)

  const setValue = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key as string]
      return next
    })
  }, [])

  const focusFirst = (errs: FieldErrors) => {
    const first = Object.keys(errs)[0]
    if (first) requestAnimationFrame(() => document.getElementById(`${idPrefix}-${first}`)?.focus())
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (status === 'submitting') return
    setFormError(null)

    // El campo trampa no se valida aquí: si un bot lo rellena, la API lo descarta en silencio y le responde "ok".
    const input = toInput(values)
    const parsed = schema.safeParse({ ...(input as object), website: '' })
    if (!parsed.success) {
      const errs = fieldErrors(parsed.error)
      setErrors(errs)
      focusFirst(errs)
      return
    }
    setErrors({})
    const blocked = preflight?.()
    if (blocked) {
      setFormError(blocked)
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = (await res.json().catch(() => null)) as ApiResult | null
      if (res.ok && data?.ok && data.number) {
        setNumber(data.number)
        setStatus('success')
        return
      }
      if (data?.errors && Object.keys(data.errors).length > 0) {
        setErrors(data.errors)
        focusFirst(data.errors)
      }
      setFormError(data?.error ?? 'No hemos podido enviar el formulario. Inténtalo de nuevo en unos minutos.')
    } catch {
      setFormError(`No hemos podido conectar. Comprueba tu conexión e inténtalo de nuevo, o ${writeToUs(contactEmail)}.`)
    }
    setStatus('idle')
  }

  const reset = useCallback(() => {
    setValues(initial)
    setErrors({})
    setFormError(null)
    setNumber(null)
    setStatus('idle')
  }, [initial])

  return { values, setValue, errors, formError, status, number, submit, reset }
}
