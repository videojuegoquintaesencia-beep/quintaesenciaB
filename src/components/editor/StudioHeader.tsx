'use client'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { site } from '@/config/site'
import { useSyncExternalStore } from 'react'
import { useCart } from '@/lib/cart-store'

/** Cabecera compacta del estudio de diseño: logo, vuelta a la tienda y carrito. */
export function StudioHeader() {
  // El carrito se lee de localStorage al crear el store, así que solo se muestra tras montar (sin desajustes de hidratación).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const units = useCart((s) => s.lines.reduce((n, l) => n + Object.values(l.sizes).reduce((a, b) => a + b, 0), 0))
  const count = mounted ? units : 0
  return (
    <header className="flex h-12 shrink-0 sm:h-14 items-center gap-2 border-b-2 border-ink bg-paper px-3 sm:gap-4 sm:px-5">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-xl font-display text-xl font-bold leading-none tracking-tight sm:text-2xl">
        {site.name}
      </Link>
      <Link
        href="/productos"
        className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold hover:bg-yellow-soft"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2.75} />
        <span>
          Volver<span className="max-sm:sr-only"> a la tienda</span>
        </span>
      </Link>
      <Link
        href="/carrito"
        aria-label={count > 0 ? `Carrito: ${count} ${count === 1 ? 'unidad' : 'unidades'}` : 'Carrito vacío'}
        className="relative inline-flex size-11 items-center justify-center rounded-full border-2 border-ink bg-yellow shadow-pop-sm transition-transform hover:-translate-y-0.5"
      >
        <ShoppingCart aria-hidden="true" className="size-5" strokeWidth={2.5} />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-ink bg-pink px-1 text-xs font-extrabold leading-5"
          >
            {count}
          </span>
        )}
      </Link>
    </header>
  )
}
