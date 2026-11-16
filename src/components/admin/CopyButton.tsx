'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Contextos sin Clipboard API (http en red local, navegadores antiguos): selección + execCommand.
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

/** Botón que copia un texto al portapapeles y lo confirma de forma visible y para lectores de pantalla. */
export function CopyButton({
  text,
  label = 'Copiar',
  className,
}: {
  text: string
  label?: string
  className?: string
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    const ok = await copyToClipboard(text)
    setState(ok ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2500)
  }

  return (
    <>
      <button type="button" onClick={copy} className={cn('btn btn-sm', className)}>
        {state === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {state === 'copied' ? 'Copiado' : label}
      </button>
      <span role="status" className="sr-only">
        {state === 'copied' ? 'Copiado al portapapeles' : state === 'failed' ? 'No se pudo copiar' : ''}
      </span>
      {state === 'failed' && <span className="text-sm font-bold text-danger">No se pudo copiar; selecciona el texto a mano.</span>}
    </>
  )
}
