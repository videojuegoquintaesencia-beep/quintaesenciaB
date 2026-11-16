import Link from 'next/link'
import { QUANTITY_DISCOUNTS, getArea, type PrintArea, type PrintTier, type Product } from '@/config/products'
import { site } from '@/config/site'
import { formatEUR, formatNumber, unidades } from '@/lib/format'
import { quantityDiscountPct } from '@/lib/pricing'
import { sizeLabel } from './appearance'

function tierRows(tiers: PrintTier[], area?: PrintArea) {
  return tiers.map((tier) => {
    const side = Math.round(Math.sqrt(tier.upToCm2))
    const wholeArea = area && Math.abs(area.widthCm * area.heightCm - tier.upToCm2) < 1
    return {
      key: tier.upToCm2,
      label: `Hasta ${formatNumber(tier.upToCm2)} cm²`,
      hint: wholeArea ? `toda la zona (${sizeLabel(area.widthCm, area.heightCm)})` : `como un cuadrado de ${side} × ${side} cm`,
      cents: tier.cents,
    }
  })
}

function unitsRange(index: number): string {
  const current = QUANTITY_DISCOUNTS[index]
  const next = QUANTITY_DISCOUNTS[index + 1]
  if (!next) return `${current.minQty} unidades o más`
  if (next.minQty - 1 === current.minQty) return unidades(current.minQty)
  return `${current.minQty} a ${next.minQty - 1} unidades`
}

/** Ejemplo con cifras reales: la primera zona del producto, su segundo escalón y 10 unidades. */
function workedExample(product: Product) {
  const [zoneId, tiers] = Object.entries(product.printTiers)[0] ?? []
  const area = zoneId ? getArea(product, zoneId) : undefined
  const tier = tiers?.[Math.min(1, tiers.length - 1)]
  if (!area || !tier) return null
  const qty = 10
  const unitCents = product.basePriceCents + tier.cents
  const pct = quantityDiscountPct(qty)
  const grossCents = unitCents * qty
  const totalCents = grossCents - Math.round((grossCents * pct) / 100)
  return { area, tier, qty, unitCents, pct, grossCents, totalCents }
}

