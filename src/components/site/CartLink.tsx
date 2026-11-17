'use client'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { unidades } from '@/lib/format'
import { useMounted } from './useMounted'

/**
 * Unidades totales del carrito (0 en servidor y durante la hidratación).
 * No usa `useCartCount` porque su indicador `hydrated` nunca llega a ser true: el carrito se lee de
 * localStorage al crear el store y el `setState` de `onRehydrateStorage` se ejecuta antes de que exista `useCart`.
 */
function useCartUnits(): number {
  const mounted = useMounted()
  const lines = useCart((s) => s.lines)
  if (!mounted) return 0
  return lines.reduce((total, line) => total + Object.values(line.sizes).reduce((a, b) => a + b, 0), 0)
}

/** Enlace al carrito con el número de unidades (oculto con el carrito vacío). */
export function CartLink() {
  const count = useCartUnits()

  return (
    <Link
      href="/carrito"
      className="relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border-2 border-ink bg-paper px-2.5 text-ink transition-colors hover:bg-yellow-soft xl:px-4"
    >
      <ShoppingBag aria-hidden="true" size={22} strokeWidth={2.3} />
      <span className="hidden font-display font-semibold xl:inline" aria-hidden="true">
        Carrito
      </span>
      {/* Nombre accesible por contenido (no por aria-label) para que incluya siempre el texto visible. */}
      <span className="sr-only">Carrito{count > 0 ? `, ${unidades(count)}` : ', vacío'}</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-2 -top-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-ink bg-pink px-1 text-xs font-extrabold leading-none text-ink"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
