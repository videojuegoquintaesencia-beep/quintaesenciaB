/**
 * Pedidos: creación, consulta y cambios de estado. Los importes son céntimos de euro (IVA incluido).
 * Este módulo solo toca la base de datos; los emails los envían las rutas que llaman a estas funciones.
 */
import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import type { InStatement } from '@libsql/client'
import type { ProductId } from '@/config/products'
import { getDb, nowIso } from './db'
import { attachFiles } from './files'
import { newId } from './ids'
import { designArtworkFileIds, type Design } from './design'
import {
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  isOrderStatus,
  type OrderStatus,
} from './order-status'
import type { Address, Customer } from './validators'

/* ───────────── Tipos ───────────── */

/** Línea de pedido tal y como queda guardada (instantánea con precios ya calculados). */
export interface OrderItem {
  lineId: string
  productId: ProductId
  productName: string
  colorId: string
  colorName: string
  colorHex: string
  /** Unidades por talla (clave = id de talla; "unica" en productos de talla única). */
  sizes: Record<string, number>
  quantity: number
  unitBaseCents: number
  printCents: number
  prints: { areaId: string; label: string; usedCm2: number; cents: number }[]
  sizeSurchargeCents: number
  grossCents: number
  discountPct: number
  discountCents: number
  totalCents: number
  design: Design
  /** Imagen de la vista del producto con el diseño aplicado (viewId → fileId). */
  previews: Record<string, string>
  /** PNG transparente listo para imprimir por cada zona usada (areaId → fileId). */
  printFiles: Record<string, string>
  note?: string
}

export type PaymentProvider = 'paypal' | 'demo'
export type PaymentStatus = 'created' | 'captured' | 'failed'
export type OrderActor = 'system' | 'customer' | 'admin' | 'paypal'

export interface OrderEvent {
  id: number
  status: OrderStatus | null
  note: string | null
  actor: OrderActor
  createdAt: string
}

