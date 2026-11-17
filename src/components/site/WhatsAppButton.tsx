'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { isActivePath } from './nav'

/** Rutas donde el botón flotante taparía elementos clave (resumen de compra, pago, importes del pedido). */
const HIDDEN_ON = ['/checkout', '/carrito', '/pedido']

/** Al bajar la página se esconde (tapa contenido del borde derecho) y reaparece al subir, arriba del todo o junto al pie. */
function useVisibleOnScrollUp(): boolean {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      const delta = y - lastY.current
      const nearTop = y < 160
      const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 160
      if (nearTop || nearBottom || delta < -8) setVisible(true)
      else if (delta > 8) setVisible(false)
      if (Math.abs(delta) > 8 || nearTop || nearBottom) lastY.current = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return visible
}

/** Botón flotante de WhatsApp. `href` ya llega construido desde el servidor. */
export function WhatsAppButton({ href }: { href: string }) {
  const pathname = usePathname()
  const scrollVisible = useVisibleOnScrollUp()
  const [focused, setFocused] = useState(false)
  if (HIDDEN_ON.some((path) => isActivePath(pathname, path))) return null
  const visible = scrollVisible || focused

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      inert={!visible}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={cn(
        'fixed bottom-4 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-teal text-ink shadow-pop transition-[opacity,translate] duration-200 hover:-translate-x-px hover:-translate-y-px motion-reduce:transition-none sm:bottom-6 sm:right-6 sm:h-14 sm:w-14',
        !visible && 'pointer-events-none translate-y-6 opacity-0',
      )}
    >
      <MessageCircle aria-hidden="true" size={26} strokeWidth={2.4} />
      <span className="sr-only">Escríbenos por WhatsApp (se abre en una pestaña nueva)</span>
    </a>
  )
}
