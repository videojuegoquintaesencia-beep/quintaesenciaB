import { cn } from '@/lib/cn'
import type { SizeRow } from '@/lib/admin/order-view'

/** Cantidades por talla en una fila de cajitas (solo las tallas pedidas). `large` es la versión de la hoja de producción. */
export function SizeMatrix({ rows, large }: { rows: SizeRow[]; large?: boolean }) {
  if (rows.length === 0) return <p className="text-ink-soft">Sin unidades.</p>
  const total = rows.reduce((n, r) => n + r.qty, 0)
  return (
    <table className="border-collapse text-center" aria-label="Unidades por talla">
      <thead>
        <tr>
          {rows.map((r) => (
            <th
              key={r.id}
              scope="col"
              className={cn(
                'border-2 border-ink bg-violet-soft px-3 font-extrabold print:bg-white',
                large ? 'min-w-12 py-1.5 text-base sm:min-w-16 sm:text-lg' : 'min-w-14 py-1 text-sm',
              )}
            >
              {r.label}
            </th>
          ))}
          <th scope="col" className={cn('border-2 border-ink bg-yellow-soft px-3 font-extrabold print:bg-white', large ? 'text-lg' : 'text-sm')}>
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {rows.map((r) => (
            <td key={r.id} className={cn('border-2 border-ink font-display font-semibold tabular-nums', large ? 'py-2 text-2xl sm:text-3xl' : 'py-1.5 text-xl')}>
              {r.qty}
            </td>
          ))}
          <td className={cn('border-2 border-ink bg-yellow-soft font-display font-bold tabular-nums print:bg-white', large ? 'py-2 text-2xl sm:text-3xl' : 'py-1.5 text-xl')}>
            {total}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