export interface Order {
  id: string
  /** Número visible para el cliente, p. ej. "PU-1042". */
  number: string
  seq: number
  /** Secreto del enlace de seguimiento (no mostrar en el panel salvo para generar el enlace). */
  publicToken: string
  status: OrderStatus
  customerName: string
  email: string
  phone: string
  company: string | null
  taxId: string | null
  shipping: Address & { name: string }
  items: OrderItem[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
  /** IVA contenido en el total. */
  vatCents: number
  payment: {
    provider: PaymentProvider
    status: PaymentStatus
    paypalOrderId: string | null
    paypalCaptureId: string | null
    paidAt: string | null
  }
  trackingCode: string | null
  carrier: string | null
  customerNote: string | null
  adminNote: string | null
  createdAt: string
  updatedAt: string
  events: OrderEvent[]
}

export interface OrderSummary {
  id: string
  number: string
  status: OrderStatus
  customerName: string
  email: string
  company: string | null
  totalCents: number
  units: number
  createdAt: string
  paidAt: string | null
}

/* ───────────── Números de pedido ───────────── */

export const ORDER_NUMBER_OFFSET = 1000
export const formatOrderNumber = (seq: number) => `PU-${ORDER_NUMBER_OFFSET + seq}`

/** "PU-1042" (o "pu1042") → seq 42. Devuelve null si no tiene el formato esperado. */
export function parseOrderNumber(value: string): number | null {
  const m = /^\s*pu[-\s]?(\d{4,9})\s*$/i.exec(value)
  if (!m) return null
  const seq = Number(m[1]) - ORDER_NUMBER_OFFSET
  return Number.isInteger(seq) && seq > 0 ? seq : null
}

/* ───────────── Mapeo de filas ───────────── */

type Row = Record<string, unknown>

function mapOrder(r: Row, events: OrderEvent[]): Order {
  return {
    id: String(r.id),
    seq: Number(r.seq),
    number: formatOrderNumber(Number(r.seq)),
    publicToken: String(r.public_token),
    status: isOrderStatus(r.status) ? r.status : 'pending_payment',
    customerName: String(r.customer_name),
    email: String(r.email),
    phone: String(r.phone),
    company: r.company == null ? null : String(r.company),
    taxId: r.tax_id == null ? null : String(r.tax_id),
    shipping: JSON.parse(String(r.shipping_json)),
    items: JSON.parse(String(r.items_json)),
    subtotalCents: Number(r.subtotal_cents),
    shippingCents: Number(r.shipping_cents),
    totalCents: Number(r.total_cents),
    vatCents: Number(r.vat_cents),
    payment: {
      provider: String(r.payment_provider) as PaymentProvider,
      status: String(r.payment_status) as PaymentStatus,
      paypalOrderId: r.paypal_order_id == null ? null : String(r.paypal_order_id),
      paypalCaptureId: r.paypal_capture_id == null ? null : String(r.paypal_capture_id),
      paidAt: r.paid_at == null ? null : String(r.paid_at),
    },
    trackingCode: r.tracking_code == null ? null : String(r.tracking_code),
    carrier: r.carrier == null ? null : String(r.carrier),
    customerNote: r.customer_note == null ? null : String(r.customer_note),
    adminNote: r.admin_note == null ? null : String(r.admin_note),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    events,
  }
}

function mapEvent(r: Row): OrderEvent {
  return {
    id: Number(r.id),
    status: isOrderStatus(r.status) ? r.status : null,
    note: r.note == null ? null : String(r.note),
    actor: String(r.actor) as OrderActor,
    createdAt: String(r.created_at),
  }
}

async function loadEvents(orderId: string): Promise<OrderEvent[]> {
  const db = await getDb()
  const res = await db.execute({
    sql: `SELECT * FROM order_events WHERE order_id = ? ORDER BY id ASC`,
    args: [orderId],
  })
  return res.rows.map((r) => mapEvent(r as unknown as Row))
}

async function loadOne(where: string, args: (string | number)[]): Promise<Order | null> {
  const db = await getDb()
  const res = await db.execute({ sql: `SELECT * FROM orders WHERE ${where} LIMIT 1`, args })
  const row = res.rows[0] as unknown as Row | undefined
  if (!row) return null
  return mapOrder(row, await loadEvents(String(row.id)))
}

function itemFileIds(items: OrderItem[]): string[] {
  const ids = new Set<string>()
  for (const it of items) {
    for (const id of Object.values(it.previews)) ids.add(id)
    for (const id of Object.values(it.printFiles)) ids.add(id)
    for (const id of designArtworkFileIds(it.design)) ids.add(id)
  }
  return [...ids]
}

/** Todos los archivos (previews, impresión y artes originales) que usa un pedido. */
export function orderFileIds(order: Pick<Order, 'items'>): string[] {
  return itemFileIds(order.items)
}

/* ───────────── Consultas ───────────── */

export const getOrderById = (id: string) => loadOne('id = ?', [id])

export const getOrderByPayPalId = (paypalOrderId: string) => loadOne('paypal_order_id = ?', [paypalOrderId])

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/** Seguimiento por enlace del email: id del pedido + token secreto. */
export async function getOrderByToken(id: string, token: string): Promise<Order | null> {
  const order = await getOrderById(id)
  if (!order || !safeEqual(order.publicToken, token)) return null
  return order
}

/** Seguimiento manual: número de pedido + email. */
export async function findOrderByNumberAndEmail(number: string, email: string): Promise<Order | null> {
  const seq = parseOrderNumber(number)
  if (!seq) return null
  const order = await loadOne('seq = ?', [seq])
  if (!order || order.email.toLowerCase() !== email.trim().toLowerCase()) return null
  return order
}

/* ───────────── Creación y pago ───────────── */

export interface NewOrderInput {
  customer: Customer
  shipping: Address
  items: OrderItem[]
  subtotalCents: number
  shippingCents: number
  totalCents: number
  vatCents: number
  paymentProvider: PaymentProvider
  customerNote?: string
}

export async function createOrder(input: NewOrderInput): Promise<Order> {
  const db = await getDb()
  const id = newId(20)
  const token = newId(28)
  const now = nowIso()
  const stmts: InStatement[] = [
    {
      sql: `INSERT INTO orders (id, public_token, status, customer_name, email, phone, company, tax_id,
              shipping_json, items_json, subtotal_cents, shipping_cents, total_cents, vat_cents,
              payment_provider, payment_status, customer_note, created_at, updated_at)
            VALUES (?, ?, 'pending_payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)`,
      args: [
        id,
        token,
        input.customer.name,
        input.customer.email,
        input.customer.phone,
        input.customer.company || null,
        input.customer.taxId || null,
        JSON.stringify(input.shipping),
        JSON.stringify(input.items),
        input.subtotalCents,
        input.shippingCents,
        input.totalCents,
        input.vatCents,
        input.paymentProvider,
        input.customerNote?.trim() || null,
        now,
        now,
      ],
    },
    {
      sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, 'pending_payment', ?, 'customer', ?)`,
      args: [id, 'Pedido creado, pendiente de pago', now],
    },
  ]
  await db.batch(stmts, 'write')
  await attachFiles({ orderId: id }, itemFileIds(input.items))
  const order = await getOrderById(id)
  if (!order) throw new Error('No se pudo crear el pedido')
  return order
}

export async function setPayPalOrderId(orderId: string, paypalOrderId: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `UPDATE orders SET paypal_order_id = ?, updated_at = ? WHERE id = ?`,
    args: [paypalOrderId, nowIso(), orderId],
  })
}

/**
 * Marca un pedido como pagado. Es idempotente: si ya estaba pagado devuelve `alreadyPaid: true`
 * y no vuelve a registrar nada (así un reintento o un webhook duplicado no envía dos emails).
 */
export async function markOrderPaid(
  orderId: string,
  info: { provider: PaymentProvider; captureId?: string | null; note?: string },
): Promise<{ order: Order; alreadyPaid: boolean }> {
  const db = await getDb()
  const now = nowIso()
  const res = await db.execute({
    sql: `UPDATE orders
          SET status = 'paid', payment_status = 'captured', payment_provider = ?, paypal_capture_id = ?,
              paid_at = ?, updated_at = ?
          WHERE id = ? AND status = 'pending_payment'`,
    args: [info.provider, info.captureId ?? null, now, now, orderId],
  })
  if (res.rowsAffected > 0) {
    await db.execute({
      sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, 'paid', ?, ?, ?)`,
      args: [
        orderId,
        info.note ?? (info.provider === 'demo' ? 'Pago simulado (modo demostración)' : 'Pago confirmado con PayPal'),
        info.provider === 'paypal' ? 'paypal' : 'system',
        now,
      ],
    })
  }
  const order = await getOrderById(orderId)
  if (!order) throw new Error('Pedido no encontrado')
  return { order, alreadyPaid: res.rowsAffected === 0 }
}

