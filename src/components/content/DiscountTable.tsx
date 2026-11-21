import type { QuantityDiscount } from '@/config/products'

/** Tabla de descuentos por volumen: tramos calculados a partir de los descuentos efectivos (editables en el panel). */
export function DiscountTable({ discounts }: { discounts: readonly QuantityDiscount[] }) {
  const rows = discounts.map((d, i) => {
    const next = discounts[i + 1]
    const range = !next ? `${d.minQty} o más` : next.minQty - 1 === d.minQty ? `${d.minQty}` : `${d.minQty} a ${next.minQty - 1}`
    return { range, pct: d.pct }
  })
  return (
    <div className="card overflow-hidden">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Descuento por volumen según las unidades de cada línea del pedido.</caption>
        <thead>
          <tr className="bg-teal-soft">
            <th scope="col" className="border-b-2 border-ink p-3.5 font-display text-lg font-semibold">Unidades de una línea</th>
            <th scope="col" className="border-b-2 border-ink p-3.5 text-right font-display text-lg font-semibold">Descuento</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.range} className={i < rows.length - 1 ? 'border-b border-ink/25' : undefined}>
              <th scope="row" className="p-3.5 font-bold">{r.range}</th>
              <td className="p-3.5 text-right font-display text-xl font-semibold">{r.pct === 0 ? 'Sin descuento' : `${r.pct} %`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
