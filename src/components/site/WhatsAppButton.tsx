'use client'
import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { isActivePath } from './nav'

/** Rutas donde el botón flotante taparía elementos clave (resumen de compra, pago). */
const HIDDEN_ON = ['/checkout', '/carrito']

/** Botón flotante de WhatsApp. `href` ya llega construido desde el servidor. */
export function WhatsAppButton({ href }: { href: string }) {
  const pathname = usePathname()
  if (HIDDEN_ON.some((path) => isActivePath(pathname, path))) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-teal text-ink shadow-pop transition-transform hover:-translate-x-px hover:-translate-y-px sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <MessageCircle aria-hidden="true" size={26} strokeWidth={2.4} />
      <span className="sr-only">Escríbenos por WhatsApp (se abre en una pestaña nueva)</span>
    </a>
  )
}
