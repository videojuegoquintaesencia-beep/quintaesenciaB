/**
 * Emisión y consulta de facturas (solo servidor). La factura se guarda en el propio pedido:
 * `invoice_number` (índice único), `invoice_issued_at` e `invoice_json` (copia inmutable, ver lib/invoice-document.ts).
 *
 * Numeración: la tabla `counters` lleva un contador por serie y año ("invoice:2026", "rectification:2026") que se
 * incrementa DENTRO de la misma transacción de escritura (`BEGIN IMMEDIATE`) que guarda la factura, así que dos
 * emisiones a la vez nunca comparten número: la segunda espera a que termine la primera (o, si el pedido ya quedó
 * facturado, recibe su factura). Dentro de una instancia las emisiones además se encadenan una tras otra, y si la
 * base está ocupada por otra escritura se reintenta unas veces en vez de fallar.
 */
import 'server-only'
import type { Transaction } from '@libsql/client'
import { getDb, nowIso } from './db'
import { formatEUR } from './format'
import {
  INVOICEABLE_STATUSES,
  RECTIFIABLE_STATUSES,
  buildInvoiceDocument,
  buildRectification,
  formatInvoiceNumber,
  invoiceCounterKey,
  invoiceYear,
  parseInvoiceRecord,
  rectificationReason,
  type InvoiceKind,
  type InvoiceRecord,
} from './invoice-document'
import { ORDER_STATUS_LABEL } from './order-status'
import { addOrderEvent, getOrderById, type Order } from './orders'
import { getSettings } from './settings'

export type IssueResult =
  | { ok: true; record: InvoiceRecord; created: boolean }
  | { ok: false; error: string; status: 404 | 409 }

/* ───────────── Consulta ───────────── */

export async function getInvoiceRecord(orderId: string): Promise<InvoiceRecord | null> {
  const db = await getDb()
  const res = await db.execute({ sql: `SELECT invoice_json FROM orders WHERE id = ? LIMIT 1`, args: [orderId] })
  const row = res.rows[0]
  return row ? parseInvoiceRecord(row.invoice_json == null ? null : String(row.invoice_json)) : null
}

/* ───────────── Serialización dentro de la instancia y reintentos ───────────── */

type G = typeof globalThis & { __puInvoiceChain?: Promise<unknown> }
const g = globalThis as G

/** Ejecuta las emisiones de una en una (la cola sobrevive a las recargas del código en desarrollo). */
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const previous = g.__puInvoiceChain ?? Promise.resolve()
  const run = previous.then(task, task)
  g.__puInvoiceChain = run.catch(() => undefined)
  return run
}

const BUSY_RETRIES = 6

function isBusy(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code ?? ''
  const message = err instanceof Error ? err.message : ''
  return code === 'SQLITE_BUSY' || /database is locked|SQLITE_BUSY/i.test(message)
}

/** La base SQLite rechaza una segunda escritura simultánea con "ocupada": se espera un poco y se repite. */
async function withBusyRetry<T>(task: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task()
    } catch (err) {
      if (!isBusy(err) || attempt >= BUSY_RETRIES) throw err
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + Math.random() * 40))
    }
  }
}

/** Siguiente valor del contador de una serie, dentro de la transacción abierta. */
async function nextNumber(tx: Transaction, kind: InvoiceKind, issuedAt: string): Promise<string> {
  const year = invoiceYear(issuedAt)
  const res = await tx.execute({
    sql: `INSERT INTO counters (key, value) VALUES (?, 1)
          ON CONFLICT(key) DO UPDATE SET value = value + 1
          RETURNING value`,
    args: [invoiceCounterKey(kind, year)],
  })
  return formatInvoiceNumber(kind, year, Number(res.rows[0]?.value ?? 1))
}

/* ───────────── Emisión ───────────── */

/**
 * Emite la factura de un pedido cobrado. Idempotente: si el pedido ya tiene factura devuelve la misma
 * (`created: false`) y no consume número.
 */
export function issueInvoice(orderId: string): Promise<IssueResult> {
  return serialized(() => withBusyRetry(() => issueInvoiceOnce(orderId)))
}

