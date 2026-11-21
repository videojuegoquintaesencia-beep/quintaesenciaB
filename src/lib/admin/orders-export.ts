/** Exportación de pedidos a CSV respetando los filtros de la lista (solo servidor). */
import 'server-only'
import { getDb } from '@/lib/db'
import { isQuoteItem, orderItemTitle } from '@/lib/order-items'
import { listOrders, type ListOrdersOptions, type OrderItem, type OrderSummary } from '@/lib/orders'
import { ORDER_STATUS_LABEL } from '@/lib/order-status'
import type { Address } from '@/lib/validators'
import { buildCsv, eurosForCsv, type CsvValue } from './csv'
import { csvDateTime } from './dates'

const PAGE = 200
/** Tope de seguridad: más de esto se corta en lugar de bloquear el servidor. */
const MAX_ROWS = 10000

const HEADERS = [
  'Número',
  'Fecha del pedido',
  'Estado',
  'Cliente',
  'Empresa',
  'NIF/CIF',
  'Email',
  'Teléfono',
  'Unidades',
  'Productos',
  'Subtotal (€)',
  'Envío (€)',
  'Total con IVA (€)',
  'IVA incluido (€)',
  'Método de pago',
  'Fecha de pago',
  'Transportista',
  'Seguimiento',
  'Código postal',
  'Localidad',
  'Provincia',
]

interface ExtraRow {
  phone: string
  taxId: string | null
  subtotalCents: number
  shippingCents: number
  vatCents: number
  provider: string
  carrier: string | null
  trackingCode: string | null
  address: (Address & { name: string }) | null
  products: string
}

function productsSummary(itemsJson: string): string {
  try {
    const items = JSON.parse(itemsJson) as OrderItem[]
    // Líneas de presupuesto: la descripción de la dueña (no tienen color).
    return items.map((i) => `${i.quantity} × ${isQuoteItem(i) ? `${orderItemTitle(i)} (presupuesto)` : `${i.productName} ${i.colorName}`}`).join(' | ')
  } catch {
    return ''
  }
}

function parseAddress(json: string): ExtraRow['address'] {
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

async function loadExtras(ids: string[]): Promise<Map<string, ExtraRow>> {
  const db = await getDb()
  const out = new Map<string, ExtraRow>()
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const res = await db.execute({
      sql: `SELECT id, phone, tax_id, subtotal_cents, shipping_cents, vat_cents, payment_provider, carrier,
                   tracking_code, shipping_json, items_json
            FROM orders WHERE id IN (${chunk.map(() => '?').join(',')})`,
      args: chunk,
    })
    for (const r of res.rows) {
      out.set(String(r.id), {
        phone: String(r.phone),
        taxId: r.tax_id == null ? null : String(r.tax_id),
        subtotalCents: Number(r.subtotal_cents),
        shippingCents: Number(r.shipping_cents),
        vatCents: Number(r.vat_cents),
        provider: String(r.payment_provider),
        carrier: r.carrier == null ? null : String(r.carrier),
        trackingCode: r.tracking_code == null ? null : String(r.tracking_code),
        address: parseAddress(String(r.shipping_json)),
        products: productsSummary(String(r.items_json)),
      })
    }
  }
  return out
}

/** Un teléfono validado (solo "+" y dígitos) no puede ser una fórmula: se deja sin comilla para no ensuciarlo. */
function phoneCell(phone: string): CsvValue {
  return /^\+\d{6,15}$/.test(phone) ? { literal: phone } : phone
}

export async function buildOrdersCsv(
  filters: Pick<ListOrdersOptions, 'status' | 'q' | 'includeUnpaid'>,
): Promise<{ csv: string; truncated: boolean }> {
  const summaries: OrderSummary[] = []
  let total = 0
  do {
    const page = await listOrders({ ...filters, limit: PAGE, offset: summaries.length })
    total = page.total
    summaries.push(...page.rows)
    if (page.rows.length === 0) break
  } while (summaries.length < total && summaries.length < MAX_ROWS)

  const extras = await loadExtras(summaries.map((s) => s.id))
  const rows: CsvValue[][] = summaries.map((s) => {
    const x = extras.get(s.id)
    return [
      s.number,
      csvDateTime(s.createdAt),
      ORDER_STATUS_LABEL[s.status],
      s.customerName,
      s.company,
      x?.taxId,
      s.email,
      x ? phoneCell(x.phone) : '',
      s.units,
      x?.products,
      x ? eurosForCsv(x.subtotalCents) : '',
      x ? eurosForCsv(x.shippingCents) : '',
      eurosForCsv(s.totalCents),
      x ? eurosForCsv(x.vatCents) : '',
      x ? (x.provider === 'paypal' ? 'PayPal' : 'Demostración') : '',
      csvDateTime(s.paidAt),
      x?.carrier,
      x?.trackingCode,
      x?.address?.postalCode,
      x?.address?.city,
      x?.address?.province,
    ]
  })

  return { csv: buildCsv(HEADERS, rows), truncated: summaries.length < total }
}
