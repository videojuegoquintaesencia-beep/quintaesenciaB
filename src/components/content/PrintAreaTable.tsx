import { PRODUCTS, allAreas } from '@/config/products'
import { formatNumber } from '@/lib/format'

/** Tamaños máximos de estampado por producto y zona (datos del catálogo). */
export function PrintAreaTable() {
  const rows = PRODUCTS.flatMap((p) => allAreas(p).map((a) => ({ product: p.namePlural, area: a.label, w: a.widthCm, h: a.heightCm })))
  return (
    <div className="card overflow-hidden">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Tamaño máximo de estampado por producto y zona, en centímetros.</caption>
        <thead>
          <tr className="bg-yellow-soft">
            <th scope="col" className="border-b-2 border-ink p-3 font-display font-semibold">Producto</th>
            <th scope="col" className="border-b-2 border-ink p-3 font-display font-semibold">Zona</th>
            <th scope="col" className="border-b-2 border-ink p-3 text-right font-display font-semibold">Máximo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.product}-${r.area}`} className={i < rows.length - 1 ? 'border-b border-ink/25' : undefined}>
              <th scope="row" className="p-3 font-bold">{r.product}</th>
              <td className="p-3 text-ink-soft">{r.area}</td>
              <td className="whitespace-nowrap p-3 text-right font-bold">
                {formatNumber(r.w)} × {formatNumber(r.h)} cm
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