async function issueInvoiceOnce(orderId: string): Promise<IssueResult> {
  const order = await getOrderById(orderId)
  if (!order) return { ok: false, error: 'Pedido no encontrado', status: 404 }
  const settings = await getSettings()
  const db = await getDb()

  const tx = await db.transaction('write')
  try {
    // Dentro de la transacción se vuelve a mirar el pedido: otra instancia puede haberlo facturado hace un instante.
    const current = await tx.execute({ sql: `SELECT status, invoice_json FROM orders WHERE id = ?`, args: [orderId] })
    const row = current.rows[0]
    if (!row) {
      await tx.rollback()
      return { ok: false, error: 'Pedido no encontrado', status: 404 }
    }
    const existing = parseInvoiceRecord(row.invoice_json == null ? null : String(row.invoice_json))
    if (existing) {
      await tx.rollback()
      return { ok: true, record: existing, created: false }
    }
    const status = String(row.status) as Order['status']
    if (!INVOICEABLE_STATUSES.includes(status)) {
      await tx.rollback()
      return {
        ok: false,
        error: `Solo se factura un pedido cobrado; este está «${ORDER_STATUS_LABEL[status] ?? status}».`,
        status: 409,
      }
    }

    const issuedAt = nowIso()
    const number = await nextNumber(tx, 'invoice', issuedAt)
    const record: InvoiceRecord = {
      v: 1,
      invoice: buildInvoiceDocument({ order, settings, number, issuedAt }),
      rectification: null,
    }
    await tx.execute({
      sql: `UPDATE orders SET invoice_number = ?, invoice_issued_at = ?, invoice_json = ?, updated_at = ?
            WHERE id = ? AND invoice_number IS NULL`,
      args: [number, issuedAt, JSON.stringify(record), issuedAt, orderId],
    })
    await tx.execute({
      sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, NULL, ?, 'admin', ?)`,
      args: [orderId, `Factura ${number} emitida (${formatEUR(record.invoice.totals.grossCents)})`, issuedAt],
    })
    await tx.commit()
    return { ok: true, record, created: true }
  } finally {
    tx.close()
  }
}

/**
 * Emite la factura rectificativa (anulación total) de un pedido reembolsado o cancelado que ya tenía factura.
 * Idempotente: si ya existe, la devuelve.
 */
export function issueRectification(orderId: string): Promise<IssueResult> {
  return serialized(() => withBusyRetry(() => issueRectificationOnce(orderId)))
}

async function issueRectificationOnce(orderId: string): Promise<IssueResult> {
  const db = await getDb()
  const tx = await db.transaction('write')
  try {
    const current = await tx.execute({ sql: `SELECT status, invoice_json FROM orders WHERE id = ?`, args: [orderId] })
    const row = current.rows[0]
    if (!row) {
      await tx.rollback()
      return { ok: false, error: 'Pedido no encontrado', status: 404 }
    }
    const existing = parseInvoiceRecord(row.invoice_json == null ? null : String(row.invoice_json))
    if (!existing) {
      await tx.rollback()
      return { ok: false, error: 'Este pedido no tiene factura que rectificar.', status: 409 }
    }
    if (existing.rectification) {
      await tx.rollback()
      return { ok: true, record: existing, created: false }
    }
    const status = String(row.status) as Order['status']
    if (!RECTIFIABLE_STATUSES.includes(status)) {
      await tx.rollback()
      return { ok: false, error: 'La rectificativa solo se emite cuando el pedido está reembolsado o cancelado.', status: 409 }
    }

    const issuedAt = nowIso()
    const number = await nextNumber(tx, 'rectification', issuedAt)
    const record: InvoiceRecord = {
      ...existing,
      rectification: buildRectification({ original: existing.invoice, number, issuedAt, reason: rectificationReason(status) }),
    }
    await tx.execute({
      sql: `UPDATE orders SET invoice_json = ?, updated_at = ? WHERE id = ?`,
      args: [JSON.stringify(record), issuedAt, orderId],
    })
    await tx.execute({
      sql: `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?, NULL, ?, 'admin', ?)`,
      args: [orderId, `Factura rectificativa ${number} emitida: anula la factura ${existing.invoice.number}`, issuedAt],
    })
    await tx.commit()
    return { ok: true, record, created: true }
  } finally {
    tx.close()
  }
}

/** Deja constancia en el historial de que la factura (o la rectificativa) se envió al cliente. */
export async function recordInvoiceSent(orderId: string, number: string, to: string, simulated: boolean): Promise<void> {
  await addOrderEvent(orderId, `Factura ${number} enviada por email a ${to}${simulated ? ' (email simulado: SMTP sin configurar)' : ''}`, 'admin')
}
