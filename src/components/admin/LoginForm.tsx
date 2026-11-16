'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { postJson } from '@/lib/admin/client'

export function LoginForm() {
  const router = useRouter()
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Se enfoca tras hidratar: `autoFocus` en el HTML del servidor provoca un aviso de hidratación en Next.
  useEffect(() => inputRef.current?.focus(), [])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await postJson('/api/admin/login', { password })
    if (result.ok) {
      router.replace('/admin')
      router.refresh()
      return
    }
    setError(result.status === 401 ? 'Contraseña incorrecta. Revísala e inténtalo de nuevo.' : result.error)
    setBusy(false)
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <label htmlFor={fieldId} className="label">
          Contraseña del panel
        </label>
        <div className="relative">
          <input
            id={fieldId}
            name="password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            ref={inputRef}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className="input pr-14"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-ink-soft hover:text-ink"
          >
            {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
          </button>
        </div>
        {error && (
          <p id={`${fieldId}-error`} role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" block disabled={busy || password.length === 0} aria-busy={busy}>
        <Lock size={18} aria-hidden="true" />
        {busy ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
