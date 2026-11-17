'use client'
import { Pencil, Trash, TriangleExclamationPoint } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useCart } from '@/lib/cart-store'
import { formatEUR, unidades } from '@/lib/format'
import { LineThumb } from './LineThumb'
import { SizeSteppers } from './SizeSteppers'
import { editHref, lineTitle, primaryPreviewId } from './line-utils'
import type { PricedLine } from './lines'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between gap-3 border-t-2 border-ink/15 pt-2 font-extrabold' : 'flex justify-between gap-3'}>
      <dt className={strong ? '' : 'text-ink-soft'}>{label}</dt>
      <dd className="whitespace-nowrap">{value}</dd>
    </div>
  )
}

function Breakdown({ priced }: { priced: PricedLine }) {
  const { price } = priced
  if (!price) return null
  const unit = (cents: number) => `${formatEUR(cents)} × ${price.quantity}`
  // El precio unitario base ya incluye el suplemento del color (p. ej. el interior de color de las tazas): se muestra aparte.
  const surchargeCents = priced.product ? price.unitBaseCents - priced.product.basePriceCents : 0
  return (
    <dl className="space-y-1 rounded-2xl bg-cream p-3 text-sm" aria-label="Desglose del precio">
      <Row label={priced.product?.name ?? 'Producto'} value={unit(priced.product?.basePriceCents ?? price.unitBaseCents)} />
      {surchargeCents > 0 && <Row label={`Suplemento de color${priced.color ? ` · ${priced.color.name}` : ''}`} value={unit(surchargeCents)} />}
      {price.prints.map((p) => (
        <Row key={p.areaId} label={`Estampado · ${p.label}`} value={unit(p.cents)} />
      ))}
      {price.sizeSurchargeCents > 0 && <Row label="Suplemento de talla" value={formatEUR(price.sizeSurchargeCents)} />}
      {price.discountCents > 0 && (
        <Row label={`Descuento por cantidad (${price.discountPct}\u00a0%)`} value={`−${formatEUR(price.discountCents)}`} />
      )}
      <Row label={`Total de la línea · ${unidades(price.quantity)}`} value={formatEUR(price.totalCents)} strong />
    </dl>
  )
}

export function CartLineCard({ priced, expired }: { priced: PricedLine; expired?: boolean }) {
  const { line, product, price } = priced
  const setSizes = useCart((s) => s.setSizes)
  const removeLine = useCart((s) => s.removeLine)
  const [previewMissing, setPreviewMissing] = useState(false)
  const title = lineTitle(priced)
  const problem =
    priced.error ?? (expired || previewMissing ? 'Los archivos de este diseño han caducado. Ábrelo en el editor para rehacerlo.' : null)

  return (
    <li className="card p-4 sm:p-5">
      <div className="flex gap-4">
        <LineThumb
          fileId={primaryPreviewId(line)}
          alt={`Vista previa de tu diseño: ${title}`}
          size={256}
          className="h-20 w-20 sm:h-32 sm:w-32"
          onMissing={() => setPreviewMissing(true)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl leading-tight">{product?.name ?? line.productId}</h2>
              <p className="mt-1 flex items-center gap-2 text-ink-soft">
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-ink"
                  style={{ background: priced.color?.hex ?? '#fff' }}
                />
                {priced.color?.name ?? line.colorId}
              </p>
            </div>
            <p className="shrink-0 font-display text-xl font-semibold">
              <span className="sr-only">Importe de la línea: </span>
              {price ? formatEUR(price.totalCents) : '—'}
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={editHref(line)} className="btn btn-sm">
              <Pencil size={16} aria-hidden="true" />
              Editar diseño
              <span className="sr-only">: {title}</span>
            </Link>
            <button type="button" className="btn btn-sm" onClick={() => removeLine(line.id)}>
              <Trash size={16} aria-hidden="true" />
              Quitar
              <span className="sr-only">: {title}</span>
            </button>
          </div>
        </div>
      </div>

      {problem && (
        <p role="alert" className="mt-4 flex gap-2 rounded-2xl border-2 border-ink bg-danger-soft p-3 text-sm font-bold">
          <TriangleExclamationPoint size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {problem}{' '}
            <Link href={editHref(line)} className="underline">
              Rehacer en el editor
            </Link>
          </span>
        </p>
      )}

      {product && (
        <fieldset className="mt-4 min-w-0 border-0 p-0">
          <legend className="label">{product.sizes.length === 1 ? 'Cantidad' : 'Unidades por talla'}</legend>
          <SizeSteppers product={product} sizes={line.sizes} onChange={(next) => setSizes(line.id, next)} />
        </fieldset>
      )}

      {price && (
        <div className="mt-4">
          <Breakdown priced={priced} />
        </div>
      )}
      {line.note && <p className="mt-3 text-sm text-ink-soft">Tu nota: {line.note}</p>}
    </li>
  )
}