export function ProductPricing({ product }: { product: Product }) {
  const zones = Object.entries(product.printTiers).map(([id, tiers]) => ({ id, tiers, area: getArea(product, id) }))
  const cheapestPrint = Math.min(...zones.map((z) => z.tiers[0]?.cents ?? 0))
  const maxDiscount = Math.max(...QUANTITY_DISCOUNTS.map((d) => d.pct))
  const example = workedExample(product)
  const surcharges = [
    ...Object.entries(product.sizeSurchargesCents ?? {}).map(([size, cents]) => `Talla ${size}: +${formatEUR(cents)} por unidad`),
    ...product.colors.filter((c) => c.surchargeCents).map((c) => `${c.name}: +${formatEUR(c.surchargeCents ?? 0)} por unidad`),
  ]

  return (
    <div>
      <ol className="grid gap-4 md:grid-cols-3">
        <li className="card-flat bg-pink-soft p-5">
          <p className="font-display text-sm font-semibold uppercase tracking-wide">El producto</p>
          <p className="mt-2 font-display text-3xl font-bold">{formatEUR(product.basePriceCents)}</p>
          <p className="mt-1 text-ink-soft">{product.name} sin estampar, por unidad.</p>
        </li>
        <li className="card-flat bg-yellow-soft p-5">
          <p className="font-display text-sm font-semibold uppercase tracking-wide">+ El estampado</p>
          <p className="mt-2 font-display text-3xl font-bold">desde {formatEUR(cheapestPrint)}</p>
          <p className="mt-1 text-ink-soft">por cada zona que estampes, según el espacio que ocupe tu diseño.</p>
        </li>
        <li className="card-flat bg-teal-soft p-5">
          <p className="font-display text-sm font-semibold uppercase tracking-wide">− El descuento</p>
          <p className="mt-2 font-display text-3xl font-bold">hasta {maxDiscount} %</p>
          <p className="mt-1 text-ink-soft">si pides varias unidades iguales.</p>
        </li>
      </ol>

      <h3 className="mt-10 text-2xl">Estampado por zona</h3>
      <p className="mt-2 max-w-3xl text-ink-soft">
        Lo que cuenta es la superficie del rectángulo más pequeño que envuelve tu diseño dentro de cada zona, no el tamaño máximo de
        la zona. Las medidas «como un cuadrado» son orientativas.
      </p>
      <div className="mt-5 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {zones.map(({ id, tiers, area }) => (
          <div key={id} className="card-flat overflow-hidden">
            <table className="w-full text-left">
              <caption className="border-b-2 border-ink bg-violet-soft px-4 py-3 text-left">
                <span className="block font-display text-xl font-semibold">{area?.label ?? id}</span>
                {area && <span className="text-sm text-ink-soft">Hasta {sizeLabel(area.widthCm, area.heightCm)}</span>}
              </caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Superficie del diseño</th>
                  <th scope="col">Precio por unidad</th>
                </tr>
              </thead>
              <tbody>
                {tierRows(tiers, area).map((row) => (
                  <tr key={row.key} className="border-b border-ink/15 last:border-0">
                    <th scope="row" className="px-4 py-2.5 font-bold">
                      {row.label}
                      <span className="block text-sm font-normal text-ink-soft">{row.hint}</span>
                    </th>
                    <td className="px-4 py-2.5 text-right font-display text-lg font-semibold">{formatEUR(row.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <h3 className="mt-10 text-2xl">Descuento por volumen</h3>
      <p className="mt-2 max-w-3xl text-ink-soft">
        Se aplica al importe de cada línea de tu pedido (mismo producto, color y diseño) según las unidades que sumes entre todas las
        tallas. Desde {site.b2b.quoteFromUnits} unidades te recomendamos{' '}
        <Link href="/empresas" className="font-bold text-violet-deep underline underline-offset-4">
          pedir un presupuesto
        </Link>
        .
      </p>
      <div className="card-flat mt-5 max-w-xl overflow-hidden">
        <table className="w-full text-left">
          <caption className="sr-only">Descuento según el número de unidades</caption>
          <thead className="border-b-2 border-ink bg-yellow-soft">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-display font-semibold">Unidades</th>
              <th scope="col" className="px-4 py-2.5 text-right font-display font-semibold">Descuento</th>
            </tr>
          </thead>
          <tbody>
            {QUANTITY_DISCOUNTS.map((d, i) => (
              <tr key={d.minQty} className="border-b border-ink/15 last:border-0">
                <th scope="row" className="px-4 py-2.5 font-bold">{unitsRange(i)}</th>
                <td className="px-4 py-2.5 text-right font-display text-lg font-semibold">{d.pct === 0 ? 'Sin descuento' : `${d.pct} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {surcharges.length > 0 && (
        <>
          <h3 className="mt-10 text-2xl">Suplementos</h3>
          <ul className="mt-3 grid gap-1.5 text-ink-soft">
            {surcharges.map((s) => (
              <li key={s} className="flex items-center gap-2.5">
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rotate-45 border-2 border-ink bg-yellow" />
                {s}
              </li>
            ))}
          </ul>
        </>
      )}

      {example && (
        <div className="mt-10 rounded-pop border-2 border-dashed border-ink bg-paper p-5 sm:p-6">
          <h3 className="text-xl">Un ejemplo con cifras reales</h3>
          <p className="mt-2 text-ink-soft">
            Una {product.name.toLowerCase()} ({formatEUR(product.basePriceCents)}) con un estampado en la zona «{example.area.label}» de hasta{' '}
            {formatNumber(example.tier.upToCm2)} cm² ({formatEUR(example.tier.cents)}) cuesta{' '}
            <strong className="text-ink">{formatEUR(example.unitCents)}</strong> por unidad. Con {example.qty} unidades iguales:{' '}
            {example.qty} × {formatEUR(example.unitCents)} = {formatEUR(example.grossCents)}
            {example.pct > 0 && (
              <>
                , menos un {example.pct} % = <strong className="text-ink">{formatEUR(example.totalCents)}</strong>
              </>
            )}
            .
          </p>
        </div>
      )}
      <p className="mt-5 text-sm text-ink-soft">
        Todos los precios incluyen el {Math.round(site.vatRate * 100)} % de IVA. El envío se calcula aparte en el carrito.
      </p>
    </div>
  )
}
