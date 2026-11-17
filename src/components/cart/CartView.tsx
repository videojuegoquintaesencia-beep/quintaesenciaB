'use client'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { ButtonLink } from '@/components/ui/Button'
import { CartLineCard } from './CartLineCard'
import { CartSummary } from './CartSummary'
import { usePricedLines } from './lines'
import { useCartHydrated } from './useCartHydrated'

function CartSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]" aria-busy="true" aria-label="Cargando tu carrito">
      {/* Altura parecida a la del carrito vacío (el caso más habitual): al cargar no se desplaza el pie de página. */}
      <div className="card h-[19rem] animate-pulse bg-cream" />
      <div className="card hidden h-[19rem] animate-pulse bg-cream lg:block" />
    </div>
  )
}

export function EmptyCart() {
  return (
    <div className="card mx-auto mt-8 max-w-xl bg-pink-soft p-8 text-center sm:p-10">
      <ShoppingBag size={44} className="mx-auto" aria-hidden="true" />
      <h2 className="mt-4 text-2xl">Tu carrito está vacío</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">
        Elige un producto, diséñalo a tu gusto y aparecerá aquí listo para pedir.
      </p>
      <ButtonLink href="/productos" variant="primary" size="lg" className="mt-6">
        Ver productos
      </ButtonLink>
    </div>
  )
}

export function CartView() {
  const lines = useCart((s) => s.lines)
  const hydrated = useCartHydrated()
  const priced = usePricedLines(lines)

  if (!hydrated) return <CartSkeleton />
  if (lines.length === 0) return <EmptyCart />

  const units = priced.reduce((n, p) => n + p.units, 0)
  const blocked = priced.some((p) => p.error !== null)
  const lineTotals = priced.map((p) => p.price?.totalCents ?? 0)

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <ul className="space-y-5" aria-label="Productos de tu carrito">
        {priced.map((p) => (
          <CartLineCard key={p.line.id} priced={p} />
        ))}
      </ul>
      <CartSummary lineTotals={lineTotals} units={units} blocked={blocked} />
    </div>
  )
}