export async function markPaymentFailed(orderId: string, note: string): Promise<void> {
  const db = await getDb()
  const now = nowIso()
  await db.batch(
    [
      {
        sql: `UPDATE orders SET payment_status = 'failed', updated_at = ? WHERE id = ? AND status = 'pending_payment'`,
        args: [now, orderId],
      },
      {
        sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, NULL, ?, 'paypal', ?)`,
        args: [orderId, note.slice(0, 500), now],
      },
    ],
    'write',
  )
}

/* ───────────── Gestión (panel de administración) ───────────── */

export type StatusUpdateResult = { ok: true; order: Order } | { ok: false; error: string }

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  opts: { note?: string; trackingCode?: string; carrier?: string; actor?: OrderActor; force?: boolean } = {},
): Promise<StatusUpdateResult> {
  const order = await getOrderById(orderId)
  if (!order) return { ok: false, error: 'Pedido no encontrado' }
  if (order.status === status) return { ok: false, error: 'El pedido ya está en ese estado' }
  if (!opts.force && !ORDER_STATUS_TRANSITIONS[order.status].includes(status))
    return { ok: false, error: 'Ese cambio de estado no está permitido' }

  const db = await getDb()
  const now = nowIso()
  const tracking = opts.trackingCode?.trim() || order.trackingCode
  const carrier = opts.carrier?.trim() || order.carrier
  // Pasar a "pagado" a mano (p. ej. transferencia) también deja constancia del cobro.
  const markCaptured = status === 'paid' && order.status === 'pending_payment'
  await db.batch(
    [
      {
        sql: markCaptured
          ? `UPDATE orders SET status = ?, tracking_code = ?, carrier = ?, updated_at = ?,
               payment_status = 'captured', paid_at = COALESCE(paid_at, ?) WHERE id = ?`
          : `UPDATE orders SET status = ?, tracking_code = ?, carrier = ?, updated_at = ? WHERE id = ?`,
        args: markCaptured ? [status, tracking, carrier, now, now, orderId] : [status, tracking, carrier, now, orderId],
      },
      {
        sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, ?, ?, ?, ?)`,
        args: [orderId, status, opts.note?.trim() || null, opts.actor ?? 'admin', now],
      },
    ],
    'write',
  )
  const updated = await getOrderById(orderId)
  return updated ? { ok: true, order: updated } : { ok: false, error: 'Pedido no encontrado' }
}

export async function updateAdminNote(orderId: string, note: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `UPDATE orders SET admin_note = ?, updated_at = ? WHERE id = ?`,
    args: [note.trim() || null, nowIso(), orderId],
  })
}

export async function updateTracking(orderId: string, carrier: string, trackingCode: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `UPDATE orders SET carrier = ?, tracking_code = ?, updated_at = ? WHERE id = ?`,
    args: [carrier.trim() || null, trackingCode.trim() || null, nowIso(), orderId],
  })
}

