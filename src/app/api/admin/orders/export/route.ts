import { guardAdminApi } from '@/lib/auth'
import { buildOrdersCsv } from '@/lib/admin/orders-export'
import { parseOrdersFilters } from '@/lib/admin/orders-filters'

export const runtime = 'nodejs'

/** CSV de pedidos con los mismos filtros que la lista (estado, q, pendientes). */
export async function GET(req: Request) {
  const denied = await guardAdminApi(req)
  if (denied) return denied

  const params = Object.fromEntries(new URL(req.url).searchParams)
  const filters = parseOrdersFilters(params)
  const { csv, truncated } = await buildOrdersCsv({
    status: filters.status,
    q: filters.q,
    includeUnpaid: filters.includeUnpaid,
  })

  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(new Date())
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pedidos-pieza-unica-${today}.csv"`,
      'Cache-Control': 'no-store',
      // Más filas de las que se exportan de una vez: avisa para que no pase desapercibido.
      ...(truncated ? { 'X-Export-Truncated': '1' } : {}),
    },
  })
}
