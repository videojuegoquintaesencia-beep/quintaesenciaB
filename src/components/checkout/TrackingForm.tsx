'use client'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { isValidEmail } from '@/lib/validators'
import { postJson } from './api'

export function TrackingForm() {
  const router = useRouter()
  const [number, setNumber] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ number?: string; email?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const found: typeof errors = {}
    if (!/^\s*(?:pu[-\s]?)?\d{4,9}\s*$/i.test(number)) found.number = 'Escribe el número de pedido, por ejemplo PU-1042.'
    if (!isValidEmail(email.trim().toLowerCase())) found.email = 'Introduce el email que usaste al comprar.'
    setErrors(found)
    setFormError(null)
    if (found.number || found.email) return

    setBusy(true)
    const res = await postJson<{ url: string }>('/api/orders/lookup', { number, email })
    if (res.ok) {
      router.push(res.data.url)
      return
    }
    setBusy(false)
    setFormError(res.failure.message)
  }

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5 sm:p-6" aria-label="Buscar mi pedido">
      <TextField
        label="Número de pedido"
        name="order-number"
        placeholder="PU-1042"
        autoComplete="off"
        required
        value={number}
        error={errors.number}
        hint="Lo tienes en el email de confirmación."
        onChange={(e) => setNumber(e.target.value)}
      />
      <TextField
        label="Email del pedido"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        error={errors.email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {formError && (
        <p role="alert" className="rounded-2xl border-2 border-ink bg-danger-soft p-3 font-bold">
          {formError}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" block disabled={busy}>
        {busy ? 'Buscando…' : 'Ver mi pedido'}
      </Button>
    </form>
  )
}