export async function addOrderEvent(orderId: string, note: string, actor: OrderActor = 'admin'): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, NULL, ?, ?, ?)`,
    args: [orderId, note.slice(0, 1000), actor, nowIso()],
  })
}

export interface ListOrdersOptions {
  /** Un estado concreto, "all" (todos), "open" (pagados y aún sin entregar) o "active" (pagados pendientes de producir/enviar). */
  status?: OrderStatus | 'all' | 'open' | 'active'
  /** Búsqueda por número de pedido, nombre, email o empresa. */
  q?: string
  limit?: number
  offset?: number
  /** Incluir pedidos "pendiente de pago" (carritos que no llegaron a pagar). Por defecto no. */
  includeUnpaid?: boolean
}

export async function listOrders(opts: ListOrdersOptions = {}): Promise<{ rows: OrderSummary[]; total: number }> {
  const db = await getDb()
  const where: string[] = []
  const args: (string | number)[] = []

  if (opts.status && opts.status !== 'all') {
    if (opts.status === 'open') where.push(`status IN ('paid','in_production','ready','shipped')`)
    else if (opts.status === 'active') where.push(`status IN ('paid','in_production','ready')`)
    else {
      where.push(`status = ?`)
      args.push(opts.status)
    }
  } else if (!opts.includeUnpaid) {
    where.push(`status <> 'pending_payment'`)
  }

  const q = opts.q?.trim()
  if (q) {
    const seq = parseOrderNumber(q)
    const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`
    const parts = [
      `customer_name LIKE ? ESCAPE '\\'`,
      `email LIKE ? ESCAPE '\\'`,
      `COALESCE(company,'') LIKE ? ESCAPE '\\'`,
    ]
    args.push(like, like, like)
    if (seq) {
      parts.push(`seq = ?`)
      args.push(seq)
    }
    where.push(`(${parts.join(' OR ')})`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 200)
  const offset = Math.max(opts.offset ?? 0, 0)

  const [countRes, rowsRes] = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS n FROM orders ${whereSql}`, args }),
    db.execute({
      sql: `SELECT seq, id, status, customer_name, email, company, total_cents, items_json, created_at, paid_at
            FROM orders ${whereSql} ORDER BY seq DESC LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    }),
  ])

  const rows: OrderSummary[] = rowsRes.rows.map((raw) => {
    const r = raw as unknown as Row
    let units = 0
    try {
      units = (JSON.parse(String(r.items_json)) as OrderItem[]).reduce((n, i) => n + i.quantity, 0)
    } catch {
      /* ignorar datos corruptos */
    }
    return {
      id: String(r.id),
      number: formatOrderNumber(Number(r.seq)),
      status: isOrderStatus(r.status) ? r.status : 'pending_payment',
      customerName: String(r.customer_name),
      email: String(r.email),
      company: r.company == null ? null : String(r.company),
      totalCents: Number(r.total_cents),
      units,
      createdAt: String(r.created_at),
      paidAt: r.paid_at == null ? null : String(r.paid_at),
    }
  })
  return { rows, total: Number(countRes.rows[0]?.n ?? 0) }
}

export interface OrderStats {
  countsByStatus: Record<OrderStatus, number>
  /** Pedidos pagados que requieren atención (pagado + en producción + listo). */
  toProcess: number
  revenue30dCents: number
  orders30d: number
  revenueTotalCents: number
}

export async function getOrderStats(): Promise<OrderStats> {
  const db = await getDb()
  const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>
  const byStatus = await db.execute(`SELECT status, COUNT(*) AS n FROM orders GROUP BY status`)
  for (const r of byStatus.rows) if (isOrderStatus(r.status)) counts[r.status] = Number(r.n)

  const since = new Date(Date.now() - 30 * 86400_000).toISOString()
  const paidStatuses = `('paid','in_production','ready','shipped','delivered')`
  const [r30, rAll] = await Promise.all([
    db.execute({
      sql: `SELECT COALESCE(SUM(total_cents),0) AS cents, COUNT(*) AS n FROM orders WHERE status IN ${paidStatuses} AND paid_at >= ?`,
      args: [since],
    }),
    db.execute(`SELECT COALESCE(SUM(total_cents),0) AS cents FROM orders WHERE status IN ${paidStatuses}`),
  ])
  return {
    countsByStatus: counts,
    toProcess: counts.paid + counts.in_production + counts.ready,
    revenue30dCents: Number(r30.rows[0]?.cents ?? 0),
    orders30d: Number(r30.rows[0]?.n ?? 0),
    revenueTotalCents: Number(rAll.rows[0]?.cents ?? 0),
  }
}
