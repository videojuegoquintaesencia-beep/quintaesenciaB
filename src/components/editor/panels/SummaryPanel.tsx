'use client'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { QUANTITY_DISCOUNTS, getColor, getProduct, isSingleSize } from '@/config/products'
import { site } from '@/config/site'
import { cn } from '@/lib/cn'
import { useEditor } from '@/lib/editor/store'
import { formatEUR, formatNumber, unidades } from '@/lib/format'
import { totalQuantity } from '@/lib/pricing'
import { useLinePrice } from '../useLinePrice'
import { Group, PanelTitle, Stepper } from '../ui'

export const BLOCKER_ID = 'editor-cart-blocker'

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1', strong && 'text-lg font-extrabold', muted && 'text-ink-soft')}>
      <dt>{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  )
}

export function Quantities() {
  const productId = useEditor((s) => s.productId)
  const sizes = useEditor((s) => s.sizes)
  const product = getProduct(productId)
  if (!product) return null
  const total = totalQuantity(sizes)
  const remaining = product.maxQtyPerLine - total

  if (isSingleSize(product)) {
    const id = product.sizes[0].id
    return (
      <div>
        <Stepper
          label={product.namePlural.toLowerCase()}
          value={sizes[id] ?? 0}
          min={0}
          max={(sizes[id] ?? 0) + remaining}
          onChange={(n) => useEditor.getState().setQty(id, n)}
        />
        <p className="field-hint">Máximo {product.maxQtyPerLine} unidades por pedido. Para más, pídenos presupuesto.</p>
      </div>
    )
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2.5" aria-label="Unidades por talla">
        {product.sizes.map((size) => {
          const surcharge = product.sizeSurchargesCents?.[size.id]
          const q = sizes[size.id] ?? 0
          return (
            <li key={size.id} className="min-w-0">
              <span className="mb-1 block text-sm font-extrabold">
                {size.label}
                {surcharge ? <span className="font-semibold text-ink-soft"> +{formatEUR(surcharge)}</span> : null}
              </span>
              <Stepper
                compact
                label={`talla ${size.label}`}
                value={q}
                min={0}
                max={q + remaining}
                onChange={(n) => useEditor.getState().setQty(size.id, n)}
              />
            </li>
          )
        })}
      </ul>
      {product.sizeSurchargesCents && (
        <p className="field-hint">Las tallas con suplemento se suman por unidad.</p>
      )}
    </div>
  )
}

/** Resumen de precio y cantidades del panel derecho (escritorio) y de la pestaña Resumen (móvil). */
export function SummaryPanel() {
  const productId = useEditor((s) => s.productId)
  const colorId = useEditor((s) => s.design.colorId)
  const sizes = useEditor((s) => s.sizes)
  const price = useLinePrice()
  const product = getProduct(productId)
  const color = product ? getColor(product, colorId) : undefined
  if (!product) return null

  const qty = totalQuantity(sizes)
  const next = QUANTITY_DISCOUNTS.find((d) => d.minQty > qty)
  const sizeSurchargeLines = Object.entries(sizes)
    .filter(([id, q]) => q > 0 && product.sizeSurchargesCents?.[id])
    .map(([id, q]) => `${product.sizes.find((s) => s.id === id)?.label ?? id} ×${q}`)

  return (
    <div>
      <PanelTitle>Tu pedido</PanelTitle>
      <p className="-mt-2 mb-4 text-sm text-ink-soft">
        {product.name}{color ? ` · ${color.name}` : ''}
      </p>

      <Group title="Cantidad">
        <Quantities />
        <p className="mt-2.5 text-sm font-bold" aria-live="polite">
          {qty > 0 ? `Total: ${unidades(qty)}` : 'Elige al menos una unidad'}
        </p>
        {next && (
          <p className="mt-1 rounded-xl border-2 border-ink bg-yellow-soft p-2.5 text-sm font-bold">
            Con {next.minQty} unidades, {next.pct} % de descuento
            {qty > 0 ? ` (te faltan ${next.minQty - qty})` : ''}.
          </p>
        )}
        {qty >= site.b2b.quoteFromUnits && (
          <p className="mt-2 rounded-xl border-2 border-ink bg-violet-soft p-2.5 text-sm font-bold">
            ¿Pedido grande? Para empresas, equipos y eventos hacemos{' '}
            <Link href="/empresas" className="text-violet-deep underline">presupuestos a medida</Link>.
          </p>
        )}
      </Group>

      <Group title="Precio">
        {price.ok ? (
          <>
            <div className="rounded-2xl border-2 border-ink bg-paper px-3.5 py-2">
              <dl>
                <Row
                  label={`${product.name} × ${price.quantity}`}
                  value={formatEUR(product.basePriceCents * price.quantity)}
                />
                {!!color?.surchargeCents && (
                  <Row label={`Suplemento de color × ${price.quantity}`} value={formatEUR(color.surchargeCents * price.quantity)} />
                )}
                {price.prints.map((p) => (
                  <Row
                    key={p.areaId}
                    label={`Estampado «${p.label}» (${formatNumber(Math.round(p.usedCm2))} cm²) × ${price.quantity}`}
                    value={formatEUR(p.cents * price.quantity)}
                  />
                ))}
                {price.sizeSurchargeCents > 0 && (
                  <Row label={`Suplemento de talla (${sizeSurchargeLines.join(', ')})`} value={formatEUR(price.sizeSurchargeCents)} />
                )}
                {price.discountCents > 0 && (
                  <Row label={`Descuento por volumen (${price.discountPct} %)`} value={`−${formatEUR(price.discountCents)}`} />
                )}
              </dl>
              <div className="mt-1 border-t-2 border-ink pt-1">
                <dl>
                  <Row label="Total" value={formatEUR(price.totalCents)} strong />
                </dl>
                <p className="pb-1 text-xs text-ink-soft">IVA incluido · Envío no incluido</p>
              </div>
            </div>
            <p className="mt-2 text-sm font-bold">
              Precio medio: {formatEUR(price.avgUnitCents)} por unidad
            </p>
          </>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-ink bg-paper p-3.5 text-sm">
            <p className="font-bold">{formatEUR(product.basePriceCents)} la prenda sin estampar</p>
            <p className="mt-1 text-ink-soft">El estampado se suma según la superficie que ocupe tu diseño en cada zona.</p>
          </div>
        )}
      </Group>

    </div>
  )
}

/** Mensaje que explica por qué no se puede añadir todavía (enlazado con aria-describedby del botón). */
export function BlockerMessage({ message }: { message: string | null }) {
  return (
    <p id={BLOCKER_ID} role="status" className={cn('mt-2 text-sm font-bold text-pink-deep', !message && 'sr-only')}>
      {message ?? ''}
    </p>
  )
}

export function CartButton({
  label,
  blocked,
  working,
  onClick,
  block = true,
  size = 'lg',
}: {
  label: string
  blocked: boolean
  working: boolean
  onClick: () => void
  block?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <button
      type="button"
      className={cn('btn btn-primary', size === 'lg' && 'btn-lg', block && 'btn-block')}
      aria-disabled={blocked || working}
      aria-describedby={blocked ? BLOCKER_ID : undefined}
      onClick={() => {
        if (!blocked && !working) onClick()
      }}
    >
      <ShoppingCart aria-hidden="true" className="size-5" strokeWidth={2.5} />
      {label}
    </button>
  )
}
